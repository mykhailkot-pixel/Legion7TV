import { st } from './state.js';
import { togglePop, closePop, recordRecentFromMessage } from './popup.js';

// кнопка «7TV» справа от ➤ в форме чата
export function ensureButtons() {
    document.querySelectorAll('form.cy-chat-f').forEach((f) => {
        const input = f.querySelector('input[type=text]');
        if (input && !f.dataset.t7RecentBound) {
            f.dataset.t7RecentBound = '1';
            const record = () => recordRecentFromMessage(input.value);
            f.addEventListener('submit', record, true);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !e.isComposing && e.keyCode !== 229)
                    record();
            }, true);
        }
        if (f.querySelector('.t7-btn')) return;
        const b = document.createElement('button');
        b.type = 'button';       // не отправляет сообщение
        b.className = 't7-btn';
        b.textContent = '7TV';
        b.title = 'Эмоуты 7TV';
        b.setAttribute('aria-label', 'Эмоуты 7TV');
        b.setAttribute('aria-haspopup', 'dialog');
        b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); togglePop(b); });
        const sub = f.querySelector('button[type=submit]');
        if (sub) sub.after(b); else f.appendChild(b);
    });
    if (st.pop && st.anchor && !st.anchor.isConnected) closePop();
}