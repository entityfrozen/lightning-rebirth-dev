/*
 * Celestial Boba shell.
 * Uses the original Boba page structure and stylesheet, but routes content to
 * Celestial's existing authenticated workspace rather than Boba's servers.
 */
(() => {
  const $ = selector => document.querySelector(selector);
  const dock = $("#dock"), frame = $("#celestialWorkspace");
  const views = [...document.querySelectorAll(".view")];
  const root = document.documentElement;
  const paths = {
    home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    browser: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    chat: '<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.7-.8L3 21l1.8-4.8A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/>',
    ai: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m20 12 1.5-1.3-1.7-3-2 .5-1.5-.9-.4-2.1h-3.4l-.4 2.1-1.5.9-2-.5-1.7 3L8 12l-1.5 1.3 1.7 3 2-.5 1.5.9.4 2.1h3.4l.4-2.1 1.5-.9 2 .5 1.7-3Z" transform="translate(-2 0)"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3.5-8 8-8s8 3 8 8"/>'
  };
  const sections = [
    ["home", "Home"],
    ["browser", "Browser"],
    ["apps", "Apps"],
    ["chat", "Chat"],
    ["ai", "Ask AI"],
    ["settings", "Settings"]
  ];
  const svg = id => '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[id] + '</svg>';
  const buttons = new Map();
  let current = "home";

  const buildButton = ([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dk";
    button.title = label;
    button.dataset.section = id;
    button.setAttribute("aria-label", label);
    button.innerHTML = '<span class="t">' + svg(id) + '</span><span class="tip">' + label + '</span>';
    button.addEventListener("click", () => navigate(id));
    buttons.set(id, button);
    dock.append(button);
  };
  sections.forEach(buildButton);
  const profile = document.createElement("button");
  profile.type = "button";
  profile.className = "dk is-profile";
  profile.title = "Account";
  profile.setAttribute("aria-label", "Account");
  profile.innerHTML = '<span class="t">' + svg("profile") + '</span><span class="tip">Account</span>';
  profile.addEventListener("click", () => navigate("settings"));
  dock.append(profile);

  function navigate(id) {
    if (!sections.some(x => x[0] === id)) id = "home";
    current = id;
    views.forEach(view => {
      const showing = view.dataset.view === (id === "home" ? "home" : "workspace");
      view.classList.toggle("on", showing);
      view.setAttribute("aria-hidden", showing ? "false" : "true");
    });
    buttons.forEach((button, key) => {
      const active = key === id;
      button.classList.toggle("on", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    if (id !== "home") {
      const nextHash = "#" + id;
      if (frame.contentWindow && frame.contentWindow.location.hash !== nextHash) {
        frame.contentWindow.location.hash = nextHash;
      }
    }
    try { history.replaceState(null, "", "#" + id); } catch {}
  }
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id && id !== current) navigate(id);
  });
  const initial = location.hash.slice(1);
  navigate(initial && initial !== "home" ? initial : "home");

  function paintClock() {
    const date = new Date();
    const time = date.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
    const parts = time.match(/^(.+?)(\s?(?:AM|PM))?$/i);
    $("#clockTime").innerHTML = (parts?.[1] || time) +
      '<i>' + (parts?.[2] || "").trim() + '</i>';
    const day = date.toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"});
    $("#clockDate").textContent = day;
  }
  paintClock();
  setInterval(paintClock, 30000);

  const search = $("#quickSearch");
  search.addEventListener("submit", event => {
    event.preventDefault();
    const q = search.elements.query.value.trim();
    if (!q) return;
    const url = /^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(q)
      ? (/^https?:\/\//i.test(q) ? q : "https://" + q)
      : "https://www.google.com/search?q=" + encodeURIComponent(q);
    navigate("browser");
    const send = () => frame.contentWindow?.postMessage({type:"celestial:boba-open",url},location.origin);
    if (frame.contentDocument?.readyState === "complete") send();
    else frame.addEventListener("load",send,{once:true});
  });
  document.querySelectorAll("[data-launch]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.launch));
  });
  // Boba's theme variables remain in charge; only the chosen palette is localized.
  const prefersDark = matchMedia("(prefers-color-scheme: dark)");
  let theme = "boba";
  try { theme = localStorage.getItem("celestial.boba.theme") || "boba"; } catch {}
  const applyTheme = () => {
    root.dataset.theme = theme === "system" ? (prefersDark.matches ? "dark" : "light")
      : ["dark","midnight","black","taro","brown"].includes(theme) ? "dark" : "light";
    root.dataset.palette = theme;
  };
  applyTheme();
  prefersDark.addEventListener("change",applyTheme);
})();