import assert from "node:assert/strict";
import test from "node:test";

import {
  createSession,
  getSessionUserId,
  hashPassword,
  verifyPassword
} from "../src/auth.js";

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("review-password");

  assert.notEqual(hash, "review-password");
  assert.equal(await verifyPassword("review-password", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("session cookie stores user identity without exposing the raw user id", () => {
  const secret = "test-secret";
  const cookie = createSession("user_alex", secret);

  assert.match(cookie, /^session=/);
  assert.equal(cookie.includes("user_alex"), false);
  assert.equal(getSessionUserId(cookie, secret), "user_alex");
  assert.equal(getSessionUserId(cookie, "wrong-secret"), null);
});

