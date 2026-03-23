import { drizzle } from "drizzle-orm/node-postgres";
import * as schemas from "./schemas/index.ts";

export const createDatabase = (databaseUrl: string) => {
  const db = drizzle(databaseUrl, {
    schema: {
      ...schemas,
    },
  });

  return db;
};

export type Database = ReturnType<typeof createDatabase>;

export const dbMock = drizzle.mock({
  schema: {
    ...schemas,
  },
});
