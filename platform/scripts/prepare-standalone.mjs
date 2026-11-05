import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".next/standalone");
await access(path.join(output, "server.js"));
await mkdir(path.join(output, ".next"), { recursive: true });
// Next's standalone output deliberately omits these assets by default.
await cp(path.join(root, "public"), path.join(output, "public"), {
  recursive: true,
});
await cp(path.join(root, ".next/static"), path.join(output, ".next/static"), {
  recursive: true,
});
console.log("Standalone server, fonts, images and browser bundles prepared.");
