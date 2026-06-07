const state = {
  users: [],
  currentUser: null,
  currentDocumentId: localStorage.getItem("ajaia.currentDocumentId") || "",
  currentDocument: null,
  documents: { owned: [], shared: [] },
  dirty: false
};

const elements = {
  loginView: document.querySelector("#loginView"),
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  currentUserLabel: document.querySelector("#currentUserLabel"),
  logoutButton: document.querySelector("#logoutButton"),
  shareUserSelect: document.querySelector("#shareUserSelect"),
  ownedDocuments: document.querySelector("#ownedDocuments"),
  sharedDocuments: document.querySelector("#sharedDocuments"),
  ownedCount: document.querySelector("#ownedCount"),
  sharedCount: document.querySelector("#sharedCount"),
  createDocument: document.querySelector("#createDocument"),
  fileImport: document.querySelector("#fileImport"),
  titleInput: document.querySelector("#titleInput"),
  ownerLabel: document.querySelector("#ownerLabel"),
  saveStatus: document.querySelector("#saveStatus"),
  editor: document.querySelector("#editor"),
  saveDocument: document.querySelector("#saveDocument"),
  shareDocument: document.querySelector("#shareDocument"),
  shareList: document.querySelector("#shareList"),
  toast: document.querySelector("#toast")
};

const quill = new Quill("#editor", {
  modules: {
    toolbar: "#toolbar"
  },
  placeholder: "Create or select a document to start editing.",
  theme: "snow"
});

await boot();

async function boot() {
  bindEvents();
  await loadSession();
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", login);
  elements.logoutButton.addEventListener("click", logout);
  elements.createDocument.addEventListener("click", createDocument);
  elements.fileImport.addEventListener("change", importFile);
  elements.saveDocument.addEventListener("click", saveDocument);
  elements.shareDocument.addEventListener("click", shareDocument);
  elements.titleInput.addEventListener("input", markDirty);
  quill.on("text-change", markDirty);
}

async function loadSession() {
  const data = await api("/api/session");
  state.currentUser = data.user;

  if (!state.currentUser) {
    showLogin();
    return;
  }

  showApp();
  await loadUsers();
  await loadDocuments();

  if (state.currentDocumentId) {
    await openDocument(state.currentDocumentId);
  } else {
    renderEditorEmpty();
  }
}

async function login(event) {
  event.preventDefault();
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: {
        email: elements.emailInput.value,
        password: elements.passwordInput.value
      }
    });
    state.currentUser = data.user;
    state.currentDocumentId = "";
    localStorage.removeItem("ajaia.currentDocumentId");
    showToast("Signed in.");
    showApp();
    await loadUsers();
    await loadDocuments();
    renderEditorEmpty();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function logout() {
  await api("/api/logout", { method: "POST" });
  state.currentUser = null;
  state.currentDocument = null;
  state.currentDocumentId = "";
  localStorage.removeItem("ajaia.currentDocumentId");
  showLogin();
}

function showLogin() {
  elements.loginView.hidden = false;
}

function showApp() {
  elements.loginView.hidden = true;
  elements.currentUserLabel.textContent = `${state.currentUser.name} (${state.currentUser.email})`;
}

async function loadUsers() {
  const data = await api("/api/users");
  state.users = data.users;
  renderShareUserOptions();
}

async function loadDocuments() {
  state.documents = await api("/api/documents");
  renderDocumentLists();
}

function renderDocumentLists() {
  elements.ownedCount.textContent = state.documents.owned.length;
  elements.sharedCount.textContent = state.documents.shared.length;
  elements.ownedDocuments.innerHTML = renderDocumentCards(state.documents.owned, "Owner");
  elements.sharedDocuments.innerHTML = renderDocumentCards(state.documents.shared, "Shared");

  document.querySelectorAll("[data-document-id]").forEach((button) => {
    button.addEventListener("click", () => openDocument(button.dataset.documentId));
  });
}

function renderDocumentCards(documents, label) {
  if (documents.length === 0) {
    return `<div class="empty">No ${label.toLowerCase()} documents.</div>`;
  }

  return documents
    .map((document) => `
      <button class="document-card ${document.id === state.currentDocumentId ? "active" : ""}" data-document-id="${document.id}">
        <strong>${escapeHtml(document.title)}</strong>
        <span>${label} - ${escapeHtml(document.ownerName)} - ${formatDate(document.updatedAt)}</span>
      </button>
    `)
    .join("");
}

