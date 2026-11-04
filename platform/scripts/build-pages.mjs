import { mkdir, writeFile, cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  target = path.join(root, ".pages-build");
const execute = (args, cwd, env = {}) => {
  const result = spawnSync(process.execPath, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// Generation uses bundled WASM and never opens a database connection.
execute(["scripts/generate-client.mjs"], root, {
  DATABASE_URL: "postgresql://static_build:unused@127.0.0.1:5432/static_build",
});
await rm(target, { recursive: true, force: true });
await mkdir(path.join(target, "app", "[[...path]]"), { recursive: true });
await writeFile(
  path.join(target, "package.json"),
  JSON.stringify({ private: true, name: "asme-nu-pages" }),
);
await writeFile(
  path.join(target, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        plugins: [{ name: "next" }],
        paths: { "@/*": ["../*"] },
      },
      include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ),
);
await writeFile(
  path.join(target, "next.config.ts"),
  `import type {NextConfig} from 'next';import path from 'node:path';const config:NextConfig={output:'export',basePath:'/ASME',trailingSlash:true,images:{unoptimized:true},poweredByHeader:false,turbopack:{root:path.resolve('..')},experimental:{cpus:2},env:{NEXT_PUBLIC_SITE_MODE:'pages',NEXT_PUBLIC_SITE_BASE_PATH:'/ASME'}};export default config;\n`,
);
await cp(path.join(root, "public"), path.join(target, "public"), {
  recursive: true,
});
for (const file of ["layout.tsx", "globals.css", "not-found.tsx", "error.tsx"])
  await cp(path.join(root, "app", file), path.join(target, "app", file));
await cp(
  path.join(root, "postcss.config.mjs"),
  path.join(target, "postcss.config.mjs"),
);
await writeFile(
  path.join(target, "app", "[[...path]]", "page.tsx"),
  `import {Provider} from '@/components/provider';import {Shell} from '@/components/shell';import {PublicPage} from '@/components/public';import content from '@/publication/content.json';import {publicRoutes,unavailableRoutes} from '@/publication/routes';import type {Content} from '@/lib/types';export const dynamicParams=false;export function generateStaticParams(){return [...publicRoutes,...unavailableRoutes,...content.events.map(e=>'events/'+e.slug)].map(route=>({path:route?route.split('/'):[]}));}export default async function Page({params}:{params:Promise<{path?:string[]}>}){const {path=[]}=await params;return <Provider initial={content as unknown as Content}><Shell><PublicPage path={path}/></Shell></Provider>;}\n`,
);
execute([path.join(root, "node_modules/next/dist/bin/next"), "build"], target, {
  NODE_ENV: "production",
});
await writeFile(path.join(target, "out", ".nojekyll"), "");
console.log("GitHub Pages export:", path.join(target, "out"));
