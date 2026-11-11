import { $, $$, el, esc, ico, cup, store, clockText, debounce, segThumb, initials, failPage } from "./ui.js";
import { get, still, favicon, hostOf } from "./api.js";
import { md, diagrams } from "./md.js";
import { readPhoto, readDoc, isPhoto } from "./attach.js";
import { FAVS, DISGUISES, ACCENTS, THEMES, AVATARS } from "./data.js";
import { N } from "./icons.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runtime = (d) => {
  if (!d) return "";
  if (d.type === "tv") return d.seasons ? d.seasons + (d.seasons === 1 ? " season" : " seasons") : "";
  if (!d.runtime) return "";
  const h = Math.floor(d.runtime / 60), m = d.runtime % 60;
  return (h ? h + "h " : "") + m + "m";
};
const metaRow = (item, d) => {
  const parts = [];
  const score = (d && d.score) || item.score;
  if (score && score !== "0.0") parts.push('<span class="sc">' + ico("star") + score + "</span>");
  if (d && d.cert) parts.push('<span class="rt">' + esc(d.cert) + "</span>");
  if (item.year) parts.push("<span>" + item.year + "</span>");
  const rt = runtime(d);
  if (rt) parts.push("<span>" + rt + "</span>");
  const g = ((d && d.genres) || item.genres || []).slice(0, 2).join(", ");
  if (g) parts.push("<span>" + esc(g) + "</span>");
  return parts.join('<span class="dot"></span>');
};
const posterTile = (m, r, i, wide) =>
  '<button class="pst' + (wide ? " wide" : "") + '" data-r="' + r + '" data-i="' + i + '" data-id="' + m.id + '"><div class="im"><img class="fade" loading="lazy" decoding="async" alt="" src="' +
  (wide ? still(m.backdrop, "w500") : still(m.poster, "w342")) + '"></div><div class="nm">' + esc(m.name) + '</div><div class="sm">' +
  esc([m.year, (m.genres || [])[0]].filter(Boolean).join(" · ")) + "</div></button>";
function brick(root, wall, { want, phone, tile, square, done }) {
  const b = { items: [], cols: 0, placed: 0, row: 0 };
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      e.target.src = e.target.dataset.src;
    }
  }, { root, rootMargin: "300px 0px" });
  const size = () => {
    const w = wall.clientWidth || root.clientWidth - 40;
    const small = w < 520, gap = small ? 10 : 16, aim = small ? phone : want;
    const cols = Math.max(3, Math.floor((w + gap) / (aim + gap)));
    wall.style.setProperty("--pw", Math.min(Math.floor((w - (cols - 1) * gap) / cols), Math.round(aim * 1.2)) + "px");
    wall.style.setProperty("--gap", gap + "px");
    return cols;
  };
  const fill = () => {
    const last = wall.lastElementChild;
    if (last && last.childElementCount < +last.dataset.n) {
      b.placed -= last.childElementCount;
      b.row--;
      last.querySelectorAll("img").forEach((im) => io.unobserve(im));
      last.remove();
    }
    const from = wall.childElementCount;
    let html = "";
    while (b.placed < b.items.length) {
      const n = b.row % 2 ? b.cols : b.cols - 1;
      const part = b.items.slice(b.placed, b.placed + n);
      html += '<div class="mw-row" data-n="' + n + '">' + part.map((m, k) => tile(m, b.placed + k)).join("") + "</div>";
      b.placed += part.length;
      b.row++;
    }
    wall.insertAdjacentHTML("beforeend", html);
    for (const r of [...wall.children].slice(from)) r.querySelectorAll("img[data-src]").forEach((im) => io.observe(im));
    if (done) done();
  };
  b.layout = (force) => {
    const cols = size();
    if (!force && cols === b.cols) return;
    b.cols = cols;
    b.placed = 0;
    b.row = 0;
    io.disconnect();
    wall.innerHTML = "";
    fill();
  };
  b.reset = (items) => {
    b.items = items.slice();
    b.layout(true);
  };
  b.add = (items) => {
    b.items.push(...items);
    if (b.cols) fill();
    else b.layout(true);
  };
  b.skeleton = () => {
    const cols = size();
    b.cols = 0;
    io.disconnect();
    wall.innerHTML = [cols - 1, cols, cols - 1].map((n) => '<div class="mw-row">' + ('<div class="mw-p' + (square ? " sq" : "") + ' sk"></div>').repeat(n) + "</div>").join("");
  };
  new ResizeObserver(() => b.items.length && b.layout(false)).observe(wall);
  return b;
}

const QL_MAX = 12;
const qlLinks = () => {
  const v = store.get("links", null);
  return Array.isArray(v) ? v.filter((x) => Array.isArray(x) && typeof x[1] === "string") : FAVS.map(([n, , u]) => [n, u]);
};
const qlHtml = () => {
  const list = qlLinks();
  return list.map(([n, u], i) => {
    const d = hostOf(u);
    const own = FAVS.find((f) => f[1] === d);
    const img = own ? '<img class="fade" alt="" src="/img/sites/' + esc(d) + '.png">' : '<img class="fade" alt="" src="' + esc(favicon(d)) + '" data-fb="/api/icon?d=' + encodeURIComponent(d) + '">';
    return '<span class="qw"><button class="qi" data-open="' + esc(u) + '" aria-label="' + esc(n) + '" title="' + esc(n) + '">' + img + "</button>" +
      '<button class="qx" data-qx="' + i + '" aria-label="Remove ' + esc(n) + '">' + ico("x") + "</button></span>";
  }).join("") + (list.length < QL_MAX ? '<button class="qi qa" data-qa aria-label="Add" title="Add"><i>' + ico("plus") + "</i></button>" : "");
};
const qlKey = (u) => {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "") + x.search;
  } catch {
    return u;
  }
};
const linkOf = (raw) => {
  const s = String(raw || "").trim();
  if (!s || /\s/.test(s)) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
    return /^https?:$/.test(u.protocol) && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname) ? u.href : "";
  } catch {
    return "";
  }
};

