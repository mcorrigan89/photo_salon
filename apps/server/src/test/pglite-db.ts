import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import * as schemas from "@photo-salon/database/schema";
import type { Database } from "@photo-salon/database";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../../packages/database/migrations", import.meta.url),
);

export interface TestDatabase {
  db: Database;
  cleanup: () => Promise<void>;
}

export async function createPgliteDb(): Promise<TestDatabase> {
  const pglite = new PGlite();

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    await pglite.exec(sql);
  }

  // drizzle-orm/pglite implements the same query API — cast is safe for tests
  const db = drizzle(pglite, { schema: schemas }) as unknown as Database;

  return {
    db,
    cleanup: async () => {
      await pglite.close();
    },
  };
}
