import path from "node:path";
import { readFileSync } from "node:fs";

import { ConvexDocumentStore } from "./convexDocumentStore.js";
import { DocumentStore } from "./documentStore.js";
import { PostgresDocumentStore } from "./postgresDocumentStore.js";

export function createStore({ env = process.env, filePath } = {}) {
  if (env.DB_FILE || filePath) {
    return new DocumentStore(filePath || env.DB_FILE);
  }

  const convexUrl = env.CONVEX_URL || (env === process.env ? readEnvFileValue(".env.local", "CONVEX_URL") : "");
  if (convexUrl) {
    return new ConvexDocumentStore(convexUrl);
  }

  if (env.DATABASE_URL) {
    return new PostgresDocumentStore(env.DATABASE_URL);
  }

  return new DocumentStore(filePath || path.join(process.cwd(), "data", "db.json"));
}

function readEnvFileValue(fileName, key) {
  try {
    const file = readFileSync(path.join(process.cwd(), fileName), "utf8");
    const line = file.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim() || "";
  } catch {
    return "";
  }
}
