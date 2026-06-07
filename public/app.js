const state = {
  users: [],
  currentUser: null,
  currentDocumentId: localStorage.getItem("ajaia.currentDocumentId") || "",
  currentDocument: null,
  documents: { owned: [], shared: [] },
  filter: "all",
  dirty: false
};

const elements = {
  loginView: document.querySelector("#loginView"),
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  profileCards: document.querySelectorAll(".profile-card"),
  appShell: document.querySelector("#appShell"),
  dashboardView: document.querySelector("#dashboardView"),
  dashboardTopbar: document.querySelector("#dashboardTopbar"),
  editorView: document.querySelector("#editorView"),
  dashboardTitle: document.querySelector("#dashboardTitle"),
  documentGrid: document.querySelector("#documentGrid"),
  emptyState: document.querySelector("#emptyState"),
  emptyCreateDocument: document.querySelector("#emptyCreateDocument"),
  searchInput: document.querySelector("#searchInput"),
  currentUserLabel: document.querySelector("#currentUserLabel"),
  currentUserAvatar: document.querySelector("#currentUserAvatar"),
  logoutButton: document.querySelector("#logoutButton"),
  navItems: document.querySelectorAll(".nav-item"),
  shareUserSelect: document.querySelector("#shareUserSelect"),
  createDocument: document.querySelector("#createDocument"),
  fileImport: document.querySelector("#fileImport"),
  titleInput: document.querySelector("#titleInput"),
  ownerLabel: document.querySelector("#ownerLabel"),
  ownerAvatar: document.querySelector("#ownerAvatar"),
  saveStatus: document.querySelector("#saveStatus"),
  editor: document.querySelector("#editor"),
  saveDocument: document.querySelector("#saveDocument"),
  topSaveButton: document.querySelector("#topSaveButton"),
  shareDocument: document.querySelector("#shareDocument"),
  topShareButton: document.querySelector("#topShareButton"),
  backToDashboard: document.querySelector("#backToDashboard"),
  shareList: document.querySelector("#shareList"),
  lastSavedLabel: document.querySelector("#lastSavedLabel"),
  createdLabel: document.querySelector("#createdLabel"),
  docIdLabel: document.querySelector("#docIdLabel"),
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
  elements.profileCards.forEach((card) => {
    card.addEventListener("click", () => {
      elements.emailInput.value = card.dataset.email;
      elements.passwordInput.value = "password123";
      elements.loginForm.requestSubmit();
    });
  });
  elements.logoutButton.addEventListener("click", logout);
  elements.createDocument.addEventListener("click", createDocument);
  elements.emptyCreateDocument.addEventListener("click", createDocument);
  elements.fileImport.addEventListener("change", importFile);
  elements.saveDocument.addEventListener("click", saveDocument);
  elements.topSaveButton.addEventListener("click", saveDocument);
  elements.shareDocument.addEventListener("click", shareDocument);
  elements.topShareButton.addEventListener("click", () => {
    if (state.currentDocumentId) {
      elements.shareUserSelect.focus();
    } else {
      showToast("Open a document before sharing.", true);
    }
  });
  elements.backToDashboard.addEventListener("click", showDashboard);
  elements.titleInput.addEventListener("input", markDirty);
  elements.searchInput.addEventListener("input", renderDocumentGrid);
  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      state.filter = item.dataset.filter;
      elements.navItems.forEach((navItem) => navItem.classList.toggle("active", navItem === item));
      renderDocumentGrid();
    });
  });
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
    showDashboard();
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
    showDashboard();
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
  elements.appShell.hidden = true;
}

function showApp() {
  elements.loginView.hidden = true;
  elements.appShell.hidden = false;
  elements.currentUserLabel.textContent = `${state.currentUser.name} (${state.currentUser.email})`;
  elements.currentUserAvatar.textContent = initials(state.currentUser.name);
}

function showDashboard() {
  elements.dashboardTopbar.hidden = false;
  elements.dashboardView.hidden = false;
  elements.editorView.hidden = true;
  renderDocumentGrid();
}

function showEditor() {
  elements.dashboardTopbar.hidden = true;
  elements.dashboardView.hidden = true;
  elements.editorView.hidden = false;
}

async function loadUsers() {
  const data = await api("/api/users");
  state.users = data.users;
  renderShareUserOptions();
}

async function loadDocuments() {
  state.documents = await api("/api/documents");
  renderDocumentGrid();
}