const home = {
  flush: true,
  html: () =>
    '<div class="wv bare" data-wv>' +
    '<div class="wbar">' +
    '<button class="cb sm gh" data-wb="back" aria-label="Back">' + ico("back") + "</button>" +
    '<button class="cb sm gh" data-wb="fwd" aria-label="Forward">' + ico("fwd") + "</button>" +
    '<button class="cb sm gh" data-wb="reload" aria-label="Reload">' + ico("reload") + "</button>" +
    '<label class="addr">' + ico("lock") + '<input data-omni placeholder="Search or enter a link" aria-label="Address" autocomplete="off" spellcheck="false">' +
    '<span class="disp" data-disp></span><div class="sugg gl g3" data-sugg></div></label>' +
    '<span class="wsep"></span><div class="wtabs" data-tabs></div>' +
    '<button class="cb sm gh" data-wnew aria-label="New tab">' + ico("plus") + "</button>" +
    '<button class="cb sm gh" data-wmax aria-label="Full screen">' + ico("expand") + "</button></div>" +
    '<span class="wtip" data-tip></span>' +
    '<div class="page" data-page><div class="gload off" data-bl>' + cup() + '</div><div class="home" data-nt>' +
    '<div class="hwm"><img alt="" src="/img/boba-cup.svg"></div><div class="hcol"><div class="clock">' +
    '<div class="t num r"><span data-ck></span><i data-ap></i></div>' +
    '<div class="d r" style="--d:.03s" data-dt></div></div>' +
    '<label class="big-q r" style="--d:.06s">' + ico("search") + '<input data-bq placeholder="Search or enter a link" aria-label="Search or enter a link" autocomplete="off" spellcheck="false"></label>' +
    '<div class="ql r" style="--d:.09s" data-ql>' + qlHtml() + "</div>" +
    '<form class="qf" data-qf hidden><label class="big-q">' + ico("link") + '<input data-qin placeholder="Paste a link" aria-label="Paste a link" autocomplete="off" spellcheck="false" inputmode="url">' +
    '<button class="qok" type="submit" aria-label="Add">' + ico("plus") + "</button></label></form>" +
    "</div></div></div></div>",
  mount(root, ctx) {
    const st = (this.st = { tabs: [], active: 0, next: 1 });
    const wv = $("[data-wv]", root);
    const page = $("[data-page]", root);
    const nt = $("[data-nt]", root);
    const omni = $("[data-omni]", root);
    const sugg = $("[data-sugg]", root);
    const bl = $("[data-bl]", root);
    const addr = $(".addr", root);
    const disp = $("[data-disp]", root);
    const tabsEl = $("[data-tabs]", root);
    const tip = $("[data-tip]", root);
    const tab = () => st.tabs.find((t) => t.id === st.active);
    const clean = (s) => String(s || "").split(/\s+[-–·|]\s+/)[0].trim();
    const readable = (s) => {
      try {
        return decodeURI(s);
      } catch {
        return s;
      }
    };

    const sync = () => {
      const t = tab();
      bl.classList.toggle("off", !(t && t.busy));
    };
    const track = (t) => {
      let d = null;
      try {
        d = t.frame.contentDocument;
      } catch {}
      if (!d || d.URL === "about:blank") return;
      const read = () => {
        let real = "";
        try {
          real = ctx.engine.decode(t.frame.contentWindow.location.href);
        } catch {}
        const name = clean(d.title);
        const moved = !!real && real !== t.url;
        if (moved) {
          t.url = real;
          t.title = hostOf(real) || t.title;
          ctx.history.push({ kind: "site", key: "site:" + t.title, name: t.title, url: real });
        }
        if (moved || name !== t.name) {
          t.name = name;
          paint();
        }
      };
      read();
      if (t.doc === d) return;
      t.doc = d;
      const ttl = d.querySelector("title");
      if (ttl) new MutationObserver(read).observe(ttl, { childList: true, characterData: true, subtree: true });
    };
    const retry = (t) => {
      t.busy = true;
      sync();
      ctx.engine.recover().finally(() => {
        loading(t);
        try {
          t.frame.contentWindow.location.reload();
        } catch {
          t.frame.src = t.frame.src;
        }
      });
    };
    const loaded = (t) => {
      clearInterval(t.lt);
      let d = null;
      try {
        d = t.frame.contentDocument;
      } catch {}
      if (ctx.engine.failed(d)) {
        if (!t.again) {
          t.again = true;
          return retry(t);
        }
        failPage(t.frame, t.url, () => {
          t.again = false;
          retry(t);
        });
      } else if (d && d.URL !== "about:blank") t.again = false;
      t.busy = false;
      sync();
      track(t);
      try {
        t.frame.contentWindow.addEventListener("beforeunload", () => loading(t));
      } catch {}
    };
    const loading = (t) => {
      clearInterval(t.lt);
      t.busy = true;
      let old = null;
      try {
        old = t.frame.contentDocument;
      } catch {}
      const t0 = Date.now();
      t.lt = setInterval(() => {
        let d = null;
        try {
          d = t.frame.contentDocument;
        } catch {}
        const fresh = d && d !== old && d.URL !== "about:blank";
        const painted = fresh && (d.readyState !== "loading" || (d.body && d.body.childElementCount && [...d.querySelectorAll("head link[rel~=stylesheet]")].every((l) => l.sheet)));
        if (painted || Date.now() - t0 > 15000) loaded(t);
      }, 200);
      sync();
    };

    const paint = () => {
      wv.classList.toggle("bare", !st.tabs.length);
      if (!st.tabs.length && wv.classList.contains("max")) ctx.focusWeb(false);
      tabsEl.innerHTML = st.tabs.map((t) =>
        '<button class="wtab' + (t.id === st.active ? " on" : "") + '" data-tab="' + t.id + '" aria-label="' + esc(t.name || t.title) + '">' +
        (t.url ? '<img alt="" src="' + favicon(hostOf(t.url)) + '">' : '<span class="ph"></span>') +
        '<span class="x" data-close>' + ico("x") + "</span></button>").join("");
      const t = tab();
      nt.style.visibility = t && t.url ? "hidden" : "";
      st.tabs.forEach((x) => x.frame && (x.frame.style.display = x.id === st.active && x.url ? "block" : "none"));
      if (document.activeElement !== omni) omni.value = t && t.url ? t.url : "";
      show();
      sync();
    };
    const show = () => {
      const t = tab();
      let u = null;
      try {
        u = t && t.url && document.activeElement !== omni && omni.value === t.url ? new URL(t.url) : null;
      } catch {}
      addr.classList.toggle("show", !!u);
      if (u) disp.innerHTML = "<b>" + esc(u.host.replace(/^www\./, "")) + "</b><span>" + esc(readable((u.pathname + u.search + u.hash).replace(/\/$/, ""))) + "</span>";
    };
    const closeTab = (id) => {
      const i = st.tabs.findIndex((t) => t.id === id);
      if (i < 0) return;
      clearInterval(st.tabs[i].lt);
      if (st.tabs[i].frame) st.tabs[i].frame.remove();
      st.tabs.splice(i, 1);
      if (st.active === id && st.tabs.length) st.active = st.tabs[Math.min(i, st.tabs.length - 1)].id;
      tip.classList.remove("on");
      paint();
    };

    const newTab = () => {
      const t = { id: st.next++, title: "New tab", url: "", frame: null };
      st.tabs.push(t);
      st.active = t.id;
      paint();
      return t;
    };

    const navigate = async (input, fresh) => {
      const url = ctx.engine.normalise(input);
      if (!url) return;
      const t = fresh || !tab() ? newTab() : tab();
      t.title = hostOf(url) || "Page";
      loading(t);
      paint();
      let src = "";
      try {
        src = await ctx.engine.open(url, store.get("mode", "deep"));
      } catch {}
      if (!src) {
        t.title = t.url ? hostOf(t.url) || "Page" : "New tab";
        loaded(t);
        return paint();
      }
      t.url = url;
      const first = !t.frame;
      if (first) {
        t.frame = el('<iframe title="Page" allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation allow-popups-to-escape-sandbox allow-pointer-lock"></iframe>');
        t.frame.addEventListener("load", () => {
          try {
            if (t.frame.contentWindow.location.href === "about:blank") return;
          } catch {}
          loaded(t);
        });
        page.appendChild(t.frame);
      }
      loading(t);
      if (first) {
        try {
          t.frame.contentWindow.location.replace(src);
        } catch {
          t.frame.src = src;
        }
      } else {
        t.frame.src = src;
      }
      ctx.history.push({ kind: "site", key: "site:" + t.title, name: t.title, url });
      paint();
    };
    st.navigate = navigate;

    const hideSugg = () => sugg.classList.remove("on");
    const suggest = debounce(async () => {
      const q = omni.value.trim();
      if (q.length < 2) return hideSugg();
      try {
        const list = await get("/api/suggest?q=" + encodeURIComponent(q));
        if (!list.length || document.activeElement !== omni) return hideSugg();
        sugg.innerHTML = list.map((s) => "<div>" + ico("search") + "<span>" + esc(s) + "</span></div>").join("");
        sugg.classList.add("on");
      } catch {
        hideSugg();
      }
    }, 160);
    omni.addEventListener("input", suggest);
    let picked = false;
    const warm = () => ctx.engine.boot().catch(() => {});
    omni.addEventListener("focus", () => {
      addr.classList.remove("show");
      omni.select();
      picked = true;
      warm();
    });
    omni.addEventListener("mouseup", (e) => {
      if (picked) e.preventDefault();
      picked = false;
    });
    omni.addEventListener("blur", () => {
      picked = false;
      show();
      setTimeout(hideSugg, 140);
    });
    tabsEl.addEventListener("pointerover", (e) => {
      const b = e.target.closest("[data-tab]");
      const t = b && st.tabs.find((x) => x.id === +b.dataset.tab);
      if (!t) return;
      tip.textContent = t.name || t.title;
      const r = b.getBoundingClientRect(), w = wv.getBoundingClientRect(), half = tip.offsetWidth / 2;
      tip.style.left = Math.min(Math.max(r.left + r.width / 2 - w.left, half + 8), w.width - half - 8) + "px";
      tip.style.top = r.bottom - w.top + 8 + "px";
      tip.classList.add("on");
    });
    tabsEl.addEventListener("pointerleave", () => tip.classList.remove("on"));
    tabsEl.addEventListener("mousedown", (e) => e.button === 1 && e.preventDefault());
    tabsEl.addEventListener("auxclick", (e) => {
      const b = e.button === 1 && e.target.closest("[data-tab]");
      if (b) closeTab(+b.dataset.tab);
    });
    omni.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        hideSugg();
        omni.blur();
        navigate(omni.value);
      }
      if (e.key === "Escape") hideSugg();
    });
    sugg.addEventListener("mousedown", (e) => {
      const d = e.target.closest("div");
      if (!d) return;
      e.preventDefault();
      hideSugg();
      navigate(d.textContent);
    });
    const bq = $("[data-bq]", root);
    bq.addEventListener("focus", warm);
    bq.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      navigate(e.target.value);
      e.target.value = "";
    });

    const ql = $("[data-ql]", root), qf = $("[data-qf]", root), qin = $("[data-qin]", root);
    const qlClose = () => {
      qf.hidden = true;
      qf.classList.remove("bad");
      ql.hidden = false;
    };
    store.watch((k) => {
      if (k === "links") ql.innerHTML = qlHtml();
    });
    ql.addEventListener("click", (e) => {
      const x = e.target.closest("[data-qx]");
      if (x) {
        const list = qlLinks();
        list.splice(+x.dataset.qx, 1);
        return store.set("links", list);
      }
      if (!e.target.closest("[data-qa]")) return;
      ql.classList.remove("edit");
      ql.hidden = true;
      qf.hidden = false;
      qin.value = "";
      qin.focus();
    });
    ql.addEventListener("contextmenu", (e) => {
      if (!e.target.closest(".qw")) return;
      e.preventDefault();
      ql.classList.toggle("edit");
    });
    document.addEventListener("pointerdown", (e) => {
      if (!ql.contains(e.target)) ql.classList.remove("edit");
    });
    qf.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = linkOf(qin.value);
      if (!u) {
        qf.classList.add("bad");
        return qin.focus();
      }
      const list = qlLinks();
      if (!list.some((x) => qlKey(x[1]) === qlKey(u)) && list.length < QL_MAX) store.set("links", [...list, [hostOf(u), u]]);
      qlClose();
    });
    $(".qok", qf).addEventListener("mousedown", (e) => e.preventDefault());
    qin.addEventListener("input", () => qf.classList.remove("bad"));
    qin.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      qlClose();
      $("[data-qa]", ql)?.focus();
    });
    qf.addEventListener("focusout", (e) => {
      if (qf.contains(e.relatedTarget)) return;
      setTimeout(() => {
        if (document.hasFocus() && !qf.contains(document.activeElement)) qlClose();
      });
    });

    root.addEventListener("click", (e) => {
      const close = e.target.closest("[data-close]");
      if (close) return closeTab(+close.closest("[data-tab]").dataset.tab);
      const tb = e.target.closest("[data-tab]");
      if (tb) {
        st.active = +tb.dataset.tab;
        return paint();
      }
      if (e.target.closest("[data-wnew]")) return newTab();
      if (e.target.closest("[data-wmax]")) return ctx.focusWeb(!wv.classList.contains("max"));
      const nb = e.target.closest("[data-wb]");
      if (nb) {
        const t = tab();
        if (!t || !t.frame) return;
        try {
          if (nb.dataset.wb === "back") t.frame.contentWindow.history.back();
          if (nb.dataset.wb === "fwd") t.frame.contentWindow.history.forward();
          if (nb.dataset.wb === "reload") t.frame.contentWindow.location.reload();
        } catch {
          if (nb.dataset.wb === "reload") t.frame.src = t.frame.src;
        }
        return;
      }
      const f = e.target.closest("[data-open]");
      if (f) navigate(f.dataset.open);
    });
    paint();
  },
  enter(root, ctx) {
    ctx.wash(null);
  },
};

