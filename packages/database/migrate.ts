import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  console.info("Connecting to database...");
  await client.connect();

  const db = drizzle(client);

  console.info("Running migrations...");
  await migrate(db, { migrationsFolder: path.join(import.meta.dirname, "migrations") });

  console.info("Migrations completed successfully!");
  await client.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
