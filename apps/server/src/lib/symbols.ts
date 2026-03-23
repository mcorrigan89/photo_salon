/**
 * DI symbols defined in a standalone file with no local imports so that any
 * domain class can safely import them without creating circular dependencies.
 */
export const dbSymbol = Symbol.for("Database");
export const loggerSymbol = Symbol.for("Logger");
export const authSymbol = Symbol.for("AuthService");
export const postmarkSymbol = Symbol.for("Postmark");