const watch = {
  html: () =>
    '<div class="mw"><div class="mw-bar r"><div class="mw-tabs" data-kind role="tablist">' +
    '<button class="mw-tab on" type="button" role="tab" aria-selected="true" data-k="movie">' + ico("watch") + "Movies</button>" +
    '<button class="mw-tab" type="button" role="tab" aria-selected="false" data-k="tv">' + ico("tv") + "TV Shows</button></div>" +
    '<label class="mw-q">' + ico("search") + '<input data-wq type="search" placeholder="Search…" aria-label="Search" autocomplete="off" spellcheck="false"></label></div>' +
    '<div class="adb" data-adb></div><p class="mw-note" data-wnote hidden></p><div class="mw-wall r" style="--d:.06s" data-wall></div><div class="mw-end" data-wend></div></div>',
  mount(root, ctx) {
    const st = (this.st = { type: "movie", q: "", seen: new Set(), page: 1, more: false, busy: false, tok: 0, loaded: false });
    const note = $("[data-wnote]", root), qIn = $("[data-wq]", root), kind = $("[data-kind]", root), end = $("[data-wend]", root);
    const tile = (m, i) =>
      '<div class="mw-p" role="button" tabindex="0" data-i="' + i + '" aria-label="' + esc(m.name) + '"><img class="fade" decoding="async" alt="" data-src="' + still(m.poster, "w342") + '">' +
      (ctx.config.play ? '<span class="mw-go" data-go>' + ico("go") + "</span>" : "") +
      '<span class="mw-i"><b>' + esc(m.name) + "</b><span>" + (m.score && m.score !== "0.0" ? ico("star") + esc(m.score) + " · " : "") + esc(m.year || "") + "</span></span></div>";
    const wall = brick(root, $("[data-wall]", root), { want: 142, phone: 106, tile });
    const fresh = (list) => (list || []).filter((m) => m && m.poster && !st.seen.has(m.id) && st.seen.add(m.id));
    const near = () => end.getBoundingClientRect().top < root.getBoundingClientRect().bottom + 900;
    const more = async () => {
      if (st.busy || !st.more || st.q) return;
      st.busy = true;
      const tok = st.tok, page = st.page + 1;
      try {
        const d = await get("/api/watch/more?type=" + st.type + "&page=" + page);
        if (tok !== st.tok) return;
        st.page = page;
        st.more = !!d.more;
        wall.add(fresh(d.items));
      } catch {
        if (tok === st.tok) st.more = false;
      } finally {
        if (tok === st.tok) st.busy = false;
      }
      if (tok === st.tok && near()) more();
    };
    const load = async (type, q) => {
      const tok = ++st.tok;
      Object.assign(st, { type, q, seen: new Set(), page: 1, more: false, busy: true });
      note.hidden = true;
      wall.items = [];
      wall.skeleton();
      try {
        const list = q ? (await get("/api/watch/search?type=" + type + "&q=" + encodeURIComponent(q))).items : (await get("/api/watch/home?type=" + type)).rows.flatMap((r) => r.items);
        if (tok !== st.tok) return;
        st.more = !q;
        st.busy = false;
        wall.reset(fresh(list));
        if (q && !wall.items.length) {
          note.textContent = "Nothing found for “" + q + "”";
          note.hidden = false;
          return;
        }
        if (near()) more();
      } catch {
        if (tok !== st.tok) return;
        st.busy = false;
        wall.reset([]);
        note.textContent = q ? "Search isn’t working right now." : "Films are offline.";
        note.hidden = false;
      }
    };
    st.load = load;
    new IntersectionObserver((es) => es[0].isIntersecting && more(), { root, rootMargin: "0px 0px 900px 0px" }).observe(end);
    kind.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b || b.classList.contains("on")) return;
      $$("button", kind).forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      root.scrollTop = 0;
      load(b.dataset.k, st.q);
    });
    qIn.addEventListener("input", debounce(() => {
      const q = qIn.value.replace(/\s+/g, " ").trim();
      const next = q.length >= 2 ? q : "";
      if (next === st.q) return;
      root.scrollTop = 0;
      load(st.type, next);
    }, 350));
    root.addEventListener("click", (e) => {
      const p = e.target.closest(".mw-p[data-i]");
      const m = p && wall.items[+p.dataset.i];
      if (!m) return;
      if (e.target.closest("[data-go]")) return ctx.playTitle(m);
      ctx.openTitle(m, $("img", p));
    });
    root.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".mw-p[data-i]")) {
        e.preventDefault();
        e.target.click();
      }
    });
  },
  enter(root, ctx) {
    ctx.wash(null);
    ctx.banner($("[data-adb]", root));
    if (this.st.loaded) return;
    this.st.loaded = true;
    if (ctx.config.films) this.st.load("movie", "");
    else {
      $("[data-wnote]", root).textContent = "Films are offline.";
      $("[data-wnote]", root).hidden = false;
    }
  },
};

