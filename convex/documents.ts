import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

const userValidator = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  passwordHash: v.string(),
});

const documentInputValidator = v.object({
  id: v.string(),
  title: v.string(),
  content: v.string(),
  ownerId: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

type DbCtx = QueryCtx | MutationCtx;

async function requireUser(ctx: DbCtx, userId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_appId", (q) => q.eq("appId", userId))
    .unique();
  if (!user) {
    throw new Error("User not found.");
  }
  return user;
}

async function findUserByAppId(ctx: DbCtx, userId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_appId", (q) => q.eq("appId", userId))
    .unique();
}

async function findDocumentByAppId(ctx: DbCtx, documentId: string) {
  return await ctx.db
    .query("documents")
    .withIndex("by_appId", (q) => q.eq("appId", documentId))
    .unique();
}

async function requireDocument(ctx: DbCtx, documentId: string) {
  const document = await findDocumentByAppId(ctx, documentId);
  if (!document) {
    throw new Error("Document not found.");
  }
  return document;
}

async function requireAccess(ctx: DbCtx, document: Doc<"documents">, userId: string) {
  if (document.ownerId === userId) {
    return;
  }
  const share = await ctx.db
    .query("shares")
    .withIndex("by_documentId_and_userId", (q) =>
      q.eq("documentId", document.appId).eq("userId", userId),
    )
    .unique();
  if (!share) {
    throw new Error("You do not have access to this document.");
  }
}

async function shareCount(ctx: DbCtx, documentId: string) {
  const shares = await ctx.db
    .query("shares")
    .withIndex("by_documentId", (q) => q.eq("documentId", documentId))
    .take(100);
  return shares.length;
}

function publicUser(user: Doc<"users">) {
  return {
    id: user.appId,
    name: user.name,
    email: user.email,
  };
}

async function summarizeDocument(ctx: DbCtx, document: Doc<"documents">) {
  const owner = await findUserByAppId(ctx, document.ownerId);
  return {
    id: document.appId,
    title: document.title,
    ownerId: document.ownerId,
    ownerName: owner?.name ?? "Unknown owner",
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    shareCount: await shareCount(ctx, document.appId),
  };
}

export const seedUsers = mutation({
  args: {
    users: v.array(userValidator),
  },
  handler: async (ctx, args) => {
    for (const user of args.users) {
      const existing = await findUserByAppId(ctx, user.id);
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: user.name,
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash,
        });
      } else {
        await ctx.db.insert("users", {
          appId: user.id,
          name: user.name,
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash,
        });
      }
    }
    return null;
  },
});

export const createUser = mutation({
  args: userValidator,
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw new Error("Email is already registered.");
    }
    await ctx.db.insert("users", {
      appId: args.id,
      name: args.name,
      email,
      passwordHash: args.passwordHash,
    });
    return {
      id: args.id,
      name: args.name,
      email,
      passwordHash: args.passwordHash,
    };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").withIndex("by_email").take(200);
    return users.map(publicUser).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const findUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
    if (!user) {
      return null;
    }
    return {
      id: user.appId,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
    };
  },
});

export const listDocumentsForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const owned = await ctx.db
      .query("documents")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.userId))
      .order("desc")
      .take(100);
    const shares = await ctx.db
      .query("shares")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
    const sharedDocuments = [];
    for (const share of shares) {
      const document = await findDocumentByAppId(ctx, share.documentId);
      if (document && document.ownerId !== args.userId) {
        sharedDocuments.push(document);
      }
    }

    const ownedSummaries = [];
    for (const document of owned) {
      ownedSummaries.push(await summarizeDocument(ctx, document));
    }
    const sharedSummaries = [];
    for (const document of sharedDocuments.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      sharedSummaries.push(await summarizeDocument(ctx, document));
    }

    return {
      owned: ownedSummaries,
      shared: sharedSummaries,
    };
  },
});

export const getDocument = query({
  args: {
    documentId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const document = await requireDocument(ctx, args.documentId);
    await requireAccess(ctx, document, args.userId);
    const shares = await ctx.db
      .query("shares")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .take(100);
    const shareDetails = [];
    for (const share of shares) {
      const user = await findUserByAppId(ctx, share.userId);
      shareDetails.push({
        id: share.appId,
        documentId: share.documentId,
        userId: share.userId,
        role: share.role,
        createdAt: share.createdAt,
        user: user ? publicUser(user) : null,
      });
    }
    return {
      ...(await summarizeDocument(ctx, document)),
      shares: shareDetails,
    };
  },
});

export const createDocument = mutation({
  args: {
    document: documentInputValidator,
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.document.ownerId);
    await ctx.db.insert("documents", {
      appId: args.document.id,
      title: args.document.title,
      content: args.document.content,
      ownerId: args.document.ownerId,
      createdAt: args.document.createdAt,
      updatedAt: args.document.updatedAt,
    });
    return args.document;
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.string(),
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);
    const document = await requireDocument(ctx, args.documentId);
    await requireAccess(ctx, document, args.userId);
    await ctx.db.patch(document._id, {
      title: args.title,
      content: args.content,
      updatedAt: args.updatedAt,
    });
    return {
      id: document.appId,
      title: args.title,
      content: args.content,
      ownerId: document.ownerId,
      createdAt: document.createdAt,
      updatedAt: args.updatedAt,
    };
  },
});

export const shareDocument = mutation({
  args: {
    id: v.string(),
    documentId: v.string(),
    ownerId: v.string(),
    recipientId: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.ownerId);
    await requireUser(ctx, args.recipientId);
    const document = await requireDocument(ctx, args.documentId);
    if (document.ownerId !== args.ownerId) {
      throw new Error("Only the owner can share this document.");
    }
    if (args.ownerId === args.recipientId) {
      throw new Error("You cannot share a document with yourself.");
    }
    const existing = await ctx.db
      .query("shares")
      .withIndex("by_documentId_and_userId", (q) =>
        q.eq("documentId", args.documentId).eq("userId", args.recipientId),
      )
      .unique();
    if (existing) {
      return {
        id: existing.appId,
        documentId: existing.documentId,
        userId: existing.userId,
        role: existing.role,
        createdAt: existing.createdAt,
      };
    }
    await ctx.db.insert("shares", {
      appId: args.id,
      documentId: args.documentId,
      userId: args.recipientId,
      role: "editor",
      createdAt: args.createdAt,
    });
    return {
      id: args.id,
      documentId: args.documentId,
      userId: args.recipientId,
      role: "editor",
      createdAt: args.createdAt,
    };
  },
});
