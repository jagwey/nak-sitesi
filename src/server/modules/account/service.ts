import "server-only";
import { db } from "../../db";
import { AppError } from "../../errors";
import type { AddressCreateInput, AddressUpdateInput } from "./schema";

export const MAX_ADDRESSES = 20;

// Every query is scoped by userId: another user's id behaves exactly like a missing one (NOT_FOUND).

export function listAddresses(userId: string) {
  return db.address.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function getAddress(userId: string, id: string) {
  const a = await db.address.findFirst({ where: { id, userId } });
  if (!a) throw new AppError("NOT_FOUND");
  return a;
}

export async function createAddress(userId: string, input: AddressCreateInput) {
  return db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) throw new AppError("VALIDATION", `En fazla ${MAX_ADDRESSES} adres kaydedebilirsiniz.`);
    if (input.isDefaultShipping) await tx.address.updateMany({ where: { userId }, data: { isDefaultShipping: false } });
    if (input.isDefaultBilling) await tx.address.updateMany({ where: { userId }, data: { isDefaultBilling: false } });
    return tx.address.create({ data: { ...input, userId } });
  });
}

export async function updateAddress(userId: string, id: string, input: AddressUpdateInput) {
  return db.$transaction(async (tx) => {
    if (input.isDefaultShipping) await tx.address.updateMany({ where: { userId, id: { not: id } }, data: { isDefaultShipping: false } });
    if (input.isDefaultBilling) await tx.address.updateMany({ where: { userId, id: { not: id } }, data: { isDefaultBilling: false } });
    const res = await tx.address.updateMany({ where: { id, userId }, data: input });
    if (res.count !== 1) throw new AppError("NOT_FOUND");
    return tx.address.findFirstOrThrow({ where: { id, userId } });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const res = await db.address.deleteMany({ where: { id, userId } });
  if (res.count !== 1) throw new AppError("NOT_FOUND");
}
