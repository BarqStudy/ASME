import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { AppError, newToken, can } from "./security";
import type { User } from "@prisma/client";
const root = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
  );
export async function upload(form: FormData, user: User) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024)
    throw new AppError(400, "FILE_SIZE");
  const bytes = Buffer.from(await file.arrayBuffer());
  let mime = "",
    ext = "";
  if (bytes.subarray(0, 5).toString() === "%PDF-") {
    mime = "application/pdf";
    ext = "pdf";
  } else if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    mime = "image/png";
    ext = "png";
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = "image/jpeg";
    ext = "jpg";
  } else throw new AppError(400, "PDF_PNG_JPEG_ONLY");
  const license = String(form.get("license") || "")
    .trim()
    .slice(0, 1000);
  if (license.length < 3) throw new AppError(400, "RIGHTS_REQUIRED");
  const isPublic = form.get("public") === "true";
  if (isPublic && !can(user.role, "content") && !can(user.role, "events"))
    throw new AppError(403, "FORBIDDEN");
  const storageName = `${newToken()}.${ext}`;
  await mkdir(root(), { recursive: true, mode: 0o700 });
  await writeFile(
    path.join(/* turbopackIgnore: true */ root(), storageName),
    bytes,
    { mode: 0o600 },
  );
  try {
    return await db.mediaAsset.create({
      data: {
        ownerId: user.id,
        storageName,
        originalName: path
          .basename(file.name)
          .replace(/[\x00-\x1f]/g, "")
          .slice(0, 150),
        mime,
        size: bytes.length,
        license,
        public: isPublic,
      },
    });
  } catch (e) {
    await unlink(path.join(/* turbopackIgnore: true */ root(), storageName));
    throw e;
  }
}
export async function fileResponse(
  id: string,
  user: User | null,
  inline = false,
) {
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError(404, "NOT_FOUND");
  const taskAccess = user
    ? await db.taskAttachment.findFirst({
        where: {
          assetId: id,
          task: {
            OR: [
              { assigneeId: user.id },
              { committee: { leaderId: user.id } },
              { committee: { members: { some: { userId: user.id } } } },
            ],
          },
        },
      })
    : null;
  const judgingAccess =
    user && can(user.role, "competitions")
      ? await db.competitionSubmission.findFirst({ where: { assetId: id } })
      : null;
  if (
    !taskAccess &&
    !judgingAccess &&
    !asset.public &&
    asset.ownerId !== user?.id &&
    !(user && can(user.role, "settings"))
  )
    throw new AppError(404, "NOT_FOUND");
  if (!/^[A-Za-z0-9_-]+\.(pdf|png|jpg)$/.test(asset.storageName))
    throw new AppError(404, "NOT_FOUND");
  return new Response(
    await readFile(
      path.join(/* turbopackIgnore: true */ root(), asset.storageName),
    ),
    {
      headers: {
        "Content-Type": asset.mime,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${asset.mime === "application/pdf" && !inline ? "attachment" : "inline"}; filename="asset.${asset.storageName.split(".").pop()}"`,
        "Cache-Control": asset.public
          ? "public, max-age=3600"
          : "private, no-store",
      },
    },
  );
}
