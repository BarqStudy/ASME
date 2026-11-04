import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import { hashPassword, newToken } from "../lib/security";
import { email, password } from "../lib/validation";
async function main() {
  if (await db.user.count({ where: { role: "SUPER_ADMIN" } }))
    throw new Error(
      "An administrator already exists. Use the authenticated roles page.",
    );
  const address = email.parse(process.env.BOOTSTRAP_EMAIL),
    provided = process.env.BOOTSTRAP_PASSWORD;
  const secret = password.parse(provided || newToken());
  await db.user.create({
    data: {
      email: address,
      passwordHash: await hashPassword(secret),
      fullName: process.env.BOOTSTRAP_NAME || "Club administrator",
      role: "SUPER_ADMIN",
      verifiedAt: new Date(),
      profile: { create: {} },
    },
  });
  if (!provided) {
    await mkdir(".data", { recursive: true, mode: 0o700 });
    await writeFile(
      ".data/bootstrap-credentials.json",
      JSON.stringify({ email: address, password: secret }),
      { mode: 0o600 },
    );
    console.log(
      "Administrator created. Generated credentials are in the private .data/bootstrap-credentials.json file.",
    );
  } else
    console.log(
      "Administrator created using the supplied environment credentials.",
    );
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Bootstrap failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
