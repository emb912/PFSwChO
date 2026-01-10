function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

function setSubtitle(text) {
  document.getElementById("subtitle").textContent = text;
}

let state = {
  search: "",
  pinnedOnly: false,
  notes: [],
};

async function showLoggedOut(mode = "login") {
  setSubtitle("Zaloguj się, aby zobaczyć swoje notatki");

  renderLoggedOutHeader(
    () => showLoggedOut("login"),
    () => showLoggedOut("register")
  );

  renderAuthPanel(mode, {
    onLogin: async ({ username, password }) => {
      const data = await apiFetch(ENDPOINTS.login, {
        method: "POST",
        body: { username, password },
      });
      setAuth(data.token, data.username);
      showToast("Zalogowano ✅");
      await showLoggedIn();
    },
    onRegister: async ({ username, password }) => {
      const data = await apiFetch(ENDPOINTS.register, {
        method: "POST",
        body: { username, password },
      });
      setAuth(data.token, data.username);
      showToast("Utworzono konto ✅");
      await showLoggedIn();
    },
  });
}

async function showLoggedIn() {
  const { username } = getAuth();
  setSubtitle("Twoje notatki (widoczne tylko dla Ciebie)");

  renderLoggedInHeader({
    username,
    onLogout: async () => {
      clearAuth();
      state = { search: "", pinnedOnly: false, notes: [] };
      showToast("Wylogowano");
      await showLoggedOut("login");
    },
    onSearch: async (q) => {
      state.search = q;
      await loadNotes();
    },
    onNewNote: () => {
      if (window.__openNoteModal) window.__openNoteModal();
    },
  });

  renderNotesShell();
  bindNotesControls({
    onRefresh: () => loadNotes(),
    onPinnedOnlyChange: async (val) => {
      state.pinnedOnly = val;
      await loadNotes();
    },
    onOpenModal: openNoteModal,
    onCloseModal: closeNoteModal,
    onSave: async () => {
      clearNoteError();
      const payload = readNewNoteForm();
      if (!payload.title) return showNoteError("Podaj tytuł");

      const modalState = window.__noteModalState || {
        mode: "create",
        noteId: null,
      };
      const isEdit = modalState.mode === "edit" && modalState.noteId != null;

      try {
        if (isEdit) {
          await apiFetch(`${ENDPOINTS.notes}${modalState.noteId}/`, {
            method: "PATCH",
            body: payload,
            needsAuth: true,
          });
          showToast("Zapisano zmiany ✨");
        } else {
          await apiFetch(ENDPOINTS.notes, {
            method: "POST",
            body: payload,
            needsAuth: true,
          });
          showToast("Zapisano ✨");
        }

        closeNoteModal();
        await loadNotes();
      } catch (e) {
        showNoteError(e.message || "Błąd zapisu");
      }
    },
  });

  await loadNotes();
}

async function loadNotes() {
  try {
    const q = state.search.trim();
    const url = q
      ? `${ENDPOINTS.notes}?search=${encodeURIComponent(q)}`
      : ENDPOINTS.notes;

    let notes = await apiFetch(url, { needsAuth: true });

    if (state.pinnedOnly) {
      notes = notes.filter((n) => n.pinned);
    }

    state.notes = notes;

    renderNotesList(notes, {
      onDelete: async (id) => {
        try {
          await apiFetch(`${ENDPOINTS.notes}${id}/`, {
            method: "DELETE",
            needsAuth: true,
          });
          showToast("Usunięto 🗑");
          await loadNotes();
        } catch (e) {
          showToast(e.message || "Błąd usuwania");
        }
      },
      onTogglePin: async (id) => {
        try {
          const note = await apiFetch(`${ENDPOINTS.notes}${id}/`, {
            needsAuth: true,
          });
          await apiFetch(`${ENDPOINTS.notes}${id}/`, {
            method: "PATCH",
            body: { pinned: !note.pinned },
            needsAuth: true,
          });
          showToast(note.pinned ? "Odpięto" : "Przypięto");
          await loadNotes();
        } catch (e) {
          showToast(e.message || "Błąd przypinania");
        }
      },
      onEdit: async (id) => {
        const note = state.notes.find((n) => String(n.id) === String(id));
        if (!note) return;

        // otwórz modal w trybie edycji
        openNoteModal();
        setNoteModalMode({ mode: "edit", noteId: note.id });
        fillNoteForm(note);
      },
    });
  } catch (e) {
    // jeśli token nieważny / brak autoryzacji
    const msg = e.message || "";
    if (
      msg.toLowerCase().includes("credentials") ||
      msg.includes("401") ||
      msg.includes("403")
    ) {
      clearAuth();
      showToast("Sesja wygasła — zaloguj się ponownie");
      await showLoggedOut("login");
      return;
    }
    showToast(msg || "Błąd pobierania");
  }
}

// Start app
(async function init() {
  const { token } = getAuth();
  if (token) await showLoggedIn();
  else await showLoggedOut("login");
})();
