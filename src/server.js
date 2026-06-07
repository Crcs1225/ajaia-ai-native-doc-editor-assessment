import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { clearSession, createSession, getSessionUserId, verifyPassword } from "./auth.js";
import { createStore } from "./storeFactory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 3000);
const store = createStore({ env: process.env, filePath: process.env.DB_FILE || path.join(process.cwd(), "data", "db.json") });
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

await store.init();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(request, response, url.pathname);
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Unexpected server error."
    });
  }
});

server.listen(port, () => {
  console.log(`Ajaia Docs Lite running at http://localhost:${port}`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/session") {
    const userId = getSessionUserId(request.headers.cookie, sessionSecret);
    if (!userId) {
      sendJson(response, 200, { user: null });
      return;
    }
    const users = await store.listUsers();
    sendJson(response, 200, { user: users.find((user) => user.id === userId) ?? null });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    const body = await readJson(request);
    const user = await store.findUserByEmail(body.email);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw Object.assign(new Error("Invalid email or password."), { statusCode: 401 });
    }
    response.setHeader("Set-Cookie", createSession(user.id, sessionSecret));
    sendJson(response, 200, {
      user: { id: user.id, name: user.name, email: user.email }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/logout") {
    response.setHeader("Set-Cookie", clearSession());
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/users") {
    requireSession(request);
    sendJson(response, 200, { users: await store.listUsers() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/documents") {
    const userId = requireSession(request);
    sendJson(response, 200, await store.listDocumentsForUser(userId));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/documents") {
    const userId = requireSession(request);
    const body = await readJson(request);
    const document = await store.createDocument(userId, {
      title: body.title,
      content: body.content
    });
    sendJson(response, 201, { document });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import") {
    const userId = requireSession(request);
    const body = await readJson(request);
    const document = await store.importDocument(userId, body);
    sendJson(response, 201, { document });
    return;
  }

  const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
  if (documentMatch && request.method === "GET") {
    const userId = requireSession(request);
    sendJson(response, 200, {
      document: await store.getDocument(documentMatch[1], userId)
    });
    return;
  }

  if (documentMatch && request.method === "PUT") {
    const userId = requireSession(request);
    const body = await readJson(request);
    const document = await store.updateDocument(documentMatch[1], userId, body);
    sendJson(response, 200, { document });
    return;
  }

  const shareMatch = url.pathname.match(/^\/api\/documents\/([^/]+)\/shares$/);
  if (shareMatch && request.method === "POST") {
    const userId = requireSession(request);
    const body = await readJson(request);
    const share = await store.shareDocument(shareMatch[1], userId, body.recipientId);
    sendJson(response, 201, { share });
    return;
  }

  sendJson(response, 404, { error: "Route not found." });
}

async function serveStatic(request, response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "Forbidden." });
    return;
  }

  try {
    await sendFile(response, filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      const index = await readFile(path.join(publicDir, "index.html"));
      response.writeHead(200, { "Content-Type": contentTypes[".html"] });
      response.end(index);
      return;
    }
    throw error;
  }
}

async function sendFile(response, filePath) {
  const content = await readFile(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
  });
  response.end(content);
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) {
      throw Object.assign(new Error("Request body is too large."), { statusCode: 413 });
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function requireSession(request) {
  const userId = getSessionUserId(request.headers.cookie, sessionSecret);
  if (!userId) {
    throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  }
  return userId;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
