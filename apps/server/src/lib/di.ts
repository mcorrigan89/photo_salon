import { createDatabase } from "@photo-salon/database";
import { getServerEnv } from "@photo-salon/env/server";
import { logger } from "@photo-salon/logger";
import { ServerClient } from "postmark";
import { auth, type AuthService } from "./auth.ts";
import { di } from "./di-container.ts";
import { dbSymbol, loggerSymbol, postmarkSymbol, authSymbol } from "./symbols.ts";

export { dbSymbol, loggerSymbol, postmarkSymbol, authSymbol };

di.bind(dbSymbol).toDynamicValue(() => {
  return createDatabase(getServerEnv().DATABASE_URL);
});

di.bind(loggerSymbol).toConstantValue(logger);

di.bind(postmarkSymbol).toDynamicValue(() => {
  return new ServerClient(getServerEnv().POSTMARK_API_KEY);
});

di.bind<AuthService>(authSymbol).toConstantValue(auth);

export { di };
