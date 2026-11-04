import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import type { Certificate } from "@prisma/client";
export async function certificatePdf(cert: Certificate) {
  const data = cert.snapshot as {
    name: string;
    event: { ar: string; en: string };
    date: string;
  };
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([842, 595]),
    font = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderColor: rgb(0.16, 0.47, 0.73),
    borderWidth: 2,
  });
  const draw = (text: string, y: number, size = 16) =>
    page.drawText(text, {
      x: 60,
      y,
      size,
      font: font,
      color: rgb(0.06, 0.16, 0.26),
    });
  page.drawText("ASME NU", {
    x: 60,
    y: 500,
    size: 32,
    font: bold,
    color: rgb(0.16, 0.47, 0.73),
  });
  draw("NAJRAN UNIVERSITY STUDENT SECTION", 468, 13);
  draw("CERTIFICATE OF PARTICIPATION", 385, 25);
  draw("This certifies that", 340);
  pdf.registerFontkit(fontkit);
  const cairo = await pdf.embedFont(
    await readFile(path.join(process.cwd(), "public/Cairo.ttf")),
    { subset: true },
  );
  page.drawText(data.name, {
    x: 60,
    y: 303,
    size: 22,
    font: cairo,
    color: rgb(0.06, 0.16, 0.26),
  });
  draw("participated in", 268);
  page.drawText(data.event.en, {
    x: 60,
    y: 232,
    size: 18,
    font: cairo,
    color: rgb(0.06, 0.16, 0.26),
  });
  page.drawText(data.event.ar, {
    x: 60,
    y: 207,
    size: 15,
    font: cairo,
    color: rgb(0.06, 0.16, 0.26),
  });
  draw(new Date(data.date).toISOString().slice(0, 10), 174);
  draw(`Certificate: ${cert.code}`, 95, 10);
  draw("Approved by the club organizer. Valid unless revoked.", 75, 10);
  const qr = await pdf.embedPng(
    await QRCode.toBuffer(`${process.env.APP_URL}/verify/${cert.code}`, {
      width: 150,
    }),
  );
  page.drawImage(qr, { x: 650, y: 60, width: 125, height: 125 });
  return new Response(Buffer.from(await pdf.save()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="asme-certificate.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
