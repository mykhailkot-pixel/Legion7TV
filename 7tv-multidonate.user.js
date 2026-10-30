// ==UserScript==
// @author       ProCto_Fliy
// @name         Legion chat extentions (7TV, более удобный чат и тд)
// @namespace    https://play.multidonate.ru/
// @version      4.7.6
// @description  Эмоуты 7TV в чате: кнопка 7TV, ник стримера, размер, список эмоутов, быстрый кеш
// @match        https://play.multidonate.ru/*
// @icon         https://cdn.7tv.app/emote/01F71VQYHR000D3ZZ6Q11NR7TV/2x.webp
// @homepageURL  https://github.com/mykhailkot-pixel/Legion7TV
// @updateURL    https://github.com/mykhailkot-pixel/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @downloadURL  https://github.com/mykhailkot-pixel/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @connect      7tv.io
// @connect      cdn.7tv.app
// @connect      api.ivr.fi
// @connect      workers.dev
// @license      MIT
// ==/UserScript==
(() => {
  var styles_default = '.t7-w{display:inline-block;position:relative;vertical-align:middle;line-height:0}\r\n.t7-e {\r\n    display: inline-block;\r\n    vertical-align: middle;\r\n    height: var(--t7-h, 1.9em);\r\n    width: auto;\r\n    min-width: var(--t7-h, 1.9em);\r\n    \r\n    aspect-ratio: auto; \r\n}\r\n.t7-zw{position:absolute;left:50%;bottom:0;transform:translateX(-50%);height:100%;width:auto;pointer-events:none}\r\n.t7-e:not([src]),.t7-zw:not([src]){visibility:hidden}\r\n\r\n\r\nform.cy-chat-f .t7-btn{\r\n    flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;\r\n    box-sizing:border-box;width:auto;height:auto;min-height:28px;margin:0 0 0 4px;padding:0 8px;\r\n    border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;\r\n    font:700 11px/1 system-ui,sans-serif;letter-spacing:0;text-indent:0;text-transform:none;\r\n    white-space:nowrap;vertical-align:middle;cursor:pointer}\r\nform.cy-chat-f .t7-btn:hover{background:rgb(165,100,255)}\r\nform.cy-chat-f{position:relative}\r\nform.cy-chat-f>.t7-ping-menu{position:absolute;left:auto;right:0;bottom:calc(100% + 5px);z-index:20;display:flex;flex-direction:column;width:min(210px,calc(100vw - 24px));max-height:132px;overflow-y:auto;padding:3px;border:1px solid rgba(255,255,255,.16);border-radius:6px;background:rgba(24,24,32,.88);box-shadow:0 5px 14px rgba(0,0,0,.28);backdrop-filter:blur(5px)}\r\nform.cy-chat-f>.t7-ping-menu[hidden]{display:none}\r\nform.cy-chat-f>.t7-ping-menu>.t7-ping-option{display:block;flex:none;width:100%;min-width:0;min-height:0;height:auto;margin:0;padding:4px 8px;border:0;border-radius:4px;background:transparent;color:#eee;text-align:left;text-transform:none;font:12px/1.25 system-ui,sans-serif;box-shadow:none}\r\nform.cy-chat-f>.t7-ping-menu>.t7-ping-option:hover,form.cy-chat-f>.t7-ping-menu>.t7-ping-option:focus-visible{background:rgba(255,255,255,.12);color:#fff;outline:none}\r\n\r\n\r\n.t7-pop,.t7-set{\r\n    --t7-bg:#1b1b24;--t7-bg-in:#0f0f15;--t7-fg:#eee;--t7-mute:#aaa;\r\n    --t7-line:rgba(255,255,255,.2);--t7-hover:rgba(255,255,255,.14);--t7-acc:#9146ff}\r\n.t7-pop *,.t7-set *{box-sizing:border-box}\r\n.t7-pop button,.t7-sw button{font:inherit;cursor:pointer}\r\n.t7-pop [hidden]{display:none!important}\r\n\r\n\r\n.t7-x,.t7-g{display:grid;place-items:center;flex:none;width:40px;height:40px;padding:0;background:none;border:0;color:#ccc;line-height:1;border-radius:6px}\r\n.t7-x{font-size:36px}\r\n.t7-g{font-size:29px}\r\n.t7-x:hover,.t7-g:hover{background:var(--t7-hover);color:#fff}\r\n\r\n\r\n.t7-pop{\r\n    position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:8px;\r\n    padding:10px;background:var(--t7-bg);color:var(--t7-fg);\r\n    border:1px solid rgba(255,255,255,.18);border-radius:10px;\r\n    box-shadow:0 8px 28px rgba(0,0,0,.55);font:13px/1.3 system-ui,sans-serif}\r\n.t7-pop.t7-drag{will-change:transform;transition:none}\r\n.t7-pop.t7-drag .t7-gr{pointer-events:none}\r\n\r\n.t7-h,.t7-sth{display:flex;justify-content:space-between;align-items:center;\r\n    font-size:15px;cursor:grab;touch-action:none;user-select:none}\r\n.t7-h:active,.t7-sth:active{cursor:grabbing}\r\n.t7-hb{display:flex;align-items:center;gap:2px}\r\n\r\n.t7-pop input[type=search]{\r\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\r\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\r\n.t7-views{display:flex;gap:3px;padding:2px;border:1px solid var(--t7-line);border-radius:6px;background:var(--t7-bg-in)}\r\n.t7-views button{flex:1;padding:5px 7px;border:0;border-radius:4px;background:transparent;color:var(--t7-mute);font-size:12px}\r\n.t7-views button[aria-selected=true]{background:var(--t7-hover);color:var(--t7-fg)}\r\n\r\n.t7-gr{flex:1;min-height:156px;overflow-y:auto;overscroll-behavior:contain}\r\n.t7-sh{margin:6px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--t7-mute)}\r\n.t7-gw{display:flex;flex-wrap:wrap;gap:2px}\r\n.t7-it{display:inline-flex;align-items:center;justify-content:center;\r\n    width:var(--t7-tile,40px);height:var(--t7-tile,40px);padding:3px;border:0;border-radius:6px;background:transparent}\r\n.t7-it:hover,.t7-it:focus-visible{background:var(--t7-hover)}\r\n.t7-it img{width:100%;height:100%;object-fit:contain}\r\n.t7-item{position:relative;flex:none;width:var(--t7-tile,40px);height:var(--t7-tile,40px)}\r\n.t7-item .t7-it{width:100%;height:100%}\r\n.t7-fav{position:absolute;top:0;right:0;z-index:1;display:grid;place-items:center;width:17px;height:17px;padding:0;border:0;border-radius:4px;background:rgba(15,15,21,.82);color:#e5c76b;font:14px/1 system-ui,sans-serif;opacity:.78}\r\n.t7-fav:hover,.t7-fav:focus-visible{opacity:1;background:var(--t7-hover)}\r\n.t7-emp{padding:16px 4px;color:var(--t7-mute);text-align:center}\r\n\r\n.t7-rs{position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none;\r\n    border-radius:0 0 10px 0;\r\n    background:linear-gradient(135deg,transparent 0 55%,#888 55% 62%,transparent 62% 72%,#888 72% 79%,transparent 79%)}\r\n\r\n\r\n.t7-set{\r\n    position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;\r\n    padding:12px;background:rgba(0,0,0,.5);font:13px/1.3 system-ui,sans-serif}\r\n.t7-sw{\r\n    width:380px;max-width:100%;max-height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:8px;\r\n    padding:14px;background:var(--t7-bg);color:var(--t7-fg);\r\n    border:1px solid rgba(255,255,255,.18);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.6)}\r\n.t7-sw.t7-drag{will-change:transform}\r\n\r\n.t7-sec{display:flex;flex-direction:column;gap:6px;padding:0 0 6px;border-bottom:1px solid rgba(255,255,255,.1);interpolate-size:allow-keywords}\r\n.t7-sec:last-of-type{padding-bottom:0;border-bottom:0}\r\n.t7-sec>summary{display:flex;align-items:center;justify-content:flex-start;gap:9px;min-height:32px;padding:0 2px;list-style:none;color:#c8c8d0;font-size:12px;font-weight:600;text-transform:none;cursor:pointer;user-select:none}\r\n.t7-sec>summary::-webkit-details-marker{display:none}\r\n.t7-sec>summary::before{content:"";flex:none;width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform 180ms ease,color 180ms ease}\r\n.t7-sec>summary:hover,.t7-sec[open]>summary{color:#fff}\r\n.t7-sec>summary:focus-visible{outline:2px solid rgba(255,201,77,.75);outline-offset:2px}\r\n.t7-sec[open]>summary::before{transform:rotate(45deg)}\r\n.t7-sec>summary~*{margin-left:15px}\r\n.t7-sec::details-content{block-size:0;overflow:clip;opacity:0;transition:block-size 220ms ease,opacity 180ms ease,content-visibility 220ms allow-discrete}\r\n.t7-sec[open]::details-content{block-size:auto;opacity:1}\r\n@media(prefers-reduced-motion:reduce){.t7-sec::details-content,.t7-sec>summary::after{transition:none}}\r\n.t7-row{display:flex;gap:6px;align-items:flex-end}\r\n.t7-wrap{flex-wrap:wrap}\r\n.t7-fl{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--t7-mute)}\r\n.t7-chk{display:flex;gap:8px;align-items:center;cursor:pointer}\r\n.t7-sst{min-height:1.3em;font-size:11px;color:var(--t7-mute)}\r\n.t7-note{display:flex;align-items:center;gap:8px;margin:0;padding:8px 10px;border:1px solid rgba(255,201,77,.3);border-left:3px solid #ffc94d;border-radius:4px;background:rgba(255,201,77,.08);color:#e8d6a4;font-size:12px;line-height:1.35}\r\n.t7-note-icon{display:grid;place-items:center;flex:none;width:18px;height:18px;border-radius:50%;background:rgba(255,201,77,.18);color:#ffc94d;font-size:12px;font-weight:700}\r\n\r\n.t7-sw input[type=text],.t7-sw input[type=number]{\r\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\r\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\r\n.t7-sw textarea,.t7-sw select{\r\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\r\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\r\n.t7-sw textarea{resize:vertical;min-height:44px}\r\n.t7-volume{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px}\r\n.t7-volume input{grid-column:1/-1;width:100%;margin:2px 0}\r\n.t7-volume output,.t7-ping-status{font-size:11px;color:var(--t7-mute)}\r\n.t7-ping-status{min-height:1.3em}\r\n\r\n.t7-b{padding:6px 10px;border-radius:6px;border:1px solid var(--t7-line);background:var(--t7-bg-in);color:#ddd}\r\n.t7-b:hover{background:#1d1d29}\r\n.t7-b.p{background:var(--t7-acc);border-color:var(--t7-acc);color:#fff}\r\n\r\n.t7-szb{display:flex;gap:4px}\r\n.t7-szb button{min-width:34px;padding:4px 8px;border-radius:6px;border:1px solid var(--t7-line);background:var(--t7-bg-in);color:#ddd}\r\n.t7-szb button[aria-pressed=true]{background:var(--t7-acc);border-color:var(--t7-acc);color:#fff}\r\n.t7-chat-tab-list{display:flex;flex-direction:column;gap:3px}\r\n.t7-chat-tab-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:2px 0}\r\n.t7-chat-tab-name{flex:1;min-width:0;font-size:12px;color:var(--t7-fg)}\r\n.t7-chat-tab-visible{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--t7-mute);white-space:nowrap;cursor:pointer}\r\n.t7-chat-tab-visible input{margin:0;accent-color:#ffc94d}\r\n.t7-chat-tab-move{display:inline-flex;gap:3px}\r\n.t7-chat-tab-move button{display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid var(--t7-line);border-radius:4px;background:var(--t7-bg-in);color:#ddd}\r\n.t7-chat-tab-move button:disabled{opacity:.35;cursor:default}\r\n\r\n\r\n.cy-chat-tabs:not([hidden]){\r\n    display:flex;flex-wrap:nowrap;gap:2px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;\r\n    overflow-x:auto;overflow-y:hidden;scrollbar-width:none}\r\n.cy-chat-tabs::-webkit-scrollbar{display:none}\r\n.cy-chat-tabs>button[data-tab]{\r\n    flex:0 0 auto;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:3px;\r\n    padding:5px 6px;font-size:11px;line-height:1.2;white-space:nowrap;overflow:visible}\r\n.cy-chat-tabs>button .cy-chat-tn{flex:none;margin:0;min-width:1.5em;padding:1px 4px;line-height:1.3;text-align:center;overflow:visible}\r\n.cy-chat-h .t7-chat-filter{display:inline-flex;align-items:center;gap:4px;margin-left:auto;padding:3px 5px;border-radius:4px;font:11px/1.2 system-ui,sans-serif;white-space:nowrap;cursor:pointer;user-select:none}\r\n.cy-chat-h .t7-chat-filter input{width:13px;height:13px;margin:0;accent-color:#ffc94d;flex:none}\r\n.cy-chat-h .t7-chat-filter span{white-space:nowrap}\r\n.cy-chat-h .t7-ping-nav{display:inline-flex;align-items:center;gap:2px;margin-left:4px}\r\n.cy-chat-h .t7-ping-nav[hidden]{display:none!important}\r\n.cy-chat-h .t7-ping-nav button{display:grid;place-items:center;width:22px;height:22px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:3px;background:transparent;color:inherit;font:16px/1 system-ui,sans-serif;cursor:pointer}\r\n.cy-chat-h .t7-ping-nav button:disabled{opacity:.35;cursor:default}\r\n.cy-chat-h.t7-chat-drag-handle{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}\r\n.cy-chat.t7-chat-dragging .cy-chat-h{cursor:grabbing}\r\n\r\n\r\n.cy-chat .cy-chat-n,\r\n.cy-chat .cy-chat-tn,\r\n.cy-chat .cy-chat-tp,\r\n.cy-chat .cy-chat-pn{\r\n    flex:none;display:inline-block;box-sizing:border-box;min-width:18px;height:18px;margin:0 0 0 4px;padding:0 5px;\r\n    border-radius:9px;font:700 11px/18px system-ui,sans-serif;text-align:center;text-indent:0;overflow:visible}\r\n.cy-chat .cy-chat-n,\r\n.cy-chat .cy-chat-tn{background:#e53935;color:#fff}\r\n.cy-chat .cy-chat-tp,\r\n.cy-chat .cy-chat-pn{background:#ffc94d;color:#1b1b24}\r\n.cy-chat .cy-chat-n[hidden],\r\n.cy-chat .cy-chat-tn[hidden],\r\n.cy-chat .cy-chat-tp[hidden],\r\n.cy-chat .cy-chat-pn[hidden]{display:none!important}\r\n.cy-chat-l>li.t7-ping-hidden{display:none!important}\r\n.cy-chat-l[data-t7-no-pings="true"]:after{display:block;padding:12px 6px;color:#aaa;font:12px/1.4 system-ui,sans-serif;text-align:center;content:"\u041F\u0438\u043D\u0433\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442"}\r\n.cy-chat-l>li.t7-filtered{font-style:italic}\r\n.cy-chat-l>li>.t7-filter-label{display:inline-block;margin-right:5px;padding:2px 6px;border-radius:4px;background:rgba(255,201,77,.14);color:#ffca66;font-size:13px;font-weight:700;white-space:nowrap}\r\n.cy-chat-l>li.t7-filtered>:not(.t7-filter-label){display:none!important}\r\n.cy-chat-l,.cy-chat-l li,.cy-chat-l li span,.cy-chat-l li a{-webkit-user-select:text!important;user-select:text!important}\r\n.cy-chat-l a.t7-link{color:#8edbff;text-decoration:underline;text-underline-offset:2px;cursor:pointer}\r\n.cy-chat-tabs>button[data-tab][hidden]{display:none!important}\r\n\r\n.cy-chat-dmx, .cy-chat-l {\r\n  overflow-anchor: auto;\r\n}\r\n\r\n\r\n.cy-chat-dmx img.t7-e {\r\n  content-visibility: auto;\r\n}\r\n\r\n\r\nform.cy-chat-f .t7-btn, form.dm-f .t7-btn{\r\n    flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;\r\n    box-sizing:border-box;width:auto;height:auto;min-height:28px;margin:0 0 0 4px;padding:0 8px;\r\n    border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;\r\n    font:700 11px/1 system-ui,sans-serif;letter-spacing:0;text-indent:0;text-transform:none;\r\n    white-space:nowrap;vertical-align:middle;cursor:pointer}\r\nform.cy-chat-f .t7-btn:hover, form.dm-f .t7-btn:hover{background:rgb(165,100,255)}\r\nform.dm-f{position:relative}';
  var CACHE_TTL = 60 * 60 * 1e3;
  var SIZES = {
    s: { h: "1.3em", n: 2, p: 32, label: "S" },
    m: { h: "1.9em", n: 2, p: 40, label: "M" },
    l: { h: "2.6em", n: 3, p: 52, label: "L" },
    x: { h: "3.4em", n: 3, p: 68, label: "XL" }
  };
  var pageChan = (() => {
    const m = /\/c\/([\w]+)/.exec(location.pathname);
    return m ? m[1].toLowerCase() : "";
  })();
  var EXTRA_EMOTES = [
    { id: "01KPTZTF2P1MP5RFNJ4Q1ZQZS6" },
    { id: "01J64BY7C0000FXZ59PB5ZMYVJ" },
    { id: "01JW6SB53B0B9T6EMJ4QWZA326" }
  ];
  var EXTRA_SETS = [
  ];
  var STORE = Object.freeze({
    emoteSize: "t7size",
    channelNickPrefix: "t7nick:",
    popupPosition: "t7pos",
    popupSize: "t7win",
    settingsPosition: "t7spos",
    emotesEnabled: "t7on",
    emoteCachePrefix: "t7c2:",
    favorites: "t7favorites",
    recentEmotes: "t7recent",
    recentEmoteLimit: "t7recentLimit",
    pingConfig: "t7ping",
    pingOnly: "t7PingOnly",
    pingArchive: "t7PingArchive",
    chatTabPrefs: "t7ChatTabPrefs",
    cityChatPosition: "t7CityChatPosition",
    linkEncoding: "t7LinkEncoding",
    networkProxy: "t7proxy"
  });
  var EV = Object.freeze({
    tabCompletionChange: "t7-tab-completion-change",
    chatTabsChange: "t7-chat-tabs-change",
    recentLimitChange: "t7-recent-limit-change"
  });
  var SEL = Object.freeze({
    chatRoot: ".cy-chat",
    chatList: ".cy-chat-l",
    chatRows: ".cy-chat-l li",
    freshChatRows: ".cy-chat-l li:not([data-l7tv-processed])",
    processedChatRows: ".cy-chat-l li[data-l7tv-processed]",
    dmRoot: ".cy-chat-dmx",
    freshDmRows: ".cy-chat-dmx li:not([data-l7tv-processed])",
    processedDmRows: ".cy-chat-dmx li[data-l7tv-processed]",
    messageContent: ":scope > span:not([class])",
    nonEmptyChatRows: ":scope > li:not(.cy-chat-0)",
    chatForm: "form.cy-chat-f",
    dmForm: "form.dm-f",
    chatForms: "form.cy-chat-f, form.dm-f",
    textInput: "input[type=text]",
    submitButton: "button[type=submit]",
    nickButtons: ".cy-chat-l b[data-nick]",
    nickButton: "b[data-nick]",
    chatTabs: ".cy-chat-tabs",
    chatTabButtons: ".cy-chat-tabs [data-tab]",
    chatHeader: ".cy-chat-h",
    chatCloseButton: ".cy-chat-x",
    chatToggleButton: ".cy-chat-t",
    emptyMessage: ".cy-chat-0",
    systemMessage: ".cy-chat-sys",
    eventMessage: ".cy-chat-ev"
  });
  var clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  function emit(name, detail) {
    const event = detail === void 0 ? new Event(name) : new CustomEvent(name, { detail });
    document.dispatchEvent(event);
    return event;
  }
  function on(name, listener, options) {
    document.addEventListener(name, listener, options);
    return () => document.removeEventListener(name, listener, options);
  }
  var S = { nick: pageChan, size: "m", on: true };
  var EM = {};
  var st = {
    pos: null,
    win: null,
    pop: null,
    anchor: null,
    io: null,
    status: "",
    loadToken: 0,
    hooks: {
      status() {
      },
      emotes() {
      },
      place() {
      }
    }
  };
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
    const v = store.get(STORE.networkProxy);
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
  function mk(host, flags, isGlobal, isExtra) {
    const files = (host.files || []).filter((f) => f.format === "WEBP").map((f) => f.name);
    return {
      base: "https:" + host.url,
      f: files.length ? files : ["1x.webp", "2x.webp"],
      zw: !!(flags & 256),
      g: isGlobal,
      ...isExtra ? { x: true } : {}
    };
  }
  function addSet(map, set, isGlobal, isExtra) {
    for (const e of set && set.emotes || []) {
      const host = e.data && e.data.host;
      if (!host || !host.url || e.name === "__proto__") continue;
      map[e.name] = mk(host, e.data.flags, isGlobal, isExtra);
    }
  }
  function addOne(map, em, alias) {
    const host = em && em.host;
    const name = String(alias || em && em.name || "");
    if (!host || !host.url || !name || /\s/.test(name) || name === "__proto__") return false;
    map[name] = mk(host, em.flags, true, true);
    return true;
  }
  var xsig = () => {
    const s = EXTRA_SETS.join(",") + "|" + EXTRA_EMOTES.map((e) => e.id + (e.name || "")).join(",");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
    return (h >>> 0).toString(36);
  };
  async function loadExtras() {
    const out = {};
    let bad = 0;
    const jobs = [
      ...EXTRA_SETS.map(async (id) => {
        const m = {};
        addSet(m, await getJson("https://7tv.io/v3/emote-sets/" + encodeURIComponent(id)), true, true);
        return m;
      }),
      ...EXTRA_EMOTES.map(async ({ id, name }) => {
        const m = {};
        if (!addOne(m, await getJson("https://7tv.io/v3/emotes/" + encodeURIComponent(id)), name))
          throw new Error("\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445: " + id);
        return m;
      })
    ];
    const res = await Promise.allSettled(jobs);
    for (const r of res) {
      if (r.status === "fulfilled") Object.assign(out, r.value);
      else {
        bad++;
        console.warn("[7TV] \u0441\u0432\u043E\u0438 \u044D\u043C\u043E\u0443\u0442\u044B", r.reason);
      }
    }
    return { map: out, bad };
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
    const key = STORE.emoteCachePrefix + nick + ":" + xsig();
    if (!force) {
      const c = store.get(key);
      if (c) return { map: c.map, msg: c.msg, stale: Date.now() - c.at >= CACHE_TTL };
    }
    const map = {};
    let err = "";
    try {
      addSet(map, await getJson("https://7tv.io/v3/emote-sets/global"), true, false);
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
          if (set && set.emotes && set.emotes.length) addSet(map, set, false, false);
          else chanMsg = "\u0443 \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435\u0442 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 7TV";
        }
      } catch (e) {
        chanMsg = "\u044D\u043C\u043E\u0443\u0442\u044B \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C (\u043D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 7TV \u0438\u043B\u0438 \u0441\u0435\u0440\u0432\u0438\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D)";
        console.warn("[7TV]", e);
      }
    }
    let bad = 0;
    if (EXTRA_EMOTES.length || EXTRA_SETS.length) {
      const ex = await loadExtras();
      Object.assign(map, ex.map);
      bad = ex.bad;
    }
    const names = Object.keys(map);
    const nc = names.filter((n) => !map[n].g).length;
    const xc = names.filter((n) => map[n].x).length;
    let msg = `\u041A\u0430\u043D\u0430\u043B: ${nc} \xB7 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435: ${names.length - nc - xc}`;
    if (xc || bad) msg += ` \xB7 \u0441\u0432\u043E\u0438: ${xc}${bad ? " (\u043D\u0435 \u0432\u0441\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C: " + bad + ")" : ""}`;
    if (chanMsg) msg += " \xB7 " + chanMsg;
    if (err) msg += " \xB7 " + err;
    if (names.length && !chanMsg && !err && !bad) store.set(key, { at: Date.now(), map, msg });
    return { map, msg, stale: false };
  }
  function setStatus(t) {
    st.status = t;
    st.hooks.status(t);
  }
  async function reload(force) {
    const my = ++st.loadToken;
    if (force) setStatus("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026");
    const { map, msg, stale } = await loadEmotes(S.nick, force);
    if (my !== st.loadToken) return;
    for (const k of Object.keys(EM)) delete EM[k];
    Object.assign(EM, map);
    setStatus(msg);
    st.hooks.emotes();
    if (stale) reload(true);
  }
  var has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
  function parseNick(v) {
    v = String(v || "").trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
    const i = v.lastIndexOf("/");
    if (i >= 0) v = v.slice(i + 1);
    v = v.replace(/^@/, "");
    return /^[a-z0-9_]{1,25}$/.test(v) ? v : "";
  }
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
  function makeImg(name, em, cls, stickFrom2) {
    const img = document.createElement("img");
    img.className = cls;
    img.alt = name;
    img.title = name;
    img.addEventListener("load", () => stickFrom2(img));
    fetchImg(urlFor(em, SIZES[S.size].n), true).then(
      (data) => {
        img.src = data;
      },
      (error) => {
        console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", name, error);
        img.replaceWith(document.createTextNode(name));
      }
    );
    return img;
  }
  function processEmotes({ content, kind, source, stickFrom: stickFrom2 }) {
    if (kind !== "message") return;
    const parts = source.split(/(\s+)/);
    if (!S.on || !parts.some((part) => has(EM, part))) return;
    const fragment = document.createDocumentFragment();
    let lastWrap = null;
    for (const part of parts) {
      const emote = has(EM, part) ? EM[part] : null;
      if (emote && emote.zw && lastWrap) {
        lastWrap.appendChild(makeImg(part, emote, "t7-zw", stickFrom2));
        continue;
      }
      if (emote) {
        const wrapper = document.createElement("span");
        wrapper.className = "t7-w";
        wrapper.appendChild(makeImg(part, emote, "t7-e", stickFrom2));
        fragment.appendChild(wrapper);
        lastWrap = wrapper;
        continue;
      }
      if (/^\s+$/.test(part)) {
        if (lastWrap) {
          fragment.appendChild(document.createTextNode(part));
          continue;
        }
      } else if (part) {
        lastWrap = null;
      }
      if (part) fragment.appendChild(document.createTextNode(part));
    }
    content.replaceChildren(fragment);
  }
  var SAY_RE = /^\/api\/(?:city\/say|mine\/chat\/say)(?:\?|$)/;
  var LINK_ENCODING_KEY = STORE.linkEncoding;
  var isLinkEncodingEnabled = () => store.get(LINK_ENCODING_KEY) === true;
  var setLinkEncodingEnabled = (enabled) => store.set(LINK_ENCODING_KEY, !!enabled);
  var HTTP_RE = /(?<![\p{L}\p{N}_])http:\/\/\S/iu;
  var URL_RE = /\[ref\]\{[^{}\s]+\}|https:\/\/[^\s<>"']+|www\.[^\s<>"']+/giu;
  var HOST_OK = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
  var TLD = "[a-z]{2}|com|net|org|info|dev|app|xyz|online|site|tech|gov|edu|club|shop|store|blog|cloud|live|link";
  var LINK_RE = new RegExp(
    "(?<![\\p{L}\\p{N}_@/.:%-])(?:https:\\/\\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:" + TLD + ")(?![\\p{L}\\p{N}-])(?::\\d{1,5})?(?:[/?#]\\S*)?",
    "giu"
  );
  function trimTrailingPunct(raw, options = {}) {
    let end = raw.length;
    while (end > 0) {
      const char = raw[end - 1];
      if (/[.,!?;:]/.test(char) || options.stripQuotes && (char === '"' || char === "'") || options.stripBrackets && char === "]") {
        end--;
        continue;
      }
      if (char === ")") {
        const text = raw.slice(0, end);
        const unbalanced = (text.match(/\)/g) || []).length > (text.match(/\(/g) || []).length;
        if (options.stripClosingParens || unbalanced) {
          end--;
          continue;
        }
      }
      break;
    }
    return { clean: raw.slice(0, end), tail: raw.slice(end) };
  }
  function isSafeHttpsUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && HOST_OK.test(url.hostname);
    } catch {
      return false;
    }
  }
  function encodeOne(raw) {
    let { clean: url, tail } = trimTrailingPunct(raw, {
      stripClosingParens: true,
      stripQuotes: true,
      stripBrackets: true
    });
    url = url.replace(/^https:\/\//i, "");
    const i = url.search(/[/?#]/);
    const host = (i < 0 ? url : url.slice(0, i)).toLowerCase().replace(/\./g, "_");
    const rest = i < 0 ? "" : url.slice(i).replace(/\./g, "%2E").replace(/\{/g, "%7B").replace(/\}/g, "%7D");
    return "[ref]{" + host + rest + "}" + tail;
  }
  var encodeLinks = (text) => text.replace(LINK_RE, encodeOne);
  function refToUrl(body) {
    const i = body.search(/[/?#]/);
    const host = (i < 0 ? body : body.slice(0, i)).replace(/_/g, ".");
    const rest = i < 0 ? "" : body.slice(i).replace(/%2E/gi, ".");
    return "https://" + host + rest;
  }
  function linkifyText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement && node.parentElement.closest("a")) continue;
      const text = node.nodeValue;
      const matches = [...text.matchAll(URL_RE)];
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const match of matches) {
        const start = match.index;
        if (start < offset) continue;
        const { clean: url } = trimTrailingPunct(match[0]);
        let href, label;
        if (/^\[ref\]/i.test(url)) {
          href = refToUrl(url.slice(6, -1));
          label = href.slice(8);
        } else {
          href = url.startsWith("www.") ? "https://" + url : url;
          label = url;
        }
        fragment.appendChild(document.createTextNode(text.slice(offset, start)));
        if (isSafeHttpsUrl(href)) {
          const anchor = document.createElement("a");
          anchor.className = "t7-link";
          anchor.href = href;
          anchor.title = href;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.textContent = label;
          fragment.appendChild(anchor);
          offset = start + url.length;
        } else {
          fragment.appendChild(document.createTextNode(match[0]));
          offset = start + match[0].length;
        }
      }
      fragment.appendChild(document.createTextNode(text.slice(offset)));
      node.replaceWith(fragment);
    }
  }
  function processLinks({ content }) {
    linkifyText(content);
  }
  async function sendWithLinks(call, path, body) {
    if (!isLinkEncodingEnabled()) return call(path, body);
    const text = body && body.text;
    if (typeof text !== "string") return call(path, body);
    if (HTTP_RE.test(text)) return { ok: false, error: "\u0441\u0441\u044B\u043B\u043A\u0438 http:// \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F - \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 https://" };
    const encoded = encodeLinks(text);
    return call(path, encoded === text ? body : { ...body, text: encoded });
  }
  var processors = [];
  var SOURCE_KEY = "l7tvEmoteSource";
  function registerChatProcessor(processor) {
    if (typeof processor === "function" && !processors.includes(processor)) processors.push(processor);
  }
  registerChatProcessor(processEmotes);
  registerChatProcessor(processLinks);
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("cy-chat-l"))
      t.dataset.t7end = t.scrollHeight - t.scrollTop - t.clientHeight < 40 ? "1" : "0";
  }, true);
  function stickEnds() {
    document.querySelectorAll(SEL.chatList).forEach((l) => {
      if (l.dataset.t7end !== "0") l.scrollTop = l.scrollHeight;
    });
  }
  function stickFrom(el) {
    const l = el.closest && el.closest(SEL.chatList);
    if (l && l.dataset.t7end !== "0") l.scrollTop = l.scrollHeight;
  }
  function processMessage(message, room) {
    if (message.dataset.l7tvProcessed || message.matches(SEL.emptyMessage)) return;
    const kind = message.matches(SEL.systemMessage) ? "system" : message.matches(SEL.eventMessage) ? "event" : "message";
    let content = message;
    if (kind === "message") {
      const spans = message.querySelectorAll(SEL.messageContent);
      content = spans[spans.length - 1];
      if (!content) return;
    }
    const source = kind === "message" ? content.dataset[SOURCE_KEY] != null ? content.dataset[SOURCE_KEY] : content.dataset.t7o != null ? content.dataset.t7o : content.textContent : content.textContent;
    if (kind === "message") {
      content.dataset[SOURCE_KEY] = source;
      content.replaceChildren(document.createTextNode(source));
    }
    message.dataset.l7tvProcessed = "1";
    const context = { message, content, room, kind, source, stickFrom };
    for (const processor of processors) processor(context);
  }
  function scan() {
    const chatFresh = document.querySelectorAll(SEL.freshChatRows);
    chatFresh.forEach((message) => processMessage(message, "chat"));
    if (chatFresh.length) stickEnds();
    document.querySelectorAll(SEL.freshDmRows).forEach((message) => processMessage(message, "dm"));
  }
  function rescanAll() {
    document.querySelectorAll(`${SEL.processedChatRows}, ${SEL.processedDmRows}`).forEach((message) => {
      delete message.dataset.l7tvProcessed;
    });
    scan();
  }
  var applySize = () => {
    document.documentElement.style.setProperty("--t7-h", SIZES[S.size].h);
    document.documentElement.style.setProperty("--t7-tile", SIZES[S.size].p + "px");
  };
  var CONFIG_KEY = STORE.pingConfig;
  var PRESETS = /* @__PURE__ */ new Set(["bell", "chime", "pop", "custom"]);
  var DEFAULTS = {
    volume: 0.5,
    selectedPreset: "bell",
    customSound: "",
    tabCompletion: true,
    aliases: [],
    blacklist: [],
    stopWords: []
  };
  function normalizeList(value) {
    return String(value || "").split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  }
  function readConfig() {
    const saved = store.get(CONFIG_KEY);
    const config = { ...DEFAULTS, ...saved && typeof saved === "object" ? saved : {} };
    config.volume = Number.isFinite(config.volume) ? Math.max(0, Math.min(1, config.volume)) : DEFAULTS.volume;
    config.selectedPreset = PRESETS.has(config.selectedPreset) ? config.selectedPreset : DEFAULTS.selectedPreset;
    config.customSound = typeof config.customSound === "string" && config.customSound.startsWith("data:audio/") ? config.customSound : "";
    config.tabCompletion = config.tabCompletion !== false;
    for (const key of ["aliases", "blacklist", "stopWords"]) {
      config[key] = Array.isArray(config[key]) ? normalizeList(config[key].join("\n")) : [];
    }
    return config;
  }
  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  var PingSystem = class {
    constructor() {
      this.config = readConfig();
      this.listeners = /* @__PURE__ */ new Set();
      this.regexCache = /* @__PURE__ */ new Map();
      this.audioContext = null;
      this.customBuffer = null;
      this.customBufferPromise = null;
    }
    subscribe(listener) {
      if (typeof listener !== "function") return () => {
      };
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    notify() {
      for (const listener of this.listeners) {
        try {
          listener(this.config);
        } catch (error) {
          console.warn("[7TV] \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043F\u0438\u043D\u0433\u043E\u0432", error);
        }
      }
    }
    save() {
      store.set(CONFIG_KEY, this.config);
    }
    setList(key, value) {
      if (!["aliases", "blacklist", "stopWords"].includes(key)) return;
      this.config[key] = normalizeList(value);
      if (key === "aliases") this.regexCache.clear();
      this.save();
      this.notify();
    }
    setTabCompletion(enabled) {
      this.config.tabCompletion = !!enabled;
      this.save();
      emit(EV.tabCompletionChange);
    }
    toggleBlacklist(login) {
      const user = String(login || "").trim().toLowerCase();
      if (!user) return false;
      const blocked = this.config.blacklist.includes(user);
      const next = blocked ? this.config.blacklist.filter((item) => item !== user) : [...this.config.blacklist, user];
      this.setList("blacklist", next.join("\n"));
      return !blocked;
    }
    setVolume(value) {
      const volume = Number(value);
      this.config.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULTS.volume;
      this.save();
    }
    setPreset(value) {
      if (!PRESETS.has(value) || value === "custom" && !this.config.customSound) return;
      this.config.selectedPreset = value;
      this.save();
    }
    saveCustomSound(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("audio/")) return reject(new Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B"));
        if (file.size > 2 * 1024 * 1024) return reject(new Error("\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 2 \u041C\u0411"));
        const reader = new FileReader();
        reader.onload = () => {
          this.config.customSound = String(reader.result || "");
          this.config.selectedPreset = "custom";
          this.customBuffer = null;
          this.customBufferPromise = null;
          this.save();
          resolve();
        };
        reader.onerror = () => reject(new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B"));
        reader.readAsDataURL(file);
      });
    }
    isPinged(messageText, extraAliases = []) {
      const text = String(messageText || "");
      for (const raw of [...this.config.aliases, ...extraAliases]) {
        const alias = String(raw || "").trim().toLowerCase();
        if (!alias) continue;
        let matcher = this.regexCache.get(alias);
        if (!matcher) {
          matcher = new RegExp("(^|[^\\p{L}\\p{N}_])" + escapeRegex(alias) + "(?=$|[^\\p{L}\\p{N}_])", "iu");
          this.regexCache.set(alias, matcher);
        }
        if (matcher.test(text)) return true;
      }
      return false;
    }
    filterLabel(sender, messageText) {
      const user = String(sender || "").toLowerCase();
      const text = String(messageText || "").toLowerCase();
      if (this.config.blacklist.includes(user)) return "\u0412 \u0427\u0421";
      if (this.config.stopWords.some((word) => text.includes(word))) return "\u0424\u0438\u043B\u044C\u0442\u0440";
      return "";
    }
    shouldIgnore(sender, messageText) {
      return !!this.filterLabel(sender, messageText);
    }
    getAudioContext() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.audioContext ||= new AudioContext();
      return this.audioContext;
    }
    unlockAudio() {
      try {
        const context = this.getAudioContext();
        if (context && context.state === "suspended") context.resume();
      } catch (error) {
        console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u043E", error);
      }
    }
    async loadCustomBuffer(context) {
      if (this.customBuffer) return this.customBuffer;
      if (!this.customBufferPromise) {
        this.customBufferPromise = (async () => {
          const encoded = this.config.customSound.split(",")[1];
          if (!encoded) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B");
          const binary = atob(encoded);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return context.decodeAudioData(bytes.buffer);
        })();
      }
      this.customBuffer = await this.customBufferPromise;
      return this.customBuffer;
    }
    async play() {
      if (this.config.volume <= 0) return;
      const context = this.getAudioContext();
      if (!context) return;
      if (context.state === "suspended") await context.resume();
      if (this.config.selectedPreset === "custom" && this.config.customSound) {
        try {
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = await this.loadCustomBuffer(context);
          gain.gain.value = this.config.volume;
          source.connect(gain);
          gain.connect(context.destination);
          source.start();
        } catch (error) {
          this.customBufferPromise = null;
          console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u043A\u043E\u0434\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0437\u0432\u0443\u043A", error);
        }
        return;
      }
      const tones = {
        bell: [[740, 0, 0.24, "sine"], [988, 0.08, 0.3, "sine"]],
        chime: [[660, 0, 0.32, "sine"], [880, 0.12, 0.4, "sine"]],
        pop: [[360, 0, 0.12, "triangle"], [220, 0.04, 0.16, "sine"]]
      }[this.config.selectedPreset] || [];
      for (const [frequency, offset, duration, type] of tones) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + offset;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(1e-4, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(1e-3, this.config.volume * 0.35), start + 0.015);
        gain.gain.exponentialRampToValueAtTime(1e-4, start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration);
      }
    }
  };
  var pingSystem = new PingSystem();
  var DEFAULT_ORDER = ["lg", "g", "dm", "tr", "ev"];
  var TAB_IDS = new Set(DEFAULT_ORDER);
  var DEFAULT_RECENT_LIMIT = 20;
  var MAX_RECENT_LIMIT = 100;
  var CHAT_TABS = [
    { id: "lg", label: "\u0416\u0443\u0440\u043D\u0430\u043B" },
    { id: "g", label: "\u041E\u0431\u0449\u0438\u0439" },
    { id: "dm", label: "\u041B\u0438\u0447\u043D\u044B\u0435" },
    { id: "tr", label: "\u0422\u043E\u0440\u0433\u043E\u0432\u043B\u044F" },
    { id: "ev", label: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F" }
  ];
  function createPref(key, { read = (value) => value, write = (value) => value } = {}) {
    return {
      get() {
        return read(store.get(key));
      },
      set(value) {
        store.set(key, write(value));
        return value;
      }
    };
  }
  function normalizeChatTabs(value) {
    const prefs = value && typeof value === "object" ? value : {};
    const savedOrder = Array.isArray(prefs.order) ? prefs.order.map((id) => id === "mn" ? "g" : id).filter((id) => TAB_IDS.has(id)) : [];
    const order = [.../* @__PURE__ */ new Set([...savedOrder, ...DEFAULT_ORDER])];
    const hiddenValues = prefs.hidden instanceof Set ? [...prefs.hidden] : Array.isArray(prefs.hidden) ? prefs.hidden : [];
    const hidden = new Set(hiddenValues.map((id) => id === "mn" ? "g" : id).filter((id) => TAB_IDS.has(id)));
    if (hidden.size === order.length) hidden.delete(order[0]);
    return { order, hidden };
  }
  var chatTabsPref = createPref(STORE.chatTabPrefs, {
    read: normalizeChatTabs,
    write: (value) => {
      const prefs = normalizeChatTabs(value);
      return { order: prefs.order, hidden: [...prefs.hidden] };
    }
  });
  function getChatTabPrefs() {
    return chatTabsPref.get();
  }
  function setChatTabPrefs(prefs) {
    chatTabsPref.set(prefs);
    emit(EV.chatTabsChange);
  }
  function normalizeRecentLimit(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_RECENT_LIMIT, Math.round(parsed))) : DEFAULT_RECENT_LIMIT;
  }
  var recentLimitPref = createPref(STORE.recentEmoteLimit, {
    read: (value) => Number.isInteger(Number(value)) ? Math.max(1, Math.min(MAX_RECENT_LIMIT, Number(value))) : DEFAULT_RECENT_LIMIT,
    write: normalizeRecentLimit
  });
  function getRecentLimit() {
    return recentLimitPref.get();
  }
  function setRecentLimit(value) {
    const limit = normalizeRecentLimit(value);
    recentLimitPref.set(limit);
    const recent = store.get(STORE.recentEmotes);
    if (Array.isArray(recent)) store.set(STORE.recentEmotes, recent.slice(-limit));
    emit(EV.recentLimitChange);
    return limit;
  }
  var SOFF = (() => {
    const p = store.get(STORE.settingsPosition);
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
      let started2 = false, nx = ox, ny = oy, raf = 0;
      const apply = () => {
        raf = 0;
        SOFF = { x: nx, y: ny };
        put();
      };
      const move = (ev) => {
        if (!started2) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          started2 = true;
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
        if (!started2) return;
        win.classList.remove("t7-drag");
        SOFF = { x: nx, y: ny };
        put();
        store.set(STORE.settingsPosition, SOFF);
      };
      hd.addEventListener("pointermove", move);
      hd.addEventListener("pointerup", up);
      hd.addEventListener("pointercancel", up);
    });
    hd.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      SOFF = { x: 0, y: 0 };
      store.set(STORE.settingsPosition, null);
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
            <details class="t7-sec">
                <summary>\u042D\u043C\u043E\u0443\u0442\u044B</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-on"> \u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u044D\u043C\u043E\u0443\u0442\u044B 7TV \u0432 \u0447\u0430\u0442\u0435</label>
            </details>
            <details class="t7-sec">
                <summary>\u041A\u0430\u043D\u0430\u043B</summary>
                <form class="t7-row">
                    <label class="t7-fl">\u041D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430 \u043D\u0430 Twitch<input type="text" class="t7-nick" maxlength="80" autocomplete="off" spellcheck="false"></label>
                    <button type="submit" class="t7-b p">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C</button>
                </form>
                <div class="t7-sst" role="status"></div>
            </details>
            <details class="t7-sec">
                <summary>\u0420\u0430\u0437\u043C\u0435\u0440 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u0432 \u0447\u0430\u0442\u0435</summary>
                <div class="t7-szb">${Object.keys(SIZES).map((k) => `<button type="button" data-sz="${k}" aria-pressed="false">${SIZES[k].label}</button>`).join("")}</div>
            </details>
            <details class="t7-sec">
                <summary>\u0412\u043A\u043B\u0430\u0434\u043A\u0438 \u0447\u0430\u0442\u0430</summary>
                <div class="t7-chat-tab-list"></div>
            </details>
            <details class="t7-sec">
                <summary>\u041D\u0435\u0434\u0430\u0432\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435</summary>
                <label class="t7-fl">\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435"<input class="t7-recent-limit" type="number" min="1" max="100" step="1" inputmode="numeric"></label>
            </details>
            <details class="t7-sec">
                <summary>\u0421\u0441\u044B\u043B\u043A\u0438 \u0432 \u0447\u0430\u0442\u0435</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-link-encoding"> \u041F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u043E\u0432\u044B\u0432\u0430\u0442\u044C HTTPS-\u0441\u0441\u044B\u043B\u043A\u0438 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435</label>
                <div class="t7-note" role="note"><span class="t7-note-icon" aria-hidden="true">!</span><span>\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043D\u0430 \u0441\u0432\u043E\u0439 \u0441\u0442\u0440\u0430\u0445 \u0438 \u0440\u0438\u0441\u043A.</span></div>
            </details>
            <details class="t7-sec">
                <summary>\u041F\u0438\u043D\u0433\u0438 \u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u044B</summary>
                <label class="t7-chk"><input type="checkbox" class="t7-tab-completion"> \u0414\u043E\u043F\u043E\u043B\u043D\u044F\u0442\u044C \u043D\u0438\u043A \u043F\u043E Tab</label>
                <label class="t7-fl">\u041D\u0438\u043A\u0438 \u0438 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0434\u043B\u044F \u043F\u0438\u043D\u0433\u0430<textarea class="t7-ping-aliases" rows="2" placeholder="\u043D\u0438\u043A, nick, @\u043D\u0438\u043A"></textarea></label>
                <label class="t7-fl">\u0427\u0435\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043D\u0438\u043A\u043E\u0432<textarea class="t7-ping-blacklist" rows="2" placeholder="\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0438\u043A\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"></textarea></label>
                <label class="t7-fl">\u0418\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441\u043E \u0441\u043B\u043E\u0432\u0430\u043C\u0438 \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0430\u043C\u0438<textarea class="t7-ping-stopwords" rows="2" placeholder="\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0441\u043B\u043E\u0432\u0443 \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0435 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"></textarea></label>
                <label class="t7-fl">\u0417\u0432\u0443\u043A \u043F\u0438\u043D\u0433\u0430<select class="t7-ping-preset"><option value="bell">\u041A\u043E\u043B\u043E\u043A\u043E\u043B\u044C\u0447\u0438\u043A</option><option value="chime">\u0417\u0432\u043E\u043D</option><option value="pop">\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u0438\u0433\u043D\u0430\u043B</option><option value="custom">\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A</option></select></label>
                <label class="t7-fl t7-volume">\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C<input class="t7-ping-volume" type="range" min="0" max="1" step="0.05"><output class="t7-volume-value"></output></label>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="custom-sound">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0432\u043E\u0439 \u0437\u0432\u0443\u043A</button>
                    <button type="button" class="t7-b" data-act="test-ping">\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0437\u0432\u0443\u043A</button>
                    <input type="file" class="t7-ping-file" accept="audio/*" hidden>
                </div>
                <div class="t7-ping-status" role="status"></div>
            </details>
            <details class="t7-sec">
                <summary>\u0414\u0430\u043D\u043D\u044B\u0435</summary>
                <div class="t7-row t7-wrap">
                    <button type="button" class="t7-b" data-act="refresh">\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</button>
                    <button type="button" class="t7-b" data-act="cache">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A</button>
                    <button type="button" class="t7-b" data-act="pos">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u0448\u043A\u0430</button>
                </div>
            </details>
        </div>`;
    ["keydown", "keyup", "keypress"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener("pointerdown", (e) => {
      if (e.target === el) closeSettings();
    });
    el.querySelector(".t7-x").onclick = closeSettings;
    const on2 = el.querySelector(".t7-on");
    on2.checked = S.on;
    on2.addEventListener("change", () => {
      S.on = on2.checked;
      store.set(STORE.emotesEnabled, S.on);
      rescanAll();
    });
    const nickInp = el.querySelector(".t7-nick");
    nickInp.value = S.nick;
    nickInp.placeholder = pageChan || "\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, zakvielchannel";
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = nickInp.value.trim();
      const n = raw ? parseNick(raw) : pageChan;
      if (raw && !n) {
        setStatus("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043D\u0438\u043A: \u043D\u0443\u0436\u043D\u044B \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B \u0438 _");
        return;
      }
      S.nick = n;
      nickInp.value = n;
      store.set(STORE.channelNickPrefix + pageChan, n);
      reload(true);
    });
    const pingFields = [
      [".t7-ping-aliases", "aliases"],
      [".t7-ping-blacklist", "blacklist"],
      [".t7-ping-stopwords", "stopWords"]
    ];
    for (const [selector, key] of pingFields) {
      const input = el.querySelector(selector);
      input.value = pingSystem.config[key].join("\n");
      input.addEventListener("change", () => pingSystem.setList(key, input.value));
    }
    const tabCompletion = el.querySelector(".t7-tab-completion");
    tabCompletion.checked = pingSystem.config.tabCompletion;
    tabCompletion.addEventListener("change", () => pingSystem.setTabCompletion(tabCompletion.checked));
    const preset = el.querySelector(".t7-ping-preset");
    const customOption = preset.querySelector('option[value="custom"]');
    customOption.disabled = !pingSystem.config.customSound;
    preset.value = pingSystem.config.selectedPreset;
    preset.addEventListener("change", () => pingSystem.setPreset(preset.value));
    const volume = el.querySelector(".t7-ping-volume");
    const volumeValue = el.querySelector(".t7-volume-value");
    volume.value = String(pingSystem.config.volume);
    volumeValue.value = Math.round(pingSystem.config.volume * 100) + "%";
    volume.addEventListener("input", () => {
      pingSystem.setVolume(volume.value);
      volumeValue.value = Math.round(pingSystem.config.volume * 100) + "%";
    });
    const pingStatus = el.querySelector(".t7-ping-status");
    const pingFile = el.querySelector(".t7-ping-file");
    pingFile.addEventListener("change", async () => {
      try {
        await pingSystem.saveCustomSound(pingFile.files[0]);
        customOption.disabled = false;
        preset.value = pingSystem.config.selectedPreset;
        pingStatus.textContent = "\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D";
      } catch (error) {
        pingStatus.textContent = error.message;
      }
      pingFile.value = "";
    });
    const mark = () => el.querySelectorAll("[data-sz]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sz === S.size)));
    mark();
    el.querySelector(".t7-szb").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sz]");
      if (!b || b.dataset.sz === S.size) return;
      S.size = b.dataset.sz;
      store.set(STORE.emoteSize, S.size);
      applySize();
      mark();
      rescanAll();
    });
    const recentLimit = el.querySelector(".t7-recent-limit");
    recentLimit.value = String(getRecentLimit());
    recentLimit.addEventListener("change", () => {
      recentLimit.value = String(setRecentLimit(recentLimit.value));
    });
    const chatTabList = el.querySelector(".t7-chat-tab-list");
    const renderChatTabPrefs = () => {
      const prefs = getChatTabPrefs();
      const visibleCount = prefs.order.filter((id) => !prefs.hidden.has(id)).length;
      chatTabList.replaceChildren(...prefs.order.map((id, index) => {
        const tab = CHAT_TABS.find((item) => item.id === id);
        const row = document.createElement("div");
        row.className = "t7-chat-tab-row";
        row.innerHTML = `<span class="t7-chat-tab-name">${tab.label}</span><label class="t7-chat-tab-visible"><input type="checkbox" data-tab-visible="${id}" ${prefs.hidden.has(id) ? "" : "checked"} ${!prefs.hidden.has(id) && visibleCount === 1 ? "disabled" : ""}>\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C</label><span class="t7-chat-tab-move"><button type="button" data-tab-move="up" data-tab-id="${id}" aria-label="\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C ${tab.label} \u0432\u044B\u0448\u0435" title="\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432\u044B\u0448\u0435" ${index === 0 ? "disabled" : ""}>\u2191</button><button type="button" data-tab-move="down" data-tab-id="${id}" aria-label="\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C ${tab.label} \u043D\u0438\u0436\u0435" title="\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u043D\u0438\u0436\u0435" ${index === prefs.order.length - 1 ? "disabled" : ""}>\u2193</button></span>`;
        return row;
      }));
    };
    chatTabList.addEventListener("change", (e) => {
      const checkbox = e.target.closest("input[data-tab-visible]");
      if (!checkbox) return;
      const prefs = getChatTabPrefs();
      if (checkbox.checked) prefs.hidden.delete(checkbox.dataset.tabVisible);
      else prefs.hidden.add(checkbox.dataset.tabVisible);
      setChatTabPrefs(prefs);
      renderChatTabPrefs();
    });
    chatTabList.addEventListener("click", (e) => {
      const button = e.target.closest("button[data-tab-move]");
      if (!button || button.disabled) return;
      const prefs = getChatTabPrefs();
      const index = prefs.order.indexOf(button.dataset.tabId);
      const nextIndex = index + (button.dataset.tabMove === "up" ? -1 : 1);
      if (index < 0 || nextIndex < 0 || nextIndex >= prefs.order.length) return;
      [prefs.order[index], prefs.order[nextIndex]] = [prefs.order[nextIndex], prefs.order[index]];
      setChatTabPrefs(prefs);
      renderChatTabPrefs();
    });
    renderChatTabPrefs();
    const linkEncoding = el.querySelector(".t7-link-encoding");
    linkEncoding.checked = isLinkEncodingEnabled();
    linkEncoding.addEventListener("change", () => setLinkEncodingEnabled(linkEncoding.checked));
    el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "custom-sound") {
        pingSystem.unlockAudio();
        pingFile.click();
      } else if (b.dataset.act === "test-ping") pingSystem.play();
      else if (b.dataset.act === "refresh") reload(true);
      else if (b.dataset.act === "cache") {
        await clearImgs();
        setStatus("\u041A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A \u043E\u0447\u0438\u0449\u0435\u043D");
        st.hooks.emotes();
      } else if (b.dataset.act === "pos") {
        st.pos = null;
        st.win = null;
        store.set(STORE.popupPosition, null);
        store.set(STORE.popupSize, null);
        st.hooks.place();
        SOFF = { x: 0, y: 0 };
        store.set(STORE.settingsPosition, null);
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
  var FAVORITES_KEY = STORE.favorites;
  var RECENT_KEY = STORE.recentEmotes;
  var gridMode = "all";
  var emoteData = /* @__PURE__ */ new Map();
  on(EV.recentLimitChange, () => {
    if (st.pop && gridMode === "recent") renderGrid();
  });
  function readEntries(key) {
    const value = store.get(key);
    if (!Array.isArray(value)) return [];
    const entries = value.map((item) => typeof item === "string" ? { name: item, emote: null } : item).filter((item) => item && typeof item.name === "string" && item.name);
    return [...new Map(entries.map((item) => [item.name, item])).values()];
  }
  function saveRecent(name) {
    const recent = readEntries(RECENT_KEY).filter((item) => item.name !== name);
    recent.push({ name, emote: EM[name] || emoteData.get(name) || null });
    store.set(RECENT_KEY, recent.slice(-getRecentLimit()));
  }
  function recordRecentFromMessage(message) {
    const names = String(message || "").split(/\s+/).filter((name) => Object.prototype.hasOwnProperty.call(EM, name));
    for (const name of names) saveRecent(name);
    if (names.length && gridMode === "recent") renderGrid();
  }
  function emoteFor(name) {
    return EM[name] || emoteData.get(name) || null;
  }
  function updateViewButtons() {
    if (!st.pop) return;
    st.pop.querySelectorAll("[data-view]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.view === gridMode));
    });
  }
  function toggleFavorite(name) {
    const favorites = readEntries(FAVORITES_KEY);
    const index = favorites.findIndex((item) => item.name === name);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push({ name, emote: EM[name] || emoteData.get(name) || null });
    store.set(FAVORITES_KEY, favorites);
    renderGrid();
  }
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
    if (inp.maxLength > 0 && nv.length > inp.maxLength) return false;
    inp.value = nv;
    const pos = (pre + add).length;
    try {
      inp.setSelectionRange(pos, pos);
    } catch {
    }
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    if (!matchMedia("(pointer: coarse)").matches) inp.focus({ preventScroll: true });
    return true;
  }
  function onVis(entries) {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      if (st.io) st.io.unobserve(el);
      const em = emoteFor(el.dataset.name);
      if (!em || el.dataset.l) continue;
      el.dataset.l = "1";
      fetchImg(urlFor(em, SIZES[S.size].n), false).then((d) => {
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
      w.querySelectorAll(".t7-item").forEach((item) => {
        const show = !q || item.dataset.name.toLowerCase().includes(q);
        item.hidden = !show;
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
    const allNames = Object.keys(EM).sort((a, b) => a.localeCompare(b, void 0, { sensitivity: "base" }));
    const favoriteEntries = readEntries(FAVORITES_KEY);
    const recentEntries = readEntries(RECENT_KEY).reverse();
    emoteData = new Map(Object.entries(EM));
    for (const item of [...favoriteEntries, ...recentEntries]) {
      if (!emoteData.has(item.name) && item.emote) emoteData.set(item.name, item.emote);
    }
    const favorites = favoriteEntries.map((item) => item.name);
    const names = gridMode === "favorites" ? favoriteEntries.filter((item) => emoteFor(item.name)).map((item) => item.name) : gridMode === "recent" ? recentEntries.filter((item) => emoteFor(item.name)).map((item) => item.name) : allNames;
    const sec = (title, list) => {
      if (!list.length) return;
      const h = document.createElement("div");
      h.className = "t7-sh";
      h.textContent = `${title} \xB7 ${list.length}`;
      const w = document.createElement("div");
      w.className = "t7-gw";
      for (const n of list) {
        const item = document.createElement("div");
        item.className = "t7-item";
        item.dataset.name = n;
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
        const favorite = document.createElement("button");
        const isFavorite = favorites.includes(n);
        favorite.type = "button";
        favorite.className = "t7-fav";
        favorite.dataset.name = n;
        favorite.textContent = isFavorite ? "\u2605" : "\u2606";
        favorite.title = isFavorite ? "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435";
        favorite.setAttribute("aria-label", favorite.title + ": " + n);
        favorite.setAttribute("aria-pressed", String(isFavorite));
        item.append(b, favorite);
        w.appendChild(item);
        st.io.observe(b);
      }
      gr.append(h, w);
    };
    if (gridMode === "all") {
      sec("\u041A\u0430\u043D\u0430\u043B", names.filter((n) => !EM[n].g));
      sec("\u0421\u0432\u043E\u0438", names.filter((n) => EM[n].x));
      sec("\u0413\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435", names.filter((n) => EM[n].g && !EM[n].x));
    } else {
      sec(gridMode === "favorites" ? "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435" : "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435", names);
    }
    if (!names.length) {
      const d = document.createElement("div");
      d.className = "t7-emp";
      d.textContent = gridMode === "favorites" ? "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043D\u0430\u0431\u043E\u0440\u0430\u0445" : gridMode === "recent" ? "\u041D\u0435\u0434\u0430\u0432\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043D\u0430\u0431\u043E\u0440\u0430\u0445" : "\u042D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442";
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
    document.removeEventListener("keydown", onKey2, true);
    removeEventListener("resize", place);
  }
  function setupDrag2(pop) {
    const hd = pop.querySelector(".t7-h");
    hd.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.button > 0) return;
      const r = pop.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
      let started2 = false, nx = r.left, ny = r.top, raf = 0;
      const apply = () => {
        raf = 0;
        pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
      };
      const start = () => {
        started2 = true;
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
        if (!started2) {
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
        if (!started2 || st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.pos = { x: nx, y: ny };
        store.set(STORE.popupPosition, st.pos);
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
      store.set(STORE.popupPosition, null);
      store.set(STORE.popupSize, null);
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
        store.set(STORE.popupSize, st.win);
        store.set(STORE.popupPosition, st.pos);
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
        <div class="t7-views" role="tablist" aria-label="\u0421\u043F\u0438\u0441\u043A\u0438 \u044D\u043C\u043E\u0443\u0442\u043E\u0432"><button type="button" role="tab" data-view="all" aria-selected="true">\u0412\u0441\u0435</button><button type="button" role="tab" data-view="favorites" aria-selected="false">\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435</button><button type="button" role="tab" data-view="recent" aria-selected="false">\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435</button></div>
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
    gridMode = "all";
    pop.querySelector(".t7-views").addEventListener("click", (e) => {
      const button = e.target.closest("[data-view]");
      if (!button || button.dataset.view === gridMode) return;
      gridMode = button.dataset.view;
      updateViewButtons();
      renderGrid();
    });
    const gr = pop.querySelector(".t7-gr");
    gr.addEventListener("click", (e) => {
      const favorite = e.target.closest(".t7-fav");
      if (favorite) {
        toggleFavorite(favorite.dataset.name);
        return;
      }
      const b = e.target.closest(".t7-it");
      if (b) {
        saveRecent(b.dataset.name);
        insertEmote(b.dataset.name);
        if (gridMode === "recent") renderGrid();
      }
    });
    st.io = new IntersectionObserver(onVis, { root: gr, rootMargin: "120px" });
    document.body.appendChild(pop);
    renderGrid();
    place();
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
  var bindings = /* @__PURE__ */ new WeakMap();
  function bindMessageHistory(input) {
    const history = [];
    let index = 0;
    let draft = "";
    let changingHistory = false;
    const setValue = (value) => {
      changingHistory = true;
      input.value = value;
      input.setSelectionRange(value.length, value.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      changingHistory = false;
    };
    const remember = (value) => {
      const message = String(value || "").trim();
      if (!message) return;
      if (history[history.length - 1] !== message) {
        history.push(message);
        if (history.length > 50) history.shift();
      }
      index = history.length;
      draft = "";
    };
    const onInput = () => {
      if (changingHistory) return;
      index = history.length;
      draft = input.value;
    };
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !history.length) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        if (index === history.length) draft = input.value;
        index = Math.max(0, index - 1);
        setValue(history[index]);
      } else if (event.key === "ArrowDown" && index < history.length) {
        event.preventDefault();
        event.stopPropagation();
        index++;
        setValue(index === history.length ? draft : history[index]);
      }
    };
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown, true);
    return {
      remember,
      dispose() {
        input.removeEventListener("input", onInput);
        input.removeEventListener("keydown", onKeyDown, true);
      }
    };
  }
  function bindPingAutocomplete(form, input) {
    const menu = document.createElement("div");
    menu.className = "t7-ping-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    form.appendChild(menu);
    const getToken = () => {
      const caret = input.selectionStart == null ? input.value.length : input.selectionStart;
      if (caret !== input.selectionEnd) return null;
      const before = input.value.slice(0, caret);
      const match = /(?:^|\s)@([a-z0-9_]*)$/i.exec(before);
      return match ? { query: match[1].toLowerCase(), start: caret - match[1].length - 1, end: caret } : null;
    };
    const candidates = (query) => {
      const names = /* @__PURE__ */ new Map();
      document.querySelectorAll(SEL.nickButtons).forEach((element) => {
        const name = String(element.dataset.nick || "").trim();
        if (name) names.set(name.toLowerCase(), name);
      });
      for (const alias of pingSystem.config.aliases) {
        const name = String(alias).replace(/^@/, "").trim();
        if (name && !/\s/.test(name)) names.set(name.toLowerCase(), name);
      }
      return [...names.values()].filter((name) => name.toLowerCase().startsWith(query)).sort((a, b) => a.localeCompare(b)).slice(0, 7);
    };
    const complete = (name) => {
      const token = getToken();
      if (!token) return;
      input.value = input.value.slice(0, token.start) + "@" + name + " " + input.value.slice(token.end);
      const caret = token.start + name.length + 2;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus({ preventScroll: true });
      menu.hidden = true;
    };
    const update = () => {
      if (!pingSystem.config.tabCompletion) {
        menu.replaceChildren();
        menu.hidden = true;
        return;
      }
      const token = getToken();
      const matches = token && candidates(token.query);
      menu.replaceChildren();
      if (!matches || !matches.length) {
        menu.hidden = true;
        return;
      }
      for (const name of matches) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "t7-ping-option";
        option.setAttribute("role", "option");
        option.textContent = "@" + name;
        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("click", () => complete(name));
        menu.appendChild(option);
      }
      menu.hidden = false;
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        menu.hidden = true;
        return;
      }
      if (event.key !== "Tab" || menu.hidden) return;
      const token = getToken();
      const name = token && candidates(token.query)[0];
      if (!name) return;
      event.preventDefault();
      event.stopPropagation();
      complete(name);
    };
    input.addEventListener("input", update);
    input.addEventListener("keydown", onKeyDown, true);
    const unsubscribe = on(EV.tabCompletionChange, update);
    return () => {
      input.removeEventListener("input", update);
      input.removeEventListener("keydown", onKeyDown, true);
      unsubscribe();
      menu.remove();
    };
  }
  function bindChatForm(form, input) {
    const history = bindMessageHistory(input);
    const disposeAutocomplete = bindPingAutocomplete(form, input);
    let lastRecentMessage = "";
    let recentRecorded = false;
    const record = () => {
      const text = input.value.trim();
      if (!text) return;
      history.remember(text);
      if (recentRecorded && text === lastRecentMessage) return;
      recordRecentFromMessage(text);
      lastRecentMessage = text;
      recentRecorded = true;
    };
    const onInput = () => {
      if (input.value.trim() !== lastRecentMessage) recentRecorded = false;
    };
    const onSubmit = () => record();
    const onKeyDown = (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing && event.keyCode !== 229)
        record();
    };
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown, true);
    form.addEventListener("submit", onSubmit, true);
    return () => {
      history.dispose();
      disposeAutocomplete();
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown, true);
      form.removeEventListener("submit", onSubmit, true);
    };
  }
  function disposeForm(form) {
    const dispose = bindings.get(form);
    if (!dispose) return;
    if (st.anchor && form.contains(st.anchor)) closePop();
    dispose();
    bindings.delete(form);
  }
  function disposeInputBindings(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(SEL.chatForms)) disposeForm(node);
    node.querySelectorAll(SEL.chatForms).forEach(disposeForm);
  }
  function ensureButtons() {
    document.querySelectorAll(SEL.chatForms).forEach((form) => {
      const input = form.querySelector(SEL.textInput);
      if (input && !bindings.has(form)) {
        bindings.set(form, form.matches(SEL.chatForm) ? bindChatForm(form, input) : () => {
        });
      }
      if (form.querySelector(".t7-btn")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "t7-btn";
      button.textContent = "7TV";
      button.title = "\u042D\u043C\u043E\u0443\u0442\u044B 7TV";
      button.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B 7TV");
      button.setAttribute("aria-haspopup", "dialog");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePop(button);
      });
      const submit = form.querySelector(SEL.submitButton);
      if (submit) submit.after(button);
      else form.appendChild(button);
    });
    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
  }
  var CITY_CHAT_POSITION_KEY = `${STORE.cityChatPosition}:${pageChan}`;
  var CITY_CHAT_DRAG_IGNORE = 'button, a, input, textarea, select, [role="tab"], [contenteditable="true"]';
  function cityChatPosition(box) {
    return {
      x: Number(box.dataset.t7CityX) || 0,
      y: Number(box.dataset.t7CityY) || 0
    };
  }
  function applyCityChatPosition(box, x, y) {
    box.dataset.t7CityX = String(x);
    box.dataset.t7CityY = String(y);
    box.style.translate = `${x}px ${y}px`;
  }
  function constrainCityChatPosition(box, x, y) {
    const rect = box.getBoundingClientRect();
    const current = cityChatPosition(box);
    const left = rect.left - current.x;
    const right = rect.right - current.x;
    const top = rect.top - current.y;
    const bottom = rect.bottom - current.y;
    const bounded = (value, min, max) => max < min ? (min + max) / 2 : clamp(value, min, max);
    return {
      x: bounded(x, 8 - left, innerWidth - 8 - right),
      y: bounded(y, 8 - top, innerHeight - 8 - bottom)
    };
  }
  function normalizeCityChatPositions() {
    document.querySelectorAll(".cy .cy-chat[data-t7-city-movable]").forEach((box) => {
      if (!box.getClientRects().length) return;
      const current = cityChatPosition(box);
      const next = constrainCityChatPosition(box, current.x, current.y);
      if (next.x === current.x && next.y === current.y) return;
      applyCityChatPosition(box, next.x, next.y);
      store.set(CITY_CHAT_POSITION_KEY, next);
    });
  }
  function bindCityChatMove(box) {
    if (!box.matches(".cy .cy-chat")) return;
    const header = box.querySelector(SEL.chatHeader);
    if (!header) return;
    header.classList.add("t7-chat-drag-handle");
    if (box.dataset.t7CityMovable) return;
    box.dataset.t7CityMovable = "1";
    const saved = store.get(CITY_CHAT_POSITION_KEY);
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y))
      applyCityChatPosition(box, saved.x, saved.y);
    let drag = null;
    let suppressClick = false;
    box.addEventListener("pointerdown", (event) => {
      const handle = event.target.closest(SEL.chatHeader);
      if (!handle || !box.contains(handle) || event.button !== 0 || event.target.closest(CITY_CHAT_DRAG_IGNORE)) return;
      const rect = box.getBoundingClientRect();
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        rect,
        start: cityChatPosition(box),
        moved: false
      };
      event.preventDefault();
      try {
        box.setPointerCapture(event.pointerId);
      } catch {
      }
    });
    box.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      box.classList.add("t7-chat-dragging");
      const next = constrainCityChatPosition(box, drag.start.x + dx, drag.start.y + dy);
      applyCityChatPosition(box, next.x, next.y);
      event.preventDefault();
    });
    const endDrag = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.moved) {
        store.set(CITY_CHAT_POSITION_KEY, cityChatPosition(box));
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      drag = null;
      box.classList.remove("t7-chat-dragging");
    };
    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
    box.addEventListener("click", (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
  }
  function contains(node, selector) {
    return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
  }
  function startChatObservers() {
    let queued = false;
    let needsButtons = false;
    let needsScan = false;
    let dmContainer = null;
    let dmObserver = null;
    let onDmScroll = null;
    const bindCityChats = () => document.querySelectorAll(".cy .cy-chat").forEach(bindCityChatMove);
    const bindDmScrollGuard = () => {
      const next = document.querySelector(SEL.dmRoot);
      if (next === dmContainer) return;
      if (dmObserver) dmObserver.disconnect();
      if (dmContainer && onDmScroll) dmContainer.removeEventListener("scroll", onDmScroll);
      dmContainer = next;
      dmObserver = null;
      onDmScroll = null;
      if (!dmContainer) return;
      let lastScrollTop = dmContainer.scrollTop;
      onDmScroll = () => {
        lastScrollTop = dmContainer.scrollTop;
      };
      dmContainer.addEventListener("scroll", onDmScroll, { passive: true });
      dmObserver = new MutationObserver(() => {
        if (dmContainer.scrollTop < lastScrollTop - 2 && dmContainer.scrollTop > 10)
          dmContainer.scrollTop = lastScrollTop;
      });
      dmObserver.observe(dmContainer, { childList: true, subtree: true });
    };
    const schedule = (records) => {
      bindDmScrollGuard();
      bindCityChats();
      for (const record of records) {
        if (record.type !== "childList") continue;
        for (const node of record.removedNodes) disposeInputBindings(node);
        const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        const form = target && target.closest(SEL.chatForms);
        if (form && form.querySelector(SEL.textInput))
          needsButtons = true;
        if (target && target.closest(SEL.chatRoot)) needsScan = true;
        for (const node of record.addedNodes) {
          if (contains(node, SEL.chatForms)) needsButtons = true;
          if (contains(node, SEL.chatRows) || contains(node, SEL.dmRoot)) needsScan = true;
        }
      }
      if (!needsButtons && !needsScan || queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const addButtons = needsButtons;
        const scanMessages = needsScan;
        needsButtons = false;
        needsScan = false;
        if (addButtons) ensureButtons();
        if (scanMessages) scan();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    bindDmScrollGuard();
    bindCityChats();
    window.addEventListener("resize", normalizeCityChatPositions, { passive: true });
    requestAnimationFrame(normalizeCityChatPositions);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", normalizeCityChatPositions);
      if (dmObserver) dmObserver.disconnect();
      if (dmContainer && onDmScroll) dmContainer.removeEventListener("scroll", onDmScroll);
    };
  }
  var W = unsafeWindow;
  var CITY = "/api/city/chat";
  var MINE = "/api/mine/chat";
  var PING_ONLY_KEY = STORE.pingOnly;
  var PING_ARCHIVE_KEY = STORE.pingArchive;
  var PING_ARCHIVE_LIMIT = 500;
  var PING_PAGE_SIZE = 50;
  var pingOnly = store.get(PING_ONLY_KEY) === true;
  var storedPingArchive = store.get(PING_ARCHIVE_KEY) || {};
  var cityPingArchive = Array.isArray(storedPingArchive.city) ? storedPingArchive.city.filter((m) => m && m.id != null) : [];
  var minePingArchive = Array.isArray(storedPingArchive.mine) ? storedPingArchive.mine.filter((m) => m && m.id != null) : [];
  var unifiedPingArchive = Array.isArray(storedPingArchive.one) ? storedPingArchive.one.filter((m) => m && m.id != null) : [];
  var ROOM_IDS = ["city", "mine", "one"];
  var createRoomState = (archive = []) => ({
    instance: null,
    pings: {},
    archive,
    archiveIds: new Set(archive.map((m) => String(m.id))),
    archivePage: 0,
    injectedPings: /* @__PURE__ */ new Set(),
    filterObserver: null,
    filterList: null
  });
  var rooms = {
    city: createRoomState(cityPingArchive),
    mine: createRoomState(minePingArchive),
    one: createRoomState(unifiedPingArchive)
  };
  var pingArchiveSaveTimer = 0;
  var hasUnifiedChat = () => !!rooms.one.instance;
  pingSystem.subscribe(() => {
    for (const room of Object.values(rooms)) if (room.instance) room.instance.raw.render();
  });
  var tagMn = (m) => m && m.tb !== "mn" ? { ...m, tb: "mn" } : m;
  var tagMsg = (r) => r && r.msg ? { ...r, msg: tagMn(r.msg) } : r;
  function schedulePingArchiveSave() {
    clearTimeout(pingArchiveSaveTimer);
    pingArchiveSaveTimer = setTimeout(() => {
      pingArchiveSaveTimer = 0;
      store.set(PING_ARCHIVE_KEY, Object.fromEntries(ROOM_IDS.map((room) => [room, rooms[room].archive])));
    }, 500);
  }
  function setupTabs(K) {
    const S2 = K.state();
    if (!S2 || !S2.chat || !S2.el) return;
    const C = S2.chat;
    const tabs = S2.el.querySelector(SEL.chatTabs);
    if (!tabs) return;
    const preferredTab = !K.one && K.base === MINE ? "mn" : "g";
    const otherCommonTab = preferredTab === "g" ? "mn" : "g";
    const commonTab = tabs.querySelector(`[data-tab="${preferredTab}"]`) ? preferredTab : tabs.querySelector(`[data-tab="${otherCommonTab}"]`) ? otherCommonTab : preferredTab;
    const alternateTab = commonTab === "g" ? "mn" : "g";
    const prefId = (id) => id === "g" || id === "mn" ? "g" : id;
    const siteId = (id) => id === "g" ? commonTab : id;
    if (!K.one) {
      C[commonTab] = true;
      if (C.un && C.un[commonTab] == null) C.un[commonTab] = 0;
    }
    const prefs = getChatTabPrefs();
    for (const k of prefs.order) {
      const id = siteId(k);
      const e = tabs.querySelector(`[data-tab="${id}"]`);
      if (!e) continue;
      const legacyAlwaysAvailable = !K.one && id === commonTab;
      const shouldBeHidden = prefs.hidden.has(prefId(k)) || !legacyAlwaysAvailable && !C[id];
      e.hidden = shouldBeHidden;
      tabs.appendChild(e);
    }
    tabs.querySelectorAll("[data-tab]").forEach((b) => {
      if (b.dataset.tab === alternateTab) b.hidden = true;
      if (b._t7h) return;
      b._t7h = 1;
      new MutationObserver(() => {
        const hidden = getChatTabPrefs().hidden.has(prefId(b.dataset.tab));
        if (hidden || b.dataset.tab === alternateTab) {
          if (!b.hidden) b.hidden = true;
        } else if (b.dataset.tab === commonTab && !K.one && b.hidden) b.hidden = false;
      }).observe(b, { attributes: true, attributeFilter: ["hidden"] });
    });
    for (const id of ["g", "mn"]) {
      const button = tabs.querySelector(`[data-tab="${id}"]`);
      if (button && button.firstChild && button.firstChild.nodeType === 3) button.firstChild.nodeValue = "\u041E\u0431\u0449\u0438\u0439";
      if (button) button.title = "\u041E\u0431\u0449\u0438\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F";
    }
    if (prefs.hidden.has(prefId(C.tab))) {
      const fallback = prefs.order.find((id) => {
        const button = tabs.querySelector(`[data-tab="${siteId(id)}"]`);
        return !prefs.hidden.has(id) && button && !button.hidden;
      });
      if (fallback) selectTab(K, siteId(fallback));
    }
    if (!tabs._t7) {
      tabs._t7 = 1;
      new MutationObserver(() => {
        const c = K.state() && K.state().chat;
        if (tabs.hidden && c && !c.panel) tabs.hidden = false;
      }).observe(tabs, { attributes: true, attributeFilter: ["hidden"] });
    }
    if (!C.panel) tabs.hidden = false;
  }
  on(EV.chatTabsChange, () => {
    for (const room of Object.values(rooms)) if (room.instance) setupTabs(room.instance.K);
  });
  function selectTab(K, t) {
    const S2 = K.state();
    const b = S2 && S2.el && S2.el.querySelector(`${SEL.chatTabs} [data-tab="${t}"]`);
    if (b) b.click();
  }
  var CHAT_JS = "/lib/site-chat.js";
  var chatLoad = null;
  function loadChatLib() {
    if (W.LGChat) return Promise.resolve();
    if (!chatLoad) chatLoad = new Promise((ok) => {
      const sc = document.createElement("script");
      sc.src = CHAT_JS;
      sc.onload = sc.onerror = () => ok();
      document.head.appendChild(sc);
    });
    return chatLoad;
  }
  function patchK(K, room) {
    const cache = /* @__PURE__ */ new WeakMap();
    const route = (api, p, b) => {
      const result = api(p, b);
      return room === "mine" && p === K.say ? Promise.resolve(result).then(tagMsg) : result;
    };
    return {
      ...K,
      flags: room === "mine" && !K.one ? () => {
        const x = K.X();
        const h = x && x.hero && x.hero() || {};
        return { on: K.flags(h).on, tr: !!h.ct, dm: !!h.cd };
      } : K.flags,
      X: () => {
        const x = K.X();
        if (!x) return x;
        let m = cache.get(x);
        if (!m) {
          const raw = (...a) => x.api(...a);
          const api = (p, b) => SAY_RE.test(p) ? sendWithLinks(raw, p, b) : raw(p, b);
          m = new Proxy(x, {
            get(t, k) {
              if (k === "api") return (p, b) => route(api, p, b);
              const v = t[k];
              return typeof v === "function" ? v.bind(t) : v;
            }
          });
          cache.set(x, m);
        }
        return m;
      }
    };
  }
  function chatOf(room) {
    const i = rooms[room].instance;
    const S2 = i && i.K.state();
    return S2 && S2.chat ? { S: S2, C: S2.chat } : null;
  }
  function tabOfMsg(C, m) {
    return m.tb || (m.rm === "mine" ? "mn" : m.ev ? C.tr ? "ev" : "g" : m.k === "tr" ? "tr" : m.k === "dm" ? "dm" : "g");
  }
  function isPingMessage(room, m, me) {
    const o = chatOf(room);
    if (!m || m.id == null || String(m.l || "").toLowerCase() === me || m.ev || m.sys) return false;
    if (o && o.C.ign && o.C.ign.has(m.l)) return false;
    if (pingSystem.shouldIgnore(m.l, m.t)) return false;
    return pingSystem.isPinged(m.t, me ? [me] : []);
  }
  function rememberPingMessages(room, msgs) {
    const roomState = rooms[room];
    const fallbackRoom = room === "mine" ? "city" : "mine";
    const i = roomState.instance || rooms[fallbackRoom].instance;
    const x = i && i.K.X();
    const me = String(x && x.login && x.login() || "").toLowerCase();
    const items = roomState.archive;
    const ids = roomState.archiveIds;
    let changed = false;
    for (const m of msgs || []) {
      if (!isPingMessage(room, m, me)) continue;
      const id = String(m.id);
      if (ids.has(id)) continue;
      items.push(m);
      ids.add(id);
      changed = true;
    }
    if (!changed) return;
    items.sort((a, b) => (a.at || 0) - (b.at || 0));
    while (items.length > PING_ARCHIVE_LIMIT) ids.delete(String(items.shift().id));
    schedulePingArchiveSave();
  }
  function stripArchivedPings(room) {
    const o = chatOf(room);
    const injected = rooms[room].injectedPings;
    if (o && o.C.list && injected.size) {
      const list = o.C.list.filter((m) => !injected.has(String(m.id)));
      o.C.list.splice(0, o.C.list.length, ...list);
    }
    injected.clear();
  }
  function archivePage(room, C) {
    const roomState = rooms[room];
    const messages = roomState.archive.filter((m) => tabOfMsg(C, m) === C.tab);
    const pageCount = Math.max(1, Math.ceil(messages.length / PING_PAGE_SIZE));
    roomState.archivePage = Math.min(roomState.archivePage, pageCount - 1);
    const end = messages.length - roomState.archivePage * PING_PAGE_SIZE;
    return messages.slice(Math.max(0, end - PING_PAGE_SIZE), end);
  }
  function syncPingArchive(room) {
    const o = chatOf(room);
    if (!o || !o.C.list) return false;
    const injected = rooms[room].injectedPings;
    const wanted = pingOnly ? archivePage(room, o.C) : [];
    const wantedIds = new Set(wanted.map((m) => String(m.id)));
    const presentIds = new Set(o.C.list.map((m) => String(m.id)));
    let changed = false;
    for (const id of injected) {
      if (wantedIds.has(id) && presentIds.has(id)) continue;
      const index = o.C.list.findIndex((m) => String(m.id) === id);
      if (index >= 0) {
        o.C.list.splice(index, 1);
        changed = true;
      }
      injected.delete(id);
    }
    for (const message of wanted) {
      const id = String(message.id);
      if (presentIds.has(id)) continue;
      o.C.list.push(message);
      injected.add(id);
      presentIds.add(id);
      changed = true;
    }
    if (changed) o.C.list.sort((a, b) => (a.at || 0) - (b.at || 0));
    return changed;
  }
  function refreshPingArchive(room) {
    const i = rooms[room].instance;
    if (!i) return;
    if (syncPingArchive(room)) i.raw.render();
    markFilteredMessages(room);
    applyPingOnly(room);
    updatePingArchiveControl(room);
  }
  function countPings(room, msgs) {
    const o = chatOf(room);
    if (!o) return;
    rememberPingMessages(room, msgs);
    const x = rooms[room].instance.K.X();
    const me = String(x && x.login && x.login() || "").toLowerCase();
    const pg = rooms[room].pings;
    let hit = false;
    for (const m of msgs || []) {
      if (!m || String(m.l || "").toLowerCase() === me || m.ev || m.sys) continue;
      if (o.C.ign && o.C.ign.has(m.l)) continue;
      if (pingSystem.shouldIgnore(m.l, m.t)) continue;
      if (!pingSystem.isPinged(m.t, me ? [me] : [])) continue;
      const id = m.id == null ? "" : room + ":" + String(m.id);
      if (!id || !seenPings.has(id)) {
        pingSystem.play();
        if (id) {
          seenPings.add(id);
          if (seenPings.size > 500) seenPings.delete(seenPings.values().next().value);
        }
      }
      const tb = tabOfMsg(o.C, m);
      if (!o.C.on || o.C.open && o.C.tab === tb) continue;
      pg[tb] = (pg[tb] || 0) + 1;
      hit = true;
    }
    if (hit && o.C.on) paint(room);
  }
  var seenPings = /* @__PURE__ */ new Set();
  function markFilteredMessages(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (!list || !o.C) return;
    if (o.C.tab === "lg") return;
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== "dm" || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const rows = list.querySelectorAll(SEL.nonEmptyChatRows);
    const x = rooms[room].instance.K.X();
    const me = String(x && x.login && x.login() || "").toLowerCase();
    visible.forEach((m, index) => {
      const row = rows[index];
      if (!row) return;
      const label = pingSystem.filterLabel(m.l, m.t);
      row.classList.toggle("t7-filtered", !!label);
      row.classList.toggle("t7-filtered-blacklist", label === "\u0412 \u0427\u0421");
      row.classList.toggle("ping", !label && pingSystem.isPinged(m.t, me ? [me] : []));
      let tag = row.querySelector(":scope > .t7-filter-label");
      if (!label) {
        if (tag) tag.remove();
        return;
      }
      if (!tag) {
        tag = document.createElement("i");
        tag.className = "t7-filter-label";
        row.prepend(tag);
      }
      tag.textContent = label === "\u0412 \u0427\u0421" ? `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${m.n || m.l} \u0432 \u0447\u0451\u0440\u043D\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435` : "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0441\u043A\u0440\u044B\u0442\u043E \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u043C";
      tag.title = label === "\u0412 \u0427\u0421" ? "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044C \u0432 \u0432\u0430\u0448\u0435\u043C \u0447\u0435\u0440\u043D\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435" : "\u0412 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0438 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0430 \u0438\u0437 \u0444\u0438\u043B\u044C\u0442\u0440\u0430";
    });
  }
  function applyPingOnly(room) {
    const o = chatOf(room);
    const list = o && o.S.el && o.S.el.querySelector(SEL.chatList);
    if (!list) return;
    if (o.C.tab === "lg") {
      list.querySelectorAll(":scope > li.t7-ping-hidden").forEach((row) => row.classList.remove("t7-ping-hidden"));
      list.dataset.t7NoPings = "false";
      return;
    }
    const visible = o.C.list.filter((m) => tabOfMsg(o.C, m) === o.C.tab && !(o.C.ign && o.C.ign.has(m.l)) && (o.C.tab !== "dm" || !o.C.peer || m.sys || m.l === o.C.peer || m.to === o.C.peer));
    const pageIds = new Set(archivePage(room, o.C).map((m) => String(m.id)));
    let messageIndex = 0;
    let hasPing = false;
    list.querySelectorAll(":scope > li").forEach((row) => {
      if (row.classList.contains("cy-chat-0")) return;
      const message = visible[messageIndex++];
      const onPage = message && (message.id == null || pageIds.has(String(message.id)));
      const keep = !pingOnly || row.classList.contains("ping") && onPage;
      row.classList.toggle("t7-ping-hidden", !keep);
      if (pingOnly && keep) hasPing = true;
    });
    list.dataset.t7NoPings = String(pingOnly && !hasPing);
  }
  function syncPingOnlyControls() {
    for (const room of hasUnifiedChat() ? ["one"] : ["city", "mine"]) {
      const o = chatOf(room);
      const input = o && o.S.el && o.S.el.querySelector(".t7-chat-filter input");
      if (input) input.checked = pingOnly;
      refreshPingArchive(room);
      applyPingOnly(room);
      updatePingArchiveControl(room);
    }
  }
  function addPingOnlyControl(room, box) {
    const header = box.querySelector(SEL.chatHeader);
    if (!header) return;
    let label = header.querySelector(".t7-chat-filter");
    if (!label) {
      label = document.createElement("label");
      label.className = "t7-chat-filter";
      label.title = "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435\u043C";
      label.innerHTML = '<input type="checkbox"><span>\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u0438\u043D\u0433\u0438</span>';
      label.addEventListener("click", (e) => e.stopPropagation());
      label.querySelector("input").addEventListener("change", (e) => {
        pingOnly = e.currentTarget.checked;
        store.set(PING_ONLY_KEY, pingOnly);
        syncPingOnlyControls();
      });
    }
    label.querySelector("input").checked = pingOnly;
    const close = header.querySelector(SEL.chatCloseButton);
    if (!label.isConnected) header.insertBefore(label, close || null);
    let nav = header.querySelector(".t7-ping-nav");
    if (!nav) {
      nav = document.createElement("span");
      nav.className = "t7-ping-nav";
      nav.innerHTML = '<button type="button" data-direction="older" title="\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u0441\u0442\u0430\u0440\u044B\u0435 \u043F\u0438\u043D\u0433\u0438" aria-label="\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u0441\u0442\u0430\u0440\u044B\u0435 \u043F\u0438\u043D\u0433\u0438">\u2039</button><button type="button" data-direction="newer" title="\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u044B\u0435 \u043F\u0438\u043D\u0433\u0438" aria-label="\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u044B\u0435 \u043F\u0438\u043D\u0433\u0438">\u203A</button>';
      nav.addEventListener("click", (e) => {
        const button = e.target.closest("button[data-direction]");
        if (!button) return;
        e.stopPropagation();
        const roomState = rooms[room];
        roomState.archivePage = Math.max(0, roomState.archivePage + (button.dataset.direction === "older" ? 1 : -1));
        refreshPingArchive(room);
        updatePingArchiveControl(room);
      });
      header.insertBefore(nav, close || null);
    }
    updatePingArchiveControl(room);
    applyPingOnly(room);
  }
  function updatePingArchiveControl(room) {
    const o = chatOf(room);
    const header = o && o.S.el && o.S.el.querySelector(SEL.chatHeader);
    const nav = header && header.querySelector(".t7-ping-nav");
    if (!nav || !o.C) return;
    const roomState = rooms[room];
    const count = roomState.archive.filter((m) => tabOfMsg(o.C, m) === o.C.tab).length;
    const pages = Math.ceil(count / PING_PAGE_SIZE);
    roomState.archivePage = Math.min(roomState.archivePage, Math.max(0, pages - 1));
    nav.hidden = !pingOnly || pages < 2;
    const older = nav.querySelector('[data-direction="older"]');
    const newer = nav.querySelector('[data-direction="newer"]');
    if (older) older.disabled = roomState.archivePage >= pages - 1;
    if (newer) newer.disabled = roomState.archivePage === 0;
  }
  var num = (n) => n > 99 ? "99+" : String(n);
  function badge(parent, cls, n, title) {
    let b = parent.querySelector(":scope > ." + cls);
    if (!b) {
      b = document.createElement("b");
      b.className = cls;
      parent.appendChild(b);
    }
    b.hidden = !n;
    b.textContent = n ? num(n) : "";
    b.title = n ? title + ": " + n : "";
  }
  function paint(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector(".cy-chat");
    if (!box) return;
    const pg = rooms[room].pings;
    if (o.C.open) pg[o.C.tab] = 0;
    let total = 0;
    box.querySelectorAll(SEL.chatTabButtons).forEach((b) => {
      const n = pg[b.dataset.tab] || 0;
      total += n;
      badge(b, "cy-chat-tp", n, "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439");
    });
    const t = box.querySelector(SEL.chatToggleButton);
    if (t) badge(t, "cy-chat-pn", o.C.open ? 0 : total, "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439");
  }
  function pingBind(room) {
    const o = chatOf(room);
    const box = o && o.S.el && o.S.el.querySelector(SEL.chatRoot);
    if (!box || box.dataset.t7pg) return;
    box.dataset.t7pg = "1";
    addPingOnlyControl(room, box);
    box.addEventListener("click", () => {
      refreshPingArchive(room);
      updatePingArchiveControl(room);
      paint(room);
    });
    const list = box.querySelector(SEL.chatList);
    if (list && !list.dataset.t7BlacklistMenu) {
      list.dataset.t7BlacklistMenu = "1";
      list.addEventListener("contextmenu", (e) => {
        const nick = e.target.closest(SEL.nickButton);
        if (!nick || !list.contains(nick)) return;
        const login = String(nick.dataset.nick || "").trim();
        if (!login) return;
        requestAnimationFrame(() => {
          const menu = document.querySelector(".cy-nm");
          if (!menu || menu.dataset.t7BlacklistAction) return;
          menu.dataset.t7BlacklistAction = "1";
          const blocked = pingSystem.config.blacklist.includes(login.toLowerCase());
          const action = document.createElement("button");
          action.type = "button";
          action.setAttribute("role", "menuitem");
          action.dataset.nm = "t7-blacklist";
          action.textContent = blocked ? "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0427\u0421" : "\u0412 \u0447\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A";
          action.addEventListener("click", () => pingSystem.toggleBlacklist(login));
          menu.appendChild(action);
        });
      }, true);
    }
    const roomState = rooms[room];
    if (list && roomState.filterList !== list) {
      if (roomState.filterObserver) roomState.filterObserver.disconnect();
      roomState.filterObserver = new MutationObserver(() => {
        markFilteredMessages(room);
        applyPingOnly(room);
      });
      roomState.filterObserver.observe(list, { childList: true });
      roomState.filterList = list;
    }
    markFilteredMessages(room);
    applyPingOnly(room);
    updatePingArchiveControl(room);
  }
  function wrapInst(raw, K, room) {
    const mine = room === "mine";
    const unified = !!K.one;
    return {
      ...raw,
      init() {
        raw.init();
        setupTabs(K);
        pingBind(room);
      },
      enter(r, rm) {
        if (unified) {
          raw.enter(r, rm);
          if (r && Array.isArray(r.chat)) rememberPingMessages(room, r.chat);
          rooms[room].pings = {};
          setupTabs(K);
          pingBind(room);
          paint(room);
          if (pingOnly) refreshPingArchive(room);
          return;
        }
        if (pingOnly) stripArchivedPings(room);
        const entered = r && Array.isArray(r.chat) && mine ? { ...r, chat: r.chat.map(tagMn) } : r;
        raw.enter(entered);
        rooms[room].injectedPings.clear();
        if (entered && Array.isArray(entered.chat)) rememberPingMessages(room, entered.chat);
        setupTabs(K);
        rooms[room].pings = {};
        pingBind(room);
        paint(room);
        selectTab(K, mine ? "mn" : "g");
        if (pingOnly) refreshPingArchive(room);
      },
      apply(d, rm) {
        if (unified) {
          raw.apply(d, rm);
          if (d && Array.isArray(d.chat)) countPings(room, d.chat);
          if (d && Array.isArray(d.chatDel)) {
            const deleted = new Set(d.chatDel.map(String));
            const archive = rooms[room];
            const kept = archive.archive.filter((m) => !deleted.has(String(m.id)));
            if (kept.length !== archive.archive.length) {
              archive.archive = kept;
              archive.archiveIds = new Set(kept.map((m) => String(m.id)));
              schedulePingArchiveSave();
            }
          }
          if (pingOnly) refreshPingArchive(room);
          return;
        }
        const own = d && Array.isArray(d.chat) && mine ? { ...d, chat: d.chat.map(tagMn) } : d;
        raw.apply(own);
        if (own && own.chat) countPings(room, own.chat);
        if (pingOnly) refreshPingArchive(room);
      }
    };
  }
  function wrapChat(v) {
    if (!v || v.__t7 || typeof v.make !== "function") return v;
    const make = v.make;
    const w = {
      ...v,
      make(K) {
        const room = K && K.one ? "one" : K && K.base === MINE ? "mine" : K && K.base === CITY ? "city" : null;
        if (!room) return make(K);
        const KK = patchK(K, room);
        const raw = make(KK);
        rooms[room].instance = { raw, K: KK };
        return wrapInst(raw, KK, room);
      }
    };
    w.__t7 = 1;
    return w;
  }
  function wrapCity(v) {
    if (!v || v.__t7 || typeof v.onEvent !== "function") return v;
    const o = v.onEvent;
    v.onEvent = function(d) {
      try {
        if (d) {
          if (Array.isArray(d.chatDel) && d.chatDel.length) {
            const deleted = new Set(d.chatDel.map(String));
            let changed = false;
            const archiveRoom = hasUnifiedChat() ? "one" : "city";
            const archive = rooms[archiveRoom];
            const kept = archive.archive.filter((m) => !deleted.has(String(m.id)));
            if (kept.length !== archive.archive.length) {
              archive.archive = kept;
              archive.archiveIds = new Set(kept.map((m) => String(m.id)));
              changed = true;
            }
            if (changed) schedulePingArchiveSave();
          }
        }
      } catch (e) {
        console.warn("[mine-tabs] city", e);
      }
      return o.apply(this, arguments);
    };
    v.__t7 = 1;
    return v;
  }
  function wrapMine(v) {
    if (!v || v.__t7) return v;
    const op = v.open;
    if (typeof op === "function") {
      v.open = function() {
        if (W.LGChat) return op.apply(this, arguments);
        const args = arguments, self = this;
        loadChatLib().then(() => op.apply(self, args));
      };
    }
    v.__t7 = 1;
    return v;
  }
  function hook(name, fn) {
    let val = W[name];
    if (val) val = fn(val);
    try {
      Object.defineProperty(W, name, {
        configurable: true,
        enumerable: true,
        get: () => val,
        set: (v) => {
          val = fn(v);
        }
      });
    } catch (e) {
      console.warn("[mine-tabs] hook", name, e);
    }
  }
  hook("LGChat", wrapChat);
  hook("LGCity", wrapCity);
  hook("LGMine", wrapMine);
  var started = false;
  function initialize() {
    const style = document.createElement("style");
    style.textContent = styles_default;
    document.head.appendChild(style);
    const size = store.get(STORE.emoteSize);
    if (SIZES[size]) S.size = size;
    S.nick = store.get(STORE.channelNickPrefix + pageChan) || pageChan;
    const position = store.get(STORE.popupPosition);
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) st.pos = position;
    const windowSize = store.get(STORE.popupSize);
    if (windowSize && Number.isFinite(windowSize.w) && Number.isFinite(windowSize.h)) st.win = windowSize;
    if (store.get(STORE.emotesEnabled) === false) S.on = false;
    applySize();
    st.hooks.status = updateSetStatus;
    st.hooks.place = place;
    st.hooks.emotes = () => {
      rescanAll();
      renderGrid();
    };
    startChatObservers();
    ensureButtons();
    scan();
    reload(false);
  }
  function startApp() {
    if (started) return;
    started = true;
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", initialize, { once: true });
    else
      initialize();
  }
  startApp();
})();
