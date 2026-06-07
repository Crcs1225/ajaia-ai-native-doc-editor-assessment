import assert from "node:assert/strict";
import test from "node:test";

import { createStore } from "../src/storeFactory.js";
import { ConvexDocumentStore } from "../src/convexDocumentStore.js";
import { DocumentStore } from "../src/documentStore.js";
import { PostgresDocumentStore } from "../src/postgresDocumentStore.js";

test("store factory uses JSON store without DATABASE_URL", () => {
  const store = createStore({ env: {}, filePath: "data/test.json" });
  assert.equal(store instanceof DocumentStore, true);
});

test("store factory uses Postgres store when DATABASE_URL is configured", () => {
  const store = createStore({
    env: { DATABASE_URL: "postgres://user:pass@localhost:5432/ajaia" }
  });
  assert.equal(store instanceof PostgresDocumentStore, true);
});

test("store factory uses Convex store when CONVEX_URL is configured", () => {
  const store = createStore({
    env: { CONVEX_URL: "https://example.convex.cloud" }
  });
  assert.equal(store instanceof ConvexDocumentStore, true);
});
