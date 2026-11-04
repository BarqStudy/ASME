import { cookies } from "next/headers";
import { db } from "./db";
import { hashToken, newToken, AppError } from "./security";
import type { User } from "@prisma/client";
export const sessionCookie = "asmenu_session";
export async function userByToken(
  token: string | undefined,
): Promise<User | null> {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabledAt)
    return null;
  return session.user;
}
export async function currentUser() {
  return userByToken((await cookies()).get(sessionCookie)?.value);
}
export async function createSession(userId: string) {
  const token = newToken(),
    expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}
export async function consumeToken(token: string, purpose: string) {
  if (token.length < 20 || token.length > 200)
    throw new AppError(400, "INVALID_TOKEN");
  return db.$transaction(async (tx) => {
    const found = await tx.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!found || found.purpose !== purpose || found.expiresAt < new Date())
      throw new AppError(400, "INVALID_TOKEN");
    const deleted = await tx.verificationToken.deleteMany({
      where: { id: found.id },
    });
    if (deleted.count !== 1) throw new AppError(400, "INVALID_TOKEN");
    return found.userId;
  });
}