const artAt = (u, n) => String(u || "").replace(/\/\d+x\d+bb\./, "/" + n + "x" + n + "bb.").replace(/(\/api\/listen\/art\/[yl]\/)\d+\//, "$1" + n + "/");
const baseTitle = (s) => String(s || "").toLowerCase().replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+.*$/, "").trim();
const uniqSongs = (list) => {
  const seen = new Set();
  return list.filter((t) => {
    const a = "a" + t.art, b = "t" + String(t.artist).toLowerCase() + "|" + baseTitle(t.title);
    if (seen.has(a) || seen.has(b)) return false;
    seen.add(a);
    seen.add(b);
    return true;
  });
};
const MTABS = [["top", "Discover", ""], ["liked", "Liked", "heart"], ["queue", "Queue", "listen"], ["hist", "History", "clock"]];
const MEMPTY = { top: "Music is offline.", liked: "No liked songs yet.", queue: "Nothing in the queue.", hist: "Nothing played yet." };
const listen = {
  html: () =>
    '<div class="mu"><div class="mw-bar r"><label class="mw-q">' + ico("search") +
    '<input data-lq type="search" maxlength="80" placeholder="Search songs or artists" aria-label="Search songs or artists" autocomplete="off" spellcheck="false"></label></div>' +
    '<div class="adb" data-adb></div>' +
    '<nav class="mu-tabs r" style="--d:.04s" data-mtabs>' + MTABS.map(([k, l, ic], i) => '<button type="button" data-mt="' + k + '"' + (i ? "" : ' class="on"') + ">" + (ic ? ico(ic) : "") + l + "</button>").join("") + "</nav>" +
    '<p class="mw-note" data-lnote hidden></p><div class="mw-wall r" style="--d:.08s" data-lwall></div>' +
    '<div class="mu-pb gl g3" data-pb hidden><div class="l"><img alt="" data-pa><div class="tx"><b data-pt></b><span data-pr></span></div></div>' +
    '<div class="c"><div class="row"><button class="cb sm gh" type="button" data-pc="like" aria-label="Like">' + ico("heart") + "</button>" +
    '<button class="cb sm" type="button" data-pc="prev" aria-label="Previous">' + ico("prev") + "</button>" +
    '<button class="cb big" type="button" data-pc="toggle" aria-label="Play">' + ico("go") + "</button>" +
    '<button class="cb sm" type="button" data-pc="next" aria-label="Next">' + ico("next") + "</button>" +
    '<button class="cb sm gh" type="button" data-pc="shuffle" aria-label="Shuffle">' + ico("shuffle") + "</button></div>" +
    '<div class="bar num"><span data-tc>0:00</span><div class="scrub" data-scrub><i data-prog></i></div><span data-td>0:00</span></div></div>' +
    '<div class="r"><button class="cb sm gh" type="button" data-pc="repeat" aria-label="Repeat">' + ico("repeat") + "</button>" +
    '<button class="cb sm gh" type="button" data-pc="mute" aria-label="Mute">' + ico("vol") + "</button>" +
    '<input class="vol" type="range" min="0" max="1" step="0.01" data-vol aria-label="Volume"></div></div></div>',
  mount(root, ctx) {
    const pl = ctx.player;
    const st = (this.st = { top: [], view: [], tab: "top", q: "", seq: 0, cur: "" });
    const note = $("[data-lnote]", root), tabs = $("[data-mtabs]", root), lq = $("[data-lq]", root), pb = $("[data-pb]", root), vol = $("[data-vol]", root);
    const eq = '<span class="eq"><i></i><i></i><i></i></span>';
    const mark = () => {
      const cur = pl.cur() && pl.cur().id;
      $$(".mw-p[data-id]", root).forEach((p) => {
        const on = p.dataset.id === cur;
        p.classList.toggle("now", on);
        p.classList.toggle("paused", on && (!pl.playing || pl.loading));
        const e = $(".eq", p);
        if (on && !e) p.insertAdjacentHTML("beforeend", eq);
        if (!on && e) e.remove();
      });
    };
    const tile = (t, i) =>
      '<div class="mw-p sq" role="button" tabindex="0" data-i="' + i + '" data-id="' + esc(t.id) + '" aria-label="' + esc(t.title) + '"><img class="fade" decoding="async" alt="" data-src="' + esc(artAt(t.art, 300)) + '">' +
      '<span class="mw-go">' + ico("go") + '</span><span class="mw-i"><b>' + esc(t.title) + "</b><span>" + esc(t.artist) + "</span></span></div>";
    const wall = brick(root, $("[data-lwall]", root), { want: 132, phone: 100, tile, square: true, done: mark });
    const lists = {
      top: () => st.top,
      liked: () => store.get("saved", []).filter((x) => /^song:/.test(x.key)),
      queue: () => (pl.cur() ? pl.list.slice(pl.i) : []),
      hist: () => ctx.history.list().filter((h) => h.kind === "song").map((h) => ({ id: h.id, vid: h.vid || "", title: h.name, artist: h.artist, art: h.art, preview: h.preview || "" })),
    };
    const show = (list, empty) => {
      st.view = list;
      note.textContent = list.length ? "" : empty;
      note.hidden = !!list.length;
      wall.reset(list);
    };
    const render = () => {
      if (!st.q) show(lists[st.tab](), MEMPTY[st.tab]);
    };
    st.render = render;
    const paintVol = () => {
      vol.style.setProperty("--v", vol.value * 100 + "%");
      $('[data-pc="mute"]', pb).classList.toggle("off", pl.audio.muted || +vol.value === 0);
    };
    const paint = () => {
      const t = pl.cur() || st.view[0] || st.top[0];
      pb.hidden = !t;
      if (!t) return;
      const a = $("[data-pa]", pb), src = artAt(t.art, 120);
      if (a.getAttribute("src") !== src) a.src = src;
      $("[data-pt]", pb).textContent = t.title;
      $("[data-pr]", pb).textContent = t.artist;
      const tg = $('[data-pc="toggle"]', pb);
      tg.innerHTML = ico(pl.playing ? "pause" : "go");
      tg.setAttribute("aria-label", pl.playing ? "Pause" : "Play");
      tg.classList.toggle("ld", pl.loading && pl.playing);
      $('[data-pc="shuffle"]', pb).classList.toggle("on", pl.shuffle);
      $('[data-pc="repeat"]', pb).classList.toggle("on", pl.repeat);
      $('[data-pc="like"]', pb).classList.toggle("on", ctx.saved.has("song:" + t.id));
      mark();
      const id = pl.cur() ? pl.cur().id : "";
      if (id !== st.cur) {
        st.cur = id;
        if (!st.q && (st.tab === "queue" || st.tab === "hist")) render();
      }
      if (ctx.is("listen")) ctx.wash(artAt(t.art, 300));
    };
    st.paint = paint;
    const tick = () => {
      const au = pl.audio, d = isFinite(au.duration) && au.duration > 0 ? au.duration : 0;
      $("[data-prog]", pb).style.width = (d ? (au.currentTime / d) * 100 : 0) + "%";
      $("[data-tc]", pb).textContent = clockText(au.currentTime);
      $("[data-td]", pb).textContent = clockText(d);
    };
    pl.on(paint);
    for (const ev of ["timeupdate", "durationchange", "emptied"]) pl.audio.addEventListener(ev, tick);
    vol.value = pl.audio.volume;
    paintVol();
    vol.addEventListener("input", () => {
      pl.audio.volume = +vol.value;
      pl.audio.muted = false;
      store.set("vol", +vol.value);
      paintVol();
    });
    const setTab = (k) => {
      st.tab = k;
      $$("button", tabs).forEach((b) => b.classList.toggle("on", b.dataset.mt === k && !st.q));
    };
    const search = debounce(async () => {
      const q = lq.value.replace(/\s+/g, " ").trim();
      const n = ++st.seq;
      if (q.length < 2) {
        if (!st.q) return;
        st.q = "";
        setTab(st.tab);
        return render();
      }
      st.q = q;
      setTab(st.tab);
      note.hidden = true;
      wall.items = [];
      wall.skeleton();
      try {
        const songs = await get("/api/listen/search?q=" + encodeURIComponent(q));
        if (n === st.seq) show(songs, "No songs found.");
      } catch {
        if (n === st.seq) show([], "Search isn’t working right now.");
      }
    }, 320);
    lq.addEventListener("input", search);
    lq.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !lq.value) return;
      e.stopPropagation();
      lq.value = "";
      search();
    });
    root.addEventListener("click", (e) => {
      const tb = e.target.closest("[data-mt]");
      if (tb) {
        lq.value = "";
        st.q = "";
        st.seq++;
        setTab(tb.dataset.mt);
        root.scrollTop = 0;
        return render();
      }
      const p = e.target.closest(".mw-p[data-i]");
      if (p) {
        const i = +p.dataset.i, t = st.view[i];
        if (!t) return;
        if (pl.cur() && pl.cur().id === t.id) return pl.toggle();
        return st.tab === "queue" && !st.q ? pl.play(pl.list, pl.i + i) : pl.play(st.view, i);
      }
      const c = e.target.closest("[data-pc]");
      if (c) {
        const k = c.dataset.pc;
        if (k === "toggle") return pl.cur() ? pl.toggle() : st.view.length && pl.play(st.view, 0);
        if (k === "next") return pl.next();
        if (k === "prev") return pl.prev();
        if (k === "shuffle") return pl.setShuffle(!pl.shuffle);
        if (k === "repeat") return pl.setRepeat(!pl.repeat);
        if (k === "mute") {
          pl.audio.muted = !pl.audio.muted;
          return paintVol();
        }
        if (k === "like") {
          const t = pl.cur() || st.view[0];
          if (!t) return;
          ctx.saved.toggle({ key: "song:" + t.id, id: t.id, vid: t.vid || "", title: t.title, artist: t.artist, art: t.art, preview: t.preview || "" });
          paint();
          if (st.tab === "liked" && !st.q) render();
        }
        return;
      }
      const s = e.target.closest("[data-scrub]");
      if (s) {
        const b = s.getBoundingClientRect();
        pl.seek((e.clientX - b.left) / b.width);
      }
    });
    root.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".mw-p[data-i]")) {
        e.preventDefault();
        e.target.click();
      }
    });
    wall.skeleton();
    get("/api/listen/top")
      .then((songs) => {
        st.top = uniqSongs(songs);
        if (st.tab === "top") render();
        paint();
      })
      .catch(() => st.tab === "top" && !st.q && show([], MEMPTY.top));
  },
  enter(root, ctx) {
    ctx.banner($("[data-adb]", root));
    if (this.st.tab !== "top" && !this.st.q) this.st.render();
    this.st.paint();
  },
};

