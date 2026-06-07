import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DocumentStore } from "./documentStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 3000);
const store = new DocumentStore(process.env.DB_FILE || path.join(process.cwd(), "data", "db.json"));

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

    await serveStatic(response, url.pathname);
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
  if (request.method === "GET" && url.pathname === "/api/users") {
    sendJson(response, 200, { users: await store.listUsers() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/documents") {
    const userId = requireQuery(url, "userId");
    sendJson(response, 200, await store.listDocumentsForUser(userId));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/documents") {
    const body = await readJson(request);
    const document = await store.createDocument(body.ownerId, {
      title: body.title,
      content: body.content
    });
    sendJson(response, 201, { document });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import") {
    const body = await readJson(request);
    const document = await store.importDocument(body.ownerId, body);
    sendJson(response, 201, { document });
    return;
  }

  const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
  if (documentMatch && request.method === "GET") {
    const userId = requireQuery(url, "userId");
    sendJson(response, 200, {
      document: await store.getDocument(documentMatch[1], userId)
    });
    return;
  }

  if (documentMatch && request.method === "PUT") {
    const body = await readJson(request);
    const document = await store.updateDocument(documentMatch[1], body.userId, body);
    sendJson(response, 200, { document });
    return;
  }

  const shareMatch = url.pathname.match(/^\/api\/documents\/([^/]+)\/shares$/);
  if (shareMatch && request.method === "POST") {
    const body = await readJson(request);
    const share = await store.shareDocument(shareMatch[1], body.ownerId, body.recipientId);
    sendJson(response, 201, { share });
    return;
  }

  sendJson(response, 404, { error: "Route not found." });
}

async function serveStatic(response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "Forbidden." });
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(content);
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

function requireQuery(url, key) {
  const value = url.searchParams.get(key);
  if (!value) {
    throw Object.assign(new Error(`${key} is required.`), { statusCode: 400 });
  }
  return value;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

