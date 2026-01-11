function renderLoggedInHeader({ username, onLogout, onSearch, onNewNote }) {
  const headerRight = document.getElementById("headerRight");
  headerRight.innerHTML = `
    <input id="searchInput"
           class="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
           placeholder="Szukaj..." />

    <button id="newBtn"
            class="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800">
      + Nowa
    </button>

    <!-- User icon dropdown -->
    <div class="relative">
      <button id="userBtn"
              class="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
              aria-label="Użytkownik">
        <!-- simple user icon (inline SVG) -->
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </button>

      <div id="userMenu" class="hidden absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg p-2">
        <div class="px-3 py-2">
          <p class="text-xs text-slate-500">Zalogowano jako</p>
          <p class="text-sm font-semibold text-slate-900 break-words">${escapeHtml(
            username || ""
          )}</p>
        </div>
        <button id="logoutBtn"
                class="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
          Wyloguj
        </button>
      </div>
    </div>
  `;

  const search = document.getElementById("searchInput");
  search.addEventListener("input", () => onSearch(search.value));

  document.getElementById("newBtn").addEventListener("click", onNewNote);

  const userBtn = document.getElementById("userBtn");
  const menu = document.getElementById("userMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  function closeMenu() {
    menu.classList.add("hidden");
  }
  function toggleMenu() {
    menu.classList.toggle("hidden");
  }

  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  logoutBtn.addEventListener("click", () => {
    closeMenu();
    onLogout();
  });

  // click outside closes dropdown
  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("hidden")) closeMenu();
  });
}

function renderNotesShell() {
  const main = document.getElementById("mainContent");
  main.innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-4">
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input id="pinnedOnly" type="checkbox" class="rounded border-slate-300" />
        Pokaż tylko przypięte
      </label>
    </div>

    <div id="notesGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>

    <div id="emptyState" class="hidden mt-10 text-center text-slate-500">
      Brak notatek. Dodaj pierwszą! ✨
    </div>

    <!-- Modal (New Note) -->
    <div id="modal" class="hidden fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200">
        <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 id="noteModalTitle" class="font-semibold">Nowa notatka</h2>
          <button id="closeModal" class="text-slate-500 hover:text-slate-900">✕</button>
        </div>

        <div class="p-5 space-y-3">
          <input id="titleInput"
                 class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                 placeholder="Tytuł" />

          <textarea id="contentInput" rows="5"
                    class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Treść"></textarea>

          <input id="tagsInput"
                 class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                 placeholder="Tagi (np. study,work)" />

          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input id="pinnedInput" type="checkbox" class="rounded border-slate-300" />
            Przypnij
          </label>

          <div id="noteError" class="hidden text-sm text-red-600"></div>
        </div>

        <div class="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button id="cancelBtn" class="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
            Anuluj
          </button>
          <button id="saveBtn" class="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800">
            Zapisz
          </button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderNotesList(notes, { onDelete, onTogglePin, onEdit }) {
  const grid = document.getElementById("notesGrid");
  const empty = document.getElementById("emptyState");

  grid.innerHTML = notes
    .map((n) => {
      const tags = (n.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);
      const tagHtml = tags
        .map(
          (t) =>
            `<span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">${escapeHtml(
              t
            )}</span>`
        )
        .join("");

      const created = new Date(n.created_at).toLocaleString("pl-PL");

      return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-slate-900">${escapeHtml(n.title)}</h3>
            <p class="text-xs text-slate-500 mt-1">${created}</p>
          </div>
          <div class="flex items-center gap-2">
            <button data-pin="${
              n.id
            }" class="text-xs px-2 py-1 rounded-xl border border-slate-200 hover:bg-slate-50">
              ${n.pinned ? "📌 Odepnij" : "📌 Przypnij"}
            </button>
             <button data-edit="${
               n.id
             }" class="text-xs px-2 py-1 rounded-xl border border-slate-200 hover:bg-slate-50">
                ✏️ Edytuj
            </button>

            <button data-del="${
              n.id
            }" class="text-xs px-2 py-1 rounded-xl border border-slate-200 hover:bg-slate-50">
              🗑 Usuń
            </button>
          </div>
        </div>

        ${
          n.content
            ? `<p class="text-sm text-slate-700 mt-3 whitespace-pre-wrap">${escapeHtml(
                n.content
              )}</p>`
            : ""
        }
        ${
          tagHtml
            ? `<div class="flex flex-wrap gap-2 mt-3">${tagHtml}</div>`
            : ""
        }
      </div>
    `;
    })
    .join("");

  empty.classList.toggle("hidden", notes.length !== 0);

  document.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => onDelete(btn.getAttribute("data-del")));
  });
  document.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => onEdit(btn.getAttribute("data-edit")));
  });

  document.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", () =>
      onTogglePin(btn.getAttribute("data-pin"))
    );
  });
}

function bindNotesControls({
  onRefresh,
  onPinnedOnlyChange,
  onOpenModal,
  onCloseModal,
  onSave,
}) {
  document.getElementById("refreshBtn").addEventListener("click", onRefresh);

  const pinnedOnly = document.getElementById("pinnedOnly");
  pinnedOnly.addEventListener("change", () =>
    onPinnedOnlyChange(pinnedOnly.checked)
  );

  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const saveBtn = document.getElementById("saveBtn");

  function close() {
    onCloseModal();
  }
  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  saveBtn.addEventListener("click", onSave);

  // expose open to app.js
  window.__openNoteModal = onOpenModal;
}

function readNewNoteForm() {
  return {
    title: document.getElementById("titleInput").value.trim(),
    content: document.getElementById("contentInput").value.trim(),
    tags: document.getElementById("tagsInput").value.trim(),
    pinned: document.getElementById("pinnedInput").checked,
  };
}

function fillNoteForm(note) {
  document.getElementById("titleInput").value = note.title || "";
  document.getElementById("contentInput").value = note.content || "";
  document.getElementById("tagsInput").value = note.tags || "";
  document.getElementById("pinnedInput").checked = !!note.pinned;
}

function setNoteModalMode({ mode, noteId }) {
  // mode: "create" | "edit"
  const titleEl = document.getElementById("noteModalTitle");
  const saveBtn = document.getElementById("saveBtn");

  if (mode === "edit") {
    titleEl.textContent = "Edytuj notatkę";
    saveBtn.textContent = "Zapisz zmiany";
  } else {
    titleEl.textContent = "Nowa notatka";
    saveBtn.textContent = "Zapisz";
  }

  window.__noteModalState = { mode, noteId: noteId || null };
}

function showNoteError(msg) {
  const box = document.getElementById("noteError");
  box.textContent = msg;
  box.classList.remove("hidden");
}

function clearNoteError() {
  const box = document.getElementById("noteError");
  box.textContent = "";
  box.classList.add("hidden");
}

function openNoteModal() {
  setNoteModalMode({ mode: "create" });

  clearNoteError();
  document.getElementById("titleInput").value = "";
  document.getElementById("contentInput").value = "";
  document.getElementById("tagsInput").value = "";
  document.getElementById("pinnedInput").checked = false;
  document.getElementById("modal").classList.remove("hidden");
}

function closeNoteModal() {
  document.getElementById("modal").classList.add("hidden");
}
