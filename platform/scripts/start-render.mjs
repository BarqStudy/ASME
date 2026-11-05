import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderEnvironment } from "./render-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(
  process.execPath,
  [path.join(root, ".next/standalone/server.js")],
  {
    cwd: root,
    env: renderEnvironment(process.env),
    stdio: "inherit",
  },
);
const stop = (signal) => child.kill(signal);
const term = () => stop("SIGTERM");
const interrupt = () => stop("SIGINT");
process.on("SIGTERM", term);
process.on("SIGINT", interrupt);
child.on("error", () => {
  console.error(
    "Could not start the standalone application. Run npm run build:render first.",
  );
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.removeListener("SIGTERM", term);
  process.removeListener("SIGINT", interrupt);
  process.exitCode =
    code ?? (signal === "SIGTERM" || signal === "SIGINT" ? 0 : 1);
});
