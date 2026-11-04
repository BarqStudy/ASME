import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { db } from "./db";
import { newToken, hashToken, AppError } from "./security";
export async function sendAccountMail(
  userId: string,
  email: string,
  purpose: "verify" | "reset",
) {
  const token = newToken();
  await db.verificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      purpose,
      expiresAt: new Date(
        Date.now() + (purpose === "verify" ? 86400000 : 1800000),
      ),
    },
  });
  const url = `${process.env.APP_URL || "http://localhost:3000"}/auth/${purpose}?token=${encodeURIComponent(token)}`;
  const subject =
    purpose === "verify"
      ? "ASME NU — Verify your email / تأكيد البريد"
      : "ASME NU — Reset password / استعادة كلمة المرور";
  const text = `${subject}\n\n${url}\n\nThis link is private and expires. الرابط خاص ومؤقت.`;
  if (
    process.env.MAIL_MODE === "file" &&
    process.env.NODE_ENV !== "production"
  ) {
    const dir = path.resolve(process.env.MAIL_DIR || ".data/mail");
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(
      path.join(dir, `${Date.now()}-${newToken().slice(0, 10)}.json`),
      JSON.stringify({ to: email, subject, text, url, purpose }),
      { mode: 0o600 },
    );
    return;
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new AppError(503, "MAIL_NOT_CONFIGURED");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.SMTP_PORT !== "465",
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text,
  });
}
