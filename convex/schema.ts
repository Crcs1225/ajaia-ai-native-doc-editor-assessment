import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    appId: v.string(),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  })
    .index("by_appId", ["appId"])
    .index("by_email", ["email"]),
  documents: defineTable({
    appId: v.string(),
    title: v.string(),
    content: v.string(),
    ownerId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_appId", ["appId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_updatedAt", ["updatedAt"]),
  shares: defineTable({
    appId: v.string(),
    documentId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.string(),
  })
    .index("by_appId", ["appId"])
    .index("by_documentId", ["documentId"])
    .index("by_userId", ["userId"])
    .index("by_documentId_and_userId", ["documentId", "userId"]),
});
