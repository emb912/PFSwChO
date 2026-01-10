function renderLoggedOutHeader(onShowLogin, onShowRegister) {
  const headerRight = document.getElementById("headerRight");
  headerRight.innerHTML = `
    <button id="btnLogin" class="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
      Logowanie
    </button>
    <button id="btnRegister" class="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800">
      Rejestracja
    </button>
  `;

  document.getElementById("btnLogin").addEventListener("click", onShowLogin);
  document
    .getElementById("btnRegister")
    .addEventListener("click", onShowRegister);
}

let __authMode = "login"; // "login" | "register"

function renderAuthPanel(mode, { onLogin, onRegister }) {
  __authMode = mode;

  const main = document.getElementById("mainContent");
  main.innerHTML = `
    <div class="max-w-lg mx-auto">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div class="flex items-center justify-center gap-2">
          <button id="tabLogin" class="text-sm px-3 py-1 rounded-xl border border-slate-200 hover:bg-slate-50">
            Logowanie
          </button>
          <button id="tabRegister" class="text-sm px-3 py-1 rounded-xl border border-slate-200 hover:bg-slate-50">
            Rejestracja
          </button>
        </div>

        <h2 id="authTitle" class="text-lg font-semibold mt-4">Zaloguj się</h2>
        <p id="authHint" class="text-sm text-slate-500 mt-1">Aby zobaczyć swoje notatki.</p>

        <form id="authForm" class="mt-5 space-y-3">
          <div>
            <label class="text-sm text-slate-700">Nazwa użytkownika</label>
            <input id="authUsername" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                autocomplete="username" />
          </div>

          <div>
            <label class="text-sm text-slate-700">Hasło</label>
            <input id="authPassword" type="password"
                   class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                   placeholder="min. 6 znaków" autocomplete="current-password" />
          </div>

          <div id="authError" class="hidden text-sm text-red-600"></div>

          <button id="authSubmitBtn" class="w-full rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800">
            Zaloguj
          </button>

        </form>
      </div>
    </div>
  `;

  function setMode(newMode) {
    __authMode = newMode;
    syncUI();
    clearError();
  }

  function syncUI() {
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const title = document.getElementById("authTitle");
    const hint = document.getElementById("authHint");
    const submit = document.getElementById("authSubmitBtn");
    const pass = document.getElementById("authPassword");

    const activeClass = "bg-slate-900 text-white border-slate-900";
    const inactiveClass =
      "bg-white text-slate-900 border-slate-200 hover:bg-slate-50";

    if (__authMode === "login") {
      tabLogin.className = `text-sm px-3 py-1 rounded-xl border ${activeClass}`;
      tabRegister.className = `text-sm px-3 py-1 rounded-xl border ${inactiveClass}`;
      title.textContent = "Zaloguj się";
      hint.textContent = "Aby zobaczyć swoje notatki.";
      submit.textContent = "Zaloguj";
      pass.autocomplete = "current-password";
    } else {
      tabLogin.className = `text-sm px-3 py-1 rounded-xl border ${inactiveClass}`;
      tabRegister.className = `text-sm px-3 py-1 rounded-xl border ${activeClass}`;
      title.textContent = "Utwórz konto";
      hint.textContent = "Rejestracja zajmuje tylko chwilę.";
      submit.textContent = "Zarejestruj";
      pass.autocomplete = "new-password";
    }
  }

  function showError(msg) {
    const box = document.getElementById("authError");
    box.textContent = msg;
    box.classList.remove("hidden");
  }

  function clearError() {
    const box = document.getElementById("authError");
    box.textContent = "";
    box.classList.add("hidden");
  }

  // init UI
  syncUI();

  document
    .getElementById("tabLogin")
    .addEventListener("click", () => setMode("login"));
  document
    .getElementById("tabRegister")
    .addEventListener("click", () => setMode("register"));

  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const username = document.getElementById("authUsername").value.trim();
    const password = document.getElementById("authPassword").value;

    if (!username || username.length < 3)
      return showError("Username min. 3 znaki");
    if (!password || password.length < 6)
      return showError("Hasło min. 6 znaków");

    try {
      if (__authMode === "login") await onLogin({ username, password });
      else await onRegister({ username, password });
    } catch (err) {
      showError(err.message || "Błąd");
    }
  });
}
