import { join } from "path";
import { readFileSync, readdirSync } from "fs";
import { Client } from "pg";

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  console.info("Connecting to database...");
  await client.connect();

  // Ensure migration tracking table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const { rows: applied } = await client.query("SELECT name FROM _migrations ORDER BY name");
  const appliedSet = new Set(applied.map((r) => r.name));

  const migrationsDir = join(process.cwd(), "migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of migrationFiles) {
    if (appliedSet.has(file)) continue;

    console.info(`Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    count++;
  }

  if (count === 0) {
    console.info("No new migrations to apply.");
  } else {
    console.info(`Applied ${count} migration(s) successfully!`);
  }

  await client.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
