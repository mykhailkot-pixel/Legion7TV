// ==UserScript==
// @name         7TV в чате Multidonate Play
// @namespace    https://play.multidonate.ru/
// @version      3.0
// @description  Эмоуты 7TV в чате: кнопка 7TV, ник стримера, размер, список эмоутов, быстрый кеш
// @match        https://play.multidonate.ru/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      workers.dev
// @connect      7tv.io
// @connect      cdn.7tv.app
// @connect      api.ivr.fi
// @run-at       document-idle
// @author       ProCto_Fliy
// @icon         https://cdn.7tv.app/emote/01F71VQYHR000D3ZZ6Q11NR7TV/2x.webp
// @homepageURL  https://github.com/mykhailkot-pixel/Legion7TV
// @updateURL    https://raw.githubusercontent.com/mykhailkot-pixel/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @downloadURL  https://raw.githubusercontent.com/mykhailkot-pixel/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @license      MIT
// ==/UserScript==

(() => {
  // src/styles.css
  var styles_default = ".t7-w{display:inline-block;position:relative;vertical-align:middle;line-height:0}\r\n.t7-e{height:var(--t7-h,1.9em);width:auto;min-width:var(--t7-h,1.9em);vertical-align:middle;display:inline-block}\r\n.t7-e:not([src]),.t7-zw:not([src]){visibility:hidden}\r\n.t7-zw{position:absolute;left:50%;bottom:0;transform:translateX(-50%);height:100%;width:auto;pointer-events:none}\r\n\r\nform.cy-chat-f .t7-btn{\r\n    flex:none;align-self:stretch;margin:0 0 0 4px;padding:0 8px;min-height:28px;height:auto;width:auto;\r\n    box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;\r\n    border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;\r\n    font:700 11px/1 system-ui,sans-serif;letter-spacing:0;text-indent:0;text-transform:none;\r\n    white-space:nowrap;vertical-align:middle;cursor:pointer}\r\nform.cy-chat-f.t7-btn:hover{background:rgb(165,100,255)}\r\n\r\n.t7-pop{position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;\r\n    padding:10px;background:#1b1b24;color:#eee;border:1px solid rgba(255,255,255,.18);border-radius:10px;\r\n    box-shadow:0 8px 28px rgba(0,0,0,.55);font:13px/1.3 system-ui,sans-serif}\r\n.t7-pop *{box-sizing:border-box}\r\n.t7-pop [hidden]{display:none!important}\r\n.t7-pop button{font:inherit;cursor:pointer}\r\n.t7-pop.t7-drag{will-change:transform;transition:none}\r\n.t7-pop.t7-drag .t7-gr{pointer-events:none}\r\n\r\n.t7-h{display:flex;justify-content:space-between;align-items:center;font-size:15px;cursor:grab;touch-action:none;user-select:none}\r\n.t7-h:active{cursor:grabbing}\r\n.t7-x{background:none;border:0;color:#ccc;font-size:20px;line-height:1;padding:0 4px}\r\n.t7-gr{flex:1;min-height:156px;overflow-y:auto;overscroll-behavior:contain}\r\n\r\n.t7-nf{display:flex;gap:6px;align-items:flex-end}\r\n.t7-nf label{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;color:#aaa}\r\n.t7-pop input[type=text],.t7-pop input[type=search]{width:100%;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);\r\n    background:#0f0f15;color:#fff;font:13px system-ui,sans-serif}\r\n.t7-nf button{padding:6px 10px;border-radius:6px;border:0;background:#9146ff;color:#fff}\r\n.t7-st{font-size:11px;color:#aaa;min-height:1.3em}\r\n\r\n.t7-sz{display:flex;align-items:center;gap:8px;font-size:12px;color:#aaa}\r\n.t7-szb{display:flex;gap:4px}\r\n.t7-szb button{min-width:34px;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#0f0f15;color:#ddd}\r\n.t7-szb button[aria-pressed=true]{background:#9146ff;border-color:#9146ff;color:#fff}\r\n\r\n.t7-gr{flex:1;min-height:140px;overflow-y:auto;overscroll-behavior:contain}\r\n.t7-sh{margin:6px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#aaa}\r\n.t7-gw{display:flex;flex-wrap:wrap;gap:2px}\r\n.t7-it{width:40px;height:40px;padding:3px;border:0;border-radius:6px;background:transparent;display:inline-flex;align-items:center;justify-content:center}\r\n.t7-it:hover,.t7-it:focus-visible{background:rgba(255,255,255,.14)}\r\n.t7-it img{max-width:100%;max-height:100%;object-fit:contain}\r\n.t7-emp{padding:16px 4px;color:#aaa;text-align:center}\r\n\r\n.t7-rs{position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none;\r\n    border-radius:0 0 10px 0;\r\n    background:linear-gradient(135deg,transparent 0 55%,#888 55% 62%,transparent 62% 72%,#888 72% 79%,transparent 79%)}\r\n\r\n.t7-hb{display:flex;align-items:center;gap:2px}\r\n.t7-g{background:none;border:0;color:#ccc;font-size:16px;line-height:1;padding:2px 5px;border-radius:6px}\r\n.t7-g:hover,.t7-x:hover{background:rgba(255,255,255,.14);color:#fff}\r\n\r\n.t7-set{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;\r\n    padding:12px;background:rgba(0,0,0,.5);font:13px/1.3 system-ui,sans-serif}\r\n.t7-set *{box-sizing:border-box}\r\n.t7-sw{width:380px;max-width:100%;max-height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:16px;\r\n    padding:14px;background:#1b1b24;color:#eee;border:1px solid rgba(255,255,255,.18);border-radius:12px;\r\n    box-shadow:0 12px 40px rgba(0,0,0,.6)}\r\n.t7-sw button{font:inherit;cursor:pointer}\r\n.t7-sth{display:flex;justify-content:space-between;align-items:center;font-size:15px}\r\n.t7-sec{display:flex;flex-direction:column;gap:6px}\r\n.t7-sec>h4{margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#aaa}\r\n.t7-row{display:flex;gap:6px;align-items:flex-end}\r\n.t7-wrap{flex-wrap:wrap}\r\n.t7-fl{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;color:#aaa}\r\n.t7-sw input[type=text]{width:100%;padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.2);\r\n    background:#0f0f15;color:#fff;font:13px system-ui,sans-serif}\r\n.t7-chk{display:flex;gap:8px;align-items:center;cursor:pointer}\r\n.t7-b{padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:#0f0f15;color:#ddd}\r\n.t7-b:hover{background:#1d1d29}\r\n.t7-b.p{background:#9146ff;border-color:#9146ff;color:#fff}\r\n.t7-sst{font-size:11px;color:#aaa;min-height:1.3em}\r\n.t7-sth{cursor:grab;touch-action:none;user-select:none}\r\n.t7-sth:active{cursor:grabbing}\r\n.t7-sw.t7-drag{will-change:transform}";

  // src/config.js
  var CACHE_TTL = 60 * 60 * 1e3;
  var SIZES = {
    s: { h: "1.3em", n: 2, label: "S" },
    m: { h: "1.9em", n: 2, label: "M" },
    l: { h: "2.6em", n: 3, label: "L" },
    x: { h: "3.4em", n: 3, label: "XL" }
  };
  var pageChan = (() => {
    const m = /\/c\/([\w]+)/.exec(location.pathname);
    return m ? m[1].toLowerCase() : "";
  })();

  // src/state.js
  var S2 = { nick: pageChan, size: "m", on: true };
  var EM = {};
  var st = {
    pos: null,
    // позиция окошка {x, y} или null (прилипает к кнопке)
    win: null,
    // размер окошка {w, h} или null
    pop: null,
    // элемент окошка
    anchor: null,
    // кнопка 7TV, от которой открыто окошко
    io: null,
    // IntersectionObserver списка
    status: "",
    loadToken: 0,
    hooks: {
      // подключаются в main.js (чтобы модули не импортировали друг друга по кругу)
      status() {
      },
      emotes() {
      },
      place() {
      }
    }
  };

  // src/store.js
  var store = {
    get: (k) => {
      try {
        return GM_getValue(k, void 0);
      } catch {
        return void 0;
      }
    },
    set: (k, v) => {
      try {
        GM_setValue(k, v);
      } catch {
      }
    }
  };

  // src/net.js
  var ALLOWED = ["7tv.io", "cdn.7tv.app", "api.ivr.fi"];
  var ROUTES = { "7tv.io": "api", "cdn.7tv.app": "cdn", "api.ivr.fi": "ivr" };
  var DEFAULT_PROXY = "";
  var normProxy = (v) => {
    v = String(v || "").trim().replace(/\/+$/, "");
    try {
      const u = new URL(v);
      return u.protocol === "https:" ? u.origin : "";
    } catch {
      return "";
    }
  };
  var proxy = (() => {
    const v = store.get("t7proxy");
    return normProxy(typeof v === "string" ? v : DEFAULT_PROXY);
  })();
  var proxyDownUntil = 0;
  var urlOk = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === "https:" && ALLOWED.includes(u.hostname);
    } catch {
      return false;
    }
  };
  function viaProxy(url) {
    const u = new URL(url);
    return `${proxy}/${ROUTES[u.hostname]}${u.pathname}${u.search}`;
  }
  var gmOnce = (url, responseType, timeout) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType,
      timeout,
      onload: (r) => r.status >= 200 && r.status < 300 ? resolve(r) : reject(new Error(url + " -> " + r.status)),
      onerror: reject,
      ontimeout: reject
    });
  });
  var gm = async (url, responseType) => {
    if (!urlOk(url)) throw new Error("url not allowed");
    if (proxy && Date.now() > proxyDownUntil) {
      try {
        return await gmOnce(viaProxy(url), responseType, 6e3);
      } catch {
        proxyDownUntil = Date.now() + 12e4;
      }
    }
    return gmOnce(url, responseType, 15e3);
  };
  var getJson = async (url) => JSON.parse((await gm(url)).responseText);
  var getBuf = async (url) => {
    const r = await gm(url, "blob");
    const type = r.response && r.response.type || "image/webp";
    const buf = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsArrayBuffer(r.response);
    });
    return new Blob([buf], { type });
  };

  // src/emotes.js
  function addSet(map, set, isGlobal) {
    for (const e of set && set.emotes || []) {
      const host = e.data && e.data.host;
      if (!host || !host.url || e.name === "__proto__") continue;
      const files = (host.files || []).filter((f) => f.format === "WEBP").map((f) => f.name);
      map[e.name] = {
        base: "https:" + host.url,
        f: files.length ? files : ["1x.webp", "2x.webp"],
        zw: !!(e.data.flags & 256),
        // zero-width эмоут
        g: isGlobal
      };
    }
  }
  function urlFor(em, n) {
    let best = null;
    for (const f of em.f) {
      const l = parseInt(f, 10);
      if (l <= n && (best === null || l > parseInt(best, 10))) best = f;
    }
    return em.base + "/" + (best || em.f[0]);
  }
  async function loadEmotes(nick, force) {
    const key = "t7c2:" + nick;
    if (!force) {
      const c = store.get(key);
      if (c) return { map: c.map, msg: c.msg, stale: Date.now() - c.at >= CACHE_TTL };
    }
    const map = {};
    let err = "";
    try {
      addSet(map, await getJson("https://7tv.io/v3/emote-sets/global"), true);
    } catch (e) {
      err = "\u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C";
      console.warn("[7TV]", e);
    }
    let chanMsg = "";
    if (!nick) {
      chanMsg = "\u0443\u043A\u0430\u0436\u0438 \u043D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430";
    } else {
      try {
        const u = await getJson("https://api.ivr.fi/v2/twitch/user?login=" + encodeURIComponent(nick));
        const id = u && u[0] && u[0].id;
        if (!id) chanMsg = "Twitch-\u043A\u0430\u043D\u0430\u043B \xAB" + nick + "\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D";
        else {
          const user = await getJson("https://7tv.io/v3/users/twitch/" + id);
          const set = user && user.emote_set;
          if (set && set.emotes && set.emotes.length) addSet(map, set, false);
          else chanMsg = "\u0443 \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435\u0442 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 7TV";
        }
      } catch (e) {
        chanMsg = "\u044D\u043C\u043E\u0443\u0442\u044B \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C (\u043D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 7TV \u0438\u043B\u0438 \u0441\u0435\u0440\u0432\u0438\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D)";
        console.warn("[7TV]", e);
      }
    }
    const names = Object.keys(map);
    const nc = names.filter((n) => !map[n].g).length;
    let msg = `\u041A\u0430\u043D\u0430\u043B: ${nc} \xB7 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435: ${names.length - nc}`;
    if (chanMsg) msg += " \xB7 " + chanMsg;
    if (err) msg += " \xB7 " + err;
    if (names.length && !chanMsg && !err) store.set(key, { at: Date.now(), map, msg });
    return { map, msg, stale: false };
  }
  function setStatus(t) {
    st.status = t;
    st.hooks.status(t);
  }
  async function reload(force) {
    const my = ++st.loadToken;
    if (force) setStatus("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026");
    const { map, msg, stale } = await loadEmotes(S2.nick, force);
    if (my !== st.loadToken) return;
    for (const k of Object.keys(EM)) delete EM[k];
    Object.assign(EM, map);
    setStatus(msg);
    st.hooks.emotes();
    if (stale) reload(true);
  }

  // src/util.js
  var clamp = (v, a, b) => Math.max(a, Math.min(v, b));
  var has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
  function parseNick(v) {
    v = String(v || "").trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
    const i = v.lastIndexOf("/");
    if (i >= 0) v = v.slice(i + 1);
    v = v.replace(/^@/, "");
    return /^[a-z0-9_]{1,25}$/.test(v) ? v : "";
  }

  // src/imgcache.js
  var DB = /* @__PURE__ */ (() => {
    let p;
    const open = () => p || (p = new Promise((res) => {
      try {
        const r = indexedDB.open("t7img", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("i");
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch {
        res(null);
      }
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      if (!db) return void 0;
      return new Promise((res) => {
        try {
          const t = db.transaction("i", mode);
          const rq = fn(t.objectStore("i"));
          t.oncomplete = () => res(rq && rq.result);
          t.onerror = t.onabort = () => res(void 0);
        } catch {
          res(void 0);
        }
      });
    };
    return {
      get: (k) => tx("readonly", (s) => s.get(k)),
      set: (k, v) => tx("readwrite", (s) => s.put(v, k)),
      clear: () => tx("readwrite", (s) => s.clear())
    };
  })();
  var Q = { hi: [], lo: [], run: 0, max: 8 };
  function pump() {
    while (Q.run < Q.max) {
      const j = Q.hi.shift() || Q.lo.shift();
      if (!j) return;
      Q.run++;
      j.fn().then(j.res, j.rej).finally(() => {
        Q.run--;
        pump();
      });
    }
  }
  var enqueue = (fn, hi) => new Promise((res, rej) => {
    (hi ? Q.hi : Q.lo).push({ fn, res, rej });
    pump();
  });
  var imgCache = /* @__PURE__ */ new Map();
  function fetchImg(url, hi) {
    if (imgCache.has(url)) return imgCache.get(url);
    const p = (async () => {
      let blob = await DB.get(url);
      if (!blob) {
        blob = await enqueue(() => getBuf(url), hi);
        DB.set(url, blob);
      }
      return URL.createObjectURL(blob);
    })();
    p.catch(() => imgCache.delete(url));
    imgCache.set(url, p);
    return p;
  }
  async function clearImgs() {
    imgCache.clear();
    await DB.clear();
  }

  // src/chat.js
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("cy-chat-l"))
      t.dataset.t7end = t.scrollHeight - t.scrollTop - t.clientHeight < 40 ? "1" : "0";
  }, true);
  function stickEnds() {
    document.querySelectorAll(".cy-chat-l").forEach((l) => {
      if (l.dataset.t7end !== "0") l.scrollTop = l.scrollHeight;
    });
  }
  function stickFrom(el) {
    const l = el.closest && el.closest(".cy-chat-l");
    if (l && l.dataset.t7end !== "0") l.scrollTop = l.scrollHeight;
  }
  function makeImg(name, em, cls) {
    const img = document.createElement("img");
    img.className = cls;
    img.alt = name;
    img.title = name;
    img.addEventListener("load", () => stickFrom(img));
    fetchImg(urlFor(em, SIZES[S2.size].n), true).then(
      (d) => {
        img.src = d;
      },
      (e) => {
        console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", name, e);
        img.replaceWith(document.createTextNode(name));
      }
    );
    return img;
  }
  var NONE = {};
  function processSpan(sp) {
    const act = S2.on ? EM : NONE;
    const src = sp.dataset.t7o != null ? sp.dataset.t7o : sp.textContent;
    const parts = src.split(/(\s+)/);
    if (!parts.some((p) => has(act, p))) {
      if (sp.dataset.t7o != null) {
        sp.textContent = src;
        delete sp.dataset.t7o;
      }
      return;
    }
    sp.dataset.t7o = src;
    const frag = document.createDocumentFragment();
    let lastWrap = null;
    for (const p of parts) {
      const em = has(EM, p) ? EM[p] : null;
      if (em && em.zw && lastWrap) {
        lastWrap.appendChild(makeImg(p, em, "t7-zw"));
        continue;
      }
      if (em) {
        const w = document.createElement("span");
        w.className = "t7-w";
        w.appendChild(makeImg(p, em, "t7-e"));
        frag.appendChild(w);
        lastWrap = w;
        continue;
      }
      if (/^\s+$/.test(p)) {
        if (lastWrap) {
          frag.appendChild(document.createTextNode(p));
          continue;
        }
      } else if (p) {
        lastWrap = null;
      }
      if (p) frag.appendChild(document.createTextNode(p));
    }
    sp.textContent = "";
    sp.appendChild(frag);
  }
  function processLi(li) {
    if (li.dataset.t7) return;
    li.dataset.t7 = "1";
    if (li.classList.contains("cy-chat-sys") || li.classList.contains("cy-chat-ev") || li.classList.contains("cy-chat-0")) return;
    const spans = li.querySelectorAll(":scope > span:not([class])");
    const sp = spans[spans.length - 1];
    if (sp) processSpan(sp);
  }
  function scan() {
    const fresh = document.querySelectorAll(".cy-chat-l li:not([data-t7])");
    if (!fresh.length) return;
    fresh.forEach(processLi);
    stickEnds();
  }
  function rescanAll() {
    document.querySelectorAll(".cy-chat-l li[data-t7]").forEach((li) => {
      delete li.dataset.t7;
    });
    scan();
  }
  var applySize = () => document.documentElement.style.setProperty("--t7-h", SIZES[S2.size].h);

  // src/settings.js
  var SOFF = (() => {
    const p = store.get("t7spos");
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
  })();
  function setupDrag(el) {
    const win = el.querySelector(".t7-sw");
    const hd = el.querySelector(".t7-sth");
    const put = () => {
      win.style.transform = SOFF.x || SOFF.y ? `translate(${SOFF.x}px, ${SOFF.y}px)` : "";
    };
    put();
    const r0 = win.getBoundingClientRect();
    let fx = 0, fy = 0;
    if (r0.left < 8) fx = 8 - r0.left;
    else if (r0.right > innerWidth - 8) fx = innerWidth - 8 - r0.right;
    if (r0.top < 8) fy = 8 - r0.top;
    else if (r0.bottom > innerHeight - 8) fy = innerHeight - 8 - r0.bottom;
    if (fx || fy) {
      SOFF = { x: SOFF.x + fx, y: SOFF.y + fy };
      put();
    }
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.button > 0) return;
      const r = win.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId, ox = SOFF.x, oy = SOFF.y;
      let started = false, nx = ox, ny = oy, raf = 0;
      const apply = () => {
        raf = 0;
        SOFF = { x: nx, y: ny };
        put();
      };
      const move = (ev) => {
        if (!started) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          started = true;
          win.classList.add("t7-drag");
          try {
            hd.setPointerCapture(pid);
          } catch {
          }
        }
        nx = ox + clamp(ev.clientX - sx, 8 - r.left, innerWidth - r.width - 8 - r.left);
        ny = oy + clamp(ev.clientY - sy, 8 - r.top, innerHeight - r.height - 8 - r.top);
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        hd.removeEventListener("pointermove", move);
        hd.removeEventListener("pointerup", up);
        hd.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        if (!started) return;
        win.classList.remove("t7-drag");
        SOFF = { x: nx, y: ny };
        put();
        store.set("t7spos", SOFF);
      };
      hd.addEventListener("pointermove", move);
      hd.addEventListener("pointerup", up);
      hd.addEventListener("pointercancel", up);
    });
    hd.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      SOFF = { x: 0, y: 0 };
      store.set("t7spos", null);
      put();
    });
  }
  function updateSetStatus(t) {
    const e = st.set && st.set.querySelector(".t7-sst");
    if (e) e.textContent = t;
  }
  function onKey(e) {
    if (e.key === "Escape" && st.set) {
      e.stopPropagation();
      closeSettings();
    }
  }
  function closeSettings() {
    if (!st.set) return;
    st.set.remove();
    st.set = null;
    document.removeEventListener("keydown", onKey, true);
  }
  function openSettings() {
    if (st.set) return;
    const el = document.createElement("div");
    st.set = el;
    el.className = "t7-set";
    el.innerHTML = `
        <div class="t7-sw" role="dialog" aria-modal="true" aria-label="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 7TV">
            <div class="t7-sth"><b>\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 7TV</b><button type="button" class="t7-x" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">\xD7</button></div>

            <div class="t7-sec">
                <h4>\u042D\u043C\u043E\u0443\u0442\u044B</h4>
                <label class="t7-chk"><input type="checkbox" class="t7-on"> \u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u044D\u043C\u043E\u0443\u0442\u044B 7TV \u0432 \u0447\u0430\u0442\u0435</label>
            </div>

            <div class="t7-sec">
                <h4>\u041A\u0430\u043D\u0430\u043B</h4>
                <form class="t7-row">
                    <label class="t7-fl">\u041D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430 \u043D\u0430 Twitch<input type="text" class="t7-nick" maxlength="80" autocomplete="off" spellcheck="false"></label>
                    <button type="submit" class="t7-b p">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C</button>
                </form>
                <div class="t7-sst" role="status"></div>
            </div>

            <div class="t7-sec">
                <h4>\u0420\u0430\u0437\u043C\u0435\u0440 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u0432 \u0447\u0430\u0442\u0435</h4>
                <div class="t7-szb">${Object.keys(SIZES).map((k) => `<button type="button" data-sz="${k}" aria-pressed="false">${SIZES[k].label}</button>`).join("")}</div>
            </div>

            <div class="t7-sec">
                <h4>\u0414\u0430\u043D\u043D\u044B\u0435</h4>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button>
                    <button type="button" class="t7-b" data-act="cache">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A</button>
                    <button type="button" class="t7-b" data-act="pos">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u0448\u043A\u0430</button>
                </div>
            </div>
        </div>`;
    ["keydown", "keyup", "keypress"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener("pointerdown", (e) => {
      if (e.target === el) closeSettings();
    });
    el.querySelector(".t7-x").onclick = closeSettings;
    const on = el.querySelector(".t7-on");
    on.checked = S2.on;
    on.addEventListener("change", () => {
      S2.on = on.checked;
      store.set("t7on", S2.on);
      rescanAll();
    });
    const nickInp = el.querySelector(".t7-nick");
    nickInp.value = S2.nick;
    nickInp.placeholder = pageChan || "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, zakvielchannel";
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = nickInp.value.trim();
      const n = raw ? parseNick(raw) : pageChan;
      if (raw && !n) {
        setStatus("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043D\u0438\u043A: \u043D\u0443\u0436\u043D\u044B \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B \u0438 _");
        return;
      }
      S2.nick = n;
      nickInp.value = n;
      store.set("t7nick:" + pageChan, n);
      reload(true);
    });
    const mark = () => el.querySelectorAll("[data-sz]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sz === S2.size)));
    mark();
    el.querySelector(".t7-szb").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sz]");
      if (!b || b.dataset.sz === S2.size) return;
      S2.size = b.dataset.sz;
      store.set("t7size", S2.size);
      applySize();
      mark();
      rescanAll();
    });
    el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "refresh") reload(true);
      else if (b.dataset.act === "cache") {
        await clearImgs();
        setStatus("\u041A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A \u043E\u0447\u0438\u0449\u0435\u043D");
        st.hooks.emotes();
      } else if (b.dataset.act === "pos") {
        st.pos = null;
        st.win = null;
        store.set("t7pos", null);
        store.set("t7win", null);
        st.hooks.place();
        SOFF = { x: 0, y: 0 };
        store.set("t7spos", null);
        el.querySelector(".t7-sw").style.transform = "";
        setStatus("\u041F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u0448\u043A\u0430 \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u043E");
      }
    });
    document.body.appendChild(el);
    const px = el.querySelector(".t7-px"), pxs = el.querySelector(".t7-pxs");
    setupDrag(el);
    updateSetStatus(st.status);
    document.addEventListener("keydown", onKey, true);
  }

  // src/popup.js
  function chatInput() {
    const f = st.anchor && st.anchor.closest("form");
    return f && f.querySelector("input[type=text]");
  }
  function insertEmote(name) {
    const inp = chatInput();
    if (!inp || inp.disabled) return;
    const v = inp.value;
    const a = inp.selectionStart != null ? inp.selectionStart : v.length;
    const b = inp.selectionEnd != null ? inp.selectionEnd : a;
    const pre = v.slice(0, a), post = v.slice(b);
    const add = (pre && !/\s$/.test(pre) ? " " : "") + name + (/^\s/.test(post) ? "" : " ");
    const nv = pre + add + post;
    if (inp.maxLength > 0 && nv.length > inp.maxLength) return;
    inp.value = nv;
    const pos = (pre + add).length;
    try {
      inp.setSelectionRange(pos, pos);
    } catch {
    }
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    if (!matchMedia("(pointer: coarse)").matches) inp.focus({ preventScroll: true });
  }
  function onVis(entries) {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      if (st.io) st.io.unobserve(el);
      const em = EM[el.dataset.name];
      if (!em || el.dataset.l) continue;
      el.dataset.l = "1";
      fetchImg(urlFor(em, 1), false).then((d) => {
        el.firstChild.src = d;
      }, () => {
      });
    }
  }
  function filterGrid() {
    if (!st.pop) return;
    const q = st.pop.querySelector(".t7-q").value.trim().toLowerCase();
    st.pop.querySelectorAll(".t7-gw").forEach((w) => {
      let vis = 0;
      w.childNodes.forEach((b) => {
        const show = !q || b.dataset.name.toLowerCase().includes(q);
        b.hidden = !show;
        if (show) vis++;
      });
      w.hidden = !vis;
      w.previousElementSibling.hidden = !vis;
    });
  }
  function renderGrid() {
    if (!st.pop) return;
    const gr = st.pop.querySelector(".t7-gr");
    st.io.disconnect();
    gr.textContent = "";
    const names = Object.keys(EM).sort((a, b) => a.localeCompare(b, void 0, { sensitivity: "base" }));
    const sec = (title, list) => {
      if (!list.length) return;
      const h = document.createElement("div");
      h.className = "t7-sh";
      h.textContent = `${title} \xB7 ${list.length}`;
      const w = document.createElement("div");
      w.className = "t7-gw";
      for (const n of list) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "t7-it";
        b.dataset.name = n;
        b.title = n;
        b.setAttribute("aria-label", n);
        const im = document.createElement("img");
        im.alt = "";
        im.decoding = "async";
        b.appendChild(im);
        w.appendChild(b);
        st.io.observe(b);
      }
      gr.append(h, w);
    };
    sec("\u041A\u0430\u043D\u0430\u043B", names.filter((n) => !EM[n].g));
    sec("\u0413\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435", names.filter((n) => EM[n].g));
    if (!names.length) {
      const d = document.createElement("div");
      d.className = "t7-emp";
      d.textContent = "\u042D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442";
      gr.appendChild(d);
    }
    filterGrid();
  }
  var GR_MIN = 156;
  function minH(pop) {
    const gr = pop.querySelector(".t7-gr");
    const kids = [...pop.children].filter((c) => !c.classList.contains("t7-rs") && !c.hidden);
    let h = 22;
    for (const c of kids) h += c === gr ? GR_MIN : c.offsetHeight;
    h += 8 * (kids.length - 1);
    return Math.ceil(h);
  }
  function place() {
    const pop = st.pop, anchor = st.anchor;
    if (!pop || !anchor || !anchor.isConnected) return;
    pop.style.transform = "";
    const w = clamp(st.win ? st.win.w : 340, 240, Math.max(240, innerWidth - 16));
    pop.style.width = w + "px";
    const mh = minH(pop);
    const size = (room) => {
      room = Math.max(room, mh);
      pop.style.maxHeight = (st.win ? room : Math.min(520, room)) + "px";
      pop.style.height = st.win ? clamp(st.win.h, mh, room) + "px" : "";
    };
    if (st.pos) {
      const x = clamp(st.pos.x, 8, Math.max(8, innerWidth - w - 8));
      const y = clamp(st.pos.y, 8, Math.max(8, innerHeight - 120));
      pop.style.left = x + "px";
      pop.style.top = y + "px";
      pop.style.bottom = "auto";
      size(Math.max(200, innerHeight - y - 8));
      return;
    }
    const r = anchor.getBoundingClientRect();
    pop.style.left = clamp(r.right - w, 8, Math.max(8, innerWidth - w - 8)) + "px";
    const above = r.top, below = innerHeight - r.bottom;
    if (above >= 300 || above > below) {
      pop.style.top = "auto";
      pop.style.bottom = innerHeight - r.top + 8 + "px";
      size(Math.max(200, above - 16));
    } else {
      pop.style.bottom = "auto";
      pop.style.top = r.bottom + 8 + "px";
      size(Math.max(200, below - 16));
    }
  }
  function onOutside(e) {
    if (e.target.closest && e.target.closest(".t7-set")) return;
    if (st.pop && !st.pop.contains(e.target) && !(st.anchor && st.anchor.contains(e.target))) closePop();
  }
  function onKey2(e) {
    if (st.set) return;
    if (e.key === "Escape" && st.pop) {
      e.stopPropagation();
      const a = st.anchor;
      closePop();
      if (a && a.isConnected) a.focus({ preventScroll: true });
    }
  }
  function closePop() {
    if (!st.pop) return;
    st.pop.remove();
    st.pop = null;
    if (st.io) st.io.disconnect();
    st.io = null;
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey2, true);
    removeEventListener("resize", place);
  }
  function setupDrag2(pop) {
    const hd = pop.querySelector(".t7-h");
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.button > 0) return;
      const r = pop.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
      let started = false, nx = r.left, ny = r.top, raf = 0;
      const apply = () => {
        raf = 0;
        pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
      };
      const start = () => {
        started = true;
        pop.style.left = r.left + "px";
        pop.style.top = r.top + "px";
        pop.style.bottom = "auto";
        pop.style.maxHeight = r.height + "px";
        pop.classList.add("t7-drag");
        try {
          hd.setPointerCapture(pid);
        } catch {
        }
      };
      const move = (ev) => {
        if (!started) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          start();
        }
        nx = clamp(r.left + ev.clientX - sx, 8, innerWidth - r.width - 8);
        ny = clamp(r.top + ev.clientY - sy, 8, innerHeight - 120);
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        hd.removeEventListener("pointermove", move);
        hd.removeEventListener("pointerup", up);
        hd.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        if (!started || st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.pos = { x: nx, y: ny };
        store.set("t7pos", st.pos);
        place();
      };
      hd.addEventListener("pointermove", move);
      hd.addEventListener("pointerup", up);
      hd.addEventListener("pointercancel", up);
    });
    hd.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      st.pos = null;
      st.win = null;
      store.set("t7pos", null);
      store.set("t7win", null);
      place();
    });
  }
  function setupResize(pop) {
    const rs = pop.querySelector(".t7-rs");
    rs.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      const r = pop.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      pop.style.transform = "";
      pop.style.left = r.left + "px";
      pop.style.top = r.top + "px";
      pop.style.bottom = "auto";
      pop.style.maxHeight = "none";
      pop.classList.add("t7-drag");
      let w = r.width, h = r.height, raf = 0;
      const mh = minH(pop);
      try {
        rs.setPointerCapture(e.pointerId);
      } catch {
      }
      const apply = () => {
        raf = 0;
        pop.style.width = w + "px";
        pop.style.height = h + "px";
      };
      const move = (ev) => {
        w = clamp(r.width + ev.clientX - sx, 240, Math.max(240, innerWidth - r.left - 8));
        h = clamp(r.height + ev.clientY - sy, mh, Math.max(mh, innerHeight - r.top - 8));
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        rs.removeEventListener("pointermove", move);
        rs.removeEventListener("pointerup", up);
        rs.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        if (st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.win = { w, h };
        st.pos = { x: r.left, y: r.top };
        store.set("t7win", st.win);
        store.set("t7pos", st.pos);
        place();
      };
      rs.addEventListener("pointermove", move);
      rs.addEventListener("pointerup", up);
      rs.addEventListener("pointercancel", up);
    });
  }
  function openPop(btn) {
    st.anchor = btn;
    const pop = document.createElement("div");
    st.pop = pop;
    pop.className = "t7-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B 7TV");
    pop.innerHTML = `
        <div class="t7-h"><b>7TV</b><span class="t7-hb"><button type="button" class="t7-g" aria-label="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" title="\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438">\u2699</button><button type="button" class="t7-x" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">\xD7</button></span></div>
        <input type="search" class="t7-q" placeholder="\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0443\u0442\u043E\u0432" autocomplete="off" aria-label="\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0443\u0442\u043E\u0432">
        <div class="t7-gr"></div>
        <div class="t7-rs" title="\u041F\u043E\u0442\u044F\u043D\u0438, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440"></div>`;
    ["keydown", "keyup", "keypress"].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));
    setupDrag2(pop);
    setupResize(pop);
    pop.querySelector(".t7-x").onclick = () => {
      const a = st.anchor;
      closePop();
      if (a) a.focus({ preventScroll: true });
    };
    pop.querySelector(".t7-g").onclick = openSettings;
    pop.querySelector(".t7-q").addEventListener("input", filterGrid);
    const gr = pop.querySelector(".t7-gr");
    gr.addEventListener("click", (e) => {
      const b = e.target.closest(".t7-it");
      if (b) insertEmote(b.dataset.name);
    });
    st.io = new IntersectionObserver(onVis, { root: gr, rootMargin: "120px" });
    document.body.appendChild(pop);
    renderGrid();
    place();
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey2, true);
    addEventListener("resize", place);
  }
  function togglePop(btn) {
    if (st.pop && st.anchor === btn) closePop();
    else {
      closePop();
      openPop(btn);
    }
  }

  // src/buttons.js
  function ensureButtons() {
    document.querySelectorAll("form.cy-chat-f").forEach((f) => {
      if (f.querySelector(".t7-btn")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "t7-btn";
      b.textContent = "7TV";
      b.title = "\u042D\u043C\u043E\u0443\u0442\u044B 7TV";
      b.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B 7TV");
      b.setAttribute("aria-haspopup", "dialog");
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePop(b);
      });
      const sub = f.querySelector("button[type=submit]");
      if (sub) sub.after(b);
      else f.appendChild(b);
    });
    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
  }

  // src/main.js
  function init() {
    const style = document.createElement("style");
    style.textContent = styles_default;
    document.head.appendChild(style);
    const sz = store.get("t7size");
    if (SIZES[sz]) S2.size = sz;
    S2.nick = store.get("t7nick:" + pageChan) || pageChan;
    const p = store.get("t7pos");
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) st.pos = p;
    const w = store.get("t7win");
    if (w && Number.isFinite(w.w) && Number.isFinite(w.h)) st.win = w;
    applySize();
    if (store.get("t7on") === false) S2.on = false;
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => {
      rescanAll();
      renderGrid();
    };
    st.hooks.emotes = () => {
      rescanAll();
      renderGrid();
    };
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ensureButtons();
        scan();
      });
    };
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    ensureButtons();
    reload(false);
  }
  init();
})();