const play = {
  html: () =>
    '<div class="mw"><div class="mw-bar r"><label class="mw-q">' + ico("search") +
    '<input data-pq type="search" placeholder="Search games…" aria-label="Search games" autocomplete="off" spellcheck="false"></label></div>' +
    '<div class="adb" data-adb></div><p class="mw-note" data-pnote hidden></p><div class="mw-wall r" style="--d:.06s" data-grid></div><div class="mw-end" data-pend></div></div>',
  mount(root, ctx) {
    const st = (this.st = { all: [], view: [], shown: 0 });
    const note = $("[data-pnote]", root), end = $("[data-pend]", root);
    const tile = (g) =>
      '<div class="mw-p sq" role="button" tabindex="0" data-g="' + g.id + '" aria-label="' + esc(g.name) + '"><img class="fade" decoding="async" alt="" data-src="' + esc(g.cover) + '"><span class="mw-go">' + ico("go") + '</span><span class="mw-i"><b>' + esc(g.name) + "</b></span></div>";
    const wall = brick(root, $("[data-grid]", root), { want: 132, phone: 100, tile, square: true });
    const near = () => end.getBoundingClientRect().top < root.getBoundingClientRect().bottom + 900;
    const more = () => {
      if (st.shown >= st.view.length) return;
      const next = st.view.slice(st.shown, st.shown + 60);
      st.shown += next.length;
      wall.add(next);
      if (near()) more();
    };
    const show = (list) => {
      st.view = list;
      st.shown = 0;
      note.textContent = list.length ? "" : "No games match";
      note.hidden = !!list.length;
      wall.reset([]);
      more();
    };
    wall.skeleton();
    get("/api/play/games")
      .then((all) => {
        st.all = all;
        show(all);
      })
      .catch(() => {
        wall.reset([]);
        note.textContent = "Games are offline.";
        note.hidden = false;
      });
    new IntersectionObserver((es) => es[0].isIntersecting && more(), { root, rootMargin: "0px 0px 900px 0px" }).observe(end);
    const q = $("[data-pq]", root);
    q.addEventListener("input", debounce(() => {
      const s = q.value.trim().toLowerCase();
      show(s ? st.all.filter((g) => g.name.toLowerCase().includes(s)) : st.all);
    }, 120));
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-g]");
      if (!b) return;
      const g = st.all.find((x) => x.id === +b.dataset.g);
      if (g) ctx.playGame(g);
    });
    root.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".mw-p[data-g]")) {
        e.preventDefault();
        e.target.click();
      }
    });
  },
  enter(root, ctx) {
    ctx.wash(null);
    ctx.banner($("[data-adb]", root));
  },
};

