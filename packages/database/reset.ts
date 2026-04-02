import { join } from "path";
import { readFileSync, readdirSync } from "fs";
import { Client } from "pg";

async function reset() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  console.info("Connecting to database...");
  await client.connect();

  console.info("Dropping all tables...");
  await client.query("DROP SCHEMA public CASCADE");
  await client.query("CREATE SCHEMA public");

  const migrationsDir = join(process.cwd(), "migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    console.info(`Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    await client.query(sql);
  }

  console.info("Database reset complete!");
  await client.end();
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
