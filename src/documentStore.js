import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const now = () => new Date().toISOString();

const seedUsers = [
  { id: "user_alex", name: "Alex Owner", email: "alex@ajaia.test" },
  { id: "user_blair", name: "Blair Reviewer", email: "blair@ajaia.test" },
  { id: "user_casey", name: "Casey Editor", email: "casey@ajaia.test" }
];

const defaultContent = "<h1>Untitled document</h1><p>Start writing...</p>";

function normalizeTitle(title) {
  const clean = String(title ?? "").trim();
  return clean || "Untitled document";
}

function ensureString(value) {
  return typeof value === "string" ? value : "";
}

function summarizeDocument(document, owner, shareCount = 0) {
  return {
    id: document.id,
    title: document.title,
    ownerId: document.ownerId,
    ownerName: owner?.name ?? "Unknown owner",
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    shareCount
  };
}

export class DocumentStore {
  constructor(filePath = path.join(process.cwd(), "data", "db.json")) {
    this.filePath = filePath;
  }

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await this.#read();
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await this.#write({
        users: seedUsers,
        documents: [],
        shares: []
      });
    }
  }

  async listUsers() {
    const db = await this.#read();
    return db.users;
  }

  async listDocumentsForUser(userId) {
    const db = await this.#read();
    this.#requireUser(db, userId);

    const sharedIds = new Set(
      db.shares.filter((share) => share.userId === userId).map((share) => share.documentId)
    );

    const withSummary = (document) => summarizeDocument(
      document,
      db.users.find((user) => user.id === document.ownerId),
      db.shares.filter((share) => share.documentId === document.id).length
    );

    return {
      owned: db.documents
        .filter((document) => document.ownerId === userId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(withSummary),
      shared: db.documents
        .filter((document) => sharedIds.has(document.id) && document.ownerId !== userId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(withSummary)
    };
  }

  async getDocument(documentId, userId) {
    const db = await this.#read();
    this.#requireUser(db, userId);
    const document = this.#requireDocument(db, documentId);
    this.#requireAccess(db, document, userId);
    const owner = db.users.find((user) => user.id === document.ownerId);
    const shares = db.shares
      .filter((share) => share.documentId === document.id)
      .map((share) => ({
        ...share,
        user: db.users.find((user) => user.id === share.userId)
      }));

    return {
      ...summarizeDocument(document, owner, shares.length),
      shares
    };
  }

  async createDocument(ownerId, input = {}) {
    const db = await this.#read();
    this.#requireUser(db, ownerId);
    const timestamp = now();
    const document = {
      id: `doc_${randomUUID()}`,
      title: normalizeTitle(input.title),
      content: ensureString(input.content) || defaultContent,
      ownerId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    db.documents.push(document);
    await this.#write(db);
    return document;
  }

  async updateDocument(documentId, userId, input = {}) {
    const db = await this.#read();
    this.#requireUser(db, userId);
    const document = this.#requireDocument(db, documentId);
    this.#requireAccess(db, document, userId);

    if (Object.hasOwn(input, "title")) {
      document.title = normalizeTitle(input.title);
    }

    if (Object.hasOwn(input, "content")) {
      document.content = ensureString(input.content);
    }

    document.updatedAt = now();
    await this.#write(db);
    return document;
  }

  async shareDocument(documentId, ownerId, recipientId) {
    const db = await this.#read();
    this.#requireUser(db, ownerId);
    this.#requireUser(db, recipientId);
    const document = this.#requireDocument(db, documentId);

    if (document.ownerId !== ownerId) {
      throw Object.assign(new Error("Only the owner can share this document."), { statusCode: 403 });
    }

    if (ownerId === recipientId) {
      throw Object.assign(new Error("You cannot share a document with yourself."), { statusCode: 400 });
    }

    const existing = db.shares.find(
      (share) => share.documentId === documentId && share.userId === recipientId
    );

    if (existing) {
      return existing;
    }

    const share = {
      id: `share_${randomUUID()}`,
      documentId,
      userId: recipientId,
      role: "editor",
      createdAt: now()
    };
    db.shares.push(share);
    await this.#write(db);
    return share;
  }

  validateImportFile(fileName) {
    const extension = path.extname(String(fileName)).toLowerCase();
    if (![".txt", ".md"].includes(extension)) {
      throw Object.assign(new Error("Only .txt and .md files are supported."), { statusCode: 400 });
    }
  }

  async importDocument(ownerId, input = {}) {
    this.validateImportFile(input.fileName);
    return this.createDocument(ownerId, {
      title: input.title || path.basename(input.fileName, path.extname(input.fileName)),
      content: textToHtml(input.content ?? "")
    });
  }

  async #read() {
    return JSON.parse(await readFile(this.filePath, "utf8"));
  }

  async #write(db) {
    await writeFile(this.filePath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }

  #requireUser(db, userId) {
    const user = db.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw Object.assign(new Error("User not found."), { statusCode: 404 });
    }
    return user;
  }

  #requireDocument(db, documentId) {
    const document = db.documents.find((candidate) => candidate.id === documentId);
    if (!document) {
      throw Object.assign(new Error("Document not found."), { statusCode: 404 });
    }
    return document;
  }

  #requireAccess(db, document, userId) {
    if (document.ownerId === userId) {
      return;
    }

    const hasShare = db.shares.some(
      (share) => share.documentId === document.id && share.userId === userId
    );

    if (!hasShare) {
      throw Object.assign(new Error("You do not have access to this document."), { statusCode: 403 });
    }
  }
}

export function textToHtml(text) {
  const escaped = String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const lines = escaped.split(/\r?\n/);
  const html = [];
  let inList = false;

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (heading) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      const level = heading[1].length;
      html.push(`<h${level}>${heading[2]}</h${level}>`);
      continue;
    }

    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${bullet[1]}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (line.trim()) {
      html.push(`<p>${line}</p>`);
    }
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("") || "<p></p>";
}

