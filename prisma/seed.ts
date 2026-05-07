/**
 * Seed script — populates a fresh database with:
 *   • Gym + default branch
 *   • Admin user (Super Admin)
 *   • All membership plans from the spec
 *   • 3 trainers
 *   • 5 dummy members covering each status (Active, Expiring Soon, Expired, Frozen, Pending Payment)
 *   • 5 dummy leads covering each lead status (New, Contacted, Trial Booked, Trial Completed, Lost)
 *   • Default settings + invoice counter
 *
 * Idempotent: uses upserts so you can re-run without duplicates.
 *
 * Run with:  pnpm db:seed   (which calls `tsx prisma/seed.ts` per package.json)
 */
import { PrismaClient, PlanType, PlanDurationUnit, MemberStatus, MembershipStatus, LeadStatus, LeadSource, Gender, PaymentStatus, PaymentMode, InstallmentStatus, UserRoleType, AttendanceMethod } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { addDays, subDays, subMonths, startOfDay } from "date-fns";

const prisma = new PrismaClient();

// Local password hashing (avoid src/ import — keeps seed self-contained for tsx)
async function hashPwd(pw: string) {
  return hash(pw, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "change-me-before-deploy";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Admin";

async function main() {
  console.log("🌱 Seeding Vayu Fitness CRM…");

  // ── Gym ──────────────────────────────────────────────────────────────────
  const gym = await prisma.gym.upsert({
    where: { id: "vayu-main-gym" },
    update: {},
    create: {
      id: "vayu-main-gym",
      name: "Vayu Fitness",
      legalName: "Vayu Fitness Pvt Ltd",
      email: "info@example.com",
      phone: "+91 0000000000",
      address: "Dummy Address, India",
      gstNumber: null,
      invoicePrefix: "VF-INV",
      invoiceFooter: "Thank you for choosing Vayu Fitness. Stay consistent, stay strong.",
      invoiceTerms:
        "Fees once paid are non-refundable. Membership is non-transferable. Membership freeze requests are subject to approval. Please keep this receipt for your records.",
      defaultGstPct: 18,
      expiryAlertDays: 7,
    },
  });
  console.log("  ✓ Gym:", gym.name);

  // ── Branch ───────────────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: "vayu-main-branch" },
    update: {},
    create: {
      id: "vayu-main-branch",
      gymId: gym.id,
      name: "Main Branch",
      address: "Dummy Address, India",
      phone: "+91 0000000000",
      isDefault: true,
    },
  });
  console.log("  ✓ Branch:", branch.name);

  // ── Invoice counter (one per branch, atomic source for invoice numbers) ──
  await prisma.invoiceCounter.upsert({
    where: { gymId_branchId_prefix: { gymId: gym.id, branchId: branch.id, prefix: "VF-INV" } },
    update: {},
    create: { gymId: gym.id, branchId: branch.id, prefix: "VF-INV", value: 0 },
  });
  console.log("  ✓ Invoice counter");

  // ── Admin user ───────────────────────────────────────────────────────────
  const adminPasswordHash = await hashPwd(ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash, role: UserRoleType.SUPER_ADMIN, isActive: true },
    create: {
      gymId: gym.id,
      branchId: branch.id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: UserRoleType.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (password: ${ADMIN_PASSWORD})`);

  // ── Membership plans ─────────────────────────────────────────────────────
  const planSeed = [
    { code: "plan-monthly",     name: "Monthly Gym Membership",      type: PlanType.MAIN_MEMBERSHIP,    months: 1,  pricePaise: 200_000,   installments: false, max: 1, sort: 1 },
    { code: "plan-quarterly",   name: "Quarterly Gym Membership",    type: PlanType.MAIN_MEMBERSHIP,    months: 3,  pricePaise: 550_000,   installments: false, max: 1, sort: 2 },
    { code: "plan-half-yearly", name: "Half-Yearly Gym Membership",  type: PlanType.MAIN_MEMBERSHIP,    months: 6,  pricePaise: 1_000_000, installments: false, max: 1, sort: 3 },
    { code: "plan-annual",      name: "Annual Gym Membership",       type: PlanType.MAIN_MEMBERSHIP,    months: 12, pricePaise: 1_800_000, installments: true,  max: 2, sort: 4 },
    { code: "plan-pt",          name: "Personal Training Add-on",    type: PlanType.PERSONAL_TRAINING,  months: 1,  pricePaise: 500_000,   installments: false, max: 1, sort: 5 },
    { code: "plan-yoga",        name: "Yoga/Zumba Add-on",           type: PlanType.ADD_ON,             months: 1,  pricePaise: 250_000,   installments: false, max: 1, sort: 6 },
  ] as const;

  const plans = await Promise.all(
    planSeed.map((p) =>
      prisma.membershipPlan.upsert({
        where: { id: p.code },
        update: {},
        create: {
          id: p.code,
          gymId: gym.id,
          name: p.name,
          type: p.type,
          durationValue: p.months,
          durationUnit: PlanDurationUnit.MONTH,
          basePricePaise: p.pricePaise,
          allowsInstallments: p.installments,
          maxInstallments: p.max,
          sortOrder: p.sort,
          isActive: true,
        },
      }),
    ),
  );
  console.log(`  ✓ Plans: ${plans.length}`);

  // ── Trainers ─────────────────────────────────────────────────────────────
  const trainerSeed = [
    { id: "trainer-rahul", name: "Rahul Sharma", phone: "+91 9000000001", specialization: "Strength Training" },
    { id: "trainer-priya", name: "Priya Verma",  phone: "+91 9000000002", specialization: "Yoga / Pilates" },
    { id: "trainer-amit",  name: "Amit Singh",   phone: "+91 9000000003", specialization: "CrossFit / HIIT" },
  ];

  const trainers = await Promise.all(
    trainerSeed.map((t) =>
      prisma.trainer.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          gymId: gym.id,
          branchId: branch.id,
          name: t.name,
          phone: t.phone,
          specialization: t.specialization,
          isActive: true,
        },
      }),
    ),
  );
  console.log(`  ✓ Trainers: ${trainers.length}`);

  // ── Dummy members (one per status) ───────────────────────────────────────
  const today = new Date();
  const memberSeed = [
    {
      id: "mem-active",      code: "VF-M-0001", name: "Aarav Mehta",     phone: "+91 9810000001",
      gender: Gender.MALE,   status: MemberStatus.ACTIVE,
      planId: "plan-annual", days: 200, // started 200 days ago
    },
    {
      id: "mem-expiring",    code: "VF-M-0002", name: "Isha Kapoor",     phone: "+91 9810000002",
      gender: Gender.FEMALE, status: MemberStatus.EXPIRING_SOON,
      planId: "plan-quarterly", days: 85, // ~5 days left on a 90-day plan
    },
    {
      id: "mem-expired",     code: "VF-M-0003", name: "Rohan Desai",     phone: "+91 9810000003",
      gender: Gender.MALE,   status: MemberStatus.EXPIRED,
      planId: "plan-monthly", days: 60, // expired 30 days ago
    },
    {
      id: "mem-frozen",      code: "VF-M-0004", name: "Neha Iyer",       phone: "+91 9810000004",
      gender: Gender.FEMALE, status: MemberStatus.FROZEN,
      planId: "plan-half-yearly", days: 60, // mid-term, frozen
    },
    {
      id: "mem-pending",     code: "VF-M-0005", name: "Vikram Reddy",    phone: "+91 9810000005",
      gender: Gender.MALE,   status: MemberStatus.PENDING_PAYMENT,
      planId: "plan-annual", days: 0, // just joined, no payment
    },
  ];

  for (const m of memberSeed) {
    const member = await prisma.member.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        memberCode: m.code,
        gymId: gym.id,
        branchId: branch.id,
        fullName: m.name,
        phone: m.phone,
        gender: m.gender,
        joiningDate: subDays(today, m.days),
        status: m.status,
        assignedTrainerId: trainerSeed[0]!.id,
        createdById: admin.id,
      },
    });

    // Attach a membership matching the status
    const plan = plans.find((p) => p.id === m.planId)!;
    const planMonths = plan.durationValue;
    const startDate = subDays(today, m.days);
    const endDate = addDays(startDate, planMonths * 30);

    let membershipStatus: MembershipStatus = MembershipStatus.ACTIVE;
    let paymentStatus: PaymentStatus = PaymentStatus.PAID;
    if (m.status === MemberStatus.EXPIRING_SOON) membershipStatus = MembershipStatus.EXPIRING_SOON;
    if (m.status === MemberStatus.EXPIRED) membershipStatus = MembershipStatus.EXPIRED;
    if (m.status === MemberStatus.FROZEN) membershipStatus = MembershipStatus.FROZEN;
    if (m.status === MemberStatus.PENDING_PAYMENT) {
      membershipStatus = MembershipStatus.PENDING_PAYMENT;
      paymentStatus = PaymentStatus.PENDING;
    }

    const code = `VF-MS-${String(memberSeed.indexOf(m) + 1).padStart(4, "0")}`;
    await prisma.memberMembership.upsert({
      where: { membershipCode: code },
      update: {},
      create: {
        membershipCode: code,
        gymId: gym.id,
        branchId: branch.id,
        memberId: member.id,
        planId: plan.id,
        startDate,
        endDate,
        originalEndDate: endDate,
        status: membershipStatus,
        basePricePaise: plan.basePricePaise,
        finalPricePaise: plan.basePricePaise,
        paymentStatus,
        createdById: admin.id,
      },
    });
  }
  console.log(`  ✓ Members: ${memberSeed.length}`);

  // ── Dummy leads (one per status) ─────────────────────────────────────────
  const leadSeed = [
    { id: "lead-new",     name: "Karan Bhatia",   phone: "+91 9820000001", status: LeadStatus.NEW,             source: LeadSource.WALK_IN },
    { id: "lead-contact", name: "Priyanka Joshi", phone: "+91 9820000002", status: LeadStatus.CONTACTED,       source: LeadSource.INSTAGRAM },
    { id: "lead-trial",   name: "Sameer Khan",    phone: "+91 9820000003", status: LeadStatus.TRIAL_BOOKED,    source: LeadSource.GOOGLE },
    { id: "lead-done",    name: "Anjali Rao",     phone: "+91 9820000004", status: LeadStatus.TRIAL_COMPLETED, source: LeadSource.REFERRAL },
    { id: "lead-lost",    name: "Manish Kumar",   phone: "+91 9820000005", status: LeadStatus.LOST,            source: LeadSource.FACEBOOK },
  ];

  for (const l of leadSeed) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        gymId: gym.id,
        branchId: branch.id,
        name: l.name,
        phone: l.phone,
        status: l.status,
        source: l.source,
        followUpDate: l.status === LeadStatus.LOST ? null : addDays(today, 2),
        assignedToId: admin.id,
        createdById: admin.id,
      },
    });
  }
  console.log(`  ✓ Leads: ${leadSeed.length}`);

  // ── Payments + invoices for paid members (revenue chart material) ───────
  // Generates a payment for each member who isn't PENDING_PAYMENT, plus a
  // partial payment + pending installment for the pending member.
  const paymentSeed = [
    { id: "pay-1", memberId: "mem-active",   membershipCode: "VF-MS-0001", planId: "plan-annual",      monthsAgo: 6, status: PaymentStatus.PAID,    mode: PaymentMode.UPI },
    { id: "pay-2", memberId: "mem-expiring", membershipCode: "VF-MS-0002", planId: "plan-quarterly",   monthsAgo: 2, status: PaymentStatus.PAID,    mode: PaymentMode.CARD },
    { id: "pay-3", memberId: "mem-expired",  membershipCode: "VF-MS-0003", planId: "plan-monthly",     monthsAgo: 2, status: PaymentStatus.PAID,    mode: PaymentMode.CASH },
    { id: "pay-4", memberId: "mem-frozen",   membershipCode: "VF-MS-0004", planId: "plan-half-yearly", monthsAgo: 2, status: PaymentStatus.PAID,    mode: PaymentMode.UPI },
    { id: "pay-5", memberId: "mem-pending",  membershipCode: "VF-MS-0005", planId: "plan-annual",      monthsAgo: 0, status: PaymentStatus.PARTIAL, mode: PaymentMode.UPI }, // installment 1 of 2
  ] as const;

  for (const [idx, p] of paymentSeed.entries()) {
    const plan = plans.find((pp) => pp.id === p.planId)!;
    const membership = await prisma.memberMembership.findUnique({ where: { membershipCode: p.membershipCode } });
    if (!membership) continue;

    const isPartial = p.status === PaymentStatus.PARTIAL;
    const grossPaise = isPartial ? Math.floor(plan.basePricePaise / 2) : plan.basePricePaise;
    const gstPercent = 18;
    const taxablePaise = grossPaise; // no discount
    const gstPaise = Math.round((taxablePaise * gstPercent) / 100);
    const totalPaise = taxablePaise + gstPaise;
    const paymentDate = subMonths(today, p.monthsAgo);

    const payment = await prisma.payment.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        paymentCode: `VF-PAY-${String(idx + 1).padStart(4, "0")}`,
        gymId: gym.id,
        branchId: branch.id,
        memberId: p.memberId,
        membershipId: membership.id,
        amountPaise: grossPaise,
        discountPaise: 0,
        taxablePaise,
        gstPaise,
        totalPaise,
        gstPercent,
        mode: p.mode,
        status: p.status,
        paymentDate,
        receivedById: admin.id,
      },
    });

    // Generate invoice for paid payments (not partial — invoice on completion)
    if (p.status === PaymentStatus.PAID) {
      const invoiceNumber = `VF-INV-${String(idx + 1).padStart(4, "0")}`;
      const member = await prisma.member.findUnique({ where: { id: p.memberId } });
      await prisma.invoice.upsert({
        where: { invoiceNumber },
        update: {},
        create: {
          invoiceNumber,
          gymId: gym.id,
          branchId: branch.id,
          memberId: p.memberId,
          paymentId: payment.id,
          issueDate: paymentDate,
          memberNameSnapshot: member!.fullName,
          memberPhoneSnapshot: member!.phone,
          memberEmailSnapshot: member!.email,
          memberAddressSnapshot: member!.address,
          planNameSnapshot: plan.name,
          gymNameSnapshot: gym.name,
          gymAddressSnapshot: gym.address,
          gymPhoneSnapshot: gym.phone,
          gymEmailSnapshot: gym.email,
          gymGstSnapshot: gym.gstNumber,
          termsSnapshot: gym.invoiceTerms,
          footerSnapshot: gym.invoiceFooter,
          subtotalPaise: grossPaise,
          discountPaise: 0,
          taxablePaise,
          gstPaise,
          gstPercent,
          totalPaise,
        },
      });
      // Bump invoice counter so next real invoice continues sequence
      await prisma.invoiceCounter.update({
        where: { gymId_branchId_prefix: { gymId: gym.id, branchId: branch.id, prefix: "VF-INV" } },
        data: { value: idx + 1 },
      });
    }

    // For the pending member: also create installments (1 paid, 1 due in 6 months)
    if (isPartial) {
      await prisma.paymentInstallment.upsert({
        where: { membershipId_installmentNumber: { membershipId: membership.id, installmentNumber: 1 } },
        update: {},
        create: {
          membershipId: membership.id,
          memberId: p.memberId,
          installmentNumber: 1,
          amountPaise: grossPaise,
          dueDate: paymentDate,
          paidDate: paymentDate,
          status: InstallmentStatus.PAID,
          paymentId: payment.id,
        },
      });
      await prisma.paymentInstallment.upsert({
        where: { membershipId_installmentNumber: { membershipId: membership.id, installmentNumber: 2 } },
        update: {},
        create: {
          membershipId: membership.id,
          memberId: p.memberId,
          installmentNumber: 2,
          amountPaise: Math.floor(plan.basePricePaise / 2),
          dueDate: addDays(today, 5), // due in 5 days — shows up as "Upcoming installments"
          status: InstallmentStatus.PENDING,
        },
      });
    }
  }
  console.log(`  ✓ Payments + invoices: ${paymentSeed.length}`);

  // ── Today's attendance for active member (so dashboard shows 1) ─────────
  await prisma.attendance.upsert({
    where: { memberId_date: { memberId: "mem-active", date: startOfDay(today) } },
    update: {},
    create: {
      gymId: gym.id,
      branchId: branch.id,
      memberId: "mem-active",
      date: startOfDay(today),
      firstInAt: new Date(today.setHours(7, 30, 0, 0)),
      method: AttendanceMethod.MANUAL,
      markedById: admin.id,
    },
  });
  console.log(`  ✓ Today's attendance: 1`);

  // ── Default settings ─────────────────────────────────────────────────────
  const defaultSettings: { key: string; value: unknown }[] = [
    { key: "expiry_alert_days", value: 7 },
    { key: "default_gst_percent", value: 18 },
    { key: "max_freeze_days", value: 30 },
    { key: "annual_max_installments", value: 2 },
    { key: "feature_flags", value: { whatsapp: false, razorpay: false, biometric: false } },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { gymId_key: { gymId: gym.id, key: s.key } },
      update: {},
      create: { gymId: gym.id, key: s.key, value: s.value as never },
    });
  }
  console.log(`  ✓ Settings: ${defaultSettings.length}`);

  console.log("\n✅ Seed complete.\n");
  console.log(`   Login:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
