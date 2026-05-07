import type { Prisma } from "@prisma/client";

/**
 * Atomically increment the invoice counter and return the next number.
 * Use ONLY inside a transaction so the counter and the invoice it numbers
 * commit together. Two concurrent calls cannot collide because Prisma's
 * `increment` is a single SQL UPDATE.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  gymId: string,
  branchId: string,
  prefix = "VF-INV",
): Promise<{ invoiceNumber: string; value: number }> {
  const counter = await tx.invoiceCounter.upsert({
    where: { gymId_branchId_prefix: { gymId, branchId, prefix } },
    update: { value: { increment: 1 } },
    create: { gymId, branchId, prefix, value: 1 },
  });
  return {
    invoiceNumber: `${prefix}-${String(counter.value).padStart(4, "0")}`,
    value: counter.value,
  };
}
