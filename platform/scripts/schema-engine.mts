import "dotenv/config";
import { SchemaEngine } from "@prisma/schema-engine-wasm";
import { PrismaPg } from "@prisma/adapter-pg";
import { bindMigrationAwareSqlAdapterFactory } from "@prisma/driver-adapter-utils";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
async function main() {
  const content = await readFile("prisma/schema.prisma", "utf8");
  const engine = await SchemaEngine.new(
    { datamodels: [["schema.prisma", content]] },
    () => {},
    bindMigrationAwareSqlAdapterFactory(
      new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    ),
  );
  try {
    if (process.argv.includes("--generate-initial")) {
      const result = await engine.diff({
        from: { tag: "empty" },
        to: {
          tag: "schemaDatamodel",
          files: [{ path: "schema.prisma", content }],
        },
        script: true,
        exitCode: null,
        filters: { externalTables: [], externalEnums: [] },
      });
      const directory = "prisma/migrations/20261104170000_init";
      await mkdir(directory, { recursive: true });
      await writeFile(`${directory}/migration.sql`, result.stdout!);
      console.log("Initial migration generated.");
    } else {
      const baseDir = path.resolve("prisma/migrations");
      const names = (await readdir(baseDir, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      const migrationDirectories = await Promise.all(
        names.map(async (name) => ({
          path: name,
          migrationFile: {
            path: "migration.sql",
            content: {
              tag: "ok" as const,
              value: await readFile(
                path.join(baseDir, name, "migration.sql"),
                "utf8",
              ),
            },
          },
        })),
      );
      const result = await engine.applyMigrations({
        migrationsList: {
          baseDir,
          lockfile: {
            path: "migration_lock.toml",
            content: 'provider = "postgresql"',
          },
          migrationDirectories,
          shadowDbInitScript: "",
        },
        filters: { externalTables: [], externalEnums: [] },
      });
      console.log("Applied migrations:", result.appliedMigrationNames.length);
    }
  } finally {
    engine.free();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Migration failed");
  process.exitCode = 1;
});