async function openDocument(documentId) {
  try {
    const data = await api(`/api/documents/${encodeURIComponent(documentId)}`);
    state.currentDocument = data.document;
    state.currentDocumentId = data.document.id;
    localStorage.setItem("ajaia.currentDocumentId", state.currentDocumentId);

    elements.titleInput.value = data.document.title;
    quill.root.innerHTML = data.document.content;
    elements.ownerLabel.textContent = `Owner: ${data.document.ownerName}`;
    state.dirty = false;
    setStatus("Saved");
    renderSharePanel();
    renderDocumentLists();
  } catch (error) {
    showToast(error.message, true);
    renderEditorEmpty();
  }
}

async function createDocument() {
  const data = await api("/api/documents", {
    method: "POST",
    body: {
      title: "Untitled document",
      content: "<h1>Untitled document</h1><p>Start writing...</p>"
    }
  });
  await loadDocuments();
  await openDocument(data.document.id);
  showToast("Document created.");
}

async function importFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!file.name.match(/\.(txt|md)$/i)) {
    showToast("Only .txt and .md files are supported.", true);
    return;
  }

  const text = await file.text();
  const data = await api("/api/import", {
    method: "POST",
    body: {
      fileName: file.name,
      content: text
    }
  });

  await loadDocuments();
  await openDocument(data.document.id);
  showToast("File imported as a new document.");
}

async function saveDocument() {
  if (!state.currentDocumentId) {
    showToast("Create or select a document before saving.", true);
    return;
  }

  setStatus("Saving...");
  const data = await api(`/api/documents/${encodeURIComponent(state.currentDocumentId)}`, {
    method: "PUT",
    body: {
      title: elements.titleInput.value,
      content: quill.root.innerHTML
    }
  });

  state.currentDocument = {
    ...state.currentDocument,
    ...data.document
  };
  state.dirty = false;
  setStatus("Saved");
  await loadDocuments();
  renderSharePanel();
  showToast("Document saved.");
}

async function shareDocument() {
  if (!state.currentDocument) {
    showToast("Select a document before sharing.", true);
    return;
  }

  if (state.currentDocument.ownerId !== state.currentUser.id) {
    showToast("Only the owner can share this document.", true);
    return;
  }

  const recipientId = elements.shareUserSelect.value;
  if (!recipientId) {
    showToast("No available user selected.", true);
    return;
  }

  await api(`/api/documents/${encodeURIComponent(state.currentDocument.id)}/shares`, {
    method: "POST",
    body: {
      recipientId
    }
  });

  await openDocument(state.currentDocument.id);
  showToast("Document shared.");
}

function renderSharePanel() {
  renderShareUserOptions();

  if (!state.currentDocument) {
    elements.shareDocument.disabled = true;
    elements.shareList.innerHTML = `<div class="empty">No document selected.</div>`;
    return;
  }

  const isOwner = state.currentDocument.ownerId === state.currentUser.id;
  elements.shareDocument.disabled = !isOwner;
  elements.shareUserSelect.disabled = !isOwner;

  const sharedUsers = state.currentDocument.shares ?? [];
  if (sharedUsers.length === 0) {
    elements.shareList.innerHTML = `<div class="empty">Not shared yet.</div>`;
    return;
  }

  elements.shareList.innerHTML = sharedUsers
    .map((share) => `
      <div class="share-person">
        <strong>${escapeHtml(share.user?.name || "Unknown user")}</strong>
        ${escapeHtml(share.user?.email || "")} - ${escapeHtml(share.role)}
      </div>
    `)
    .join("");
}

function renderShareUserOptions() {
  const currentShares = new Set((state.currentDocument?.shares ?? []).map((share) => share.userId));
  const currentUserId = state.currentUser?.id;
  const options = state.users
    .filter((user) => user.id !== currentUserId && !currentShares.has(user.id))
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`)
    .join("");

  elements.shareUserSelect.innerHTML = options || `<option value="">No available users</option>`;
  elements.shareDocument.disabled = !options;
}

function renderEditorEmpty() {
  state.currentDocument = null;
  state.currentDocumentId = "";
  elements.titleInput.value = "Select or create a document";
  quill.root.innerHTML = "<h1>Ajaia Docs Lite</h1><p>Create or select a document to start editing.</p>";
  elements.ownerLabel.textContent = "No document selected";
  setStatus("Idle");
  renderSharePanel();
  renderDocumentLists();
}

function markDirty() {
  if (!state.currentDocumentId) {
    return;
  }
  state.dirty = true;
  setStatus("Unsaved changes");
}

function setStatus(text) {
  elements.saveStatus.textContent = text;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.hidden = false;
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

