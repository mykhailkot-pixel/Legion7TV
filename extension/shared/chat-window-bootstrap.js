if (new URL(location.href).searchParams.get('l7tv_chat_window') === '1') {
    const stylesheet = new CSSStyleSheet();
    stylesheet.replaceSync(`
        html, body {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            overflow: clip !important;
        }
        html {
            background: #121018 !important;
        }
        body {
            visibility: hidden !important;
        }
        body .cy-chat {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            left: 0 !important;
            box-sizing: border-box !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            overflow: clip !important;
            overflow-anchor: none !important;
            margin: 0 !important;
            z-index: 2147483640 !important;
            visibility: visible !important;
        }
        body .cy-chat,
        body .cy-chat-b:not([hidden]),
        body .cy-chat-h {
            transform: none !important;
        }
        body .cy-chat-b:not([hidden]) {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            left: 0 !important;
            box-sizing: border-box !important;
            width: auto !important;
            height: 100% !important;
            overflow: clip !important;
            overflow-anchor: none !important;
            max-width: none !important;
            max-height: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
        }
        body .cy-chat-h {
            position: sticky !important;
            top: 0 !important;
            z-index: 1 !important;
            flex-shrink: 0 !important;
            min-height: 28px !important;
            margin-top: 0 !important;
        }
        body .cy-chat-tabs:not([hidden]) {
            flex-shrink: 0 !important;
            min-height: 28px !important;
        }
        body .cy-chat-tabs > button[data-tab] {
            box-sizing: border-box !important;
            height: 28px !important;
            min-height: 28px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-right: 3px !important;
            padding-left: 3px !important;
        }
    `);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];
}
