// ==UserScript==
// @author       ProCto_Fliy
// @name         Legion chat extentions (7TV, более удобный чат и тд)
// @namespace    https://play.multidonate.ru/
// @version      5.9.0
// @description  Эмоуты 7TV в чате: кнопка 7TV, ник стримера, размер, список эмоутов, быстрый кеш
// @match        https://play.multidonate.ru/*
// @icon         https://cdn.7tv.app/emote/01F71VQYHR000D3ZZ6Q11NR7TV/2x.webp
// @homepageURL  https://github.com/mykhailkot-pixel/Legion7TV
// @updateURL    https://github.com/mykhailkot-pixel/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @downloadURL  https://github.com/mykhailkot-pixel/Legion7TV/raw/refs/heads/main/7tv-multidonate.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @connect      7tv.io
// @connect      cdn.7tv.app
// @connect      api.ivr.fi
// @connect      ibb.co
// @connect      www.ibb.co
// @connect      imgbb.com
// @connect      www.imgbb.com
// @connect      i.ibb.co
// @license      MIT
// ==/UserScript==
(() => {
  var styles_default = '.t7-w{display:inline-block;position:relative;vertical-align:middle;line-height:0}\r\n.t7-e {\r\n    display: block;\r\n    height: var(--t7-h, 1.9em);\r\n    width: calc(var(--t7-h, 1.9em) * var(--t7-r, 1));\r\n    object-fit: contain;\r\n}\r\n.t7-zw{position:absolute;left:50%;bottom:0;transform:translateX(-50%);height:var(--t7-h,1.9em);width:auto;pointer-events:none}\r\n.t7-e:not([data-loaded]),.t7-zw:not([data-loaded]){visibility:hidden}\r\n.t7-spoiler{padding:0 3px;border-radius:4px;background:#c7c9ce;color:transparent!important;cursor:pointer;transition:background-color .12s ease,color .12s ease}\r\n.t7-spoiler:not(.t7-spoiler-revealed) img{visibility:hidden}\r\n.t7-spoiler:not(.t7-spoiler-revealed) *{color:transparent!important;text-shadow:none!important}\r\n.t7-spoiler.t7-spoiler-revealed{padding:0;border-radius:0;background:transparent;color:inherit!important;cursor:inherit;transition:none}\r\n.t7-spoiler:focus-visible{outline:2px solid rgba(255,201,77,.75);outline-offset:2px}\r\n\r\n.t7-tip{position:fixed;z-index:2147483200;display:flex;flex-direction:column;align-items:center;width:min(210px,calc(100vw - 16px));overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#201d2b;color:#f4f1fb;box-shadow:0 5px 20px rgba(0,0,0,.55);font:14px/1.3 Arial,sans-serif;text-align:center;pointer-events:none}\r\n.t7-tip[hidden]{display:none!important}\r\n.t7-tip-preview{display:grid;place-items:center;width:100%;height:132px;background:linear-gradient(135deg,#302c3c,#171522)}\r\n.t7-tip-preview img{max-width:100%;max-height:100%;object-fit:contain}\r\n.t7-tip-preview img.t7-tip-loading{visibility:hidden}\r\n.t7-tip-info{display:flex;flex-direction:column;align-items:center;gap:7px;width:100%;padding:10px 8px 8px;overflow-wrap:anywhere}\r\n.t7-tip-name{display:flex;align-items:center;justify-content:center;gap:6px;font-size:17px;font-weight:700}\r\n.t7-tip-logo{display:inline-grid;place-items:center;width:25px;height:20px;border-radius:3px;background:#7136d8;color:#fff;font:bold 10px/1 Arial,sans-serif}\r\n.t7-tip-author{font-size:16px}\r\n.t7-tip-author span{color:#e89a00}\r\n.t7-tip-type{font-size:16px;font-weight:700}\r\n.t7-image-link{display:inline-flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:100%;vertical-align:top;font-size:0;line-height:0;text-decoration:none}\r\n.t7-image-preview{display:block;width:auto;height:auto;max-width:min(100%,400px);max-height:300px;object-fit:contain;border-radius:4px}\r\n\r\n\r\nform.cy-chat-f .t7-btn{\r\n    flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;\r\n    box-sizing:border-box;width:auto;height:auto;min-height:28px;margin:0 0 0 4px;padding:0 8px;\r\n    border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;\r\n    font:700 11px/1 system-ui,sans-serif;letter-spacing:0;text-indent:0;text-transform:none;\r\n    white-space:nowrap;vertical-align:middle;cursor:pointer}\r\nform.cy-chat-f .t7-btn:hover{background:rgb(165,100,255)}\r\nform.dm-f .t7-pastes-btn{flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:auto;height:auto;min-height:28px;margin:0 0 0 4px;padding:0 8px;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;font:700 11px/1 system-ui,sans-serif;white-space:nowrap;cursor:pointer}\r\nform.dm-f .t7-pastes-btn:hover{background:rgb(165,100,255)}\r\nform.cy-chat-f .t7-pastes-btn[hidden],form.dm-f .t7-pastes-btn[hidden],form.cy-chat-f .t7-images-btn[hidden],form.dm-f .t7-images-btn[hidden]{display:none!important}\r\nform.cy-chat-f{position:relative}\r\nform.cy-chat-f>.t7-ping-menu{position:absolute;left:auto;right:0;bottom:calc(100% + 5px);z-index:20;display:flex;flex-direction:column;width:min(210px,calc(100vw - 24px));max-height:132px;overflow-y:auto;padding:3px;border:1px solid rgba(255,255,255,.16);border-radius:6px;background:rgba(24,24,32,.88);box-shadow:0 5px 14px rgba(0,0,0,.28);backdrop-filter:blur(5px)}\r\nform.cy-chat-f>.t7-ping-menu[hidden]{display:none}\r\nform.cy-chat-f>.t7-ping-menu>.t7-ping-option{display:block;flex:none;width:100%;min-width:0;min-height:0;height:auto;margin:0;padding:4px 8px;border:0;border-radius:4px;background:transparent;color:#eee;text-align:left;text-transform:none;font:12px/1.25 system-ui,sans-serif;box-shadow:none}\r\nform.cy-chat-f>.t7-ping-menu>.t7-ping-option:hover,form.cy-chat-f>.t7-ping-menu>.t7-ping-option:focus-visible{background:rgba(255,255,255,.12);color:#fff;outline:none}\r\nform.cy-chat-f>.t7-emote-menu,form.dm-f>.t7-emote-menu{position:absolute;left:0;right:0;bottom:calc(100% + 5px);z-index:20;box-sizing:border-box;display:flex;align-items:center;gap:4px;width:min(620px,calc(100vw - 24px));max-width:100%;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(24,24,32,.94);box-shadow:0 5px 14px rgba(0,0,0,.32);backdrop-filter:blur(6px)}\r\nform.cy-chat-f>.t7-emote-menu[hidden],form.dm-f>.t7-emote-menu[hidden]{display:none}\r\n.t7-emote-strip{display:flex;flex:1;gap:4px;min-width:0;overflow:hidden}\r\n.t7-emote-nav,.t7-emote-option{flex:none;min-width:0;height:auto;margin:0;border:0;border-radius:5px;background:transparent;color:#eee;box-shadow:none;text-transform:none;cursor:pointer}\r\n.t7-emote-nav{width:24px;padding:4px;font:20px/1 system-ui,sans-serif}\r\n.t7-emote-nav:hover:not(:disabled),.t7-emote-option:hover{background:rgba(255,255,255,.14);color:#fff}\r\n.t7-emote-option:focus-visible{outline:2px solid rgba(255,201,77,.75);outline-offset:-2px}\r\n.t7-emote-option[aria-selected=true]{box-shadow:inset 0 -2px #ffc94d}\r\n.t7-emote-nav:disabled{opacity:.35;cursor:default}\r\n.t7-emote-option{display:flex;flex:1 1 62px;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:58px;min-height:56px;padding:1.5px;font:9px/1.15 system-ui,sans-serif}\r\n.t7-emote-option img{width:26px;height:26px;object-fit:contain}\r\n.t7-emote-option span{display:block;width:9ch;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:8px}\r\nform.cy-chat-f>.t7-emote-menu .t7-emote-option,form.dm-f>.t7-emote-menu .t7-emote-option{box-sizing:border-box;min-height:56px!important;height:auto!important;margin:0!important;padding:1.5px!important}\r\nform.cy-chat-f>.t7-banword-warning{position:absolute;left:0;right:0;bottom:calc(100% + 5px);z-index:21;padding:7px 9px;border:1px solid rgba(255,201,77,.38);border-left:3px solid #ffc94d;border-radius:4px;background:rgba(24,24,32,.96);color:#f2dda0;font:12px/1.35 system-ui,sans-serif;box-shadow:0 5px 14px rgba(0,0,0,.28)}\r\nform.cy-chat-f>.t7-banword-warning[hidden]{display:none}\r\n.t7-paste-overlay{position:fixed;inset:0;z-index:2147483100;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.58);font:13px/1.35 system-ui,sans-serif}\r\n.t7-paste-dialog{display:flex;flex-direction:column;gap:10px;width:min(440px,100%);max-height:min(620px,90vh);overflow-y:auto;padding:12px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:#1b1b24;color:#eee;box-shadow:0 10px 32px rgba(0,0,0,.48)}\r\n.t7-paste-header,.t7-paste-row,.t7-paste-actions{display:flex;align-items:center;gap:6px}\r\n.t7-paste-header{justify-content:space-between;font-size:15px}\r\n.t7-paste-list{display:flex;flex-direction:column;gap:4px;min-height:36px;overflow-y:auto}\r\n.t7-paste-item,.t7-paste-edit,.t7-paste-delete,.t7-paste-close,.t7-paste-primary,.t7-paste-secondary{border:1px solid rgba(255,255,255,.18);border-radius:4px;background:#101018;color:#eee;cursor:pointer}\r\n.t7-paste-item{flex:1;min-width:0;padding:7px 9px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\r\n.t7-paste-item:hover,.t7-paste-edit:hover,.t7-paste-delete:hover,.t7-paste-close:hover,.t7-paste-secondary:hover{background:#292936}\r\n.t7-paste-edit,.t7-paste-delete,.t7-paste-close{display:grid;place-items:center;flex:none;width:30px;height:30px;padding:0}\r\n.t7-paste-edit{font-size:16px}\r\n.t7-paste-delete,.t7-paste-close{font-size:20px}\r\n.t7-paste-add,.t7-paste-primary,.t7-paste-secondary{padding:7px 10px}\r\n.t7-paste-primary{border-color:#7650c9;background:#6844b5;color:#fff}\r\n.t7-paste-primary:hover{background:#7954c5}\r\n.t7-paste-editor{display:flex;flex-direction:column;gap:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12)}\r\n.t7-paste-editor[hidden],.t7-paste-add[hidden],.t7-paste-list[hidden]{display:none}\r\n.t7-paste-field{display:flex;flex-direction:column;gap:4px;color:#bbb;font-size:12px}\r\n.t7-paste-field input,.t7-paste-field textarea{box-sizing:border-box;width:100%;padding:7px 8px;border:1px solid rgba(255,255,255,.2);border-radius:4px;background:#101018;color:#fff;font:13px/1.35 system-ui,sans-serif}\r\n.t7-paste-field textarea{min-height:100px;resize:vertical}\r\n.t7-paste-actions{justify-content:flex-end}\r\n.t7-paste-empty{padding:10px 4px;color:#aaa;text-align:center}\r\n.t7-image-picker{width:min(440px,100%);max-height:min(680px,92vh)}\r\n.t7-image-picker-url{display:flex;align-items:center;gap:6px}\r\n.t7-image-picker-url>a{display:grid;place-items:center;flex:none;width:34px;height:34px;border:1px solid rgba(255,255,255,.18);border-radius:5px;background:#101018;color:#eee;font-size:18px;text-decoration:none}\r\n.t7-image-picker-url>a:hover{background:#292936}\r\n.t7-image-picker-input{box-sizing:border-box;flex:1;min-width:0;padding:8px;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:#101018;color:#fff;font:13px system-ui,sans-serif}\r\n.t7-image-picker-preview{display:grid;place-items:center;min-height:110px;max-height:180px;overflow:hidden;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:5px;background:#15141e;color:#aaa;font-size:12px;text-align:center}\r\n.t7-image-picker-preview img{display:block;max-width:100%;max-height:160px;object-fit:contain}\r\n.t7-image-picker-preview.t7-image-picker-error{color:#ffaaa5}\r\n.t7-image-picker-actions{display:flex;justify-content:flex-end;gap:6px}\r\n.t7-image-picker-tabs button{flex:1;padding:6px 8px;border:0;border-radius:4px;background:transparent;color:#aaa;font:12px system-ui,sans-serif;cursor:pointer}\r\n.t7-image-picker-tabs button[aria-selected=true]{background:rgba(255,255,255,.14);color:#eee}\r\n.t7-image-library{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px;min-height:52px;max-height:190px;overflow-y:auto;overscroll-behavior:contain}\r\n.t7-image-library-item{position:relative;min-width:0}\r\n.t7-image-library-choose{display:flex;flex-direction:column;align-items:stretch;gap:4px;width:100%;height:100%;min-height:82px;padding:5px;border:1px solid rgba(255,255,255,.12);border-radius:5px;background:#101018;color:#ddd;text-align:center;cursor:pointer}\r\n.t7-image-library-choose:hover,.t7-image-library-choose:focus-visible{background:#292936}\r\n.t7-image-library-choose img{display:block;width:100%;height:54px;object-fit:contain}\r\n.t7-image-library-choose span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}\r\n.t7-image-library-favorite{position:absolute;top:3px;right:3px;display:grid;place-items:center;width:24px;height:24px;padding:0;border:1px solid rgba(255,255,255,.18);border-radius:4px;background:rgba(15,15,21,.88);color:#e5c76b;font:16px/1 system-ui,sans-serif;cursor:pointer}\r\n.t7-image-picker-empty{grid-column:1/-1;padding:16px 6px;color:#aaa;text-align:center;font-size:12px}\r\n\r\n\r\n.t7-pop,.t7-set{\r\n    --t7-bg:#1b1b24;--t7-bg-in:#0f0f15;--t7-fg:#eee;--t7-mute:#aaa;\r\n    --t7-line:rgba(255,255,255,.2);--t7-hover:rgba(255,255,255,.14);--t7-acc:#9146ff}\r\n.t7-pop *,.t7-set *{box-sizing:border-box}\r\n.t7-pop button,.t7-sw button{font:inherit;cursor:pointer}\r\n.t7-pop [hidden]{display:none!important}\r\n\r\n\r\n.t7-x,.t7-g{display:grid;place-items:center;flex:none;width:40px;height:40px;padding:0;background:none;border:0;color:#ccc;line-height:1;border-radius:6px}\r\n.t7-x{font-size:36px}\r\n.t7-g{font-size:29px}\r\n.t7-x:hover,.t7-g:hover{background:var(--t7-hover);color:#fff}\r\n\r\n\r\n.t7-pop{\r\n    position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:8px;\r\n    padding:10px;background:var(--t7-bg);color:var(--t7-fg);\r\n    border:1px solid rgba(255,255,255,.18);border-radius:10px;\r\n    box-shadow:0 8px 28px rgba(0,0,0,.55);font:13px/1.3 system-ui,sans-serif;\r\n    contain:layout paint;isolation:isolate}\r\n.t7-pop.t7-drag{will-change:transform;transition:none}\r\n.t7-pop.t7-drag .t7-gr{pointer-events:none}\r\n\r\n.t7-h,.t7-sth{display:flex;justify-content:space-between;align-items:center;\r\n    font-size:15px;cursor:grab;touch-action:none;user-select:none}\r\n.t7-h:active,.t7-sth:active{cursor:grabbing}\r\n.t7-hb{display:flex;align-items:center;gap:2px}\r\n\r\n.t7-pop input[type=search]{\r\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\r\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\r\n.t7-views{display:flex;gap:3px;padding:2px;border:1px solid var(--t7-line);border-radius:6px;background:var(--t7-bg-in)}\r\n.t7-views button{flex:1;padding:5px 7px;border:0;border-radius:4px;background:transparent;color:var(--t7-mute);font-size:12px}\r\n.t7-views button[aria-selected=true]{background:var(--t7-hover);color:var(--t7-fg)}\r\n\r\n.t7-gr{flex:1;min-height:156px;overflow-y:auto;overscroll-behavior:contain}\r\n.t7-sh{margin:6px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--t7-mute)}\r\n.t7-gw{display:flex;flex-wrap:wrap;gap:2px}\r\n.t7-it{display:inline-flex;align-items:center;justify-content:center;\r\n    width:var(--t7-tile,40px);height:var(--t7-tile,40px);padding:3px;border:0;border-radius:6px;background:transparent}\r\n.t7-it:hover,.t7-it:focus-visible{background:var(--t7-hover)}\r\n.t7-it img{width:100%;height:100%;object-fit:contain}\r\n.t7-item{position:relative;flex:none;width:var(--t7-tile,40px);height:var(--t7-tile,40px)}\r\n.t7-item .t7-it{width:100%;height:100%}\r\n.t7-fav{position:absolute;top:0;right:0;z-index:1;display:grid;place-items:center;width:17px;height:17px;padding:0;border:0;border-radius:4px;background:rgba(15,15,21,.82);color:#e5c76b;font:14px/1 system-ui,sans-serif;opacity:.78}\r\n.t7-fav:hover,.t7-fav:focus-visible{opacity:1;background:var(--t7-hover)}\r\n.t7-emp{padding:16px 4px;color:var(--t7-mute);text-align:center}\r\n\r\n.t7-rs{position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none;\r\n    border-radius:0 0 10px 0;\r\n    background:linear-gradient(135deg,transparent 0 55%,#888 55% 62%,transparent 62% 72%,#888 72% 79%,transparent 79%)}\r\n\r\n\r\n.t7-set{\r\n    position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;\r\n    padding:12px;background:rgba(0,0,0,.5);font:13px/1.3 system-ui,sans-serif}\r\n.t7-sw{\r\n    width:380px;max-width:100%;max-height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:8px;\r\n    padding:14px;background:var(--t7-bg);color:var(--t7-fg);\r\n    border:1px solid rgba(255,255,255,.18);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.6)}\r\n.t7-sw.t7-drag{will-change:transform}\r\n.t7-settings-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:3px;border:1px solid var(--t7-line);border-radius:8px;background:var(--t7-bg-in)}\r\n.t7-settings-tabs button{min-width:0;padding:7px 3px;border:0;border-radius:6px;background:transparent;color:var(--t7-mute);font-size:12px;font-weight:600;white-space:nowrap}\r\n.t7-settings-tabs button:hover{background:var(--t7-hover);color:var(--t7-fg)}\r\n.t7-settings-tabs button[aria-selected=true]{background:#ffc94d;color:#211b11}\r\n.t7-settings-tabs button:focus-visible{outline:2px solid #ffc94d;outline-offset:1px}\r\n.t7-setting-panel{display:flex;flex-direction:column;gap:8px;min-width:0}\r\n.t7-setting-panel[hidden]{display:none!important}\r\n\r\n.t7-sec{display:flex;flex-direction:column;gap:6px;padding:0 0 6px;border-bottom:1px solid rgba(255,255,255,.1);interpolate-size:allow-keywords}\r\n.t7-sec:last-of-type{padding-bottom:0;border-bottom:0}\r\n.t7-sec>summary{display:flex;align-items:center;justify-content:flex-start;gap:9px;min-height:32px;padding:0 2px;list-style:none;color:#c8c8d0;font-size:12px;font-weight:600;text-transform:none;cursor:pointer;user-select:none}\r\n.t7-sec>summary::-webkit-details-marker{display:none}\r\n.t7-sec>summary::before{content:"";flex:none;width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform 180ms ease,color 180ms ease}\r\n.t7-sec>summary:hover,.t7-sec[open]>summary{color:#fff}\r\n.t7-sec>summary:focus-visible{outline:2px solid rgba(255,201,77,.75);outline-offset:2px}\r\n.t7-sec[open]>summary::before{transform:rotate(45deg)}\r\n.t7-sec>summary~*{margin-left:15px}\r\n.t7-sec::details-content{block-size:0;overflow:clip;opacity:0;transition:block-size 220ms ease,opacity 180ms ease,content-visibility 220ms allow-discrete}\r\n.t7-sec[open]::details-content{block-size:auto;opacity:1}\r\n@media(prefers-reduced-motion:reduce){.t7-sec::details-content,.t7-sec>summary::after{transition:none}}\r\n.t7-row{display:flex;gap:6px;align-items:flex-end}\r\n.t7-wrap{flex-wrap:wrap}\r\n.t7-fl{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--t7-mute)}\r\n.t7-chk{display:flex;gap:8px;align-items:center;cursor:pointer}\r\n.t7-dm-nick-mode{display:flex;align-items:center;justify-content:center;gap:10px;min-height:34px}\r\n.t7-dm-nick-mode-label{color:var(--t7-mute);font-size:12px;font-weight:600;transition:color 150ms ease}\r\n.t7-dm-nick-mode:not(.is-whitelist) .t7-dm-nick-mode-label:first-child,\r\n.t7-dm-nick-mode.is-whitelist .t7-dm-nick-mode-label:last-child{color:#ffc94d}\r\n.t7-toggle-switch{position:relative;display:inline-flex;flex:none;align-items:center;gap:8px;width:auto;height:auto;cursor:pointer}\r\n.t7-toggle-switch input{position:absolute;width:1px;height:1px;opacity:0}\r\n.t7-toggle-track{position:relative;display:block;flex:none;box-sizing:border-box;width:34px;height:18px;border:1px solid var(--t7-line);border-radius:999px;background:var(--t7-bg-in);transition:background 180ms ease,border-color 180ms ease}\r\n.t7-toggle-track::after{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#aaa;content:"";transition:transform 180ms ease,background 180ms ease}\r\n.t7-toggle-switch input:checked+.t7-toggle-track{border-color:#b783ff;background:rgba(145,70,255,.35)}\r\n.t7-toggle-switch input:checked+.t7-toggle-track::after{transform:translateX(14px);background:#d7b6ff}\r\n.t7-toggle-switch input:focus-visible+.t7-toggle-track{outline:2px solid #ffc94d;outline-offset:2px}\r\n.t7-toggle-switch:has(input:disabled){cursor:not-allowed;opacity:.5}\r\n.t7-sst{min-height:1.3em;font-size:11px;color:var(--t7-mute)}\r\n.t7-note{display:flex;align-items:center;gap:8px;margin:0;padding:8px 10px;border:1px solid rgba(255,201,77,.3);border-left:3px solid #ffc94d;border-radius:4px;background:rgba(255,201,77,.08);color:#e8d6a4;font-size:12px;line-height:1.35}\r\n.t7-note-icon{display:grid;place-items:center;flex:none;width:18px;height:18px;border-radius:50%;background:rgba(255,201,77,.18);color:#ffc94d;font-size:12px;font-weight:700}\r\n\r\n.t7-sw input[type=text],.t7-sw input[type=number]{\r\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\r\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\r\n.t7-sw textarea,.t7-sw select{\r\n    width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--t7-line);\r\n    background:var(--t7-bg-in);color:#fff;font:13px system-ui,sans-serif}\r\n.t7-sw textarea{resize:vertical;min-height:44px}\r\n.t7-volume{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px}\r\n.t7-volume input{grid-column:1/-1;width:100%;margin:2px 0}\r\n.t7-volume output,.t7-ping-status{font-size:11px;color:var(--t7-mute)}\r\n.t7-ping-status{min-height:1.3em}\r\n.t7-ping-color-control input{width:38px;height:30px;padding:2px;border:1px solid var(--t7-line);border-radius:5px;background:var(--t7-bg-in);cursor:pointer}\r\n.t7-chat-font-control{min-width:0;width:100%}\r\n.t7-chat-font-control select{box-sizing:border-box;min-width:0;max-width:100%}\r\n.t7-chat-font-size-control{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px}\r\n.t7-chat-font-size-control input{grid-column:1/-1;width:100%;margin:2px 0;accent-color:var(--t7-acc)}\r\n.t7-chat-font-size-control output{min-width:42px;text-align:right;font-variant-numeric:tabular-nums}\r\n.t7-chat-font-actions{min-width:0;align-items:center}\r\n.t7-chat-font-actions .t7-b{flex:1 1 130px;min-width:0;white-space:normal}\r\n.t7-chat-font-actions .t7-b:disabled{opacity:.45;cursor:default}\r\n.t7-chat-font-status{overflow-wrap:anywhere}\r\n\r\n.t7-b{padding:6px 10px;border-radius:6px;border:1px solid var(--t7-line);background:var(--t7-bg-in);color:#ddd}\r\n.t7-b:hover{background:#1d1d29}\r\n.t7-b.p{background:var(--t7-acc);border-color:var(--t7-acc);color:#fff}\r\n\r\n.t7-szb{display:flex;gap:4px}\r\n.t7-szb button{min-width:34px;padding:4px 8px;border-radius:6px;border:1px solid var(--t7-line);background:var(--t7-bg-in);color:#ddd}\r\n.t7-szb button[aria-pressed=true]{background:var(--t7-acc);border-color:var(--t7-acc);color:#fff}\r\n.t7-chat-tab-list{display:flex;flex-direction:column;gap:3px}\r\n.t7-chat-tab-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:2px 0}\r\n.t7-chat-tab-name{flex:1;min-width:0;font-size:12px;color:var(--t7-fg)}\r\n.t7-chat-tab-visible{font-size:11px;color:var(--t7-mute);white-space:nowrap}\r\n.t7-chat-tab-move{display:inline-flex;gap:3px}\r\n.t7-chat-tab-move button{display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid var(--t7-line);border-radius:4px;background:var(--t7-bg-in);color:#ddd}\r\n.t7-chat-tab-move button:disabled{opacity:.35;cursor:default}\r\n\r\n\r\n.cy-chat-tabs:not([hidden]){\r\n    display:flex;flex-wrap:nowrap;gap:2px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;\r\n    overflow-x:auto;overflow-y:hidden;scrollbar-width:none}\r\n.cy-chat-tabs::-webkit-scrollbar{display:none}\r\n.cy-chat-tabs>button[data-tab]{\r\n    flex:0 0 auto;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:3px;\r\n    padding:5px 6px;font-size:11px;line-height:1.2;white-space:nowrap;overflow:visible}\r\n.cy-chat-tabs>button .cy-chat-tn{flex:none;margin:0;min-width:1.5em;padding:1px 4px;line-height:1.3;text-align:center;overflow:visible}\r\n.cy-chat-h .t7-chat-filter{display:inline-flex;align-items:center;gap:4px;margin-left:auto;padding:3px 5px;border-radius:4px;font:11px/1.2 system-ui,sans-serif;white-space:nowrap;cursor:pointer;user-select:none}\r\n.cy-chat-h .t7-chat-filter input{width:13px;height:13px;margin:0;accent-color:#ffc94d;flex:none}\r\n.cy-chat-h .t7-chat-filter span{white-space:nowrap}\r\n.cy-chat-h .t7-ping-nav{display:inline-flex;align-items:center;gap:2px;margin-left:4px}\r\n.cy-chat-h .t7-ping-nav[hidden]{display:none!important}\r\n.cy-chat-h .t7-ping-nav button{display:grid;place-items:center;width:22px;height:22px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:3px;background:transparent;color:inherit;font:16px/1 system-ui,sans-serif;cursor:pointer}\r\n.cy-chat-h .t7-ping-nav button:disabled{opacity:.35;cursor:default}\r\n\r\n\r\n.cy-chat .cy-chat-n,\r\n.cy-chat .cy-chat-tn,\r\n.cy-chat .cy-chat-tp,\r\n.cy-chat .cy-chat-pn{\r\n    flex:none;display:inline-block;box-sizing:border-box;min-width:18px;height:18px;margin:0 0 0 4px;padding:0 5px;\r\n    border-radius:9px;font:700 11px/18px system-ui,sans-serif;text-align:center;text-indent:0;overflow:visible}\r\n.cy-chat .cy-chat-n,\r\n.cy-chat .cy-chat-tn{background:#e53935;color:#fff}\r\n.cy-chat .cy-chat-tp,\r\n.cy-chat .cy-chat-pn{background:#ffc94d;color:#1b1b24}\r\n.cy-chat .cy-chat-n[hidden],\r\n.cy-chat .cy-chat-tn[hidden],\r\n.cy-chat .cy-chat-tp[hidden],\r\n.cy-chat .cy-chat-pn[hidden]{display:none!important}\r\n.cy-chat-l>li.t7-ping-hidden{display:none!important}\r\n.cy-chat-l>li.t7-ping{background:rgba(255,201,77,.14);border-radius:6px;box-shadow:inset 3px 0 0 #ffc94d;padding-left:6px}\r\n.cy-chat-l[data-t7-no-pings="true"]:after{display:block;padding:12px 6px;color:#aaa;font:12px/1.4 system-ui,sans-serif;text-align:center;content:"\u041F\u0438\u043D\u0433\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442"}\r\n.cy-chat-l,.dm-l{font-family:var(--t7-chat-font,inherit);font-size:var(--t7-chat-font-size,14px);font-synthesis:weight style}\r\n.t7-mention{color:var(--t7-ping-color,#e89aa3);font-weight:600}\r\n.cy-chat-l>li.t7-filtered{font-style:italic}\r\n.cy-chat-l>li>.t7-filter-label{display:inline-block;margin-right:5px;padding:2px 6px;border-radius:4px;background:rgba(255,201,77,.14);color:#ffca66;font-size:13px;font-weight:700;white-space:nowrap}\r\n.cy-chat-l>li.t7-filtered>:not(.t7-filter-label){display:none!important}\r\n.mn .cy-chat-l,.mn .cy-chat-l li,.mn .cy-chat-l li *{-webkit-user-select:text!important;user-select:text!important}\r\n\r\n.cy-chat-l a.t7-link{color:#8edbff;text-decoration:underline;text-underline-offset:2px;cursor:pointer}\r\n.cy-chat-tabs>button[data-tab][hidden]{display:none!important}\r\n.cy-chat-tabs>button[data-tab].t7-pref-hidden{display:none!important}\r\n.t7-link-warning{flex-basis:100%;color:#ffb4a8;font:12px/1.35 system-ui,sans-serif}\r\n\r\n.cy-chat-l,\r\n.dm-l {\r\n  overflow-anchor: none;\r\n}\r\n\r\n\r\nform.cy-chat-f .t7-btn, form.dm-f .t7-btn{\r\n    flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;\r\n    box-sizing:border-box;width:auto;height:auto;min-height:28px;margin:0 0 0 4px;padding:0 8px;\r\n    border:1px solid rgba(255,255,255,.25);border-radius:6px;background:rgba(145,70,255,.9);color:#fff;\r\n    font:700 11px/1 system-ui,sans-serif;letter-spacing:0;text-indent:0;text-transform:none;\r\n    white-space:nowrap;vertical-align:middle;cursor:pointer}\r\nform.cy-chat-f .t7-btn:hover, form.dm-f .t7-btn:hover{background:rgb(165,100,255)}\r\nform.dm-f{position:relative}';
  var CACHE_TTL = 60 * 60 * 1e3;
  var SIZES = {
    s: { h: "1.25em", n: 2, p: 32, label: "S" },
    m: { h: "1.6em", n: 2, p: 40, label: "M" },
    l: { h: "2.05em", n: 3, p: 52, label: "L" },
    x: { h: "2.65em", n: 3, p: 68, label: "XL" },
    xxl: { h: "3.4em", n: 4, p: 84, label: "XXL" }
  };
  var HARD_BANNED_WORDS = [
    "\u043F\u0438\u0434\u043E\u0440",
    "\u043F\u0438\u0434\u043E\u0440\u0430\u0441",
    "\u043F\u0438\u0434\u0440\u0438\u043B\u0430",
    "\u043F\u0438\u0434\u0440",
    "\u0433\u043E\u043C\u0438\u043A",
    "\u0433\u043E\u043C\u043E\u0441\u0435\u043A",
    "\u043B\u0435\u0441\u0431\u0443\u0445\u0430",
    "\u043D\u0438\u0433\u0433\u0435\u0440",
    "\u043D\u0438\u0433\u0433\u0430",
    "\u0447\u0435\u0440\u043D\u043E\u043C\u0430\u0437\u044B\u0439",
    "\u0447\u0435\u0440\u043D\u043E\u0436\u043E\u043F\u044B\u0439",
    "\u0447\u0443\u0440\u043A\u0430",
    "\u0445\u0430\u0447",
    "\u0447\u0443\u0440\u0431\u0430\u043D",
    "\u0436\u0438\u0434",
    "\u0443\u0437\u043A\u043E\u0433\u043B\u0430\u0437\u044B\u0439",
    "\u0447\u0443\u0440\u043A\u043E\u0431\u0435\u0441",
    "\u043A\u0443\u043A\u043E\u043B\u0434",
    "\u0440\u043E\u0433\u043E\u043D\u043E\u0441\u0435\u0446",
    "\u0438\u043C\u043F\u043E\u0442\u0435\u043D\u0442",
    "\u0448\u043B\u044E\u0445\u0430",
    "\u0445\u0443\u0435\u0441\u043E\u0441",
    "\u0434\u0435\u0433\u0435\u043D\u0435\u0440\u0430\u0442",
    "\u0434\u0430\u0443\u043D"
  ];
  var pageChan = (() => {
    const m = /\/c\/([\w]+)/.exec(location.pathname);
    return m ? m[1].toLowerCase() : "";
  })();
  var EXTRA_EMOTES = [
    { id: "01KPTZTF2P1MP5RFNJ4Q1ZQZS6" },
    { id: "01J64BY7C0000FXZ59PB5ZMYVJ" },
    { id: "01JW6SB53B0B9T6EMJ4QWZA326" },
    { id: "01KVWQKYK22C9XHBG1NMKHYR67" },
    { id: "01HCCXW2M00003DZM5HVHF63FP" }
  ];
  var EXTRA_SETS = [
  ];
  var STORE = Object.freeze({
    emoteSize: "t7size",
    popupPosition: "t7pos",
    popupSize: "t7win",
    settingsPosition: "t7spos",
    emotesEnabled: "t7on",
    emoteCachePrefix: "t7c5:",
    favorites: "t7favorites",
    recentEmotes: "t7recent",
    recentEmoteLimit: "t7recentLimit",
    pingConfig: "t7ping",
    chatFont: "t7ChatFont",
    chatFontFile: "t7ChatFontFile",
    chatFontSize: "t7ChatFontSize",
    pingOnly: "t7PingOnly",
    pingArchive: "t7PingArchive",
    chatTabPrefs: "t7ChatTabPrefs",
    linkEncoding: "t7LinkEncoding",
    imagePreviews: "t7ImagePreviews",
    imageResolveCache: "t7ImageResolveCache",
    imagePickerButton: "t7ImagePickerButton",
    imageRecent: "t7Images:recent",
    imageFavorites: "t7Images:favorites",
    networkProxy: "t7proxy",
    pastes: "t7Pastes",
    pastesEnabled: "t7PastesEnabled"
  });
  var EV = Object.freeze({
    tabCompletionChange: "t7-tab-completion-change",
    emoteCompletionChange: "t7-emote-completion-change",
    chatTabsChange: "t7-chat-tabs-change",
    recentLimitChange: "t7-recent-limit-change"
  });
  var SEL = Object.freeze({
    chatRoot: ".cy-chat",
    chatList: ".cy-chat-l",
    chatRows: ".cy-chat-l li",
    freshChatRows: ".cy-chat-l li:not([data-l7tv-processed])",
    processedChatRows: ".cy-chat-l li[data-l7tv-processed]",
    dmRoot: ".cy-chat-dmx, .dm-l",
    dmRows: ".cy-chat-dmx li, .dm-l > li",
    freshDmRows: ".cy-chat-dmx li:not([data-l7tv-processed]), .dm-l > li:not([data-l7tv-processed])",
    processedDmRows: ".cy-chat-dmx li[data-l7tv-processed], .dm-l > li[data-l7tv-processed]",
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
    emptyMessage: ".cy-chat-0, .dm-0, .dm-old",
    systemMessage: ".cy-chat-sys",
    eventMessage: ".cy-chat-ev"
  });
  var extensionEvents = new EventTarget();
  var clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  function emit(name, detail) {
    const event = detail === void 0 ? new Event(name) : new CustomEvent(name, { detail });
    extensionEvents.dispatchEvent(event);
    return event;
  }
  function on(name, listener, options) {
    extensionEvents.addEventListener(name, listener, options);
    return () => extensionEvents.removeEventListener(name, listener, options);
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
  var extensionValues = null;
  var extensionWriter = null;
  var extensionPersistenceUnavailable = false;
  function logStorageError(operation, error) {
    console.error(`[Legion7TV] storage ${operation} failed`, error);
  }
  function handleExtensionWriteError(error) {
    if (error instanceof Error && /extension context invalidated/i.test(error.message)) {
      extensionWriter = null;
      extensionPersistenceUnavailable = true;
      console.warn("[Legion7TV] The extension was reloaded; storage changes will not persist until this page is refreshed.", error);
      return;
    }
    logStorageError("write", error);
  }
  var store = {
    get(key) {
      if (extensionValues) return extensionValues[key];
      try {
        return typeof GM_getValue === "function" ? GM_getValue(key, void 0) : void 0;
      } catch (error) {
        logStorageError("read", error);
        return void 0;
      }
    },
    set(key, value) {
      if (extensionValues) {
        extensionValues[key] = value;
        if (!extensionWriter) {
          if (extensionPersistenceUnavailable) return;
          logStorageError("write", new Error("extension storage writer is not configured"));
          return;
        }
        try {
          Promise.resolve(extensionWriter(key, value)).catch(handleExtensionWriteError);
        } catch (error) {
          handleExtensionWriteError(error);
        }
        return;
      }
      try {
        if (typeof GM_setValue !== "function") throw new Error("GM_setValue is unavailable");
        GM_setValue(key, value);
      } catch (error) {
        logStorageError("write", error);
      }
    }
  };
  var ALLOWED = ["7tv.io", "cdn.7tv.app", "api.ivr.fi", "ibb.co", "www.ibb.co", "imgbb.com", "www.imgbb.com", "i.ibb.co"];
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
    if (typeof GM_xmlhttpRequest !== "function") {
      const api = globalThis.browser || globalThis.chrome;
      if (!api || !api.runtime || typeof api.runtime.sendMessage !== "function") {
        reject(new Error("no supported cross-origin request API is available"));
        return;
      }
      const request = api.runtime.sendMessage({ type: "LEGION7TV_FETCH", url, responseType, timeout });
      Promise.resolve(request).then((result) => {
        if (!result || !result.ok) {
          reject(new Error(result && result.error || "extension request failed"));
          return;
        }
        if (responseType === "blob") {
          const binary = atob(result.body);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          resolve({ status: result.status, response: new Blob([bytes], { type: result.contentType }) });
        } else {
          resolve({ status: result.status, responseText: result.body });
        }
      }, reject);
      return;
    }
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
    const route = ROUTES[new URL(url).hostname];
    if (proxy && route && Date.now() > proxyDownUntil) {
      try {
        return await gmOnce(viaProxy(url), responseType, 6e3);
      } catch {
        proxyDownUntil = Date.now() + 12e4;
      }
    }
    return gmOnce(url, responseType, 15e3);
  };
  var getJson = async (url) => JSON.parse((await gm(url)).responseText);
  var getText = async (url) => (await gm(url)).responseText;
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
  function fetchImg(url, hi, reusableUrls = []) {
    if (imgCache.has(url)) return imgCache.get(url);
    const p = (async () => {
      let blob = await DB.get(url);
      for (const candidate of reusableUrls) {
        if (blob) break;
        if (candidate !== url) blob = await DB.get(candidate);
      }
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
  function mk(host, flags, isGlobal, isExtra, meta = {}) {
    const imageFiles = (host.files || []).filter((f) => f.format === "WEBP");
    const files = imageFiles.map((f) => f.name);
    const dimensions = imageFiles.find((f) => Number.isFinite(f.width) && f.width > 0 && Number.isFinite(f.height) && f.height > 0);
    const owner = meta.owner || {};
    return {
      base: "https:" + host.url,
      f: files.length ? files : ["1x.webp", "2x.webp"],
      ...dimensions ? { r: dimensions.width / dimensions.height } : {},
      zw: !!(flags & 256),
      g: isGlobal,
      id: String(meta.id || ""),
      owner: String(owner.display_name || owner.username || ""),
      animated: typeof meta.animated === "boolean" ? meta.animated : null,
      ...isExtra ? { x: true } : {}
    };
  }
  function addSet(map, set, isGlobal, isExtra) {
    for (const e of set && set.emotes || []) {
      const host = e.data && e.data.host;
      if (!host || !host.url || e.name === "__proto__") continue;
      map[e.name] = mk(host, e.data.flags, isGlobal, isExtra, {
        id: e.id || e.data.id,
        owner: e.data.owner,
        animated: e.data.animated
      });
    }
  }
  function addOne(map, em, alias) {
    const host = em && em.host;
    const name = String(alias || em && em.name || "");
    if (!host || !host.url || !name || /\s/.test(name) || name === "__proto__") return false;
    map[name] = mk(host, em.flags, true, true, {
      id: em.id,
      owner: em.owner,
      animated: em.animated
    });
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
  function setEmoteImage(image, em, n, loading = "lazy", onError) {
    const src = urlFor(em, n);
    image.loading = loading;
    image.decoding = "async";
    image.removeAttribute("srcset");
    fetchImg(src, true, reusableUrlsFor(em, n)).then((cachedSrc) => {
      image.src = cachedSrc;
    }, (error) => {
      if (onError) onError(error);
      else console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u044D\u043C\u043E\u0443\u0442\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", src, error);
    });
  }
  function reusableUrlsFor(em, n) {
    const target = urlFor(em, n);
    const targetSize = parseInt(target.slice(em.base.length + 1), 10);
    const higher = em.f.filter((f) => parseInt(f, 10) > targetSize).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map((f) => em.base + "/" + f);
    return [target, ...higher];
  }
  async function loadEmotes(nick, force) {
    const now = Date.now();
    const globalKey = STORE.emoteCachePrefix + "global:" + xsig();
    const channel = String(nick || "").trim().toLowerCase();
    const channelKey = STORE.emoteCachePrefix + "channel:" + encodeURIComponent(channel);
    const validCache = (value) => value && value.map && typeof value.map === "object";
    let globalData = !force ? store.get(globalKey) : null;
    if (!validCache(globalData)) globalData = null;
    let channelData = channel && !force ? store.get(channelKey) : null;
    if (!validCache(channelData)) channelData = null;
    let err = "";
    if (!globalData) {
      const globalMap = {};
      let globalLoaded = false;
      try {
        addSet(globalMap, await getJson("https://7tv.io/v3/emote-sets/global"), true, false);
        globalLoaded = true;
      } catch (e) {
        err = "\u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C";
        console.warn("[7TV]", e);
      }
      let extras = {};
      let bad2 = 0;
      if (EXTRA_EMOTES.length || EXTRA_SETS.length) {
        const result = await loadExtras();
        extras = result.map;
        bad2 = result.bad;
      }
      globalData = { at: now, map: globalMap, extras, bad: bad2 };
      if (globalLoaded && !bad2) store.set(globalKey, globalData);
    }
    let chanMsg = "";
    if (!channel) {
      chanMsg = "\u0443\u043A\u0430\u0436\u0438 \u043D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430";
    } else if (channelData) {
      chanMsg = channelData.msg || "";
    } else {
      const channelMap = {};
      let canCacheChannel = false;
      try {
        const u = await getJson("https://api.ivr.fi/v2/twitch/user?login=" + encodeURIComponent(channel));
        const id = u && u[0] && u[0].id;
        if (!id) {
          chanMsg = "Twitch-\u043A\u0430\u043D\u0430\u043B \xAB" + channel + "\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D";
          canCacheChannel = true;
        } else {
          const user = await getJson("https://7tv.io/v3/users/twitch/" + id);
          const set = user && user.emote_set;
          if (set && set.emotes && set.emotes.length) addSet(channelMap, set, false, false);
          else chanMsg = "\u0443 \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435\u0442 \u044D\u043C\u043E\u0443\u0442\u043E\u0432 7TV";
          canCacheChannel = true;
        }
      } catch (e) {
        chanMsg = "\u044D\u043C\u043E\u0443\u0442\u044B \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C (\u043D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 7TV \u0438\u043B\u0438 \u0441\u0435\u0440\u0432\u0438\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D)";
        console.warn("[7TV]", e);
      }
      channelData = { at: now, map: channelMap, msg: chanMsg };
      if (canCacheChannel) store.set(channelKey, channelData);
    }
    const map = {};
    if (globalData) Object.assign(map, globalData.map);
    if (channelData) Object.assign(map, channelData.map);
    if (globalData && globalData.extras) Object.assign(map, globalData.extras);
    const names = Object.keys(map);
    const nc = names.filter((n) => !map[n].g).length;
    const xc = names.filter((n) => map[n].x).length;
    const gc = names.filter((n) => map[n].g && !map[n].x).length;
    const bad = globalData && globalData.bad || 0;
    let msg = `\u041A\u0430\u043D\u0430\u043B: ${nc} \xB7 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0435: ${gc}`;
    if (xc || bad) msg += ` \xB7 \u0441\u0432\u043E\u0438: ${xc}${bad ? " (\u043D\u0435 \u0432\u0441\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C: " + bad + ")" : ""}`;
    if (chanMsg) msg += " \xB7 " + chanMsg;
    if (err) msg += " \xB7 " + err;
    const stale = !!(globalData && now - globalData.at >= CACHE_TTL || channelData && now - channelData.at >= CACHE_TTL);
    return { map, msg, stale };
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
  var MARKERS = [
    { token: "***", tag: "strong", nestedTag: "em" },
    { token: "**", tag: "strong" },
    { token: "__", tag: "u" },
    { token: "~~", tag: "s" },
    { token: "||", tag: "span", className: "t7-spoiler" },
    { token: "*", tag: "em" },
    { token: "_", tag: "em" }
  ];
  var WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
  var URL_PREFIX_RE = /(?:\[ref\]\{[^{}\s]+\}|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/iy;
  var MENTION_RE = /(?<![\p{L}\p{N}_])@[a-z0-9_]{1,25}(?![\p{L}\p{N}_])/iy;
  var MARKER_SUFFIX_RE = /(?:\*{1,3}|_{1,2}|~{2}|\|{2})+$/;
  function isUnderscoreBoundary(text, index, opening) {
    const adjacent = opening ? text[index + 1] : text[index - 1];
    const other = opening ? text[index - 1] : text[index + 1];
    return !!adjacent && !/\s/.test(adjacent) && (!other || !WORD_CHAR_RE.test(other));
  }
  function markerAt(text, index, opening) {
    return MARKERS.find(({ token }) => {
      if (!text.startsWith(token, index)) return false;
      return token !== "_" || isUnderscoreBoundary(text, index, opening);
    });
  }
  function createWrapper(marker) {
    const wrapper = document.createElement(marker.tag);
    if (marker.className) {
      wrapper.className = marker.className;
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "button");
      wrapper.setAttribute("aria-label", "\u0420\u0430\u0441\u043A\u0440\u044B\u0442\u044C \u0441\u043F\u043E\u0439\u043B\u0435\u0440");
      wrapper.setAttribute("aria-expanded", "false");
      const toggle = () => {
        if (wrapper.classList.contains("t7-spoiler-revealed")) return;
        wrapper.classList.add("t7-spoiler-revealed");
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("tabindex");
        wrapper.removeAttribute("aria-expanded");
        wrapper.removeAttribute("aria-label");
      };
      wrapper.addEventListener("click", toggle);
      wrapper.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      });
    }
    return wrapper;
  }
  function parseInline(text, start = 0, closing = null, depth = 0) {
    const fragment = document.createDocumentFragment();
    let offset = start;
    let index = start;
    let changed = false;
    while (index < text.length) {
      URL_PREFIX_RE.lastIndex = index;
      const url = URL_PREFIX_RE.exec(text);
      if (url) {
        const markerSuffix = MARKER_SUFFIX_RE.exec(url[0]);
        index += url[0].length - (markerSuffix ? markerSuffix[0].length : 0);
        continue;
      }
      MENTION_RE.lastIndex = index;
      const mention = MENTION_RE.exec(text);
      if (mention) {
        index += mention[0].length;
        continue;
      }
      if (closing && text.startsWith(closing.token, index) && (closing.token !== "_" || isUnderscoreBoundary(text, index, false))) {
        fragment.appendChild(document.createTextNode(text.slice(offset, index)));
        return { fragment, index: index + closing.token.length, closed: true, changed };
      }
      const marker = depth < 32 ? markerAt(text, index, true) : null;
      if (!marker) {
        index++;
        continue;
      }
      const nested = parseInline(text, index + marker.token.length, marker, depth + 1);
      if (nested.closed) {
        fragment.appendChild(document.createTextNode(text.slice(offset, index)));
        const wrapper = createWrapper(marker);
        if (marker.nestedTag) {
          const nestedWrapper = document.createElement(marker.nestedTag);
          nestedWrapper.appendChild(nested.fragment);
          wrapper.appendChild(nestedWrapper);
        } else {
          wrapper.appendChild(nested.fragment);
        }
        fragment.appendChild(wrapper);
        index = nested.index;
        offset = index;
        changed = true;
        continue;
      }
      index += marker.token.length;
    }
    fragment.appendChild(document.createTextNode(text.slice(offset)));
    return { fragment, index, closed: false, changed };
  }
  function processMarkdown({ content, kind, source }) {
    if (kind !== "message") return;
    const parsed = parseInline(source);
    if (parsed.changed) content.replaceChildren(parsed.fragment);
  }
  var has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);
  function parseNick(v) {
    v = String(v || "").trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
    const i = v.lastIndexOf("/");
    if (i >= 0) v = v.slice(i + 1);
    v = v.replace(/^@/, "");
    return /^[a-z0-9_]{1,25}$/.test(v) ? v : "";
  }
  var tooltipData = /* @__PURE__ */ new WeakMap();
  var tooltip = null;
  var current = null;
  var imageToken = 0;
  var initialized = false;
  function setEmoteTooltipData(element, name, emote) {
    if (element && emote) tooltipData.set(element, { name, emote });
  }
  function findTarget(node) {
    const element = node instanceof Element ? node.closest(".t7-e, .t7-it") : null;
    return element && tooltipData.has(element) ? element : null;
  }
  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "t7-tip";
    tooltip.id = "t7-emote-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    const preview = document.createElement("div");
    preview.className = "t7-tip-preview";
    const image = document.createElement("img");
    image.alt = "";
    preview.appendChild(image);
    const info = document.createElement("div");
    info.className = "t7-tip-info";
    const name = document.createElement("strong");
    name.className = "t7-tip-name";
    const author = document.createElement("div");
    author.className = "t7-tip-author";
    const type = document.createElement("div");
    type.className = "t7-tip-type";
    info.append(name, author, type);
    tooltip.append(preview, info);
    document.body.appendChild(tooltip);
    return tooltip;
  }
  function position(target) {
    if (!tooltip || tooltip.hidden) return;
    const targetRect = target.getBoundingClientRect();
    const margin = 8;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.max(margin, Math.min(innerWidth - rect.width - margin, targetRect.left + targetRect.width / 2 - rect.width / 2));
    const above = targetRect.top - rect.height - 10;
    const top = above >= margin ? above : Math.min(innerHeight - rect.height - margin, targetRect.bottom + 10);
    tooltip.style.left = left + "px";
    tooltip.style.top = Math.max(margin, top) + "px";
  }
  function show(target) {
    const data = tooltipData.get(target);
    if (!data) return;
    if (current && current !== target) current.removeAttribute("aria-describedby");
    current = target;
    const tip = ensureTooltip();
    const { name, emote } = data;
    const title = tip.querySelector(".t7-tip-name");
    title.replaceChildren(document.createTextNode(name));
    const logo = document.createElement("span");
    logo.className = "t7-tip-logo";
    logo.textContent = emote.tw ? "T" : "7TV";
    logo.style.background = emote.tw ? "#9147ff" : "#111";
    logo.setAttribute("aria-label", emote.tw ? "Twitch" : "7TV");
    title.appendChild(logo);
    const author = tip.querySelector(".t7-tip-author");
    author.replaceChildren();
    if (emote.owner) {
      author.append(document.createTextNode("by "));
      const owner = document.createElement("span");
      owner.textContent = emote.owner;
      author.appendChild(owner);
    }
    tip.querySelector(".t7-tip-type").textContent = emote.tw ? "Twitch Global Emote" : emote.x ? "Imported Emote" : emote.g ? "Global Emote" : "Channel Emote";
    const image = tip.querySelector("img");
    const token = ++imageToken;
    image.removeAttribute("src");
    image.removeAttribute("srcset");
    image.classList.add("t7-tip-loading");
    tip.hidden = false;
    target.setAttribute("aria-describedby", tip.id);
    position(target);
    image.onload = () => {
      if (current === target && token === imageToken) image.classList.remove("t7-tip-loading");
    };
    setEmoteImage(image, emote, 4, "eager", (error) => {
      if (current === target && token === imageToken) {
        image.classList.remove("t7-tip-loading");
        console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u0435\u0432\u044C\u044E \u044D\u043C\u043E\u0443\u0442\u0430", name, error);
      }
    });
  }
  function hide() {
    if (current) current.removeAttribute("aria-describedby");
    current = null;
    imageToken++;
    if (tooltip) tooltip.hidden = true;
  }
  function initEmoteTooltip() {
    if (initialized) return;
    initialized = true;
    document.addEventListener("mouseover", (event) => {
      const target = findTarget(event.target);
      if (!target || target === current) return;
      show(target);
    });
    document.addEventListener("mouseout", (event) => {
      if (!current) return;
      if (findTarget(event.relatedTarget) === current) return;
      hide();
    });
    document.addEventListener("focusin", (event) => {
      const target = findTarget(event.target);
      if (target) show(target);
    });
    document.addEventListener("focusout", (event) => {
      if (current === findTarget(event.target)) hide();
    });
    document.addEventListener("scroll", () => {
      if (current) hide();
    }, true);
  }
  var emoteAspectRatios = /* @__PURE__ */ new Map();
  var loadedEmoteImages = /* @__PURE__ */ new Set();
  function makeImg(name, em, cls) {
    const img = document.createElement("img");
    img.className = cls;
    img.alt = name;
    if (cls === "t7-e") setEmoteTooltipData(img, name, em);
    const resolution = SIZES[S.size].n;
    const url = urlFor(em, resolution);
    const knownRatio = em.r || emoteAspectRatios.get(url);
    if (cls === "t7-e") img.style.setProperty("--t7-r", String(Math.max(1, knownRatio || 1)));
    if (loadedEmoteImages.has(url)) img.dataset.loaded = "1";
    img.addEventListener("load", () => {
      loadedEmoteImages.add(url);
      if (cls === "t7-e" && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        emoteAspectRatios.set(url, ratio);
      }
      img.dataset.loaded = "1";
    });
    setEmoteImage(img, em, resolution, "lazy", (error) => {
      console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", name, error);
    });
    return img;
  }
  function processEmotes({ content, kind }) {
    if (kind !== "message" || !S.on) return;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement && node.parentElement.closest("a")) continue;
      const parts = node.nodeValue.split(/(\s+)/);
      if (!parts.some((part) => has(EM, part))) continue;
      const fragment = document.createDocumentFragment();
      let lastWrap = null;
      for (const part of parts) {
        const emote = has(EM, part) ? EM[part] : null;
        if (emote && emote.zw && lastWrap) {
          lastWrap.appendChild(makeImg(part, emote, "t7-zw"));
          continue;
        }
        if (emote) {
          const wrapper = document.createElement("span");
          wrapper.className = "t7-w";
          wrapper.style.setProperty("--t7-h", SIZES[S.size].h);
          wrapper.appendChild(makeImg(part, emote, "t7-e"));
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
      node.replaceWith(fragment);
    }
  }
  var providers = [];
  var RESOLVE_CACHE_TTL = 24 * 60 * 60 * 1e3;
  var MAX_RESOLVED_IMAGES = 500;
  var resolvedImages = /* @__PURE__ */ new Map();
  var pendingResolutions = /* @__PURE__ */ new Map();
  var persistentCacheLoaded = false;
  var cacheEpoch = 0;
  function pruneCache(now = Date.now()) {
    for (const [url, entry] of resolvedImages) {
      if (now - entry.at >= RESOLVE_CACHE_TTL) resolvedImages.delete(url);
    }
    while (resolvedImages.size > MAX_RESOLVED_IMAGES)
      resolvedImages.delete(resolvedImages.keys().next().value);
  }
  function loadPersistentCache() {
    if (persistentCacheLoaded) return;
    persistentCacheLoaded = true;
    const saved = store.get(STORE.imageResolveCache);
    if (!saved || typeof saved !== "object") return;
    const now = Date.now();
    for (const [url, entry] of Object.entries(saved)) {
      if (entry && typeof entry.url === "string" && Number.isFinite(entry.at) && now - entry.at < RESOLVE_CACHE_TTL) resolvedImages.set(url, entry);
    }
    pruneCache(now);
  }
  function savePersistentCache() {
    pruneCache();
    store.set(STORE.imageResolveCache, Object.fromEntries(resolvedImages));
  }
  function getAttribute(tag, name) {
    const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
    return match && (match[1] ?? match[2] ?? match[3] ?? "");
  }
  function decodeHtmlAttribute(value) {
    return value.replace(/&amp;|&#0*38;|&#x0*26;/gi, "&").replace(/&quot;|&#0*34;|&#x0*22;/gi, '"').replace(/&#0*39;|&#x0*27;/gi, "'");
  }
  function readImageMeta(html) {
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
      const tag = match[0];
      const kind = getAttribute(tag, "property") || getAttribute(tag, "name");
      if (kind && /^(?:og:image|twitter:image)$/i.test(kind))
        return decodeHtmlAttribute(getAttribute(tag, "content") || "");
    }
    return "";
  }
  function registerImageProvider(provider) {
    if (!provider || typeof provider.id !== "string" || typeof provider.match !== "function" || typeof provider.resolve !== "function" || typeof provider.isImageUrl !== "function")
      throw new TypeError("image provider must define id, match, resolve, and isImageUrl");
    if (providers.some((item) => item.id === provider.id))
      throw new Error("image provider already registered: " + provider.id);
    providers.push(provider);
  }
  var imgbb = {
    id: "imgbb",
    match(url) {
      if (url.hostname === "i.ibb.co") return /^\/[^/]+\/[^/]+/.test(url.pathname);
      if (url.hostname === "ibb.co" || url.hostname === "www.ibb.co")
        return /^\/[a-z0-9]+(?:\/|$)/i.test(url.pathname);
      if (url.hostname === "imgbb.com" || url.hostname === "www.imgbb.com")
        return /^\/(?:gallery\/)?[a-z0-9]+(?:\/|$)/i.test(url.pathname);
      return false;
    },
    isImageUrl(url) {
      return /^(?:i\.ibb\.co|[a-z0-9-]+\.imgbb\.com)$/i.test(url.hostname);
    },
    async resolve(url) {
      if (url.hostname === "i.ibb.co") return url.href;
      const html = await getText(url.href);
      const image = readImageMeta(html);
      const imageUrl = image && new URL(image, url).href;
      if (!imageUrl || !this.isImageUrl(new URL(imageUrl)))
        throw new Error("imgbb page did not contain a supported image URL");
      return imageUrl;
    }
  };
  registerImageProvider(imgbb);
  function supportsImageUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    return url.protocol === "https:" && providers.some((provider) => provider.match(url));
  }
  async function resolveImageUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.protocol !== "https:") return null;
    const provider = providers.find((item) => item.match(url));
    if (!provider) return null;
    const key = url.href;
    loadPersistentCache();
    const cached = resolvedImages.get(key);
    if (cached && Date.now() - cached.at < RESOLVE_CACHE_TTL) return cached.url;
    if (pendingResolutions.has(key)) return pendingResolutions.get(key);
    const epoch = cacheEpoch;
    const pending = (async () => {
      const resolved = await provider.resolve(url);
      const imageUrl = new URL(resolved);
      if (imageUrl.protocol !== "https:" || !provider.isImageUrl(imageUrl)) return null;
      const entry = { url: imageUrl.href, at: Date.now() };
      if (epoch === cacheEpoch) {
        resolvedImages.set(key, entry);
        savePersistentCache();
      }
      return entry.url;
    })();
    pendingResolutions.set(key, pending);
    try {
      return await pending;
    } finally {
      if (pendingResolutions.get(key) === pending) pendingResolutions.delete(key);
    }
  }
  function clearResolvedImageCache() {
    cacheEpoch++;
    resolvedImages.clear();
    pendingResolutions.clear();
    persistentCacheLoaded = true;
    store.set(STORE.imageResolveCache, {});
  }
  var IMAGE_ID = /^[a-z0-9]{1,32}$/i;
  var RECENT_LIMIT = 10;
  var FAVORITE_LIMIT = 200;
  var activeDialog = null;
  function isImagePickerButtonEnabled() {
    return store.get(STORE.imagePickerButton) === true;
  }
  function setImagePickerButtonEnabled(enabled) {
    const visible = !!enabled;
    store.set(STORE.imagePickerButton, visible);
    document.querySelectorAll(".t7-images-btn").forEach((button) => {
      button.hidden = !visible || !!button.closest(".dm-f");
    });
  }
  function readIds(key, limit = FAVORITE_LIMIT) {
    const saved = store.get(key);
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter((id) => typeof id === "string" && IMAGE_ID.test(id)))].slice(0, limit);
  }
  function imageId(value) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (!["https:", "http:"].includes(url.protocol) || !["ibb.co", "www.ibb.co"].includes(url.hostname))
        return null;
      const id = url.pathname.replace(/^\/|\/$/g, "");
      return IMAGE_ID.test(id) ? id : null;
    } catch {
      return null;
    }
  }
  function rememberImage(id) {
    const recent = readIds(STORE.imageRecent, RECENT_LIMIT).filter((item) => item !== id);
    store.set(STORE.imageRecent, [id, ...recent].slice(0, RECENT_LIMIT));
  }
  function rememberSentImages(text) {
    const value = String(text || "");
    const ids = [];
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?ibb\.co\/([a-z0-9]{1,32})\/?(?=$|[\s?#.,!;:)])/gi;
    const tokenPattern = /\[ref\]\{(?:www_)?ibb_co\/([a-z0-9]{1,32})(?:[?#][^}\s]*)?\}/gi;
    for (const match of value.matchAll(urlPattern)) ids.push(match[1]);
    for (const match of value.matchAll(tokenPattern)) ids.push(match[1]);
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return;
    const recent = readIds(STORE.imageRecent, RECENT_LIMIT);
    store.set(STORE.imageRecent, [...uniqueIds.reverse(), ...recent.filter((id) => !uniqueIds.includes(id))].slice(0, RECENT_LIMIT));
  }
  function isFavorite(id) {
    return readIds(STORE.imageFavorites).includes(id);
  }
  function toggleFavorite(id) {
    const favorites = readIds(STORE.imageFavorites);
    store.set(STORE.imageFavorites, favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites].slice(0, FAVORITE_LIMIT));
  }
  async function loadPreview(id, image, failed) {
    try {
      const imageUrl = await resolveImageUrl(`https://ibb.co/${id}`);
      if (!imageUrl) throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435");
      const src = await fetchImg(imageUrl, true);
      if (image.isConnected) image.src = src;
    } catch (error) {
      if (image.isConnected) failed(error);
    }
  }
  function createButton(text, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    return button;
  }
  function insertUrl(input, url) {
    if (!input || input.disabled || !input.isConnected) return false;
    const start = input.selectionStart == null ? input.value.length : input.selectionStart;
    const end = input.selectionEnd == null ? start : input.selectionEnd;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const insertion = (before && !/\s$/.test(before) ? " " : "") + url + (after && !/^\s/.test(after) ? " " : "");
    const value = before + insertion + after;
    if (input.maxLength > 0 && value.length > input.maxLength) return false;
    input.value = value;
    const caret = start + insertion.length;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  function disposeImagePicker(form) {
    if (activeDialog && form.contains(activeDialog.input)) activeDialog.close();
  }
  function openImagePicker(input) {
    if (!input || input.disabled || !input.isConnected) return;
    if (activeDialog && activeDialog.input === input) {
      activeDialog.close();
      return;
    }
    if (activeDialog) activeDialog.close();
    const overlay = document.createElement("div");
    overlay.className = "t7-paste-overlay t7-image-picker-overlay";
    const dialog = document.createElement("section");
    dialog.className = "t7-paste-dialog t7-image-picker";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 imgBB");
    const header = document.createElement("div");
    header.className = "t7-paste-header";
    const title = document.createElement("strong");
    title.textContent = "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 imgBB";
    const closeButton = createButton("\xD7", "t7-paste-close");
    closeButton.setAttribute("aria-label", "\u0417\u0430\u043A\u0440\u044B\u0442\u044C");
    header.append(title, closeButton);
    const urlRow = document.createElement("div");
    urlRow.className = "t7-image-picker-url";
    const uploadLink = document.createElement("a");
    uploadLink.href = "https://imgbb.com/";
    uploadLink.target = "_blank";
    uploadLink.rel = "noopener noreferrer";
    uploadLink.title = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043D\u0430 imgBB";
    uploadLink.setAttribute("aria-label", "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043D\u0430 imgBB");
    uploadLink.textContent = "\u2197";
    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "t7-image-picker-input";
    urlInput.placeholder = "https://ibb.co/\u043A\u043E\u0434";
    urlInput.autocomplete = "url";
    urlInput.setAttribute("aria-label", "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 imgBB");
    urlRow.append(uploadLink, urlInput);
    const preview = document.createElement("div");
    preview.className = "t7-image-picker-preview";
    preview.setAttribute("aria-live", "polite");
    const previewMessage = document.createElement("span");
    previewMessage.textContent = "\u0412\u0441\u0442\u0430\u0432\u044C \u0441\u0441\u044B\u043B\u043A\u0443 imgBB \u0434\u043B\u044F \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430";
    preview.appendChild(previewMessage);
    const actions = document.createElement("div");
    actions.className = "t7-image-picker-actions";
    const insertButton = createButton("\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C", "t7-paste-primary");
    const sendButton = createButton("\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", "t7-paste-primary");
    const favoritePreviewButton = createButton("\u2606 \u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", "t7-paste-secondary t7-image-picker-favorite-preview");
    insertButton.disabled = true;
    sendButton.disabled = true;
    favoritePreviewButton.disabled = true;
    favoritePreviewButton.setAttribute("aria-pressed", "false");
    actions.append(favoritePreviewButton, insertButton, sendButton);
    const tabs = document.createElement("div");
    tabs.className = "t7-views t7-image-picker-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A");
    const recentTab = createButton("\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 10", "");
    recentTab.setAttribute("role", "tab");
    recentTab.dataset.imagesTab = "recent";
    recentTab.setAttribute("aria-selected", "true");
    const favoritesTab = createButton("\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", "");
    favoritesTab.setAttribute("role", "tab");
    favoritesTab.dataset.imagesTab = "favorites";
    favoritesTab.setAttribute("aria-selected", "false");
    tabs.append(recentTab, favoritesTab);
    const library = document.createElement("div");
    library.className = "t7-image-library";
    dialog.append(header, urlRow, preview, actions, tabs, library);
    overlay.appendChild(dialog);
    let activeTab = "recent";
    let selectedId = null;
    let previewToken = 0;
    let closed = false;
    const thumbObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        thumbObserver.unobserve(entry.target);
        loadPreview(entry.target.dataset.imageId, entry.target, (error) => {
          console.warn("[Images] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u0437 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0438", error);
          entry.target.alt = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C";
        });
      }
    }, { root: library, rootMargin: "100px" });
    const close = () => {
      if (closed) return;
      closed = true;
      previewToken++;
      thumbObserver.disconnect();
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown, true);
      if (activeDialog?.close === close) activeDialog = null;
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
      input.focus({ preventScroll: true });
    };
    activeDialog = { input, close };
    const choose = (id) => {
      selectedId = id;
      urlInput.value = `https://ibb.co/${id}`;
      updatePreview();
    };
    const updateFavoritePreviewButton = () => {
      const favorite = !!selectedId && isFavorite(selectedId);
      favoritePreviewButton.disabled = !selectedId;
      favoritePreviewButton.textContent = favorite ? "\u2605 \u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u043C" : "\u2606 \u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435";
      favoritePreviewButton.setAttribute("aria-pressed", String(favorite));
      favoritePreviewButton.title = favorite ? "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435";
    };
    const renderLibrary = () => {
      thumbObserver.disconnect();
      library.replaceChildren();
      const ids = readIds(
        activeTab === "recent" ? STORE.imageRecent : STORE.imageFavorites,
        activeTab === "recent" ? RECENT_LIMIT : FAVORITE_LIMIT
      );
      if (!ids.length) {
        const empty = document.createElement("div");
        empty.className = "t7-image-picker-empty";
        empty.textContent = activeTab === "recent" ? "\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F" : "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442";
        library.appendChild(empty);
        return;
      }
      for (const id of ids) {
        const item = document.createElement("div");
        item.className = "t7-image-library-item";
        const chooseButton = createButton("", "t7-image-library-choose");
        chooseButton.setAttribute("aria-label", `\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 ${id}`);
        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        image.dataset.imageId = id;
        const idLabel = document.createElement("span");
        idLabel.textContent = id;
        chooseButton.append(image, idLabel);
        chooseButton.addEventListener("click", () => choose(id));
        const favorite = createButton(isFavorite(id) ? "\u2605" : "\u2606", "t7-image-library-favorite");
        favorite.title = isFavorite(id) ? "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435";
        favorite.setAttribute("aria-label", `${favorite.title}: ${id}`);
        favorite.setAttribute("aria-pressed", String(isFavorite(id)));
        favorite.addEventListener("click", () => {
          toggleFavorite(id);
          renderLibrary();
          if (selectedId === id) updateFavoritePreviewButton();
        });
        item.append(chooseButton, favorite);
        library.appendChild(item);
        thumbObserver.observe(image);
      }
    };
    function updatePreview() {
      const token = ++previewToken;
      selectedId = imageId(urlInput.value.trim());
      insertButton.disabled = !selectedId;
      sendButton.disabled = !selectedId;
      updateFavoritePreviewButton();
      preview.classList.toggle("t7-image-picker-error", !!urlInput.value.trim() && !selectedId);
      preview.replaceChildren();
      if (!selectedId) {
        const message = document.createElement("span");
        message.textContent = urlInput.value.trim() ? "\u041D\u0443\u0436\u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u0432\u0438\u0434\u0430 https://ibb.co/\u043A\u043E\u0434" : "\u0412\u0441\u0442\u0430\u0432\u044C \u0441\u0441\u044B\u043B\u043A\u0443 imgBB \u0434\u043B\u044F \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430";
        preview.appendChild(message);
        return;
      }
      const image = document.createElement("img");
      image.alt = `\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F ${selectedId}`;
      image.loading = "eager";
      preview.appendChild(image);
      loadPreview(selectedId, image, (error) => {
        if (token !== previewToken || !image.isConnected) return;
        console.warn("[Images] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440", error);
        const message = document.createElement("span");
        message.textContent = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440";
        preview.replaceChildren(message);
      });
    }
    const updateTabs = () => {
      tabs.querySelectorAll("[data-images-tab]").forEach((tab) => {
        tab.setAttribute("aria-selected", String(tab.dataset.imagesTab === activeTab));
      });
    };
    tabs.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-images-tab]");
      if (!tab) return;
      activeTab = tab.dataset.imagesTab;
      updateTabs();
      renderLibrary();
    });
    urlInput.addEventListener("input", updatePreview);
    const insertSelected = (send) => {
      if (!selectedId || !input.isConnected) return;
      const url = `https://ibb.co/${selectedId}`;
      if (!insertUrl(input, url)) {
        preview.classList.add("t7-image-picker-error");
        preview.textContent = "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0435 \u043F\u043E\u043C\u0435\u0449\u0430\u0435\u0442\u0441\u044F \u0432 \u043F\u043E\u043B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F";
        return;
      }
      rememberImage(selectedId);
      const form = input.closest("form");
      close();
      input.focus({ preventScroll: true });
      if (send) form?.requestSubmit();
    };
    insertButton.addEventListener("click", () => insertSelected(false));
    sendButton.addEventListener("click", () => insertSelected(true));
    favoritePreviewButton.addEventListener("click", () => {
      if (!selectedId) return;
      toggleFavorite(selectedId);
      updateFavoritePreviewButton();
      renderLibrary();
    });
    closeButton.addEventListener("click", () => {
      close();
      input.focus({ preventScroll: true });
    });
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay) close();
    });
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    document.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(overlay);
    renderLibrary();
    urlInput.focus();
  }
  var scrollListSelector = `${SEL.chatList}, .dm-l`;
  var states = /* @__PURE__ */ new WeakMap();
  var savedPositions = /* @__PURE__ */ new Map();
  var END_THRESHOLD = 40;
  var CHANGE_THRESHOLD = 0.5;
  var MAX_SAVED_POSITIONS = 20;
  var started = false;
  function getContainer(element) {
    return element && element.closest ? element.closest(scrollListSelector) : null;
  }
  function maxScrollTop(list) {
    return Math.max(0, list.scrollHeight - list.clientHeight);
  }
  function isAtEnd(list) {
    return maxScrollTop(list) - list.scrollTop <= END_THRESHOLD;
  }
  function getRows(list) {
    return [...list.children].filter((child) => child.tagName === "LI");
  }
  function getState(list) {
    let state = states.get(list);
    if (!state) {
      state = {
        atEnd: isAtEnd(list),
        anchor: null,
        rows: /* @__PURE__ */ new Set(),
        resizeObserver: null,
        mutationObserver: null,
        key: null,
        userScrollVersion: 0,
        lastScrollTop: list.scrollTop
      };
      states.set(list, state);
    }
    return state;
  }
  function findVisibleAnchor(list, rows = getRows(list)) {
    const listTop = list.getBoundingClientRect().top;
    const listBottom = listTop + list.clientHeight;
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rect = row.getBoundingClientRect();
      if (rect.height && rect.bottom > listTop && rect.top < listBottom) {
        return {
          row,
          id: row.dataset.mid || "",
          index,
          offset: rect.top - listTop
        };
      }
    }
    return null;
  }
  function findAnchorRow(list, anchor, oldRows) {
    const rows = getRows(list);
    if (anchor.row.isConnected && list.contains(anchor.row)) return anchor.row;
    if (anchor.id) {
      const match = rows.find((row) => row.dataset.mid === anchor.id);
      if (match) return match;
    }
    for (let index = anchor.index + 1; index < oldRows.length; index++) {
      const row = oldRows[index];
      if (row.isConnected && list.contains(row)) return row;
    }
    for (let index = anchor.index - 1; index >= 0; index--) {
      const row = oldRows[index];
      if (row.isConnected && list.contains(row)) return row;
    }
    return rows[Math.min(anchor.index, rows.length - 1)] || null;
  }
  function restoreAnchor(list, anchor, oldRows) {
    if (!anchor) return;
    const row = findAnchorRow(list, anchor, oldRows);
    if (!row) return;
    const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    const delta = offset - anchor.offset;
    if (Math.abs(delta) > CHANGE_THRESHOLD) list.scrollTop += delta;
  }
  function savePosition(list, state) {
    if (!state.key || !list.clientHeight) return;
    savedPositions.delete(state.key);
    savedPositions.set(state.key, {
      top: list.scrollTop,
      atEnd: state.atEnd,
      anchorId: state.anchor && state.anchor.id,
      anchorOffset: state.anchor && state.anchor.offset
    });
    while (savedPositions.size > MAX_SAVED_POSITIONS) {
      savedPositions.delete(savedPositions.keys().next().value);
    }
  }
  function observeRows(list, state, rows = getRows(list)) {
    if (!state.resizeObserver) return;
    const currentRows = new Set(rows);
    for (const row of state.rows) {
      if (!currentRows.has(row)) state.resizeObserver.unobserve(row);
    }
    for (const row of currentRows) {
      if (!state.rows.has(row)) state.resizeObserver.observe(row);
    }
    state.rows = currentRows;
  }
  function commit(list, state) {
    const rows = getRows(list);
    observeRows(list, state, rows);
    state.anchor = findVisibleAnchor(list, rows);
    state.lastScrollTop = list.scrollTop;
    savePosition(list, state);
  }
  function scrollToEnd(list) {
    const target = maxScrollTop(list);
    if (Math.abs(list.scrollTop - target) > CHANGE_THRESHOLD) list.scrollTop = target;
  }
  function preserveAfterLayoutChange(list, state) {
    if (!list.isConnected) return;
    const previousRows = [...state.rows];
    if (state.atEnd) scrollToEnd(list);
    else restoreAnchor(list, state.anchor, previousRows);
    commit(list, state);
  }
  function setupObservers(list, state) {
    if (!state.resizeObserver) {
      state.resizeObserver = new ResizeObserver(() => preserveAfterLayoutChange(list, state));
      state.resizeObserver.observe(list);
    }
    if (!state.mutationObserver) {
      state.mutationObserver = new MutationObserver((records) => {
        if (records.some((record) => record.target === list && record.type === "childList")) {
          preserveAfterLayoutChange(list, state);
        }
      });
      state.mutationObserver.observe(list, { childList: true });
    }
  }
  function register(list, key, restore) {
    if (!list) return;
    const state = getState(list);
    if (key) state.key = key;
    setupObservers(list, state);
    if (restore && state.key) {
      const saved = savedPositions.get(state.key);
      if (saved) {
        state.atEnd = saved.atEnd;
        if (saved.atEnd) {
          scrollToEnd(list);
        } else {
          const row = saved.anchorId && getRows(list).find((item) => item.dataset.mid === saved.anchorId);
          if (row) {
            const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
            list.scrollTop += offset - saved.anchorOffset;
          } else {
            list.scrollTop = Math.min(saved.top, maxScrollTop(list));
          }
        }
      }
    }
    commit(list, state);
  }
  function updateFromScroll(list) {
    const state = getState(list);
    state.atEnd = isAtEnd(list);
    commit(list, state);
  }
  function markUserScroll(event) {
    const list = getContainer(event.target);
    if (!list) return;
    const state = getState(list);
    state.userScrollVersion++;
  }
  function captureAnchor(list) {
    const rows = getRows(list);
    return { anchor: findVisibleAnchor(list, rows), rows };
  }
  var chatScroller = {
    start() {
      if (started) return;
      started = true;
      document.addEventListener("wheel", markUserScroll, { capture: true, passive: true });
      document.addEventListener("touchmove", markUserScroll, { capture: true, passive: true });
      document.addEventListener("pointerdown", markUserScroll, { capture: true, passive: true });
      document.addEventListener("pointermove", (event) => {
        if (event.buttons) markUserScroll(event);
      }, { capture: true, passive: true });
      document.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) return;
        const target = event.target;
        if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
        markUserScroll(event);
      }, true);
      document.addEventListener("scroll", (event) => {
        const list = event.target;
        if (list && list.matches && list.matches(scrollListSelector)) updateFromScroll(list);
      }, true);
    },
    getContainer,
    isAtEnd,
    scrollToEnd(list) {
      if (!list) return;
      const state = getState(list);
      state.atEnd = true;
      scrollToEnd(list);
      commit(list, state);
    },
    captureEndIntent(list) {
      if (!list) return null;
      const state = getState(list);
      return { atEnd: state.atEnd || isAtEnd(list), userScrollVersion: state.userScrollVersion };
    },
    settleAtEnd(list, intent) {
      if (!list || !intent || !intent.atEnd) return;
      const state = getState(list);
      let frames = 18;
      const settle = () => {
        requestAnimationFrame(() => {
          if (!list.isConnected || state.userScrollVersion !== intent.userScrollVersion) return;
          state.atEnd = true;
          scrollToEnd(list);
          commit(list, state);
          if (--frames) settle();
        });
      };
      settle();
    },
    register,
    keep(list, mutate) {
      if (!list) return mutate();
      const state = getState(list);
      const { anchor, rows } = captureAnchor(list);
      const atEnd = state.atEnd || isAtEnd(list);
      state.atEnd = atEnd;
      const result = mutate();
      if (!list.isConnected) return result;
      if (atEnd) scrollToEnd(list);
      else restoreAnchor(list, anchor, rows);
      commit(list, state);
      return result;
    },
    reinitialize(list, mutate) {
      if (!list) return mutate();
      const state = getState(list);
      const { anchor, rows } = captureAnchor(list);
      const atEnd = state.atEnd || isAtEnd(list);
      const result = mutate();
      if (list.isConnected) {
        state.atEnd = atEnd;
        if (atEnd) scrollToEnd(list);
        else restoreAnchor(list, anchor, rows);
        commit(list, state);
      }
      return result;
    },
    stickAtEnd(lists) {
      lists.forEach((list) => {
        const state = getState(list);
        if (state.atEnd) scrollToEnd(list);
        commit(list, state);
      });
    },
    preserve(element, mutate) {
      const list = getContainer(element);
      if (!list) return mutate();
      return this.keep(list, mutate);
    }
  };
  var LINK_ENCODING_KEY = STORE.linkEncoding;
  var IMAGE_PREVIEWS_KEY = STORE.imagePreviews;
  var previewCache = /* @__PURE__ */ new Map();
  var outgoingBindings = /* @__PURE__ */ new WeakMap();
  var isLinkEncodingEnabled = () => store.get(LINK_ENCODING_KEY) === true;
  var setLinkEncodingEnabled = (enabled) => store.set(LINK_ENCODING_KEY, !!enabled);
  var areImagePreviewsEnabled = () => store.get(IMAGE_PREVIEWS_KEY) === true;
  var setImagePreviewsEnabled = (enabled) => store.set(IMAGE_PREVIEWS_KEY, !!enabled);
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
    if (/^\[ref\]\{[^{}\s]+\}$/i.test(raw)) return raw;
    let { clean: url, tail } = trimTrailingPunct(raw, {
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
  function linkifyText(root, showImages) {
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
          if (showImages && supportsImageUrl(href)) {
            anchor.classList.add("t7-image-pending");
            anchor.dataset.t7ImagePreview = "pending";
          }
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
  function buildPreview(anchor, src, w, h) {
    const image = document.createElement("img");
    image.className = "t7-image-preview";
    image.alt = "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435";
    image.decoding = "sync";
    image.width = w;
    image.height = h;
    image.src = src;
    anchor.replaceChildren(image);
    anchor.classList.remove("t7-image-pending");
    anchor.classList.add("t7-image-link");
    anchor.dataset.t7ImagePreview = "done";
  }
  async function addImagePreview(anchor) {
    if (anchor.dataset.t7ImagePreview === "done") return;
    if (!supportsImageUrl(anchor.href)) return;
    try {
      const cached = previewCache.get(anchor.href);
      if (cached) {
        if (anchor.isConnected) {
          chatScroller.preserve(anchor, () => buildPreview(anchor, cached.src, cached.w, cached.h));
        }
        return;
      }
      anchor.dataset.t7ImagePreview = "pending";
      const imageUrl = await resolveImageUrl(anchor.href);
      if (!imageUrl || !anchor.isConnected) {
        anchor.classList.remove("t7-image-pending");
        delete anchor.dataset.t7ImagePreview;
        return;
      }
      const imageSrc = await fetchImg(imageUrl, true);
      if (!anchor.isConnected) return;
      const image = document.createElement("img");
      image.src = imageSrc;
      await image.decode();
      if (!anchor.isConnected) return;
      const preview = { src: imageSrc, w: image.naturalWidth, h: image.naturalHeight };
      previewCache.set(anchor.href, preview);
      chatScroller.preserve(anchor, () => buildPreview(anchor, preview.src, preview.w, preview.h));
    } catch (error) {
      if (anchor.isConnected) {
        anchor.classList.remove("t7-image-pending");
        delete anchor.dataset.t7ImagePreview;
      }
      console.warn("[Images] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443", anchor.href, error);
    }
  }
  function processLinks({ content, room }) {
    const parseLinks = isLinkEncodingEnabled();
    const previewsEnabled = areImagePreviewsEnabled();
    const showImages = previewsEnabled && room !== "dm";
    if (!parseLinks && !previewsEnabled) return;
    linkifyText(content, showImages);
    if (showImages) content.querySelectorAll("a.t7-link").forEach((anchor) => {
      addImagePreview(anchor);
    });
  }
  function showLinkWarning(form, message) {
    let warning = form.querySelector(":scope > .t7-link-warning");
    if (!warning) {
      warning = document.createElement("div");
      warning.className = "t7-link-warning";
      warning.setAttribute("role", "alert");
      form.appendChild(warning);
    }
    warning.textContent = message;
    warning.hidden = false;
  }
  function isExcludedChatSend(form, input) {
    const activeTab = form.closest(".cy-chat")?.querySelector('[data-tab][aria-selected="true"]');
    const tab = activeTab?.dataset.tab;
    return tab === "gl" || tab === "lg" || tab === "g" && input.value.trim().startsWith("/");
  }
  function bindOutgoingLinkEncoding(form, input) {
    if (outgoingBindings.has(form)) return outgoingBindings.get(form);
    const prepare = (event) => {
      if (isExcludedChatSend(form, input)) return;
      if (!isLinkEncodingEnabled()) {
        rememberSentImages(input.value);
        return;
      }
      const text = input.value;
      if (HTTP_RE.test(text)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showLinkWarning(form, "\u0421\u0441\u044B\u043B\u043A\u0438 http:// \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 https://");
        return;
      }
      rememberSentImages(text);
      const encoded = encodeLinks(text);
      if (encoded === text) return;
      input.value = encoded;
      queueMicrotask(() => {
        if (input.isConnected && input.value === encoded) input.value = text;
      });
    };
    const onKeyDown = (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || event.keyCode === 229) return;
      prepare(event);
    };
    const onSubmit = (event) => prepare(event);
    input.addEventListener("keydown", onKeyDown, true);
    form.addEventListener("submit", onSubmit, true);
    const dispose = () => {
      input.removeEventListener("keydown", onKeyDown, true);
      form.removeEventListener("submit", onSubmit, true);
      outgoingBindings.delete(form);
    };
    outgoingBindings.set(form, dispose);
    return dispose;
  }
  var CONFIG_KEY = STORE.pingConfig;
  var PRESETS = /* @__PURE__ */ new Set(["bell", "chime", "pop", "custom"]);
  var MAX_CUSTOM_SOUND_SIZE = 20 * 1024 * 1024;
  var DEFAULTS = {
    volume: 0.5,
    selectedPreset: "bell",
    customSound: "",
    dmSoundEnabled: false,
    dmSelectedPreset: "chime",
    dmCustomSound: "",
    dmNickList: [],
    dmNickWhitelist: false,
    pingColor: "#e89aa3",
    tabCompletion: true,
    emoteCompletion: true,
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
    for (const key of ["customSound", "dmCustomSound"])
      config[key] = typeof config[key] === "string" && config[key].startsWith("data:audio/") ? config[key] : "";
    config.dmSoundEnabled = config.dmSoundEnabled !== false;
    config.dmSelectedPreset = PRESETS.has(config.dmSelectedPreset) ? config.dmSelectedPreset : DEFAULTS.dmSelectedPreset;
    if (config.dmSelectedPreset === "custom" && !config.dmCustomSound) {
      config.dmSelectedPreset = DEFAULTS.dmSelectedPreset;
    }
    config.dmNickWhitelist = config.dmNickWhitelist === true;
    config.pingColor = /^#[0-9a-f]{6}$/i.test(config.pingColor) ? config.pingColor : DEFAULTS.pingColor;
    config.tabCompletion = config.tabCompletion !== false;
    config.emoteCompletion = config.emoteCompletion !== false;
    for (const key of ["aliases", "blacklist", "stopWords", "dmNickList"]) {
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
      this.dmCustomBuffer = null;
      this.dmCustomBufferPromise = null;
      this.dmUser = "";
      this.audioUnlockHandler = () => this.unlockAudio();
      document.addEventListener("pointerdown", this.audioUnlockHandler, { capture: true, passive: true });
      document.addEventListener("keydown", this.audioUnlockHandler, true);
    }
    reloadConfig() {
      Object.assign(this.config, readConfig());
      this.regexCache.clear();
      this.notify();
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
      if (!["aliases", "blacklist", "stopWords", "dmNickList"].includes(key)) return;
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
    setEmoteCompletion(enabled) {
      this.config.emoteCompletion = !!enabled;
      this.save();
      emit(EV.emoteCompletionChange);
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
    setPingColor(value) {
      const color = String(value || "").trim();
      if (!/^#[0-9a-f]{6}$/i.test(color)) return;
      this.config.pingColor = color.toLowerCase();
      this.save();
      document.querySelectorAll(".t7-mention").forEach((mention) => {
        mention.style.color = this.config.pingColor;
      });
    }
    applyPingColor() {
      document.querySelectorAll(".t7-mention").forEach((mention) => {
        mention.style.color = this.config.pingColor;
      });
    }
    setPreset(value) {
      if (!PRESETS.has(value) || value === "custom" && !this.config.customSound) return;
      this.config.selectedPreset = value;
      this.save();
    }
    setDmSoundEnabled(enabled) {
      this.config.dmSoundEnabled = !!enabled;
      this.save();
    }
    setDmPreset(value) {
      if (!PRESETS.has(value) || value === "custom" && !this.config.dmCustomSound) return;
      this.config.dmSelectedPreset = value;
      this.save();
    }
    setDmNickWhitelist(enabled) {
      this.config.dmNickWhitelist = !!enabled;
      this.save();
    }
    setDmUser(login) {
      this.dmUser = String(login || "").trim().toLowerCase();
    }
    shouldNotifyDm(sender) {
      const user = String(sender || "").trim().toLowerCase();
      if (!this.config.dmSoundEnabled || !user || user === this.dmUser) return false;
      const listed = this.config.dmNickList.includes(user);
      return this.config.dmNickWhitelist ? listed : !listed;
    }
    saveCustomSound(file, isDm = false) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("audio/")) return reject(new Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B"));
        if (file.size > MAX_CUSTOM_SOUND_SIZE) return reject(new Error("\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 20 \u041C\u0411"));
        const reader = new FileReader();
        reader.onload = () => {
          if (isDm) {
            this.config.dmCustomSound = String(reader.result || "");
            this.config.dmSelectedPreset = "custom";
            this.dmCustomBuffer = null;
            this.dmCustomBufferPromise = null;
          } else {
            this.config.customSound = String(reader.result || "");
            this.config.selectedPreset = "custom";
            this.customBuffer = null;
            this.customBufferPromise = null;
          }
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
        if (context && context.state === "suspended") {
          context.resume().catch((error) => console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u043E", error));
        }
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
      return this.playSound(this.config.selectedPreset, this.config.customSound, false);
    }
    async playDm() {
      return this.playSound(this.config.dmSelectedPreset, this.config.dmCustomSound, true);
    }
    async decodeCustomBuffer(context, encodedSound) {
      const encoded = encodedSound.split(",")[1];
      if (!encoded) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B");
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return context.decodeAudioData(bytes.buffer);
    }
    saveCustomDmSound(file) {
      return this.saveCustomSound(file, true);
    }
    async playSound(preset, customSound, isDm) {
      if (this.config.volume <= 0) return;
      const context = this.getAudioContext();
      if (!context) return;
      if (context.state === "suspended") await context.resume();
      if (preset === "custom" && customSound) {
        try {
          const source = context.createBufferSource();
          const gain = context.createGain();
          if (isDm) {
            if (!this.dmCustomBufferPromise) {
              this.dmCustomBufferPromise = this.decodeCustomBuffer(context, customSound);
            }
            this.dmCustomBuffer = await this.dmCustomBufferPromise;
            source.buffer = this.dmCustomBuffer;
          } else {
            source.buffer = await this.loadCustomBuffer(context);
          }
          gain.gain.value = this.config.volume;
          source.connect(gain);
          gain.connect(context.destination);
          source.start();
        } catch (error) {
          if (isDm) this.dmCustomBufferPromise = null;
          else this.customBufferPromise = null;
          console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u0435\u043A\u043E\u0434\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0437\u0432\u0443\u043A", error);
        }
        return;
      }
      const tones = {
        bell: [[740, 0, 0.24, "sine"], [988, 0.08, 0.3, "sine"]],
        chime: [[660, 0, 0.32, "sine"], [880, 0.12, 0.4, "sine"]],
        pop: [[360, 0, 0.12, "triangle"], [220, 0.04, 0.16, "sine"]]
      }[preset] || [];
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
  var MENTION_RE2 = /(?<![\p{L}\p{N}_])@[a-z0-9_]{1,25}(?![\p{L}\p{N}_])/giu;
  function processMentions({ content, kind }) {
    if (kind !== "message") return;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement && node.parentElement.closest("a")) continue;
      const text = node.nodeValue;
      const matches = [...text.matchAll(MENTION_RE2)];
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const match of matches) {
        const start = match.index;
        if (start > offset) fragment.appendChild(document.createTextNode(text.slice(offset, start)));
        const mention = document.createElement("span");
        mention.className = "t7-mention";
        mention.style.color = pingSystem.config.pingColor;
        mention.textContent = match[0];
        fragment.appendChild(mention);
        offset = start + match[0].length;
      }
      if (offset < text.length) fragment.appendChild(document.createTextNode(text.slice(offset)));
      node.replaceWith(fragment);
    }
  }
  var processors = [];
  var SOURCE_KEY = "l7tvEmoteSource";
  function registerChatProcessor(processor) {
    if (typeof processor === "function" && !processors.includes(processor)) processors.push(processor);
  }
  registerChatProcessor(processMarkdown);
  registerChatProcessor(processLinks);
  registerChatProcessor(processEmotes);
  registerChatProcessor(processMentions);
  var initializedDmLists = /* @__PURE__ */ new WeakSet();
  function processDmMessage(message, isInitial) {
    processMessage(message, "dm");
  }
  chatScroller.start();
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
    const context = { message, content, room, kind, source };
    for (const processor of processors) processor(context);
  }
  function scan() {
    const chatFresh = document.querySelectorAll(SEL.freshChatRows);
    const chatLists = /* @__PURE__ */ new Map();
    chatFresh.forEach((message) => {
      const list = message.closest(SEL.chatList);
      if (!list) return;
      if (!chatLists.has(list)) chatLists.set(list, []);
      chatLists.get(list).push(message);
    });
    for (const [list, messages] of chatLists) {
      chatScroller.register(list);
      chatScroller.keep(list, () => messages.forEach((message) => processMessage(message, "chat")));
    }
    const dmFresh = document.querySelectorAll(SEL.freshDmRows);
    const dmLists = new Set([...dmFresh].map((message) => message.closest(".dm-l") || message.closest(".cy-chat-dmx")).filter(Boolean));
    const scrollLists = new Set([...dmLists].filter((list) => list.matches(".dm-l")));
    scrollLists.forEach((list) => chatScroller.register(list));
    const dmWasAtEnd = new Set([...scrollLists].filter((list) => chatScroller.isAtEnd(list)));
    for (const list of dmLists) {
      const isInitial = !initializedDmLists.has(list);
      const messages = [...dmFresh].filter((message) => (message.closest(".dm-l") || message.closest(".cy-chat-dmx")) === list);
      if (!isInitial || messages.some((message) => !message.matches(SEL.emptyMessage))) {
        initializedDmLists.add(list);
      }
      messages.forEach((message) => processDmMessage(message, isInitial));
    }
    dmWasAtEnd.forEach((list) => {
      if (list.isConnected) chatScroller.scrollToEnd(list);
    });
  }
  function rescanAll() {
    document.querySelectorAll(`${SEL.processedChatRows}, ${SEL.processedDmRows}`).forEach((message) => {
      delete message.dataset.l7tvProcessed;
    });
    scan();
  }
  var applySize = () => {
    document.querySelectorAll(".t7-w").forEach((wrapper) => {
      wrapper.style.setProperty("--t7-h", SIZES[S.size].h);
    });
    document.querySelectorAll(".t7-pop").forEach((popup) => {
      popup.style.setProperty("--t7-tile", SIZES[S.size].p + "px");
    });
  };
  var CUSTOM_FAMILY = "T7UploadedChatFont";
  var FONT_MIME = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };
  var FONT_CHOICES = /* @__PURE__ */ new Set(["site", "nunito", "open-sans", "roboto", "lato", "montserrat", "custom"]);
  var MAX_FONT_SIZE = 2 * 1024 * 1024;
  var DEFAULT_CHAT_FONT_SIZE = 14;
  var customFace = null;
  var listObserver = null;
  function getChatFont() {
    const value = store.get(STORE.chatFont);
    return FONT_CHOICES.has(value) ? value : "site";
  }
  function getCustomChatFont() {
    const value = store.get(STORE.chatFontFile);
    return value && typeof value.name === "string" && typeof value.source === "string" ? value : null;
  }
  function getChatFontSize() {
    const value = Number(store.get(STORE.chatFontSize));
    return Number.isFinite(value) ? Math.max(11, Math.min(22, Math.round(value))) : DEFAULT_CHAT_FONT_SIZE;
  }
  function setChatFontSize(value) {
    const size = Number(value);
    if (!Number.isFinite(size)) return DEFAULT_CHAT_FONT_SIZE;
    const normalized = Math.max(11, Math.min(22, Math.round(size)));
    store.set(STORE.chatFontSize, normalized);
    applyFontSettings();
    return normalized;
  }
  function setFamily(value) {
    document.querySelectorAll(".cy-chat-l, .dm-l").forEach((list) => {
      if (value) list.style.setProperty("--t7-chat-font", value);
      else list.style.removeProperty("--t7-chat-font");
    });
  }
  function applyFontSettings(root = document) {
    const family = selectedFamily();
    const size = getChatFontSize() + "px";
    const lists = [];
    if (root instanceof Element && root.matches(".cy-chat-l, .dm-l")) lists.push(root);
    if (root.querySelectorAll) lists.push(...root.querySelectorAll(".cy-chat-l, .dm-l"));
    for (const list of lists) {
      if (family) list.style.setProperty("--t7-chat-font", family);
      else list.style.removeProperty("--t7-chat-font");
      list.style.setProperty("--t7-chat-font-size", size);
    }
  }
  function selectedFamily() {
    const choice = getChatFont();
    return choice === "nunito" ? "Nunito, sans-serif" : choice === "open-sans" ? '"Open Sans", sans-serif' : choice === "roboto" ? "Roboto, sans-serif" : choice === "lato" ? "Lato, sans-serif" : choice === "montserrat" ? "Montserrat, sans-serif" : choice === "custom" && customFace ? `"${CUSTOM_FAMILY}", sans-serif` : "";
  }
  function observeChatLists() {
    if (listObserver || !document.body) return;
    listObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) applyFontSettings(node);
        }
      }
    });
    listObserver.observe(document.body, { childList: true, subtree: true });
  }
  async function loadCustomFont(font) {
    if (!font || !font.source || typeof FontFace !== "function") return false;
    const face = new FontFace(CUSTOM_FAMILY, `url("${font.source}")`);
    await face.load();
    if (customFace) document.fonts.delete(customFace);
    document.fonts.add(face);
    customFace = face;
    setFamily(`"${CUSTOM_FAMILY}", sans-serif`);
    return true;
  }
  async function applyChatFont() {
    const choice = getChatFont();
    observeChatLists();
    if (choice === "custom") {
      try {
        if (await loadCustomFont(getCustomChatFont())) {
          applyFontSettings();
          return true;
        }
      } catch (error) {
        console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0448\u0440\u0438\u0444\u0442 \u0447\u0430\u0442\u0430", error);
      }
      setFamily(null);
      applyFontSettings();
      return false;
    }
    setFamily(selectedFamily());
    applyFontSettings();
    return true;
  }
  async function setChatFont(choice) {
    if (!FONT_CHOICES.has(choice) || choice === "custom" && !getCustomChatFont()) return false;
    store.set(STORE.chatFont, choice);
    return applyChatFont();
  }
  function toBase64(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return btoa(binary);
  }
  async function uploadChatFont(file) {
    if (!file) throw new Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0448\u0440\u0438\u0444\u0442\u0430");
    const extension = file.name.split(".").pop().toLowerCase();
    const mime = FONT_MIME[extension];
    if (!mime) throw new Error("\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0444\u043E\u0440\u043C\u0430\u0442\u044B WOFF2, WOFF, TTF \u0438 OTF");
    if (file.size > MAX_FONT_SIZE) throw new Error("\u0420\u0430\u0437\u043C\u0435\u0440 \u0444\u0430\u0439\u043B\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 2 \u041C\u0411");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const source = `data:${mime};base64,${toBase64(bytes)}`;
    const font = { name: file.name, source };
    const face = new FontFace(CUSTOM_FAMILY, `url("${source}")`);
    try {
      await face.load();
    } catch {
      throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B \u0448\u0440\u0438\u0444\u0442\u0430");
    }
    if (customFace) document.fonts.delete(customFace);
    document.fonts.add(face);
    customFace = face;
    store.set(STORE.chatFontFile, font);
    store.set(STORE.chatFont, "custom");
    setFamily(`"${CUSTOM_FAMILY}", sans-serif`);
    return font.name;
  }
  async function removeCustomChatFont() {
    if (customFace) document.fonts.delete(customFace);
    customFace = null;
    store.set(STORE.chatFontFile, null);
    if (getChatFont() === "custom") store.set(STORE.chatFont, "site");
    await applyChatFont();
  }
  var DEFAULT_ORDER = ["g", "tr", "mn", "dm"];
  var TAB_IDS = new Set(DEFAULT_ORDER);
  var DEFAULT_RECENT_LIMIT = 20;
  var MAX_RECENT_LIMIT = 100;
  var CHAT_TABS = [
    { id: "g", label: "\u0413\u043E\u0440\u043E\u0434" },
    { id: "tr", label: "\u0422\u043E\u0440\u0433\u043E\u0432\u043B\u044F" },
    { id: "mn", label: "\u0420\u0435\u043C\u0451\u0441\u043B\u0430" },
    { id: "dm", label: "\u041B\u0438\u0447\u043D\u044B\u0435" }
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
    const hasMineTab = Array.isArray(prefs.order) && prefs.order.includes("mn");
    const savedOrder = Array.isArray(prefs.order) ? prefs.order.filter((id) => TAB_IDS.has(id)) : [];
    const order = [.../* @__PURE__ */ new Set([...savedOrder, ...DEFAULT_ORDER])];
    const hiddenValues = prefs.hidden instanceof Set ? [...prefs.hidden] : Array.isArray(prefs.hidden) ? prefs.hidden : [];
    const hidden = new Set(hiddenValues.filter((id) => TAB_IDS.has(id)));
    if (!hasMineTab && hidden.has("g")) hidden.add("mn");
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
  var PASTES_KEY = STORE.pastes;
  var PASTES_ENABLED_KEY = STORE.pastesEnabled;
  var closeActiveDialog = null;
  function arePastesEnabled() {
    return store.get(PASTES_ENABLED_KEY) === true;
  }
  function setPastesEnabled(enabled) {
    const active = !!enabled;
    store.set(PASTES_ENABLED_KEY, active);
    document.querySelectorAll(".t7-pastes-btn").forEach((button) => {
      button.hidden = !active;
    });
    if (!active && closeActiveDialog) closeActiveDialog();
  }
  function readPastes() {
    const saved = store.get(PASTES_KEY);
    if (!Array.isArray(saved)) return [];
    return saved.filter((paste) => paste && typeof paste.name === "string" && typeof paste.text === "string");
  }
  function insertPaste(input, text) {
    if (!input || input.disabled || !input.isConnected) return;
    const start = input.selectionStart == null ? input.value.length : input.selectionStart;
    const end = input.selectionEnd == null ? start : input.selectionEnd;
    const value = input.value.slice(0, start) + text + input.value.slice(end);
    if (input.maxLength > 0 && value.length > input.maxLength) return;
    input.value = value;
    const caret = start + text.length;
    try {
      input.setSelectionRange(caret, caret);
    } catch {
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus({ preventScroll: true });
  }
  function openPastes(input) {
    if (!input || !arePastesEnabled()) return;
    if (closeActiveDialog) closeActiveDialog();
    const overlay = document.createElement("div");
    overlay.className = "t7-paste-overlay";
    const dialog = document.createElement("section");
    dialog.className = "t7-paste-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0430\u0441\u0442\u044B");
    const header = document.createElement("div");
    header.className = "t7-paste-header";
    const title = document.createElement("strong");
    title.textContent = "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0430\u0441\u0442\u044B";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "t7-paste-close";
    close.textContent = "\xD7";
    close.title = "\u0417\u0430\u043A\u0440\u044B\u0442\u044C";
    close.setAttribute("aria-label", "\u0417\u0430\u043A\u0440\u044B\u0442\u044C");
    header.append(title, close);
    const list = document.createElement("div");
    list.className = "t7-paste-list";
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "t7-paste-add t7-paste-primary";
    addButton.textContent = "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u0441\u0442\u0443";
    const editor = document.createElement("form");
    editor.className = "t7-paste-editor";
    editor.hidden = true;
    const nameLabel = document.createElement("label");
    nameLabel.className = "t7-paste-field";
    nameLabel.textContent = "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 60;
    nameInput.required = true;
    nameInput.autocomplete = "off";
    nameLabel.appendChild(nameInput);
    const textLabel = document.createElement("label");
    textLabel.className = "t7-paste-field";
    textLabel.textContent = "\u0422\u0435\u043A\u0441\u0442";
    const textInput = document.createElement("textarea");
    textInput.rows = 5;
    textInput.required = true;
    textLabel.appendChild(textInput);
    const editorActions = document.createElement("div");
    editorActions.className = "t7-paste-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "t7-paste-secondary";
    cancelButton.textContent = "\u041E\u0442\u043C\u0435\u043D\u0430";
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "t7-paste-primary";
    saveButton.textContent = "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C";
    editorActions.append(cancelButton, saveButton);
    editor.append(nameLabel, textLabel, editorActions);
    dialog.append(header, list, addButton, editor);
    overlay.appendChild(dialog);
    let editingIndex = null;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeDialog();
    };
    const closeDialog = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown, true);
      if (closeActiveDialog === closeDialog) closeActiveDialog = null;
    };
    closeActiveDialog = closeDialog;
    const renderList = () => {
      const pastes = readPastes();
      list.replaceChildren();
      list.hidden = !editor.hidden;
      if (!pastes.length) {
        const empty = document.createElement("div");
        empty.className = "t7-paste-empty";
        empty.textContent = "\u041F\u0430\u0441\u0442 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442";
        list.appendChild(empty);
        return;
      }
      pastes.forEach((paste, index) => {
        const row = document.createElement("div");
        row.className = "t7-paste-row";
        const insertButton = document.createElement("button");
        insertButton.type = "button";
        insertButton.className = "t7-paste-item";
        insertButton.textContent = paste.name;
        insertButton.title = paste.text;
        insertButton.addEventListener("click", () => {
          insertPaste(input, paste.text);
          closeDialog();
        });
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "t7-paste-edit";
        editButton.textContent = "\u270E";
        editButton.title = `\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0430\u0441\u0442\u0443 \xAB${paste.name}\xBB`;
        editButton.setAttribute("aria-label", editButton.title);
        editButton.addEventListener("click", () => {
          editingIndex = index;
          nameInput.value = paste.name;
          textInput.value = paste.text;
          editor.hidden = false;
          addButton.hidden = true;
          renderList();
          nameInput.focus();
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "t7-paste-delete";
        deleteButton.textContent = "\xD7";
        deleteButton.title = `\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0430\u0441\u0442\u0443 \xAB${paste.name}\xBB`;
        deleteButton.setAttribute("aria-label", deleteButton.title);
        deleteButton.addEventListener("click", () => {
          const next = readPastes();
          next.splice(index, 1);
          store.set(PASTES_KEY, next);
          renderList();
        });
        row.append(insertButton, editButton, deleteButton);
        list.appendChild(row);
      });
    };
    close.addEventListener("click", closeDialog);
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay) closeDialog();
    });
    addButton.addEventListener("click", () => {
      editingIndex = null;
      editor.reset();
      editor.hidden = false;
      addButton.hidden = true;
      renderList();
      nameInput.focus();
    });
    cancelButton.addEventListener("click", () => {
      editingIndex = null;
      editor.reset();
      editor.hidden = true;
      addButton.hidden = false;
      renderList();
    });
    editor.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      const text = textInput.value;
      if (!name || !text.trim()) return;
      const pastes = readPastes();
      if (editingIndex === null) {
        pastes.push({ name, text });
      } else if (pastes[editingIndex]) {
        pastes[editingIndex] = { name, text };
      } else {
        editingIndex = null;
        editor.reset();
        editor.hidden = true;
        addButton.hidden = false;
        renderList();
        return;
      }
      store.set(PASTES_KEY, pastes);
      editingIndex = null;
      editor.reset();
      editor.hidden = true;
      addButton.hidden = false;
      renderList();
    });
    renderList();
    document.addEventListener("keydown", onKeyDown, true);
    document.body.appendChild(overlay);
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
      if (e.target.closest("button") || e.button !== 0 || !e.isPrimary) return;
      const r = win.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId, ox = SOFF.x, oy = SOFF.y;
      let started4 = false, nx = ox, ny = oy, raf = 0;
      const apply = () => {
        raf = 0;
        SOFF = { x: nx, y: ny };
        put();
      };
      const move = (ev) => {
        if (ev.pointerId !== pid) return;
        if (ev.pointerType === "mouse" && !(ev.buttons & 1)) {
          up();
          return;
        }
        if (!started4) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          started4 = true;
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
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        removeEventListener("blur", up);
        if (raf) cancelAnimationFrame(raf);
        if (!started4) return;
        win.classList.remove("t7-drag");
        SOFF = { x: nx, y: ny };
        put();
        store.set(STORE.settingsPosition, SOFF);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
      addEventListener("blur", up);
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
  function createNode(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === "className") node.className = value;
      else if (name in node && !name.startsWith("aria-") && !name.startsWith("data-")) node[name] = value;
      else node.setAttribute(name, value);
    }
    for (const child of children) {
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }
  function settingsSection(title, ...children) {
    return createNode("details", { className: "t7-sec", open: true }, [
      createNode("summary", {}, [title]),
      ...children
    ]);
  }
  function settingsField(title, control, className = "t7-fl") {
    return createNode("label", { className }, [title, control]);
  }
  function settingsToggle(className, title) {
    return createNode("label", { className: "t7-chk t7-toggle-switch" }, [
      createNode("input", { type: "checkbox", className }),
      createNode("span", { className: "t7-toggle-track", "aria-hidden": "true" }),
      title
    ]);
  }
  function settingsButton(title, action) {
    return createNode("button", { type: "button", className: "t7-b", "data-act": action }, [title]);
  }
  function buildSettingsMarkup(root) {
    const dialog = createNode("div", {
      className: "t7-sw",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 7TV"
    });
    const header = createNode("div", { className: "t7-sth" }, [
      createNode("b", {}, ["\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 7TV"]),
      createNode("button", { type: "button", className: "t7-x", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }, ["\xD7"])
    ]);
    const tabs = createNode("div", {
      className: "t7-settings-tabs",
      role: "tablist",
      "aria-label": "\u0420\u0430\u0437\u0434\u0435\u043B\u044B \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A"
    });
    const tabNames = [["emotes", "\u042D\u043C\u043E\u0443\u0442\u044B"], ["chat", "\u0427\u0430\u0442"], ["pings", "\u041F\u0438\u043D\u0433\u0438"], ["data", "\u0414\u0430\u043D\u043D\u044B\u0435"]];
    for (const [id, title] of tabNames) {
      tabs.appendChild(createNode("button", {
        type: "button",
        id: `t7-settings-tab-${id}`,
        role: "tab",
        "aria-selected": String(id === "emotes"),
        "aria-controls": `t7-settings-panel-${id}`,
        tabindex: id === "emotes" ? "0" : "-1"
      }, [title]));
    }
    const panel = (id) => createNode("div", {
      className: "t7-setting-panel",
      id: `t7-settings-panel-${id}`,
      role: "tabpanel",
      "aria-labelledby": `t7-settings-tab-${id}`,
      tabindex: "0",
      hidden: id !== "emotes"
    });
    const emotesPanel = panel("emotes");
    emotesPanel.append(
      settingsSection(
        "\u041E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
        settingsToggle("t7-on", "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u044D\u043C\u043E\u0443\u0442\u044B 7TV \u0432 \u0447\u0430\u0442\u0435"),
        settingsToggle("t7-emote-completion", "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0443\u0441\u0435\u043B\u044C \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u043F\u043E Tab")
      ),
      settingsSection(
        "\u041A\u0430\u043D\u0430\u043B",
        createNode("form", { className: "t7-row" }, [
          settingsField("\u041D\u0438\u043A \u0441\u0442\u0440\u0438\u043C\u0435\u0440\u0430 \u043D\u0430 Twitch", createNode("input", {
            type: "text",
            className: "t7-nick",
            maxlength: "80",
            autocomplete: "off",
            spellcheck: false
          })),
          createNode("button", { type: "submit", className: "t7-b p" }, ["\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C"])
        ]),
        createNode("div", { className: "t7-sst", role: "status" })
      ),
      settingsSection(
        "\u0420\u0430\u0437\u043C\u0435\u0440 \u0432 \u0447\u0430\u0442\u0435",
        createNode("div", { className: "t7-szb" }, Object.keys(SIZES).map(
          (size) => createNode("button", {
            type: "button",
            "data-sz": size,
            "aria-pressed": "false"
          }, [SIZES[size].label])
        ))
      ),
      settingsSection(
        "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435 \u044D\u043C\u043E\u0443\u0442\u044B",
        settingsField("\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u044D\u043C\u043E\u0443\u0442\u043E\u0432 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435", createNode("input", {
          className: "t7-recent-limit",
          type: "number",
          min: "1",
          max: "100",
          step: "1",
          inputmode: "numeric"
        }))
      )
    );
    const chatPanel = panel("chat");
    chatPanel.append(
      settingsSection("\u0412\u043A\u043B\u0430\u0434\u043A\u0438 \u0447\u0430\u0442\u0430", createNode("div", { className: "t7-chat-tab-list" })),
      settingsSection(
        "\u041A\u043D\u043E\u043F\u043A\u0438 \u0432 \u0447\u0430\u0442\u0435",
        settingsToggle("t7-pastes-enabled", "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443 \u043F\u0430\u0441\u0442 \u0432 \u0447\u0430\u0442\u0435"),
        settingsToggle("t7-image-picker-enabled", "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443 imgBB \u0432 \u0447\u0430\u0442\u0435")
      ),
      settingsSection(
        "\u0421\u0441\u044B\u043B\u043A\u0438",
        settingsToggle("t7-link-encoding", "\u041E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043F\u0440\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435 \u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0438"),
        settingsToggle("t7-image-previews", "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0430\u043C (imgbb; \u0432 \u041B\u0421 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C)"),
        createNode("div", { className: "t7-note", role: "note" }, [
          createNode("span", { className: "t7-note-icon", "aria-hidden": "true" }, ["!"]),
          createNode("span", {}, ["\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043D\u0430 \u0441\u0432\u043E\u0439 \u0441\u0442\u0440\u0430\u0445 \u0438 \u0440\u0438\u0441\u043A."])
        ])
      ),
      settingsSection(
        "\u0428\u0440\u0438\u0444\u0442",
        settingsField("\u0413\u0430\u0440\u043D\u0438\u0442\u0443\u0440\u0430", createNode("select", { className: "t7-chat-font" }, [
          ["site", "\u041A\u0430\u043A \u043D\u0430 \u0441\u0430\u0439\u0442\u0435"],
          ["nunito", "Nunito"],
          ["open-sans", "Open Sans"],
          ["roboto", "Roboto"],
          ["lato", "Lato"],
          ["montserrat", "Montserrat"],
          ["custom", "\u0421\u0432\u043E\u0439 \u0448\u0440\u0438\u0444\u0442\u2026"]
        ].map(([value, title]) => createNode("option", { value }, [title]))), "t7-fl t7-chat-font-control"),
        createNode("label", { className: "t7-fl t7-chat-font-size-control" }, [
          "\u0420\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430",
          createNode("input", {
            type: "range",
            className: "t7-chat-font-size",
            min: "11",
            max: "22",
            step: "1"
          }),
          createNode("output", { className: "t7-chat-font-size-value" })
        ]),
        createNode("div", { className: "t7-row t7-wrap t7-chat-font-actions" }, [
          settingsButton("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B \u0448\u0440\u0438\u0444\u0442\u0430", "chat-font"),
          settingsButton("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0432\u043E\u0439 \u0448\u0440\u0438\u0444\u0442", "chat-font-reset"),
          createNode("input", {
            type: "file",
            className: "t7-chat-font-file",
            accept: ".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf",
            hidden: true
          })
        ]),
        createNode("div", { className: "t7-ping-status t7-chat-font-status", role: "status" })
      )
    );
    const pingsPanel = panel("pings");
    const pingPreset = createNode("select", { className: "t7-ping-preset" }, [
      ["bell", "\u041A\u043E\u043B\u043E\u043A\u043E\u043B\u044C\u0447\u0438\u043A"],
      ["chime", "\u0417\u0432\u043E\u043D"],
      ["pop", "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u0438\u0433\u043D\u0430\u043B"],
      ["custom", "\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A"]
    ].map(([value, title]) => createNode("option", { value }, [title])));
    const dmPreset = createNode("select", { className: "t7-dm-ping-preset" }, [
      ["bell", "\u041A\u043E\u043B\u043E\u043A\u043E\u043B\u044C\u0447\u0438\u043A"],
      ["chime", "\u0417\u0432\u043E\u043D"],
      ["pop", "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0441\u0438\u0433\u043D\u0430\u043B"],
      ["custom", "\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A \u0434\u043B\u044F \u041B\u0421"]
    ].map(([value, title]) => createNode("option", { value }, [title])));
    pingsPanel.append(
      settingsSection(
        "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u044B",
        settingsToggle("t7-tab-completion", "\u0414\u043E\u043F\u043E\u043B\u043D\u044F\u0442\u044C \u043D\u0438\u043A \u043F\u043E Tab"),
        settingsField("\u041D\u0438\u043A\u0438 \u0438 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0434\u043B\u044F \u043F\u0438\u043D\u0433\u0430", createNode("textarea", {
          className: "t7-ping-aliases",
          rows: "2",
          placeholder: "\u043D\u0438\u043A, nick, @\u043D\u0438\u043A"
        })),
        settingsField("\u0426\u0432\u0435\u0442 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 (@\u043D\u0438\u043A)", createNode("input", {
          type: "color",
          className: "t7-ping-color"
        }), "t7-fl t7-ping-color-control"),
        settingsField("\u0427\u0435\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043D\u0438\u043A\u043E\u0432", createNode("textarea", {
          className: "t7-ping-blacklist",
          rows: "2",
          placeholder: "\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0438\u043A\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"
        })),
        settingsField("\u0418\u0433\u043D\u043E\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441\u043E \u0441\u043B\u043E\u0432\u0430\u043C\u0438 \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0430\u043C\u0438", createNode("textarea", {
          className: "t7-ping-stopwords",
          rows: "2",
          placeholder: "\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0441\u043B\u043E\u0432\u0443 \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0435 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"
        })),
        settingsField("\u0417\u0432\u0443\u043A \u043F\u0438\u043D\u0433\u0430", pingPreset),
        createNode("label", { className: "t7-fl t7-volume" }, [
          "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C",
          createNode("input", {
            className: "t7-ping-volume",
            type: "range",
            min: "0",
            max: "1",
            step: "0.05"
          }),
          createNode("output", { className: "t7-volume-value" })
        ]),
        createNode("div", { className: "t7-row t7-wrap" }, [
          settingsButton("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0432\u043E\u0439 \u0437\u0432\u0443\u043A", "custom-sound"),
          settingsButton("\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0437\u0432\u0443\u043A", "test-ping"),
          createNode("input", { type: "file", className: "t7-ping-file", accept: "audio/*", hidden: true })
        ]),
        createNode("div", { className: "t7-ping-status", role: "status" })
      ),
      settingsSection(
        "\u041B\u0438\u0447\u043D\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F",
        settingsToggle("t7-dm-sound-enabled", "\u0417\u0432\u0443\u043A \u043F\u0440\u0438 \u043D\u043E\u0432\u043E\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0438 \u0432 \u041B\u0421"),
        settingsField("\u0417\u0432\u0443\u043A \u043B\u0438\u0447\u043D\u044B\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439", dmPreset),
        settingsField("\u041D\u0438\u043A\u0438 \u0434\u043B\u044F \u0437\u0432\u0443\u043A\u043E\u0432\u044B\u0445 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439", createNode("textarea", {
          className: "t7-dm-nick-list",
          rows: "2",
          placeholder: "\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0438\u043A\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443"
        })),
        createNode("div", { className: "t7-dm-nick-mode" }, [
          createNode("span", { className: "t7-dm-nick-mode-label" }, ["\u0427\u0451\u0440\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A"]),
          createNode("label", { className: "t7-toggle-switch" }, [
            createNode("input", {
              type: "checkbox",
              className: "t7-dm-nick-whitelist",
              role: "switch",
              "aria-label": "\u0411\u0435\u043B\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A"
            }),
            createNode("span", { className: "t7-toggle-track", "aria-hidden": "true" })
          ]),
          createNode("span", { className: "t7-dm-nick-mode-label" }, ["\u0411\u0435\u043B\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A"])
        ]),
        createNode("div", { className: "t7-row t7-wrap" }, [
          settingsButton("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0432\u0443\u043A \u0434\u043B\u044F \u041B\u0421", "custom-dm-sound"),
          settingsButton("\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0437\u0432\u0443\u043A \u041B\u0421", "test-dm-ping"),
          createNode("input", { type: "file", className: "t7-dm-ping-file", accept: "audio/*", hidden: true })
        ]),
        createNode("div", { className: "t7-ping-status t7-dm-ping-status", role: "status" }),
        createNode("div", { className: "t7-note" }, [
          "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439 \u041B\u0421 \u0440\u0435\u0433\u0443\u043B\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043E\u0431\u0449\u0435\u0439 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u043E\u0439 \u0433\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u0438 \u0432\u044B\u0448\u0435. \u0412 \u0447\u0451\u0440\u043D\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043D\u0438\u043A\u0438; \u0432 \u0431\u0435\u043B\u043E\u043C \u2014 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u0435\u0442 \u0441\u0438\u0433\u043D\u0430\u043B\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u043D\u0438\u0445."
        ])
      )
    );
    const dataPanel = panel("data");
    dataPanel.append(settingsSection(
      "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u043C\u0438",
      createNode("div", { className: "t7-row t7-wrap" }, [
        settingsButton("\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A", "refresh"),
        settingsButton("\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u0435\u0448 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A", "cache"),
        settingsButton("\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043E\u0448\u043A\u0430", "pos")
      ])
    ));
    dialog.append(header, tabs, emotesPanel, chatPanel, pingsPanel, dataPanel);
    root.appendChild(dialog);
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
    buildSettingsMarkup(el);
    ["keydown", "keyup", "keypress"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener("pointerdown", (e) => {
      if (e.target === el) closeSettings();
    });
    el.querySelector(".t7-x").addEventListener("click", closeSettings);
    const settingsTabs = el.querySelector(".t7-settings-tabs");
    const activateSettingsTab = (tab) => {
      settingsTabs.querySelectorAll('[role="tab"]').forEach((item) => {
        const selected = item === tab;
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
        el.querySelector(`#${item.getAttribute("aria-controls")}`).hidden = !selected;
      });
    };
    settingsTabs.addEventListener("click", (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) activateSettingsTab(tab);
    });
    settingsTabs.addEventListener("keydown", (event) => {
      const tabs = [...settingsTabs.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(event.target);
      if (index < 0) return;
      const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      activateSettingsTab(tabs[nextIndex]);
      tabs[nextIndex].focus();
    });
    const on2 = el.querySelector(".t7-on");
    on2.checked = S.on;
    on2.addEventListener("change", () => {
      S.on = on2.checked;
      store.set(STORE.emotesEnabled, S.on);
      rescanAll();
    });
    const pastesEnabled = el.querySelector(".t7-pastes-enabled");
    pastesEnabled.checked = arePastesEnabled();
    pastesEnabled.addEventListener("change", () => setPastesEnabled(pastesEnabled.checked));
    const imagePickerEnabled = el.querySelector(".t7-image-picker-enabled");
    imagePickerEnabled.checked = isImagePickerButtonEnabled();
    imagePickerEnabled.addEventListener("change", () => {
      setImagePickerButtonEnabled(imagePickerEnabled.checked);
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
      reload(false);
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
    const emoteCompletion = el.querySelector(".t7-emote-completion");
    emoteCompletion.checked = pingSystem.config.emoteCompletion;
    emoteCompletion.addEventListener("change", () => pingSystem.setEmoteCompletion(emoteCompletion.checked));
    const pingColor = el.querySelector(".t7-ping-color");
    pingColor.value = pingSystem.config.pingColor;
    pingColor.addEventListener("input", () => pingSystem.setPingColor(pingColor.value));
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
    const dmSoundEnabled = el.querySelector(".t7-dm-sound-enabled");
    dmSoundEnabled.checked = pingSystem.config.dmSoundEnabled;
    dmSoundEnabled.addEventListener("change", () => pingSystem.setDmSoundEnabled(dmSoundEnabled.checked));
    const dmPreset = el.querySelector(".t7-dm-ping-preset");
    dmPreset.value = pingSystem.config.dmSelectedPreset;
    const dmPingFile = el.querySelector(".t7-dm-ping-file");
    const dmPingStatus = el.querySelector(".t7-dm-ping-status");
    dmPreset.addEventListener("change", () => {
      if (dmPreset.value === "custom" && !pingSystem.config.dmCustomSound) {
        dmPreset.value = pingSystem.config.dmSelectedPreset;
        dmPingFile.click();
        return;
      }
      pingSystem.setDmPreset(dmPreset.value);
      dmPreset.value = pingSystem.config.dmSelectedPreset;
    });
    const dmNickList = el.querySelector(".t7-dm-nick-list");
    dmNickList.value = pingSystem.config.dmNickList.join("\n");
    dmNickList.addEventListener("change", () => pingSystem.setList("dmNickList", dmNickList.value));
    const dmNickWhitelist = el.querySelector(".t7-dm-nick-whitelist");
    const dmNickMode = dmNickWhitelist.closest(".t7-dm-nick-mode");
    dmNickWhitelist.checked = pingSystem.config.dmNickWhitelist;
    const renderDmNickMode = () => {
      dmNickMode.classList.toggle("is-whitelist", dmNickWhitelist.checked);
    };
    dmNickWhitelist.addEventListener("change", () => {
      pingSystem.setDmNickWhitelist(dmNickWhitelist.checked);
      renderDmNickMode();
    });
    renderDmNickMode();
    dmPingFile.addEventListener("change", async () => {
      try {
        await pingSystem.saveCustomDmSound(dmPingFile.files[0]);
        dmPreset.value = pingSystem.config.dmSelectedPreset;
        dmPingStatus.textContent = "\u0421\u0432\u043E\u0439 \u0437\u0432\u0443\u043A \u0434\u043B\u044F \u041B\u0421 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D";
      } catch (error) {
        dmPingStatus.textContent = error.message;
      }
      dmPingFile.value = "";
    });
    const chatFont = el.querySelector(".t7-chat-font");
    const chatFontFile = el.querySelector(".t7-chat-font-file");
    const chatFontStatus = el.querySelector(".t7-chat-font-status");
    const chatFontSize = el.querySelector(".t7-chat-font-size");
    const chatFontSizeValue = el.querySelector(".t7-chat-font-size-value");
    const customChatFont = getCustomChatFont();
    chatFont.value = getChatFont();
    chatFontSize.value = String(getChatFontSize());
    chatFontSizeValue.value = chatFontSize.value + " px";
    chatFontSize.addEventListener("input", () => {
      const size = setChatFontSize(chatFontSize.value);
      chatFontSize.value = String(size);
      chatFontSizeValue.value = size + " px";
      applySize();
    });
    el.querySelector('[data-act="chat-font-reset"]').disabled = !customChatFont;
    chatFontStatus.textContent = customChatFont ? `\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${customChatFont.name}` : "";
    chatFont.addEventListener("change", async () => {
      if (chatFont.value === "custom" && !getCustomChatFont()) {
        chatFontFile.click();
        return;
      }
      if (await setChatFont(chatFont.value)) {
        const font = getCustomChatFont();
        chatFontStatus.textContent = chatFont.value === "custom" && font ? `\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${font.name}` : "";
      } else {
        chatFont.value = getChatFont();
        chatFontStatus.textContent = "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u0448\u0440\u0438\u0444\u0442";
      }
    });
    chatFontFile.addEventListener("change", async () => {
      try {
        const name = await uploadChatFont(chatFontFile.files[0]);
        chatFont.value = "custom";
        el.querySelector('[data-act="chat-font-reset"]').disabled = false;
        chatFontStatus.textContent = `\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D: ${name}`;
      } catch (error) {
        chatFont.value = getChatFont();
        chatFontStatus.textContent = error.message;
      }
      chatFontFile.value = "";
    });
    chatFontFile.addEventListener("cancel", () => {
      chatFont.value = getChatFont();
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
        const name = createNode("span", { className: "t7-chat-tab-name" }, [tab.label]);
        const visibility = createNode("label", { className: "t7-chat-tab-visible t7-toggle-switch" }, [
          createNode("input", {
            type: "checkbox",
            "data-tab-visible": id,
            checked: !prefs.hidden.has(id),
            disabled: !prefs.hidden.has(id) && visibleCount === 1
          }),
          createNode("span", { className: "t7-toggle-track", "aria-hidden": "true" }),
          createNode("span", {}, ["\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C"])
        ]);
        const move = createNode("span", { className: "t7-chat-tab-move" }, [
          createNode("button", {
            type: "button",
            "data-tab-move": "up",
            "data-tab-id": id,
            "aria-label": `\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C ${tab.label} \u0432\u044B\u0448\u0435`,
            title: "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432\u044B\u0448\u0435",
            disabled: index === 0
          }, ["\u2191"]),
          createNode("button", {
            type: "button",
            "data-tab-move": "down",
            "data-tab-id": id,
            "aria-label": `\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C ${tab.label} \u043D\u0438\u0436\u0435`,
            title: "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u043D\u0438\u0436\u0435",
            disabled: index === prefs.order.length - 1
          }, ["\u2193"])
        ]);
        row.append(name, visibility, move);
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
    linkEncoding.addEventListener("change", () => {
      setLinkEncodingEnabled(linkEncoding.checked);
      rescanAll();
    });
    const imagePreviews = el.querySelector(".t7-image-previews");
    imagePreviews.checked = areImagePreviewsEnabled();
    imagePreviews.addEventListener("change", () => {
      setImagePreviewsEnabled(imagePreviews.checked);
      rescanAll();
    });
    el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "custom-sound") {
        pingSystem.unlockAudio();
        pingFile.click();
      } else if (b.dataset.act === "custom-dm-sound") {
        pingSystem.unlockAudio();
        dmPingFile.click();
      } else if (b.dataset.act === "chat-font") chatFontFile.click();
      else if (b.dataset.act === "chat-font-reset") {
        await removeCustomChatFont();
        chatFont.value = getChatFont();
        b.disabled = true;
        chatFontStatus.textContent = "\u0421\u0432\u043E\u0439 \u0448\u0440\u0438\u0444\u0442 \u0443\u0434\u0430\u043B\u0451\u043D";
      } else if (b.dataset.act === "test-ping") {
        pingSystem.play().catch((error) => console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0432\u0443\u043A \u043F\u0438\u043D\u0433\u0430", error));
      } else if (b.dataset.act === "test-dm-ping") {
        pingSystem.playDm().catch((error) => console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0432\u0443\u043A \u041B\u0421", error));
      } else if (b.dataset.act === "refresh") reload(true);
      else if (b.dataset.act === "cache") {
        clearResolvedImageCache();
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
  function toggleFavorite2(name) {
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
      const resolution = SIZES[S.size].n;
      const image = el.firstChild;
      setEmoteImage(image, em, resolution, "lazy", (error) => {
        console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u044D\u043C\u043E\u0443\u0442\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", el.dataset.name, error);
      });
    }
  }
  function filterGrid() {
    if (!st.pop) return;
    const q = st.pop.querySelector(".t7-q").value.trim().toLowerCase();
    st.pop.querySelectorAll(".t7-gw").forEach((w) => {
      let vis = 0;
      w.querySelectorAll(".t7-item").forEach((item) => {
        const show2 = !q || item.dataset.name.toLowerCase().includes(q);
        item.hidden = !show2;
        if (show2) vis++;
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
        setEmoteTooltipData(b, n, emoteFor(n));
        b.setAttribute("aria-label", n);
        const im = document.createElement("img");
        im.alt = "";
        im.decoding = "async";
        b.appendChild(im);
        const favorite = document.createElement("button");
        const isFavorite2 = favorites.includes(n);
        favorite.type = "button";
        favorite.className = "t7-fav";
        favorite.dataset.name = n;
        favorite.textContent = isFavorite2 ? "\u2605" : "\u2606";
        favorite.title = isFavorite2 ? "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435";
        favorite.setAttribute("aria-label", favorite.title + ": " + n);
        favorite.setAttribute("aria-pressed", String(isFavorite2));
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
      if (e.target.closest("button") || e.button !== 0 || !e.isPrimary) return;
      const r = pop.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY, pid = e.pointerId;
      let started4 = false, nx = r.left, ny = r.top, raf = 0;
      const apply = () => {
        raf = 0;
        pop.style.transform = `translate(${nx - r.left}px, ${ny - r.top}px)`;
      };
      const start = () => {
        started4 = true;
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
        if (ev.pointerId !== pid) return;
        if (ev.pointerType === "mouse" && !(ev.buttons & 1)) {
          up();
          return;
        }
        if (!started4) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          start();
        }
        nx = clamp(r.left + ev.clientX - sx, 8, innerWidth - r.width - 8);
        ny = clamp(r.top + ev.clientY - sy, 8, innerHeight - 120);
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        removeEventListener("blur", up);
        if (raf) cancelAnimationFrame(raf);
        if (!started4 || st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.pos = { x: nx, y: ny };
        store.set(STORE.popupPosition, st.pos);
        place();
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
      addEventListener("blur", up);
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
      if (e.button !== 0 || !e.isPrimary) return;
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
        if (ev.pointerId !== e.pointerId) return;
        if (ev.pointerType === "mouse" && !(ev.buttons & 1)) {
          up();
          return;
        }
        w = clamp(r.width + ev.clientX - sx, 240, Math.max(240, innerWidth - r.left - 8));
        h = clamp(r.height + ev.clientY - sy, mh, Math.max(mh, innerHeight - r.top - 8));
        if (!raf) raf = requestAnimationFrame(apply);
      };
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", up);
        removeEventListener("blur", up);
        if (raf) cancelAnimationFrame(raf);
        if (st.pop !== pop) return;
        pop.classList.remove("t7-drag");
        st.win = { w, h };
        st.pos = { x: r.left, y: r.top };
        store.set(STORE.popupSize, st.win);
        store.set(STORE.popupPosition, st.pos);
        place();
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
      addEventListener("pointercancel", up);
      addEventListener("blur", up);
    });
  }
  function openPop(btn) {
    st.anchor = btn;
    const pop = document.createElement("div");
    st.pop = pop;
    pop.className = "t7-pop";
    pop.style.setProperty("--t7-tile", SIZES[S.size].p + "px");
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B 7TV");
    const header = document.createElement("div");
    header.className = "t7-h";
    const title = document.createElement("b");
    title.textContent = "7TV";
    const headerButtons = document.createElement("span");
    headerButtons.className = "t7-hb";
    for (const [className, label, text] of [
      ["t7-g", "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", "\u2699"],
      ["t7-x", "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", "\xD7"]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.textContent = text;
      headerButtons.appendChild(button);
    }
    header.append(title, headerButtons);
    const search = document.createElement("input");
    search.type = "search";
    search.className = "t7-q";
    search.placeholder = "\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0443\u0442\u043E\u0432";
    search.autocomplete = "off";
    search.setAttribute("aria-label", "\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0443\u0442\u043E\u0432");
    const views = document.createElement("div");
    views.className = "t7-views";
    views.setAttribute("role", "tablist");
    views.setAttribute("aria-label", "\u0421\u043F\u0438\u0441\u043A\u0438 \u044D\u043C\u043E\u0443\u0442\u043E\u0432");
    for (const [id, label, selected] of [
      ["all", "\u0412\u0441\u0435", true],
      ["favorites", "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", false],
      ["recent", "\u041D\u0435\u0434\u0430\u0432\u043D\u0438\u0435", false]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "tab");
      button.dataset.view = id;
      button.setAttribute("aria-selected", String(selected));
      button.textContent = label;
      views.appendChild(button);
    }
    const grid = document.createElement("div");
    grid.className = "t7-gr";
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "t7-rs";
    resizeHandle.title = "\u041F\u043E\u0442\u044F\u043D\u0438, \u0447\u0442\u043E\u0431\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440";
    pop.append(header, search, views, grid, resizeHandle);
    ["keydown", "keyup", "keypress"].forEach((t) => pop.addEventListener(t, (e) => e.stopPropagation()));
    setupDrag2(pop);
    setupResize(pop);
    pop.querySelector(".t7-x").addEventListener("click", () => {
      const a = st.anchor;
      closePop();
      if (a) a.focus({ preventScroll: true });
    });
    pop.querySelector(".t7-g").addEventListener("click", openSettings);
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
        toggleFavorite2(favorite.dataset.name);
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
  var emoteBindings = /* @__PURE__ */ new WeakMap();
  var linkBindings = /* @__PURE__ */ new WeakMap();
  function normalizeBanword(value) {
    return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
  }
  function findTwitchBanword(message) {
    const text = normalizeBanword(message);
    for (const raw of HARD_BANNED_WORDS) {
      const word = normalizeBanword(raw);
      if (!word) continue;
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matcher = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, "u");
      if (matcher.test(text)) return String(raw).trim();
    }
    return "";
  }
  function showTwitchBanwordWarning(form, word) {
    let warning = form.querySelector(":scope > .t7-banword-warning");
    if (!warning) {
      warning = document.createElement("div");
      warning.className = "t7-banword-warning";
      warning.setAttribute("role", "alert");
      form.appendChild(warning);
    }
    warning.textContent = `\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E: \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D\u043D\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \xAB${word}\xBB.`;
    warning.hidden = false;
    const menu = form.querySelector(".t7-ping-menu");
    if (menu) menu.hidden = true;
    const emoteMenu = form.querySelector(".t7-emote-menu");
    if (emoteMenu) emoteMenu.hidden = true;
  }
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
    return {
      hide() {
        menu.hidden = true;
      },
      dispose() {
        input.removeEventListener("input", update);
        input.removeEventListener("keydown", onKeyDown, true);
        unsubscribe();
        menu.remove();
      }
    };
  }
  function bindEmoteAutocomplete(form, input) {
    const menu = document.createElement("div");
    menu.className = "t7-emote-menu";
    menu.setAttribute("role", "group");
    menu.setAttribute("aria-label", "\u042D\u043C\u043E\u0443\u0442\u044B");
    menu.hidden = true;
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "t7-emote-nav";
    previous.textContent = "\u2039";
    previous.title = "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0435 \u044D\u043C\u043E\u0443\u0442\u044B";
    previous.setAttribute("aria-label", previous.title);
    const strip = document.createElement("div");
    strip.className = "t7-emote-strip";
    strip.setAttribute("role", "listbox");
    const next = document.createElement("button");
    next.type = "button";
    next.className = "t7-emote-nav";
    next.textContent = "\u203A";
    next.title = "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u044D\u043C\u043E\u0443\u0442\u044B";
    next.setAttribute("aria-label", next.title);
    menu.append(previous, strip, next);
    form.appendChild(menu);
    let matches = [];
    let selectedIndex = -1;
    let pageStart = 0;
    let pageSize = 1;
    let requested = false;
    let dismissed = false;
    const getToken = () => {
      const caret = input.selectionStart == null ? input.value.length : input.selectionStart;
      if (caret !== input.selectionEnd) return null;
      const before = input.value.slice(0, caret);
      const match = /(?:^|\s)([^\s]*)$/u.exec(before);
      if (!match || match[1].length < 2) return null;
      return { query: match[1].toLowerCase(), start: caret - match[1].length, end: caret };
    };
    const complete = (name) => {
      const token = getToken();
      if (!token || !name) return;
      const after = input.value.slice(token.end);
      const suffix = /^\s/.test(after) ? "" : " ";
      const replacement = name + suffix;
      input.value = input.value.slice(0, token.start) + replacement + after;
      const caret = token.start + replacement.length;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus({ preventScroll: true });
      menu.hidden = true;
    };
    const render = () => {
      strip.replaceChildren();
      if (!matches.length) {
        menu.hidden = true;
        return;
      }
      const width = menu.clientWidth || Math.max(1, Math.min(620, form.clientWidth, window.innerWidth - 24));
      pageSize = Math.max(1, Math.floor((width - 64) / 66));
      if (selectedIndex >= matches.length) selectedIndex = -1;
      if (selectedIndex >= 0) pageStart = Math.floor(selectedIndex / pageSize) * pageSize;
      else pageStart = Math.floor(pageStart / pageSize) * pageSize;
      pageStart = Math.min(pageStart, Math.floor((matches.length - 1) / pageSize) * pageSize);
      const start = pageStart;
      for (const [offset, name] of matches.slice(start, start + pageSize).entries()) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "t7-emote-option";
        option.title = name;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(selectedIndex >= 0 && start + offset === selectedIndex));
        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        option.appendChild(image);
        const label = document.createElement("span");
        label.textContent = name.length > 9 ? name.slice(0, 9) + "\u2026" : name;
        option.appendChild(label);
        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("click", () => complete(name));
        strip.appendChild(option);
        const emote = EM[name];
        if (emote) {
          const resolution = Math.min(2, SIZES[S.size].n);
          setEmoteImage(image, emote, resolution, "lazy", (error) => {
            console.warn("[7TV] \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u044D\u043C\u043E\u0443\u0442\u0430 \u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043A\u043E\u043C\u043F\u043B\u0438\u0442\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C", name, error);
          });
        }
      }
      previous.disabled = pageStart === 0;
      next.disabled = pageStart + pageSize >= matches.length;
      previous.hidden = matches.length <= pageSize;
      next.hidden = matches.length <= pageSize;
      menu.hidden = !pingSystem.config.emoteCompletion || !requested || dismissed;
    };
    const update = () => {
      requested = false;
      dismissed = false;
      if (!pingSystem.config.emoteCompletion) {
        matches = [];
        render();
        return;
      }
      const token = getToken();
      if (!token) {
        matches = [];
        render();
        return;
      }
      matches = Object.keys(EM).filter((name) => name.toLowerCase().startsWith(token.query) && name.toLowerCase() !== token.query).sort((a, b) => a.localeCompare(b));
      selectedIndex = -1;
      pageStart = 0;
      render();
    };
    const move = (offset) => {
      const current2 = selectedIndex < 0 ? offset > 0 ? pageStart - 1 : pageStart : selectedIndex;
      selectedIndex = Math.max(0, Math.min(matches.length - 1, current2 + offset));
      pageStart = Math.floor(selectedIndex / pageSize) * pageSize;
      render();
    };
    const onKeyDown = (event) => {
      if (event.key === "Tab" && !event.shiftKey && menu.hidden && pingSystem.config.emoteCompletion && matches.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requested = true;
        dismissed = false;
        render();
        return;
      }
      if (menu.hidden) return;
      if (event.key === "Escape") {
        dismissed = true;
        menu.hidden = true;
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        move(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        move(-1);
      } else if (event.key === "Enter" && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        complete(matches[selectedIndex < 0 ? pageStart : selectedIndex]);
      } else if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        complete(matches[selectedIndex < 0 ? pageStart : selectedIndex]);
      }
    };
    const changePage = (offset) => {
      const nextStart = Math.max(0, Math.min(
        Math.floor((matches.length - 1) / pageSize) * pageSize,
        pageStart + offset * pageSize
      ));
      pageStart = nextStart;
      selectedIndex = -1;
      render();
    };
    previous.addEventListener("pointerdown", (event) => event.preventDefault());
    next.addEventListener("pointerdown", (event) => event.preventDefault());
    previous.addEventListener("click", () => changePage(-1));
    next.addEventListener("click", () => changePage(1));
    input.addEventListener("input", update);
    input.addEventListener("keydown", onKeyDown, true);
    const unsubscribe = on(EV.emoteCompletionChange, update);
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(form);
    update();
    return () => {
      input.removeEventListener("input", update);
      input.removeEventListener("keydown", onKeyDown, true);
      unsubscribe();
      resizeObserver.disconnect();
      menu.remove();
    };
  }
  function bindChatForm(form, input) {
    const history = bindMessageHistory(input);
    const pingAutocomplete = bindPingAutocomplete(form, input);
    let lastRecentMessage = "";
    let recentRecorded = false;
    let warning = null;
    const blockBannedWord = (event) => {
      const word = findTwitchBanword(input.value);
      if (!word) return false;
      event.preventDefault();
      event.stopImmediatePropagation();
      showTwitchBanwordWarning(form, word);
      return true;
    };
    const record = () => {
      const text = input.value.trim();
      if (!text) return;
      pingAutocomplete.hide();
      history.remember(text);
      if (recentRecorded && text === lastRecentMessage) return;
      recordRecentFromMessage(text);
      lastRecentMessage = text;
      recentRecorded = true;
    };
    const onInput = () => {
      if (input.value.trim() !== lastRecentMessage) recentRecorded = false;
      warning = form.querySelector(":scope > .t7-banword-warning");
      if (warning) warning.hidden = true;
    };
    const onSubmit = (event) => {
      if (blockBannedWord(event)) return;
      record();
      requestAnimationFrame(() => {
        if (!form.isConnected) return;
        const active = document.activeElement;
        if (active !== document.body && !form.contains(active)) return;
        const currentInput = form.querySelector(SEL.textInput);
        if (currentInput) currentInput.focus({ preventScroll: true });
      });
    };
    const onClick = (event) => {
      if (event.target.closest(SEL.submitButton)) blockBannedWord(event);
    };
    const onKeyDown = (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing && event.keyCode !== 229) {
        if (blockBannedWord(event)) return;
        record();
      }
    };
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown, true);
    form.addEventListener("submit", onSubmit, true);
    form.addEventListener("click", onClick, true);
    return () => {
      history.dispose();
      pingAutocomplete.dispose();
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown, true);
      form.removeEventListener("submit", onSubmit, true);
      form.removeEventListener("click", onClick, true);
    };
  }
  function disposeForm(form) {
    const dispose = bindings.get(form);
    const disposeEmotes = emoteBindings.get(form);
    const disposeLinks = linkBindings.get(form);
    if (dispose && st.anchor && form.contains(st.anchor)) closePop();
    disposeImagePicker(form);
    if (dispose) {
      dispose();
      bindings.delete(form);
    }
    if (disposeEmotes) {
      disposeEmotes();
      emoteBindings.delete(form);
    }
    if (disposeLinks) {
      disposeLinks();
      linkBindings.delete(form);
    }
  }
  function disposeInputBindings(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(SEL.chatForms)) disposeForm(node);
    node.querySelectorAll(SEL.chatForms).forEach(disposeForm);
  }
  function ensureButtons() {
    document.querySelectorAll(SEL.chatForms).forEach((form) => {
      const input = form.querySelector(SEL.textInput);
      if (input && !emoteBindings.has(form)) {
        emoteBindings.set(form, bindEmoteAutocomplete(form, input));
      }
      if (input && !bindings.has(form)) {
        bindings.set(form, form.matches(SEL.chatForm) ? bindChatForm(form, input) : () => {
        });
      }
      if (input && !linkBindings.has(form))
        linkBindings.set(form, bindOutgoingLinkEncoding(form, input));
      const submit = form.querySelector(SEL.submitButton);
      let button = form.querySelector(".t7-btn");
      if (!button) {
        button = document.createElement("button");
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
        if (submit) submit.before(button);
        else form.appendChild(button);
      }
      let imagesButton = form.querySelector(".t7-images-btn");
      if (input && !imagesButton) {
        imagesButton = document.createElement("button");
        imagesButton.type = "button";
        imagesButton.className = "t7-btn t7-images-btn";
        imagesButton.textContent = "imgBB";
        imagesButton.hidden = !isImagePickerButtonEnabled() || !!form.closest(".dm-f");
        imagesButton.title = "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 imgBB";
        imagesButton.setAttribute("aria-label", "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 imgBB");
        imagesButton.setAttribute("aria-haspopup", "dialog");
        imagesButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openImagePicker(input);
        });
        if (submit) submit.before(imagesButton);
        else form.appendChild(imagesButton);
      }
      if (imagesButton) imagesButton.hidden = !isImagePickerButtonEnabled() || !!form.closest(".dm-f");
      let pastesButton = form.querySelector(".t7-pastes-btn");
      if (!pastesButton) {
        pastesButton = document.createElement("button");
        pastesButton.type = "button";
        pastesButton.className = "t7-btn t7-pastes-btn";
        pastesButton.textContent = "\u041F\u0430\u0441\u0442\u044B";
        pastesButton.title = "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0430\u0441\u0442\u044B";
        pastesButton.setAttribute("aria-label", "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0430\u0441\u0442\u044B");
        pastesButton.hidden = !arePastesEnabled();
        pastesButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openPastes(input);
        });
        if (submit) submit.before(pastesButton);
        else form.appendChild(pastesButton);
      }
    });
    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
  }
  function contains(node, selector) {
    return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
  }
  function startChatObservers() {
    let buttonsQueued = false;
    let needsButtons = false;
    let needsScan = false;
    const schedule = (records) => {
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
          if (contains(node, SEL.chatRows) || contains(node, SEL.dmRows) || contains(node, SEL.dmRoot)) needsScan = true;
        }
      }
      if (needsScan) {
        needsScan = false;
        scan();
      }
      if (!needsButtons || buttonsQueued) return;
      buttonsQueued = true;
      requestAnimationFrame(() => {
        buttonsQueued = false;
        needsButtons = false;
        ensureButtons();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }
  var observers = /* @__PURE__ */ new WeakMap();
  var failedFallbacks = /* @__PURE__ */ new WeakMap();
  var documentObserver = null;
  function applyTabs(tabs) {
    if (!tabs.isConnected) return;
    const prefs = getChatTabPrefs();
    const buttons = [...tabs.querySelectorAll(":scope > [data-tab]")];
    if (!buttons.length) return;
    const byId = new Map(buttons.map((button) => [button.dataset.tab, button]));
    const ordered = [
      ...prefs.order.map((id) => byId.get(id)).filter(Boolean),
      ...buttons.filter((button) => !prefs.order.includes(button.dataset.tab))
    ];
    if (ordered.some((button, index) => buttons[index] !== button))
      ordered.forEach((button) => tabs.appendChild(button));
    for (const button of ordered) {
      const hidden = prefs.hidden.has(button.dataset.tab);
      button.classList.toggle("t7-pref-hidden", hidden);
    }
    const active = ordered.find((button) => button.getAttribute("aria-selected") === "true");
    if (!active || !prefs.hidden.has(active.dataset.tab)) {
      failedFallbacks.delete(tabs);
      return;
    }
    const fallback = ordered.find((button) => !prefs.hidden.has(button.dataset.tab) && !button.hidden && !button.disabled);
    if (!fallback || failedFallbacks.get(tabs) === active.dataset.tab) return;
    failedFallbacks.set(tabs, active.dataset.tab);
    fallback.click();
  }
  function observeTabs(tabs) {
    if (observers.has(tabs)) return;
    const observer = new MutationObserver(() => applyTabs(tabs));
    observer.observe(tabs, {
      attributes: true,
      attributeFilter: ["aria-selected", "hidden"],
      childList: true
    });
    observers.set(tabs, observer);
    applyTabs(tabs);
  }
  function setupTabs(root = document) {
    root.querySelectorAll(SEL.chatTabs).forEach(observeTabs);
    if (!documentObserver && document.documentElement) {
      documentObserver = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node.matches(SEL.chatTabs)) observeTabs(node);
            node.querySelectorAll(SEL.chatTabs).forEach(observeTabs);
          }
        }
      });
      documentObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  on(EV.chatTabsChange, () => setupTabs());
  var PING_ONLY_KEY = STORE.pingOnly;
  var PING_ARCHIVE_KEY = STORE.pingArchive;
  var PING_ARCHIVE_LIMIT = 500;
  var PING_PAGE_SIZE = 50;
  var ROOM_IDS = ["city", "mine", "one"];
  var states2 = /* @__PURE__ */ new Set();
  var stateByBox = /* @__PURE__ */ new WeakMap();
  var pingOnly = store.get(PING_ONLY_KEY) === true;
  var saveTimer = 0;
  var documentObserver2 = null;
  var storedArchive = readArchive();
  function readArchive() {
    const saved = store.get(PING_ARCHIVE_KEY);
    const archive = Object.fromEntries(ROOM_IDS.map((room) => [room, []]));
    for (const room of ROOM_IDS) {
      const values = saved && Array.isArray(saved[room]) ? saved[room] : [];
      for (const message of values) {
        if (!message || message.id == null) continue;
        const text = typeof message.text === "string" ? message.text : String(message.t || "");
        const login = String(message.login || message.l || "");
        const name = String(message.name || message.n || login);
        const tab = String(message.tab || message.tb || inferTab(message));
        archive[room].push({
          id: String(message.id),
          login,
          name,
          text,
          tab,
          at: Number(message.at) || 0
        });
      }
    }
    return archive;
  }
  function inferTab(message) {
    if (message.rm === "mine") return "mn";
    if (message.k === "tr") return "tr";
    if (message.k === "dm") return "dm";
    return "g";
  }
  function saveArchiveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = 0;
      store.set(PING_ARCHIVE_KEY, storedArchive);
    }, 500);
  }
  function getRoom(box, row) {
    if (box.closest(".co-host, .co-float")) return "one";
    if (row.dataset.rm === "mine" || box.closest(".mn")) return "mine";
    if (row.dataset.rm === "city") return "city";
    return "city";
  }
  function getTab(box, row) {
    if (row.dataset.rm === "mine") return "mn";
    const selected = box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`);
    return selected && selected.dataset.tab || "g";
  }
  function getMessage(row) {
    if (row.matches(`${SEL.emptyMessage}, ${SEL.systemMessage}, ${SEL.eventMessage}`) || row.classList.contains("t7-archive-row")) return null;
    const nick = row.querySelector(":scope > b[data-nick]");
    const content = row.querySelector(":scope > span:not([class])");
    const login = nick && String(nick.dataset.nick || "").trim();
    const text = content ? content.textContent : "";
    if (!login || !text) return null;
    return { login, name: nick.textContent.trim() || login, text };
  }
  function archiveMessage(room, tab, row, message) {
    if (!row.dataset.mid) return;
    const id = `${room}:${row.dataset.mid}`;
    if (storedArchive[room].some((item) => `${room}:${item.id}` === id)) return;
    storedArchive[room].push({
      id: row.dataset.mid,
      login: message.login,
      name: message.name,
      text: message.text,
      tab,
      at: Date.now()
    });
    storedArchive[room].sort((a, b) => a.at - b.at);
    if (storedArchive[room].length > PING_ARCHIVE_LIMIT)
      storedArchive[room].splice(0, storedArchive[room].length - PING_ARCHIVE_LIMIT);
    saveArchiveSoon();
  }
  function addFilterLabel(row, label) {
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
    const text = label === "\u0412 \u0427\u0421" ? `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${row.querySelector(":scope > b[data-nick]")?.textContent || ""} \u0432 \u0447\u0451\u0440\u043D\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435` : "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0441\u043A\u0440\u044B\u0442\u043E \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u043C";
    if (tag.textContent !== text) tag.textContent = text;
    tag.title = label === "\u0412 \u0427\u0421" ? "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044C \u0432 \u0432\u0430\u0448\u0435\u043C \u0447\u0435\u0440\u043D\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435" : "\u0412 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0438 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0444\u0440\u0430\u0437\u0430 \u0438\u0437 \u0444\u0438\u043B\u044C\u0442\u0440\u0430";
  }
  function processRow(state, row, notify) {
    const message = getMessage(row);
    if (!message) return false;
    const room = getRoom(state.box, row);
    const tab = getTab(state.box, row);
    const key = row.dataset.mid ? `${room}:${row.dataset.mid}` : "";
    const previouslySeen = key && state.seen.has(key);
    if (key) state.seen.add(key);
    row.dataset.t7PingProcessed = "1";
    const label = pingSystem.filterLabel(message.login, message.text);
    addFilterLabel(row, label);
    row.classList.toggle("t7-filtered", !!label);
    row.classList.toggle("t7-filtered-blacklist", label === "\u0412 \u0427\u0421");
    const nativePing = row.classList.contains("ping");
    const pinged = !label && !row.classList.contains("me") && (nativePing || pingSystem.isPinged(message.text));
    row.classList.toggle("t7-ping", pinged && !nativePing);
    if (pinged) {
      archiveMessage(room, tab, row, message);
      const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
      if (!previouslySeen && notify) {
        state.counts[tab] = (state.counts[tab] || 0) + (tab === currentTab ? 0 : 1);
        pingSystem.play().catch((error) => console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0432\u0443\u043A \u043F\u0438\u043D\u0433\u0430", error));
      }
    }
    return pinged;
  }
  function badge(parent, className, count, title) {
    let element = parent.querySelector(`:scope > .${className}`);
    if (!element) {
      element = document.createElement("b");
      element.className = className;
      parent.appendChild(element);
    }
    element.hidden = count <= 0;
    element.textContent = count > 99 ? "99+" : count ? String(count) : "";
    element.title = count > 0 ? `${title}: ${count}` : "";
  }
  function paint(state) {
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
    if (activeTab) state.counts[activeTab] = 0;
    let total = 0;
    state.box.querySelectorAll(SEL.chatTabButtons).forEach((button) => {
      const count = state.counts[button.dataset.tab] || 0;
      total += count;
      badge(button, "cy-chat-tp", count, "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439");
    });
    const toggle = state.box.querySelector(SEL.chatToggleButton);
    if (toggle) badge(toggle, "cy-chat-pn", state.box.classList.contains("open") ? 0 : total, "\u0423\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439");
  }
  function visibleArchive(state) {
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab;
    const rooms = state.box.closest(".mn") ? ["mine"] : state.box.closest(".co-host, .co-float") ? ["one", "city", "mine"] : ["city"];
    const messages = rooms.flatMap((room) => storedArchive[room] || []);
    return [...new Map(messages.map((item) => [item.id, item])).values()].filter((item) => item.tab === activeTab).sort((a, b) => a.at - b.at);
  }
  function archiveRow(message, room) {
    const row = document.createElement("li");
    row.className = "t7-archive-row ping";
    row.dataset.mid = message.id;
    row.dataset.t7ArchiveRoom = room;
    row.title = message.at ? new Date(message.at).toLocaleTimeString() : "";
    const nick = document.createElement("b");
    nick.dataset.nick = message.login;
    nick.tabIndex = 0;
    nick.textContent = message.name || message.login;
    const text = document.createElement("span");
    text.textContent = message.text;
    row.append(nick, document.createTextNode(" "), text);
    return row;
  }
  function updateArchiveControls(state) {
    const nav = state.box.querySelector(".t7-ping-nav");
    if (!nav) return;
    const messages = visibleArchive(state);
    const pages = Math.ceil(messages.length / PING_PAGE_SIZE);
    state.page = Math.min(state.page, Math.max(0, pages - 1));
    nav.hidden = !pingOnly || pages < 2;
    const older = nav.querySelector('[data-direction="older"]');
    const newer = nav.querySelector('[data-direction="newer"]');
    if (older) older.disabled = state.page >= pages - 1;
    if (newer) newer.disabled = state.page === 0;
  }
  function renderArchivePage(state) {
    const list = state.list;
    if (!list) return;
    const messages = visibleArchive(state);
    const start = Math.max(0, messages.length - (state.page + 1) * PING_PAGE_SIZE);
    const end = messages.length - state.page * PING_PAGE_SIZE;
    const pageMessages = messages.slice(start, end);
    const wanted = new Set(pageMessages.map((message) => message.id));
    chatScroller.keep(list, () => {
      list.querySelectorAll(":scope > li:not(.t7-archive-row)").forEach((row) => {
        const keep = state.page === 0 && (row.classList.contains("ping") || row.classList.contains("t7-ping"));
        row.classList.toggle("t7-ping-hidden", pingOnly && !keep);
      });
      list.querySelectorAll(":scope > .t7-archive-row").forEach((row) => {
        if (!wanted.has(row.dataset.mid)) row.remove();
      });
      if (pingOnly) {
        const present = new Set([...list.querySelectorAll(":scope > li[data-mid]")].map((row) => row.dataset.mid));
        const room = state.box.closest(".mn") ? "mine" : state.box.closest(".co-host, .co-float") ? "one" : "city";
        const missing = pageMessages.filter((message) => !present.has(message.id)).map((message) => archiveRow(message, room));
        if (missing.length) {
          const firstLiveRow = list.querySelector(":scope > li:not(.t7-archive-row)");
          if (firstLiveRow) firstLiveRow.before(...missing);
          else list.append(...missing);
        }
      }
      list.dataset.t7NoPings = String(pingOnly && !pageMessages.length);
    });
    updateArchiveControls(state);
  }
  function ensureControls(state) {
    const header = state.box.querySelector(SEL.chatHeader);
    if (!header) return;
    let filter = header.querySelector(".t7-chat-filter");
    if (!filter) {
      filter = document.createElement("label");
      filter.className = "t7-chat-filter";
      filter.title = "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441 \u0443\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435\u043C";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const text = document.createElement("span");
      text.textContent = "\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u0438\u043D\u0433\u0438";
      filter.append(checkbox, text);
      filter.addEventListener("click", (event) => event.stopPropagation());
      checkbox.addEventListener("change", () => {
        pingOnly = checkbox.checked;
        store.set(PING_ONLY_KEY, pingOnly);
        for (const current2 of states2) {
          const input = current2.box.querySelector(".t7-chat-filter input");
          if (input) input.checked = pingOnly;
          current2.page = 0;
          renderArchivePage(current2);
        }
      });
    }
    filter.querySelector("input").checked = pingOnly;
    const close = header.querySelector(SEL.chatCloseButton);
    if (!filter.isConnected) header.insertBefore(filter, close || null);
    let nav = header.querySelector(".t7-ping-nav");
    if (!nav) {
      nav = document.createElement("span");
      nav.className = "t7-ping-nav";
      for (const [direction, title, symbol] of [
        ["older", "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u0441\u0442\u0430\u0440\u044B\u0435 \u043F\u0438\u043D\u0433\u0438", "\u2039"],
        ["newer", "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u044B\u0435 \u043F\u0438\u043D\u0433\u0438", "\u203A"]
      ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.direction = direction;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.textContent = symbol;
        nav.appendChild(button);
      }
      nav.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-direction]");
        if (!button) return;
        event.stopPropagation();
        state.page = Math.max(0, state.page + (button.dataset.direction === "older" ? 1 : -1));
        renderArchivePage(state);
      });
      header.insertBefore(nav, close || null);
    }
  }
  function addBlacklistMenu(state) {
    const list = state.list;
    if (!list || list.dataset.t7BlacklistMenu) return;
    list.dataset.t7BlacklistMenu = "1";
    list.addEventListener("contextmenu", (event) => {
      const nick = event.target.closest(SEL.nickButton);
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
  function refreshRows(state, notify = false) {
    if (!state.box.isConnected) return;
    const activeTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || "";
    if (state.activeTab !== activeTab) {
      state.activeTab = activeTab;
      state.page = 0;
      notify = false;
    }
    const tabs = state.box.querySelector(SEL.chatTabs);
    if (tabs !== state.tabs) {
      state.tabsObserver?.disconnect();
      state.tabs = tabs;
      if (tabs) {
        state.tabsObserver = new MutationObserver(() => refreshRows(state, false));
        state.tabsObserver.observe(tabs, {
          attributes: true,
          attributeFilter: ["aria-selected"],
          subtree: true
        });
      }
    }
    const list = state.box.querySelector(SEL.chatList);
    if (list !== state.list) {
      state.listObserver?.disconnect();
      state.list = list;
      state.page = 0;
      if (list) {
        chatScroller.register(list);
        addBlacklistMenu(state);
        state.listObserver = new MutationObserver(() => {
          const currentTab = state.box.querySelector(`${SEL.chatTabs} [data-tab][aria-selected="true"]`)?.dataset.tab || "";
          if (currentTab !== state.activeTab) {
            refreshRows(state, false);
            return;
          }
          list.querySelectorAll(":scope > li:not(.t7-archive-row)").forEach((row) => processRow(state, row, true));
          paint(state);
          renderArchivePage(state);
        });
        state.listObserver.observe(list, { childList: true });
      }
    }
    ensureControls(state);
    if (state.list) {
      state.list.querySelectorAll(":scope > li:not(.t7-archive-row)").forEach((row) => processRow(state, row, notify));
      addBlacklistMenu(state);
    }
    paint(state);
    renderArchivePage(state);
  }
  function observeBox(box) {
    if (stateByBox.has(box)) return;
    const state = { box, list: null, listObserver: null, counts: {}, page: 0, seen: /* @__PURE__ */ new Set() };
    stateByBox.set(box, state);
    states2.add(state);
    state.boxObserver = new MutationObserver(() => refreshRows(state, true));
    state.boxObserver.observe(box, { childList: true });
    box.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(`${SEL.chatTabButtons}, ${SEL.chatToggleButton}, ${SEL.chatCloseButton}`)) return;
      queueMicrotask(() => refreshRows(state, false));
    });
    refreshRows(state, false);
  }
  function startDocumentObserver() {
    if (documentObserver2 || !document.documentElement) return;
    documentObserver2 = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const removedBoxes = [];
          if (node.matches(SEL.chatRoot)) removedBoxes.push(node);
          removedBoxes.push(...node.querySelectorAll(SEL.chatRoot));
          for (const box of removedBoxes) {
            const state = stateByBox.get(box);
            if (!state || box.isConnected) continue;
            state.boxObserver.disconnect();
            state.listObserver?.disconnect();
            state.tabsObserver?.disconnect();
            states2.delete(state);
            stateByBox.delete(box);
          }
        }
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches(SEL.chatRoot)) observeBox(node);
          node.querySelectorAll(SEL.chatRoot).forEach(observeBox);
        }
      }
    });
    documentObserver2.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll(SEL.chatRoot).forEach(observeBox);
  }
  pingSystem.subscribe(() => {
    for (const state of states2) refreshRows(state, false);
  });
  function startChatPingIntegration() {
    startDocumentObserver();
  }
  var listStates = /* @__PURE__ */ new WeakMap();
  var states3 = /* @__PURE__ */ new Set();
  var documentObserver3 = null;
  function messageRows(list) {
    return [...list.children].filter((row) => row.tagName === "LI" && !row.matches(".dm-old, .dm-0"));
  }
  function rowKey(row) {
    return `${row.className}|${row.title}|${row.textContent}`;
  }
  function recipientOf(list) {
    const root = list.closest(".dm");
    const name = root && root.querySelector(".dm-who");
    if (name && name.textContent.trim()) return name.textContent.trim();
    const activeTab = root && root.querySelector(".dm-tab.on [data-dmt]");
    return activeTab && activeTab.dataset.dmt || "";
  }
  function updateList(state) {
    const currentRecipient = recipientOf(state.list);
    const rows = messageRows(state.list);
    const keys = rows.map(rowKey);
    if (!state.recipient || currentRecipient !== state.recipient) {
      state.recipient = currentRecipient;
      state.seen = new Set(keys);
      state.lastKey = keys[keys.length - 1] || "";
      return;
    }
    const previousLastIndex = state.lastKey ? keys.lastIndexOf(state.lastKey) : -1;
    const newRows = previousLastIndex < 0 ? [] : rows.slice(previousLastIndex + 1);
    for (const row of newRows) {
      const key = rowKey(row);
      if (state.seen.has(key)) continue;
      state.seen.add(key);
      if (row.classList.contains("me") || !pingSystem.shouldNotifyDm(currentRecipient)) continue;
      pingSystem.playDm().catch((error) => console.warn("[7TV] \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0432\u0443\u043A \u041B\u0421", error));
    }
    for (const key of keys) state.seen.add(key);
    state.lastKey = keys[keys.length - 1] || "";
    if (state.seen.size > 600) state.seen = new Set(keys.slice(-300));
  }
  function observeList(list) {
    if (listStates.has(list)) return;
    const state = {
      list,
      observer: null,
      recipient: "",
      lastKey: "",
      seen: /* @__PURE__ */ new Set()
    };
    state.observer = new MutationObserver(() => updateList(state));
    state.observer.observe(list, { childList: true });
    listStates.set(list, state);
    states3.add(state);
    updateList(state);
  }
  function scan2(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches(".dm-l")) observeList(root);
    root.querySelectorAll(".dm-l").forEach(observeList);
  }
  function startDirectMessageObserver() {
    if (documentObserver3 || !document.documentElement) return;
    documentObserver3 = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          for (const state of states3) {
            if ((node === state.list || node.contains(state.list)) && !state.list.isConnected) {
              state.observer.disconnect();
              states3.delete(state);
              listStates.delete(state.list);
            }
          }
        }
        for (const node of record.addedNodes) scan2(node);
      }
    });
    documentObserver3.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll(".dm-l").forEach(observeList);
  }
  var started2 = false;
  function startSiteChatIntegration() {
    if (started2) return;
    started2 = true;
    setupTabs();
    startChatPingIntegration();
    startDirectMessageObserver();
  }
  var started3 = false;
  function initialize() {
    if (styles_default) {
      const style = document.createElement("style");
      style.textContent = styles_default;
      document.head.appendChild(style);
    }
    const size = store.get(STORE.emoteSize);
    if (SIZES[size]) S.size = size;
    S.nick = pageChan;
    const position2 = store.get(STORE.popupPosition);
    if (position2 && Number.isFinite(position2.x) && Number.isFinite(position2.y)) st.pos = position2;
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
    pingSystem.applyPingColor();
    applyChatFont();
    initEmoteTooltip();
    startChatObservers();
    startSiteChatIntegration();
    ensureButtons();
    scan();
    reload(false);
  }
  function startApp() {
    if (started3) return;
    started3 = true;
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", initialize, { once: true });
    else
      initialize();
  }
  startApp();
})();
