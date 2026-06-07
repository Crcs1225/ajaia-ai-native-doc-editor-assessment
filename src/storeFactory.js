import path from "node:path";

import { DocumentStore } from "./documentStore.js";
import { PostgresDocumentStore } from "./postgresDocumentStore.js";

export function createStore({ env = process.env, filePath } = {}) {
  if (env.DATABASE_URL) {
    return new PostgresDocumentStore(env.DATABASE_URL);
  }

  return new DocumentStore(filePath || path.join(process.cwd(), "data", "db.json"));
}