const TIERS = { smart: ["Smart", "ask"], fast: ["Fast", "bolt"], haiku: ["Haiku", "star"] };
const tierOf = (t) => TIERS[t] || TIERS.smart;
const chip = (f, i) =>
  '<span class="ai-chip' + (f.loading ? " ld" : "") + '">' +
  (f.kind === "photo"
    ? f.url ? '<img class="th" alt="" src="' + f.url + '">' : '<span class="fi ph">' + ico("image") + "</span>"
    : '<span class="fi">' + ico("file") + "</span>") +
  '<span class="nm"><b>' + esc(f.name) + "</b>" +
  (f.loading ? "<small>Reading…</small>" : f.pages ? "<small>" + f.pages + (f.pages > 1 ? " pages" : " page") + "</small>" : "") +
  "</span>" + (i !== undefined ? '<button class="x" type="button" data-rm="' + i + '" aria-label="Remove">' + ico("x") + "</button>" : "") + "</span>";
const qEl = (m, pics) => {
  const d = document.createElement("div");
  d.className = "ai-q";
  if (m.id) d.dataset.mid = m.id;
  const shots = pics && pics.length ? pics.map((u) => '<img class="ai-qp" alt="" src="' + u + '">').join("") : m.photos ? chip({ kind: "photo", name: m.photos > 1 ? m.photos + " photos" : "Photo" }) : "";
  const files = (m.files || []).map((f) => chip(f)).join("");
  d.innerHTML = (shots || files ? '<div class="ai-qa">' + shots + files + "</div>" : "") +
    (m.text ? '<div class="ai-qr"><button class="ai-ed" type="button" data-edit aria-label="Edit">' + ico("pencil") + '</button><div class="ai-u"></div></div>' : "");
  if (m.text) $(".ai-u", d).textContent = m.text;
  return d;
};
const aSrc = (list) =>
  list && list.length
    ? '<div class="ai-src">' + list.map((s, i) => '<a href="' + esc(s.url) + '" title="' + esc(s.title) + '"><img alt="" src="/api/icon?d=' + encodeURIComponent(s.site) + '">' +
        esc(String(s.site).replace(/^(en|m|www)\./, "")) + "<i>" + (i + 1) + "</i></a>").join("") + "</div>"
    : "";