function renderDocumentGrid() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const titleByFilter = {
    all: "All Documents",
    owned: "Owned by Me",
    shared: "Shared with Me"
  };
  elements.dashboardTitle.textContent = titleByFilter[state.filter] || "All Documents";

  const allDocuments = [
    ...state.documents.owned.map((document) => ({ ...document, bucket: "owned" })),
    ...state.documents.shared.map((document) => ({ ...document, bucket: "shared" }))
  ];

  const visible = allDocuments.filter((document) => {
    const matchesFilter = state.filter === "all" || document.bucket === state.filter;
    const matchesQuery = !query || document.title.toLowerCase().includes(query) || document.ownerName.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  elements.documentGrid.hidden = visible.length === 0;
  elements.emptyState.hidden = visible.length > 0;
  elements.documentGrid.innerHTML = visible.map(renderDocumentCard).join("");

  document.querySelectorAll("[data-document-id]").forEach((button) => {
    button.addEventListener("click", () => openDocument(button.dataset.documentId));
  });
}

function renderDocumentCard(document) {
  const isShared = document.bucket === "shared";
  const editedLabel = document.updatedAt ? `Last edited ${relativeDate(document.updatedAt)}` : "Not edited yet";
  const ownerInitials = initials(document.ownerName);
  const icon = isShared ? "◎" : document.shareCount > 0 ? "✦" : "□";

  return `
    <button class="document-card ${isShared ? "shared" : ""}" type="button" data-document-id="${document.id}">
      <div class="doc-preview">
        <span>${icon}</span>
        <span class="doc-actions" aria-hidden="true">
          <span>✎</span>
          <span>↗</span>
        </span>
      </div>
      <div class="doc-body">
        <div class="doc-title-row">
          <strong>${escapeHtml(document.title)}</strong>
          ${isShared ? `<span class="badge">Shared</span>` : document.shareCount > 0 ? `<span class="badge">Team</span>` : ""}
        </div>
        <p class="doc-meta">${escapeHtml(editedLabel)}</p>
        <div class="doc-footer">
          <span class="doc-owner">
            <span class="avatar mini">${escapeHtml(ownerInitials)}</span>
            ${escapeHtml(document.ownerName)}
          </span>
          ${isShared || document.shareCount > 0 ? `<span aria-label="Shared document">◎</span>` : ""}
        </div>
      </div>
    </button>
  `;
}

async function openDocument(documentId) {
  try {
    const data = await api(`/api/documents/${encodeURIComponent(documentId)}`);
    state.currentDocument = data.document;
    state.currentDocumentId = data.document.id;
    localStorage.setItem("ajaia.currentDocumentId", state.currentDocumentId);

    elements.titleInput.value = data.document.title;
    quill.root.innerHTML = data.document.content;
    elements.ownerLabel.textContent = data.document.ownerName;
    elements.ownerAvatar.textContent = initials(data.document.ownerName);
    elements.lastSavedLabel.textContent = data.document.updatedAt ? relativeDate(data.document.updatedAt) : "Not saved";
    elements.createdLabel.textContent = data.document.createdAt ? shortDate(data.document.createdAt) : "-";
    elements.docIdLabel.textContent = data.document.id.slice(0, 12);
    state.dirty = false;
    setStatus("Saved");
    renderSharePanel();
    renderDocumentGrid();
    showEditor();
  } catch (error) {
    showToast(error.message, true);
    renderEditorEmpty();
    showDashboard();
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
  elements.lastSavedLabel.textContent = relativeDate(data.document.updatedAt);
  state.dirty = false;
  setStatus("Saved");
  await loadDocuments();
  renderSharePanel();
  showToast("Document saved.");
}

async function shareDocument() {
  if (!state.currentDocument) {
    showToast("Open a document before sharing.", true);
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
  await loadDocuments();
  showToast("Document shared.");
}

function renderSharePanel() {
  renderShareUserOptions();

  if (!state.currentDocument) {
    elements.shareDocument.disabled = true;
    elements.topShareButton.disabled = true;
    elements.shareList.innerHTML = `<div class="empty">No document selected.</div>`;
    return;
  }

  const isOwner = state.currentDocument.ownerId === state.currentUser.id;
  elements.shareDocument.disabled = !isOwner;
  elements.topShareButton.disabled = !isOwner;
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
  elements.topShareButton.disabled = !options;
}

function renderEditorEmpty() {
  state.currentDocument = null;
  state.currentDocumentId = "";
  elements.titleInput.value = "Select or create a document";
  quill.root.innerHTML = "<h1>Ajaia Docs</h1><p>Create or select a document to start editing.</p>";
  elements.ownerLabel.textContent = "No document selected";
  elements.ownerAvatar.textContent = "--";
  elements.lastSavedLabel.textContent = "Not saved";
  elements.createdLabel.textContent = "-";
  elements.docIdLabel.textContent = "-";
  setStatus("Idle");
  renderSharePanel();
  renderDocumentGrid();
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

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts[0]?.[0] || "-") + (parts[1]?.[0] || "");
}

function shortDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function relativeDate(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate(value);
}
