import { type AppDomain } from "@/domain/domain.ts";
import { type Logger } from "@photo-salon/logger";
import { type Session } from "./auth.ts";
import { di } from "./di-container.ts";
import { loggerSymbol } from "./symbols.ts";

export interface HttpContext {
  headers: Headers;
  domain: AppDomain;
  session?: Session["session"];
  user?: Session["user"];
}

export interface UserContext extends HttpContext {
  logger: ContextLogger;
  currentUserId: string | null;
}

export interface EventContext {
  logger: ContextLogger;
}

export type Context = UserContext | EventContext;

export class ContextLogger {
  private userContext?: UserContext;
  constructor(private baseLogger: Logger) {}

  public setUserContext(userContext: UserContext) {
    this.userContext = userContext;
  }

  public trace(message: string, ...args: unknown[]) {
    this.baseLogger.trace({ userId: this.userContext?.user?.id ?? null }, message, ...args);
  }

  public info(message: string, ...args: unknown[]) {
    this.baseLogger.info({ userId: this.userContext?.user?.id ?? null }, message, ...args);
  }

  public warn(message: string, ...args: unknown[]) {
    this.baseLogger.warn({ userId: this.userContext?.user?.id ?? null }, message, ...args);
  }

  public error(message: string | Error, ...args: unknown[]) {
    this.baseLogger.error(
      { userId: this.userContext?.user?.id ?? null },
      message instanceof Error ? message.message : message,
      ...args
    );
  }
}

export function createUserContext(params: HttpContext, logger: Logger): UserContext {
  return {
    ...params,
    logger: new ContextLogger(logger),
    currentUserId: params.user?.id ?? null,
  };
}

export function createEventContext(): EventContext {
  const logger = di.get<Logger>(loggerSymbol);
  return {
    logger: new ContextLogger(logger),
  };
}
