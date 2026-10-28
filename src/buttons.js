import { st } from './state.js';
import { togglePop, closePop } from './popup.js';

// кнопка «7TV» справа от ➤ в форме чата
export function ensureButtons() {
    document.querySelectorAll('form.cy-chat-f').forEach((f) => {
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