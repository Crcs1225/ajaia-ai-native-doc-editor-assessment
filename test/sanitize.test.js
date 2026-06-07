import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeDocumentHtml } from "../src/sanitize.js";

test("sanitizer removes scripts and unsafe attributes while keeping editor formatting", () => {
  const input = `
    <h1 onclick="alert(1)">Roadmap</h1>
    <p>Hello <strong>team</strong><script>alert(1)</script></p>
    <a href="javascript:alert(1)">bad link</a>
    <ul><li><em>One</em></li></ul>
  `;

  const clean = sanitizeDocumentHtml(input);

  assert.equal(clean.includes("<script"), false);
  assert.equal(clean.includes("onclick"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.match(clean, /<h1>Roadmap<\/h1>/);
  assert.match(clean, /<strong>team<\/strong>/);
  assert.match(clean, /<ul><li><em>One<\/em><\/li><\/ul>/);
});

