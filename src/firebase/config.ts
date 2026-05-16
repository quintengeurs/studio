// Re-exporting from client.ts for backward compatibility
export * from "./client";

/**
 * @deprecated Use imports from src/firebase/client.ts directly
 */
export function initializeFirebase() {
  const { app, db, auth } = require("./client");
  return { app, db, auth };
}
