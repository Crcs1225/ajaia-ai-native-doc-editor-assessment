import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { DocumentStore } from "../src/documentStore.js";

async function withStore(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "ajaia-docs-test-"));
  const filePath = path.join(dir, "db.json");
  const store = new DocumentStore(filePath);
  try {
    await store.init();
    await run(store);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("shared document appears under recipient shared documents and remains owned by creator", async () => {
  await withStore(async (store) => {
    const users = await store.listUsers();
    const owner = users.find((user) => user.email === "alex@ajaia.test");
    const recipient = users.find((user) => user.email === "blair@ajaia.test");

    const document = await store.createDocument(owner.id, {
      title: "Partner notes",
      content: "<h1>Partner notes</h1><p>Initial draft</p>"
    });

    await store.shareDocument(document.id, owner.id, recipient.id);

    const ownerDocuments = await store.listDocumentsForUser(owner.id);
    const recipientDocuments = await store.listDocumentsForUser(recipient.id);

    assert.equal(ownerDocuments.owned.length, 1);
    assert.equal(ownerDocuments.shared.length, 0);
    assert.equal(ownerDocuments.owned[0].id, document.id);
    assert.equal(ownerDocuments.owned[0].ownerId, owner.id);

    assert.equal(recipientDocuments.owned.length, 0);
    assert.equal(recipientDocuments.shared.length, 1);
    assert.equal(recipientDocuments.shared[0].id, document.id);
    assert.equal(recipientDocuments.shared[0].ownerId, owner.id);
  });
});

test("unsupported import file types are rejected", async () => {
  await withStore(async (store) => {
    assert.throws(
      () => store.validateImportFile("brief.pdf"),
      /Only .txt and .md files are supported/
    );
  });
});

