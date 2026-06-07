import { randomUUID } from "node:crypto";
import path from "node:path";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api.js";
import { sanitizeDocumentHtml } from "./sanitize.js";
import { seedUsers } from "./seedData.js";
import { textToHtml } from "./documentStore.js";

const now = () => new Date().toISOString();
const defaultContent = "<h1>Untitled document</h1><p>Start writing...</p>";

function normalizeTitle(title) {
  const clean = String(title ?? "").trim();
  return clean || "Untitled document";
}

function ensureString(value) {
  return typeof value === "string" ? value : "";
}

export class ConvexDocumentStore {
  constructor(convexUrl) {
    if (!convexUrl) {
      throw new Error("CONVEX_URL is required to use Convex persistence.");
    }
    this.client = new ConvexHttpClient(convexUrl);
  }

  async init() {
    await this.client.mutation(api.documents.seedUsers, { users: seedUsers });
  }

  async createUser(input = {}) {
    return await this.client.mutation(api.documents.createUser, {
      id: `user_${randomUUID()}`,
      name: normalizeName(input.name),
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash
    });
  }

  async listUsers() {
    return await this.client.query(api.documents.listUsers, {});
  }

  async findUserByEmail(email) {
    return await this.client.query(api.documents.findUserByEmail, { email: String(email ?? "") });
  }

  async listDocumentsForUser(userId) {
    return await this.client.query(api.documents.listDocumentsForUser, { userId });
  }

  async getDocument(documentId, userId) {
    return await this.client.query(api.documents.getDocument, { documentId, userId });
  }

  async createDocument(ownerId, input = {}) {
    const timestamp = now();
    const document = {
      id: `doc_${randomUUID()}`,
      title: normalizeTitle(input.title),
      content: sanitizeDocumentHtml(ensureString(input.content) || defaultContent),
      ownerId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    return await this.client.mutation(api.documents.createDocument, { document });
  }

  async updateDocument(documentId, userId, input = {}) {
    const existing = await this.getDocument(documentId, userId);
    const title = Object.hasOwn(input, "title") ? normalizeTitle(input.title) : existing.title;
    const content = Object.hasOwn(input, "content") ? sanitizeDocumentHtml(input.content) : existing.content;
    return await this.client.mutation(api.documents.updateDocument, {
      documentId,
      userId,
      title,
      content,
      updatedAt: now()
    });
  }

  async shareDocument(documentId, ownerId, recipientId) {
    return await this.client.mutation(api.documents.shareDocument, {
      id: `share_${randomUUID()}`,
      documentId,
      ownerId,
      recipientId,
      createdAt: now()
    });
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
      content: sanitizeDocumentHtml(textToHtml(input.content ?? ""))
    });
  }
}

function normalizeName(name) {
  const clean = String(name ?? "").trim();
  if (clean.length < 2) {
    throw Object.assign(new Error("Name must be at least 2 characters."), { statusCode: 400 });
  }
  return clean.slice(0, 80);
}

function normalizeEmail(email) {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw Object.assign(new Error("Enter a valid email address."), { statusCode: 400 });
  }
  return clean;
}
