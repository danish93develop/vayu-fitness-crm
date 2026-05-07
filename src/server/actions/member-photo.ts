"use server";

import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "members");

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Upload a member's profile photo.
 *   • Server-side validates MIME + size (defense beyond client checks)
 *   • Writes to public/uploads/members/<memberId>-<timestamp>.<ext>
 *   • Updates Member.profilePhotoUrl
 *   • Removes the old file if one existed
 *
 * The form submits FormData with `file` (the image) and `memberId`.
 * Server actions accept FormData natively, so no JSON body needed.
 */
export async function uploadMemberPhotoAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const session = await requirePermission("members:update");
  const { user } = session;

  const memberId = formData.get("memberId");
  const file = formData.get("file");

  if (typeof memberId !== "string" || !memberId) {
    return { ok: false, error: "Missing memberId." };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, or WebP images are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be smaller than 4 MB." };
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: user.gymId, deletedAt: null },
    select: { id: true, profilePhotoUrl: true },
  });
  if (!member) return { ok: false, error: "Member not found." };

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const filename = `${member.id}-${Date.now()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, bytes);

    const publicUrl = `/uploads/members/${filename}`;

    await prisma.member.update({
      where: { id: member.id },
      data: { profilePhotoUrl: publicUrl },
    });

    // Best-effort delete of the old photo
    if (member.profilePhotoUrl?.startsWith("/uploads/members/")) {
      const oldPath = path.join(process.cwd(), "public", member.profilePhotoUrl);
      await unlink(oldPath).catch(() => {});
    }

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Member",
      entityId: member.id,
      metadata: { event: "photo_uploaded", filename },
    });

    revalidatePath(`/members/${member.id}`);
    revalidatePath(`/members/${member.id}/edit`);
    revalidatePath("/members");

    return { ok: true, data: { url: publicUrl } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Remove the member's photo (sets profilePhotoUrl to null + deletes file) */
export async function removeMemberPhotoAction(
  memberId: string,
): Promise<ActionResult> {
  const { user } = await requirePermission("members:update");

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: user.gymId, deletedAt: null },
    select: { id: true, profilePhotoUrl: true },
  });
  if (!member) return { ok: false, error: "Member not found." };

  try {
    if (member.profilePhotoUrl?.startsWith("/uploads/members/")) {
      const oldPath = path.join(process.cwd(), "public", member.profilePhotoUrl);
      await unlink(oldPath).catch(() => {});
    }
    await prisma.member.update({
      where: { id: memberId },
      data: { profilePhotoUrl: null },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Member",
      entityId: memberId,
      metadata: { event: "photo_removed" },
    });

    revalidatePath(`/members/${memberId}`);
    revalidatePath(`/members/${memberId}/edit`);
    revalidatePath("/members");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
