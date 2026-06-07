import pg from "pg";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { sanitizeDocumentHtml } from "./sanitize.js";
import { textToHtml } from "./documentStore.js";
import { seedUsers } from "./seedData.js";

const { Pool } = pg;
const now = () => new Date().toISOString();
const defaultContent = "<h1>Untitled document</h1><p>Start writing...</p>";

function normalizeTitle(title) {
  const clean = String(title ?? "").trim();
  return clean || "Untitled document";
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

function summarize(row) {
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareCount: Number(row.share_count ?? 0)
  };
}

export class PostgresDocumentStore {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'editor',
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE(document_id, user_id)
      );
    `);

    for (const user of seedUsers) {
      await this.pool.query(
        `INSERT INTO users (id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash`,
        [user.id, user.name, user.email, user.passwordHash]
      );
    }
  }

  async listUsers() {
    const result = await this.pool.query("SELECT id, name, email FROM users ORDER BY name");
    return result.rows;
  }

  async findUserByEmail(email) {
    const result = await this.pool.query(
      "SELECT id, name, email, password_hash AS \"passwordHash\" FROM users WHERE lower(email) = lower($1)",
      [email]
    );
    return result.rows[0] ?? null;
  }

  async createUser(input = {}) {
    const user = {
      id: `user_${randomUUID()}`,
      name: normalizeName(input.name),
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash
    };
    try {
      const result = await this.pool.query(
        `INSERT INTO users (id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, password_hash AS "passwordHash"`,
        [user.id, user.name, user.email, user.passwordHash]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw Object.assign(new Error("Email is already registered."), { statusCode: 409 });
      }
      throw error;
    }
  }

  async listDocumentsForUser(userId) {
    await this.#requireUser(userId);
    const result = await this.pool.query(
      `SELECT d.*, u.name AS owner_name,
              (SELECT COUNT(*) FROM shares s WHERE s.document_id = d.id) AS share_count,
              CASE WHEN d.owner_id = $1 THEN 'owned' ELSE 'shared' END AS bucket
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = $1
       WHERE d.owner_id = $1 OR s.user_id = $1
       ORDER BY d.updated_at DESC`,
      [userId]
    );

    return {
      owned: result.rows.filter((row) => row.bucket === "owned").map(summarize),
      shared: result.rows.filter((row) => row.bucket === "shared").map(summarize)
    };
  }

  async getDocument(documentId, userId) {
    await this.#requireUser(userId);
    const document = await this.#requireDocument(documentId);
    await this.#requireAccess(document, userId);

    const shareResult = await this.pool.query(
      `SELECT s.id, s.document_id AS "documentId", s.user_id AS "userId", s.role, s.created_at AS "createdAt",
              u.id AS "user.id", u.name AS "user.name", u.email AS "user.email"
       FROM shares s
       JOIN users u ON u.id = s.user_id
       WHERE s.document_id = $1
       ORDER BY u.name`,
      [documentId]
    );

    const shares = shareResult.rows.map((row) => ({
      id: row.id,
      documentId: row.documentId,
      userId: row.userId,
      role: row.role,
      createdAt: row.createdAt,
      user: {
        id: row["user.id"],
        name: row["user.name"],
        email: row["user.email"]
      }
    }));

    return {
      ...summarize(document),
      shares
    };
  }

  async createDocument(ownerId, input = {}) {
    await this.#requireUser(ownerId);
    const timestamp = now();
    const document = {
      id: `doc_${randomUUID()}`,
      title: normalizeTitle(input.title),
      content: sanitizeDocumentHtml(input.content || defaultContent),
      ownerId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await this.pool.query(
      `INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [document.id, document.title, document.content, document.ownerId, document.createdAt, document.updatedAt]
    );

    return document;
  }

  async updateDocument(documentId, userId, input = {}) {
    await this.#requireUser(userId);
    const existing = await this.#requireDocument(documentId);
    await this.#requireAccess(existing, userId);
    const title = Object.hasOwn(input, "title") ? normalizeTitle(input.title) : existing.title;
    const content = Object.hasOwn(input, "content") ? sanitizeDocumentHtml(input.content) : existing.content;
    const updatedAt = now();

    const result = await this.pool.query(
      `UPDATE documents
       SET title = $1, content = $2, updated_at = $3
       WHERE id = $4
       RETURNING id, title, content, owner_id, created_at, updated_at`,
      [title, content, updatedAt, documentId]
    );

    return {
      id: result.rows[0].id,
      title: result.rows[0].title,
      content: result.rows[0].content,
      ownerId: result.rows[0].owner_id,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  }

  async shareDocument(documentId, ownerId, recipientId) {
    await this.#requireUser(ownerId);
    await this.#requireUser(recipientId);
    const document = await this.#requireDocument(documentId);

    if (document.owner_id !== ownerId) {
      throw Object.assign(new Error("Only the owner can share this document."), { statusCode: 403 });
    }

    if (ownerId === recipientId) {
      throw Object.assign(new Error("You cannot share a document with yourself."), { statusCode: 400 });
    }

    const result = await this.pool.query(
      `INSERT INTO shares (id, document_id, user_id, role, created_at)
       VALUES ($1, $2, $3, 'editor', $4)
       ON CONFLICT (document_id, user_id) DO UPDATE SET role = shares.role
       RETURNING id, document_id AS "documentId", user_id AS "userId", role, created_at AS "createdAt"`,
      [`share_${randomUUID()}`, documentId, recipientId, now()]
    );

    return result.rows[0];
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

  async #requireUser(userId) {
    const result = await this.pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (!result.rows[0]) {
      throw Object.assign(new Error("User not found."), { statusCode: 404 });
    }
  }

  async #requireDocument(documentId) {
    const result = await this.pool.query(
      `SELECT d.*, u.name AS owner_name,
              (SELECT COUNT(*) FROM shares s WHERE s.document_id = d.id) AS share_count
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.id = $1`,
      [documentId]
    );
    if (!result.rows[0]) {
      throw Object.assign(new Error("Document not found."), { statusCode: 404 });
    }
    return result.rows[0];
  }

  async #requireAccess(document, userId) {
    if (document.owner_id === userId) {
      return;
    }

    const result = await this.pool.query(
      "SELECT id FROM shares WHERE document_id = $1 AND user_id = $2",
      [document.id, userId]
    );

    if (!result.rows[0]) {
      throw Object.assign(new Error("You do not have access to this document."), { statusCode: 403 });
    }
  }
}