const aFoot = (m) =>
  '<div class="ai-f">' + (m.text ? '<button type="button" data-copy aria-label="Copy">' + ico("copy") + "</button>" : "") +
  '<button type="button" data-regen aria-label="Regenerate">' + ico("reload") + "</button>" +
  (m.model ? '<span class="ai-m">' + ico(tierOf(m.model.tier)[1]) + "<b>" + tierOf(m.model.tier)[0] + "</b> · " + esc(m.model.name) + "</span>" : "") + "</div>";
const ACCEPT = "image/*,.pdf,.docx,.txt,.md,.csv,.json,.html,.htm,.xml,.js,.ts,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.sql,.yml,.yaml,.log,.tex";

const ask = {
  flush: true,
  html: () =>
    '<div class="ai"><aside class="ai-side"><button class="btn k s" type="button" data-new>' + ico("plus") + "New chat</button>" +
    '<label class="ai-find">' + ico("search") + '<input data-find placeholder="Search chats" aria-label="Search chats" autocomplete="off" spellcheck="false"></label>' +
    '<div class="ai-list srl" data-list></div></aside>' +
    '<section class="ai-main"><div class="ai-thread srl" data-thread><div class="ai-in" data-in></div></div>' +
    '<form class="ai-box gl g2" data-form><p class="ai-note" data-note hidden></p><div class="ai-atts" data-atts hidden></div>' +
    '<textarea data-aq rows="1" maxlength="8000" placeholder="Ask anything" aria-label="Ask anything"></textarea>' +
    '<div class="ai-tools"><button class="ai-t ic" type="button" data-add aria-label="Add a photo or file">' + ico("plus") + "</button>" +
    '<button class="ai-t" type="button" data-web aria-pressed="false">' + ico("web") + "Search</button>" +
    '<span class="ai-tw"><button class="ai-t" type="button" data-tier aria-haspopup="menu"><span class="tv" data-tico></span><span data-tname></span>' + ico("caret", "i car") + "</button>" +
    '<div class="ai-menu ai-tmenu gl g3" data-tmenu role="menu" hidden>' +
    Object.entries(TIERS).map(([k, [n, ic]]) => '<button type="button" role="menuitemradio" data-tv="' + k + '">' + ico(ic) + n + ico("check", "i ck") + "</button>").join("") + "</div></span>" +
    '<span class="sp"></span><button class="cb" type="submit" data-asend aria-label="Send">' + ico("send") + "</button></div>" +
    '<input type="file" data-pick multiple hidden accept="' + ACCEPT + '"></form></section></div>',
  mount(root, ctx) {
    this.root = root;
    const st = (this.st = { chat: null, list: [], ready: true, busy: null, find: "", att: [], pics: new Map(), menu: null });
    const inner = $("[data-in]", root), thread = $("[data-thread]", root), q = $("[data-aq]", root), form = $("[data-form]", root);
    const sendBtn = $("[data-asend]", root), listEl = $("[data-list]", root), atts = $("[data-atts]", root), pick = $("[data-pick]", root);
    const tmenu = $("[data-tmenu]", root), note = $("[data-note]", root), findIn = $("[data-find]", root);
    const near = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 140;
    const toEnd = () => (thread.scrollTop = thread.scrollHeight);
    const grow = () => {
      q.style.height = "auto";
      q.style.height = Math.min(q.scrollHeight, 200) + "px";
    };
    const say = (t) => {
      note.textContent = t || "";
      note.hidden = !t;
    };
    const tierNow = () => {
      const t = store.get("askTier", "smart");
      return TIERS[t] ? t : "smart";
    };
    const greet = () => {
      const h = new Date().getHours();
      const me = ctx.account.me;
      return (h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening") + (me ? ", " + me.display : "") + ".";
    };
    const empty = () => {
      thread.classList.add("empty");
      inner.innerHTML = '<div class="ai-hi"><h1>' + esc(greet()) + "</h1>" +
        (st.ready ? '<div class="sugs">' + ["Explain photosynthesis simply", "Outline an essay on climate", "Quiz me on world capitals", "Fix this sentence’s grammar"].map((s) => "<button type=\"button\" data-s>" + esc(s) + "</button>").join("") + "</div>"
          : '<p class="off">Ask isn’t set up yet.</p>') + "</div>";
    };
    const order = () => st.list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || 0) - (a.updated || 0));
    const paintList = () => {
      const item = (c) =>
        '<div class="ai-it' + (c.id === st.chat ? " on" : "") + '" data-id="' + esc(c.id) + '" role="button" tabindex="0">' + (c.pinned ? ico("pin", "i pn") : "") +
        "<span>" + esc(c.title) + '</span><button class="mo" type="button" data-more aria-label="More">' + ico("dots") + "</button></div>";
      const pinned = st.list.filter((c) => c.pinned), rest = st.list.filter((c) => !c.pinned);
      listEl.innerHTML = st.find
        ? st.list.length ? st.list.map(item).join("") : '<p class="ai-none">No chats found</p>'
        : (pinned.length ? '<div class="ai-sec">Pinned</div>' + pinned.map(item).join("") + (rest.length ? '<div class="ai-sec">Recent</div>' : "") : "") + rest.map(item).join("");
      $$(".ai-imenu", root).forEach((x) => x.remove());
      st.menu = null;
    };
    const paintTools = () => {
      const web = !!store.get("askWeb", false), [n, ic] = tierOf(tierNow());
      const wb = $("[data-web]", root);
      wb.classList.toggle("on", web);
      wb.setAttribute("aria-pressed", web);
      $("[data-tico]", root).innerHTML = ico(ic);
      $("[data-tname]", root).textContent = n;
      $$("[data-tv]", tmenu).forEach((b) => b.setAttribute("aria-checked", b.dataset.tv === tierNow()));
    };
    const paintAtts = () => {
      atts.hidden = !st.att.length;
      atts.innerHTML = st.att.map((f, i) => chip(f, i)).join("");
    };
    this.paintAtts = paintAtts;
    this.paintTools = paintTools;
    const setBusy = (ctl) => {
      st.busy = ctl;
      sendBtn.innerHTML = ico(ctl ? "x" : "send");
      sendBtn.setAttribute("aria-label", ctl ? "Stop" : "Send");
      sendBtn.classList.toggle("stop", !!ctl);
    };
    const patch = (id, body) =>