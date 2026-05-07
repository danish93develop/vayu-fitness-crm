"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv-parse";
import { nextMemberCode } from "@/server/services/members";
import type { Gender } from "@prisma/client";

type ImportResult = {
  ok: true;
  created: number;
  skipped: { row: number; reason: string }[];
};

const PHONE_RE = /^[+0-9 ()-]+$/;

function parseGender(raw: string): Gender {
  const v = raw.trim().toUpperCase();
  if (v === "M" || v === "MALE") return "MALE";
  if (v === "F" || v === "FEMALE") return "FEMALE";
  if (v === "O" || v === "OTHER") return "OTHER";
  return "UNSPECIFIED";
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Bulk-import members from CSV text.
 *
 * Required headers: full name (or fullname/name), phone
 * Optional:         email, gender, date of birth, address,
 *                   emergency name, emergency phone, joining date, notes
 *
 * Skips rows that fail validation and reports them. Returns a count of
 * created members + a per-row skip reason list. Atomic per-row (each insert
 * is its own transaction so one bad row doesn't roll the whole batch back).
 */
export async function importMembersAction(
  csvText: string,
): Promise<ImportResult | { ok: false; error: string }> {
  const session = await requirePermission("members:create");
  const { user } = session;

  if (!csvText.trim()) return { ok: false, error: "CSV is empty." };

  const { headers, rows } = parseCsv(csvText);
  if (rows.length === 0) return { ok: false, error: "No rows found in CSV." };
  if (rows.length > 500) {
    return { ok: false, error: "CSV has too many rows (max 500 per import)." };
  }

  // Find the headers we care about (be lenient about exact spelling)
  function find(...aliases: string[]): string | null {
    for (const a of aliases) {
      const found = headers.find((h) => h === a);
      if (found) return found;
    }
    return null;
  }
  const nameCol = find("full name", "fullname", "name");
  const phoneCol = find("phone", "mobile", "contact");
  if (!nameCol || !phoneCol) {
    return {
      ok: false,
      error: "CSV must include at least 'name' and 'phone' columns.",
    };
  }

  const emailCol = find("email");
  const genderCol = find("gender", "sex");
  const dobCol = find("date of birth", "dob", "birthday");
  const addressCol = find("address");
  const emergencyNameCol = find("emergency name", "emergency contact");
  const emergencyPhoneCol = find("emergency phone");
  const joiningCol = find("joining date", "joined", "join date");
  const notesCol = find("notes");

  const branch = await prisma.branch.findFirst({
    where: { gymId: user.gymId, deletedAt: null, isDefault: true },
  });
  if (!branch) return { ok: false, error: "No default branch configured." };

  const skipped: ImportResult["skipped"] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowNum = i + 2; // +2 because row 1 is the header in the CSV

    const fullName = (row[nameCol] ?? "").trim();
    const phone = (row[phoneCol] ?? "").trim();

    if (!fullName || fullName.length < 2) {
      skipped.push({ row: rowNum, reason: "Name missing or too short" });
      continue;
    }
    if (!phone || !PHONE_RE.test(phone)) {
      skipped.push({ row: rowNum, reason: "Invalid or missing phone" });
      continue;
    }

    const email = emailCol ? (row[emailCol] ?? "").trim() || null : null;
    const gender = genderCol ? parseGender(row[genderCol] ?? "") : "UNSPECIFIED";
    const dob = dobCol ? parseDate(row[dobCol] ?? "") : null;
    const address = addressCol ? (row[addressCol] ?? "").trim() || null : null;
    const emergencyName = emergencyNameCol
      ? (row[emergencyNameCol] ?? "").trim() || null
      : null;
    const emergencyPhone = emergencyPhoneCol
      ? (row[emergencyPhoneCol] ?? "").trim() || null
      : null;
    const joiningDate = joiningCol
      ? parseDate(row[joiningCol] ?? "") ?? new Date()
      : new Date();
    const notes = notesCol ? (row[notesCol] ?? "").trim() || null : null;

    try {
      const memberCode = await nextMemberCode(user.gymId);
      await prisma.member.create({
        data: {
          memberCode,
          gymId: user.gymId,
          branchId: branch.id,
          fullName,
          phone,
          email,
          gender,
          dateOfBirth: dob,
          address,
          emergencyName,
          emergencyPhone,
          joiningDate,
          notes,
          createdById: user.id,
        },
      });
      created++;
    } catch (err) {
      skipped.push({
        row: rowNum,
        reason: (err as Error).message?.slice(0, 100) ?? "Database error",
      });
    }
  }

  await audit({
    gymId: user.gymId,
    userId: user.id,
    action: "IMPORT",
    entityType: "Member",
    metadata: { created, skipped: skipped.length, totalRows: rows.length },
  });

  revalidatePath("/members");

  return { ok: true, created, skipped };
}
