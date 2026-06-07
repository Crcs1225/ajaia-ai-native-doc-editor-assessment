import { createHmac, randomBytes, timingSafeEqual, pbkdf2 as pbkdf2Callback } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Callback);
const iterations = 120_000;
const keyLength = 32;
const digest = "sha256";

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await pbkdf2(String(password), salt, iterations, keyLength, digest);
  return `pbkdf2$${iterations}$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  const [scheme, rawIterations, salt, expected] = String(storedHash).split("$");
  if (scheme !== "pbkdf2" || !rawIterations || !salt || !expected) {
    return false;
  }

  const derived = await pbkdf2(String(password), salt, Number(rawIterations), keyLength, digest);
  const expectedBuffer = Buffer.from(expected, "base64url");

  if (expectedBuffer.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derived);
}

export function createSession(userId, secret, options = {}) {
  const expiresAt = options.expiresAt ?? Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  const signature = sign(payload, secret);
  return `session=${payload}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`;
}

export function clearSession() {
  return "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

export function getSessionUserId(cookieHeader = "", secret) {
  const cookies = parseCookies(cookieHeader);
  const token = cookies.session;
  if (!token || !secret) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== sign(payload, secret)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.userId || Number(parsed.expiresAt) < Date.now()) {
      return null;
    }
    return parsed.userId;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    String(cookieHeader)
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [key, ...value] = cookie.split("=");
        return [decodeURIComponent(key), decodeURIComponent(value.join("="))];
      })
  );
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

