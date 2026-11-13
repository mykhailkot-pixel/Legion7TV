import { SIZES, pageChan } from '../core/config.js';
import { S, st } from '../core/state.js';
import { store } from '../core/store.js';
import { parseNick, clamp } from '../core/util.js';
import { reload, setStatus } from '../emotes/emotes.js';
import { rescanAll, applySize } from '../chat/messages/chat.js';
import { clearImgs } from '../emotes/imgcache.js';
import { pingSystem } from '../chat/pingSystem.js';
import { getChatFont, getChatFontSize, getCustomChatFont, setChatFont, setChatFontSize, uploadChatFont, removeCustomChatFont } from '../chat/ui/chatFonts.js';
import { getRecentLimit, setRecentLimit } from '../chat/prefs.js';
import { areImagePreviewsEnabled, isLinkEncodingEnabled, setImagePreviewsEnabled, setLinkEncodingEnabled } from '../chat/messages/links.js';
import { CHAT_TABS, getChatTabPrefs, setChatTabPrefs } from '../chat/prefs.js';
import { STORE } from '../core/consts.js';
import { arePastesEnabled, setPastesEnabled } from '../chat/ui/pastes.js';
import { clearResolvedImageCache } from '../chat/ui/imageProviders.js';
import { isImagePickerButtonEnabled, setImagePickerButtonEnabled } from '../chat/ui/imagePicker.js';
import { getOverlayRoot } from '../core/ui.js';
import { areDeletedMessagesEnabled, setDeletedMessagesEnabled } from '../chat/integration/chatPings.js';

// смещение окна настроек от центра экрана
let SOFF = (() => {
    const p = store.get(STORE.settingsPosition);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
})();

function setupDrag(el) {
    const win = el.querySelector('.t7-sw');
    const hd = el.querySelector('.t7-sth');
    const put = () => { win.style.transform = (SOFF.x || SOFF.y) ? `translate(${SOFF.x}px, ${SOFF.y}px)` : ''; };

    // если экран стал меньше, чем при прошлом открытии, возвращаем окно в видимую область
    put();
    const r0 = win.getBoundingClientRect();
    let fx = 0, fy = 0;
    if (r0.left < 8) fx = 8 - r0.left; else if (r0.right > innerWidth - 8) fx = innerWidth - 8 - r0.right;
    if (r0.top < 8) fy = 8 - r0.top; else if (r0.bottom > innerHeight - 8) fy = innerHeight - 8 - r0.bottom;
    if (fx || fy) { SOFF = { x: SOFF.x + fx, y: SOFF.y + fy }; put(); }

    hd.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.button !== 0 || !e.isPrimary) return;   // кнопка × остаётся кнопкой
        const r = win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, pid = e.pointerId, ox = SOFF.x, oy = SOFF.y;
        let started = false, nx = ox, ny = oy, raf = 0;
        const apply = () => { raf = 0; SOFF = { x: nx, y: ny }; put(); };
        const move = (ev) => {
            if (ev.pointerId !== pid) return;
            if (ev.pointerType === 'mouse' && !(ev.buttons & 1)) { up(); return; }
            if (!started) {
                if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
                started = true;
                win.classList.add('t7-drag');
                try { hd.setPointerCapture(pid); } catch {}
            }
            nx = ox + clamp(ev.clientX - sx, 8 - r.left, innerWidth - r.width - 8 - r.left);
            ny = oy + clamp(ev.clientY - sy, 8 - r.top, innerHeight - r.height - 8 - r.top);
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const up = () => {
            removeEventListener('pointermove', move);
            removeEventListener('pointerup', up);
            removeEventListener('pointercancel', up);
            removeEventListener('blur', up);
            if (raf) cancelAnimationFrame(raf);
            if (!started) return;
            win.classList.remove('t7-drag');
            SOFF = { x: nx, y: ny };
            put();
            store.set(STORE.settingsPosition, SOFF);
        };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
        addEventListener('pointercancel', up);
        addEventListener('blur', up);
    });

    hd.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        SOFF = { x: 0, y: 0 };
        store.set(STORE.settingsPosition, null);
        put();
    });
}

export function updateSetStatus(t) {
    const e = st.set && st.set.querySelector('.t7-sst');
    if (e) e.textContent = t;
}

function createNode(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        if (name === 'className') node.className = value;
        else if (name in node && !name.startsWith('aria-') && !name.startsWith('data-')) node[name] = value;
        else node.setAttribute(name, value);
    }
    for (const child of children) {
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
}

function settingsSection(title, ...children) {
    return createNode('details', { className: 't7-sec', open: true }, [
        createNode('summary', {}, [title]),
        ...children
    ]);
}

function settingsField(title, control, className = 't7-fl') {
    return createNode('label', { className }, [title, control]);
}

function settingsToggle(className, title) {
    return createNode('label', { className: 't7-chk t7-toggle-switch' }, [
        createNode('input', { type: 'checkbox', className }),
        createNode('span', { className: 't7-toggle-track', 'aria-hidden': 'true' }),
        title
    ]);
}

function settingsButton(title, action) {
    return createNode('button', { type: 'button', className: 't7-b', 'data-act': action }, [title]);
}

function buildSettingsMarkup(root) {
    const dialog = createNode('div', {
        className: 't7-sw',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Настройки 7TV'
    });
    const header = createNode('div', { className: 't7-sth' }, [
        createNode('b', {}, ['Настройки 7TV']),
        createNode('button', { type: 'button', className: 't7-x', 'aria-label': 'Закрыть' }, ['×'])
    ]);
    const tabs = createNode('div', {
        className: 't7-settings-tabs',
        role: 'tablist',
        'aria-label': 'Разделы настроек'
    });
    const tabNames = [['emotes', 'Эмоуты'], ['chat', 'Чат'], ['pings', 'Пинги'], ['data', 'Данные']];
    for (const [id, title] of tabNames) {
        tabs.appendChild(createNode('button', {
            type: 'button',
            id: `t7-settings-tab-${id}`,
            role: 'tab',
            'aria-selected': String(id === 'emotes'),
            'aria-controls': `t7-settings-panel-${id}`,
            tabindex: id === 'emotes' ? '0' : '-1'
        }, [title]));
    }

    const panel = (id) => createNode('div', {
        className: 't7-setting-panel',
        id: `t7-settings-panel-${id}`,
        role: 'tabpanel',
        'aria-labelledby': `t7-settings-tab-${id}`,
        tabindex: '0',
        hidden: id !== 'emotes'
    });

    const emotesPanel = panel('emotes');
    emotesPanel.append(
        settingsSection('Отображение',
            settingsToggle('t7-on', 'Показывать эмоуты 7TV в чате'),
            settingsToggle('t7-emote-completion', 'Показывать карусель эмоутов по Tab')
        ),
        settingsSection('Канал',
            createNode('form', { className: 't7-row' }, [
                settingsField('Ник стримера на Twitch', createNode('input', {
                    type: 'text', className: 't7-nick', maxlength: '80',
                    autocomplete: 'off', spellcheck: false
                })),
                createNode('button', { type: 'submit', className: 't7-b p' }, ['Загрузить'])
            ]),
            createNode('div', { className: 't7-sst', role: 'status' })
        ),
        settingsSection('Размер в чате',
            createNode('div', { className: 't7-szb' }, Object.keys(SIZES).map((size) =>
                createNode('button', {
                    type: 'button', 'data-sz': size, 'aria-pressed': 'false'
                }, [SIZES[size].label])
            ))
        ),
        settingsSection('Недавние эмоуты',
            settingsField('Количество эмоутов в списке', createNode('input', {
                className: 't7-recent-limit', type: 'number', min: '1', max: '100',
                step: '1', inputmode: 'numeric'
            }))
        )
    );

    const chatPanel = panel('chat');
    chatPanel.append(
        settingsSection('Вкладки чата', createNode('div', { className: 't7-chat-tab-list' })),
        settingsSection('Кнопки в чате',
            settingsToggle('t7-pastes-enabled', 'Показывать кнопку паст в чате'),
            settingsToggle('t7-image-picker-enabled', 'Показывать кнопку imgBB в чате')
        ),
        settingsSection('Удалённые сообщения',
            settingsToggle('t7-deleted-messages-enabled', 'Сохранять удалённые сообщения в чате')
        ),
        settingsSection('Ссылки',
            settingsToggle('t7-link-encoding', 'Обрабатывать ссылки при отправке и отображении'),
            settingsToggle('t7-image-previews', 'Показывать изображения по ссылкам (imgbb; в ЛС не отправляем)'),
            createNode('div', { className: 't7-note', role: 'note' }, [
                createNode('span', { className: 't7-note-icon', 'aria-hidden': 'true' }, ['!']),
                createNode('span', {}, ['Используйте на свой страх и риск.'])
            ])
        ),
        settingsSection('Шрифт',
            settingsField('Гарнитура', createNode('select', { className: 't7-chat-font' }, [
                ['site', 'Как на сайте'], ['nunito', 'Nunito'], ['open-sans', 'Open Sans'],
                ['roboto', 'Roboto'], ['lato', 'Lato'], ['montserrat', 'Montserrat'],
                ['custom', 'Свой шрифт…']
            ].map(([value, title]) => createNode('option', { value }, [title]))), 't7-fl t7-chat-font-control'),
            createNode('label', { className: 't7-fl t7-chat-font-size-control' }, [
                'Размер текста',
                createNode('input', {
                    type: 'range', className: 't7-chat-font-size', min: '11', max: '22', step: '1'
                }),
                createNode('output', { className: 't7-chat-font-size-value' })
            ]),
            createNode('div', { className: 't7-row t7-wrap t7-chat-font-actions' }, [
                settingsButton('Загрузить файл шрифта', 'chat-font'),
                settingsButton('Удалить свой шрифт', 'chat-font-reset'),
                createNode('input', {
                    type: 'file', className: 't7-chat-font-file',
                    accept: '.woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf',
                    hidden: true
                })
            ]),
            createNode('div', { className: 't7-ping-status t7-chat-font-status', role: 'status' })
        )
    );

    const pingsPanel = panel('pings');
    const pingPreset = createNode('select', { className: 't7-ping-preset' }, [
        ['bell', 'Колокольчик'], ['chime', 'Звон'], ['pop', 'Короткий сигнал'], ['custom', 'Свой звук']
    ].map(([value, title]) => createNode('option', { value }, [title])));
    const dmPreset = createNode('select', { className: 't7-dm-ping-preset' }, [
        ['bell', 'Колокольчик'], ['chime', 'Звон'], ['pop', 'Короткий сигнал'], ['custom', 'Свой звук для ЛС']
    ].map(([value, title]) => createNode('option', { value }, [title])));
    pingsPanel.append(
        settingsSection('Звуки уведомлений',
            settingsToggle('t7-ping-sound-enabled', 'Звук пингов в общем чате'),
            settingsToggle('t7-dm-sound-enabled', 'Звук новых сообщений в ЛС')
        ),
        settingsSection('Упоминания и фильтры',
            settingsToggle('t7-tab-completion', 'Дополнять ник по Tab'),
            settingsField('Ники и варианты для пинга', createNode('textarea', {
                className: 't7-ping-aliases', rows: '2', placeholder: 'ник, nick, @ник'
            })),
            settingsField('Цвет упоминаний (@ник)', createNode('input', {
                type: 'color', className: 't7-ping-color'
            }), 't7-fl t7-ping-color-control'),
            settingsField('Черный список ников', createNode('textarea', {
                className: 't7-ping-blacklist', rows: '2', placeholder: 'по одному нику на строку'
            })),
            settingsField('Игнорировать сообщения со словами или фразами', createNode('textarea', {
                className: 't7-ping-stopwords', rows: '2', placeholder: 'по одному слову или фразе на строку'
            })),
            settingsField('Звук пинга', pingPreset),
            createNode('label', { className: 't7-fl t7-volume' }, [
                'Громкость',
                createNode('input', {
                    className: 't7-ping-volume', type: 'range', min: '0', max: '1', step: '0.05'
                }),
                createNode('output', { className: 't7-volume-value' })
            ]),
            createNode('div', { className: 't7-row t7-wrap' }, [
                settingsButton('Загрузить свой звук', 'custom-sound'),
                settingsButton('Проверить звук', 'test-ping'),
                createNode('input', { type: 'file', className: 't7-ping-file', accept: 'audio/*', hidden: true })
            ]),
            createNode('div', { className: 't7-ping-status', role: 'status' })
        ),
        settingsSection('Личные сообщения',
            settingsField('Звук личных сообщений', dmPreset),
            createNode('label', { className: 't7-fl t7-volume' }, [
                'Громкость звука ЛС',
                createNode('input', {
                    className: 't7-dm-volume', type: 'range', min: '0', max: '1', step: '0.05'
                }),
                createNode('output', { className: 't7-dm-volume-value' })
            ]),
            createNode('div', { className: 't7-row t7-wrap' }, [
                settingsButton('Загрузить звук для ЛС', 'custom-dm-sound'),
                settingsButton('Проверить звук ЛС', 'test-dm-ping'),
                createNode('input', { type: 'file', className: 't7-dm-ping-file', accept: 'audio/*', hidden: true })
            ]),
            settingsField('Ники для звуковых уведомлений', createNode('textarea', {
                className: 't7-dm-nick-list', rows: '2', placeholder: 'по одному нику на строку'
            })),
            createNode('div', { className: 't7-dm-nick-mode' }, [
                createNode('span', { className: 't7-dm-nick-mode-label' }, ['Чёрный список']),
                createNode('label', { className: 't7-toggle-switch' }, [
                    createNode('input', {
                        type: 'checkbox', className: 't7-dm-nick-whitelist',
                        role: 'switch', 'aria-label': 'Белый список'
                    }),
                    createNode('span', { className: 't7-toggle-track', 'aria-hidden': 'true' })
                ]),
                createNode('span', { className: 't7-dm-nick-mode-label' }, ['Белый список'])
            ]),
            createNode('div', { className: 't7-ping-status t7-dm-ping-status', role: 'status' }),
            createNode('div', { className: 't7-note' }, [
                'В чёрном режиме список исключает ники; в белом — разрешает сигналы только для них.'
            ])
        )
    );

    const dataPanel = panel('data');
    dataPanel.append(settingsSection('Управление данными',
        createNode('div', { className: 't7-row t7-wrap' }, [
            settingsButton('Обновить список', 'refresh'),
            settingsButton('Очистить кеш картинок', 'cache'),
            settingsButton('Сбросить положение окошка', 'pos')
        ])
    ));

    dialog.append(header, tabs, emotesPanel, chatPanel, pingsPanel, dataPanel);
    root.appendChild(dialog);
}

function onKey(e) {
    if (e.key === 'Escape' && st.set) {
        e.stopPropagation();
        closeSettings();
    }
}

export function closeSettings() {
    if (!st.set) return;
    st.set.remove();
    st.set = null;
    document.removeEventListener('keydown', onKey, true);
}

export function openSettings() {
    if (st.set) return;
    const el = document.createElement('div');
    st.set = el;
    el.className = 't7-set';
    buildSettingsMarkup(el);
    // игра не должна ловить клавиши, пока печатаем в настройках
    ['keydown', 'keyup', 'keypress'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener('pointerdown', (e) => { if (e.target === el) closeSettings(); });

    el.querySelector('.t7-x').addEventListener('click', closeSettings);

    const settingsTabs = el.querySelector('.t7-settings-tabs');
    const activateSettingsTab = (tab) => {
        settingsTabs.querySelectorAll('[role="tab"]').forEach((item) => {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
            el.querySelector(`#${item.getAttribute('aria-controls')}`).hidden = !selected;
        });
    };
    settingsTabs.addEventListener('click', (event) => {
        const tab = event.target.closest('[role="tab"]');
        if (tab) activateSettingsTab(tab);
    });
    settingsTabs.addEventListener('keydown', (event) => {
        const tabs = [...settingsTabs.querySelectorAll('[role="tab"]')];
        const index = tabs.indexOf(event.target);
        if (index < 0) return;
        const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
            : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
                : event.key === 'Home' ? 0
                    : event.key === 'End' ? tabs.length - 1
                        : -1;
        if (nextIndex < 0) return;
        event.preventDefault();
        activateSettingsTab(tabs[nextIndex]);
        tabs[nextIndex].focus();
    });

    const on = el.querySelector('.t7-on');
    on.checked = S.on;
    on.addEventListener('change', () => {
        S.on = on.checked;
        store.set(STORE.emotesEnabled, S.on);
        rescanAll();
    });

    const pastesEnabled = el.querySelector('.t7-pastes-enabled');
    pastesEnabled.checked = arePastesEnabled();
    pastesEnabled.addEventListener('change', () => setPastesEnabled(pastesEnabled.checked));

    const imagePickerEnabled = el.querySelector('.t7-image-picker-enabled');
    imagePickerEnabled.checked = isImagePickerButtonEnabled();
    imagePickerEnabled.addEventListener('change', () => {
        setImagePickerButtonEnabled(imagePickerEnabled.checked);
    });
    const deletedMessagesEnabled = el.querySelector('.t7-deleted-messages-enabled');
    deletedMessagesEnabled.checked = areDeletedMessagesEnabled();
    deletedMessagesEnabled.addEventListener('change', () =>
        setDeletedMessagesEnabled(deletedMessagesEnabled.checked));

    const nickInp = el.querySelector('.t7-nick');
    nickInp.value = S.nick;
    nickInp.placeholder = pageChan || 'например, zakvielchannel';
    el.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = nickInp.value.trim();
        const n = raw ? parseNick(raw) : pageChan;
        if (raw && !n) { setStatus('Неверный ник: нужны латинские буквы, цифры и _'); return; }
        S.nick = n;
        nickInp.value = n;
        reload(false);
    });

    const pingFields = [
        ['.t7-ping-aliases', 'aliases'],
        ['.t7-ping-blacklist', 'blacklist'],
        ['.t7-ping-stopwords', 'stopWords']
    ];
    for (const [selector, key] of pingFields) {
        const input = el.querySelector(selector);
        input.value = pingSystem.config[key].join('\n');
        input.addEventListener('change', () => pingSystem.setList(key, input.value));
    }
    const tabCompletion = el.querySelector('.t7-tab-completion');
    tabCompletion.checked = pingSystem.config.tabCompletion;
    tabCompletion.addEventListener('change', () => pingSystem.setTabCompletion(tabCompletion.checked));
    const emoteCompletion = el.querySelector('.t7-emote-completion');
    emoteCompletion.checked = pingSystem.config.emoteCompletion;
    emoteCompletion.addEventListener('change', () => pingSystem.setEmoteCompletion(emoteCompletion.checked));
    const pingSoundEnabled = el.querySelector('.t7-ping-sound-enabled');
    pingSoundEnabled.checked = pingSystem.config.pingSoundEnabled;
    pingSoundEnabled.addEventListener('change', () =>
        pingSystem.setPingSoundEnabled(pingSoundEnabled.checked));
    const pingColor = el.querySelector('.t7-ping-color');
    pingColor.value = pingSystem.config.pingColor;
    pingColor.addEventListener('input', () => pingSystem.setPingColor(pingColor.value));
    const preset = el.querySelector('.t7-ping-preset');
    const customOption = preset.querySelector('option[value="custom"]');
    customOption.disabled = !pingSystem.config.customSound;
    preset.value = pingSystem.config.selectedPreset;
    preset.addEventListener('change', () => pingSystem.setPreset(preset.value));
    const volume = el.querySelector('.t7-ping-volume');
    const volumeValue = el.querySelector('.t7-volume-value');
    volume.value = String(pingSystem.config.volume);
    volumeValue.value = Math.round(pingSystem.config.volume * 100) + '%';
    volume.addEventListener('input', () => {
        pingSystem.setVolume(volume.value);
        volumeValue.value = Math.round(pingSystem.config.volume * 100) + '%';
    });
    const dmVolume = el.querySelector('.t7-dm-volume');
    const dmVolumeValue = el.querySelector('.t7-dm-volume-value');
    dmVolume.value = String(pingSystem.config.dmVolume);
    dmVolumeValue.value = Math.round(pingSystem.config.dmVolume * 100) + '%';
    dmVolume.addEventListener('input', () => {
        pingSystem.setDmVolume(dmVolume.value);
        dmVolumeValue.value = Math.round(pingSystem.config.dmVolume * 100) + '%';
    });
    const pingStatus = el.querySelector('.t7-ping-status');
    const pingFile = el.querySelector('.t7-ping-file');
    pingFile.addEventListener('change', async () => {
        try {
            await pingSystem.saveCustomSound(pingFile.files[0]);
            customOption.disabled = false;
            preset.value = pingSystem.config.selectedPreset;
            pingStatus.textContent = 'Свой звук сохранен';
        } catch (error) {
            pingStatus.textContent = error.message;
        }
        pingFile.value = '';
    });
    const dmSoundEnabled = el.querySelector('.t7-dm-sound-enabled');
    dmSoundEnabled.checked = pingSystem.config.dmSoundEnabled;
    dmSoundEnabled.addEventListener('change', () => pingSystem.setDmSoundEnabled(dmSoundEnabled.checked));
    const dmPreset = el.querySelector('.t7-dm-ping-preset');
    dmPreset.value = pingSystem.config.dmSelectedPreset;
    const dmPingFile = el.querySelector('.t7-dm-ping-file');
    const dmPingStatus = el.querySelector('.t7-dm-ping-status');
    dmPreset.addEventListener('change', () => {
        if (dmPreset.value === 'custom' && !pingSystem.config.dmCustomSound) {
            dmPreset.value = pingSystem.config.dmSelectedPreset;
            dmPingFile.click();
            return;
        }
        pingSystem.setDmPreset(dmPreset.value);
        dmPreset.value = pingSystem.config.dmSelectedPreset;
    });
    const dmNickList = el.querySelector('.t7-dm-nick-list');
    dmNickList.value = pingSystem.config.dmNickList.join('\n');
    dmNickList.addEventListener('change', () => pingSystem.setList('dmNickList', dmNickList.value));
    const dmNickWhitelist = el.querySelector('.t7-dm-nick-whitelist');
    const dmNickMode = dmNickWhitelist.closest('.t7-dm-nick-mode');
    dmNickWhitelist.checked = pingSystem.config.dmNickWhitelist;
    const renderDmNickMode = () => {
        dmNickMode.classList.toggle('is-whitelist', dmNickWhitelist.checked);
    };
    dmNickWhitelist.addEventListener('change', () => {
        pingSystem.setDmNickWhitelist(dmNickWhitelist.checked);
        renderDmNickMode();
    });
    renderDmNickMode();
    dmPingFile.addEventListener('change', async () => {
        try {
            await pingSystem.saveCustomDmSound(dmPingFile.files[0]);
            dmPreset.value = pingSystem.config.dmSelectedPreset;
            dmPingStatus.textContent = 'Свой звук для ЛС сохранён';
        } catch (error) {
            dmPingStatus.textContent = error.message;
        }
        dmPingFile.value = '';
    });

    const chatFont = el.querySelector('.t7-chat-font');
    const chatFontFile = el.querySelector('.t7-chat-font-file');
    const chatFontStatus = el.querySelector('.t7-chat-font-status');
    const chatFontSize = el.querySelector('.t7-chat-font-size');
    const chatFontSizeValue = el.querySelector('.t7-chat-font-size-value');
    const customChatFont = getCustomChatFont();
    chatFont.value = getChatFont();
    chatFontSize.value = String(getChatFontSize());
    chatFontSizeValue.value = chatFontSize.value + ' px';
    chatFontSize.addEventListener('input', () => {
        const size = setChatFontSize(chatFontSize.value);
        chatFontSize.value = String(size);
        chatFontSizeValue.value = size + ' px';
        applySize();
    });
    el.querySelector('[data-act="chat-font-reset"]').disabled = !customChatFont;
    chatFontStatus.textContent = customChatFont ? `Загружен: ${customChatFont.name}` : '';
    chatFont.addEventListener('change', async () => {
        if (chatFont.value === 'custom' && !getCustomChatFont()) {
            chatFontFile.click();
            return;
        }
        if (await setChatFont(chatFont.value)) {
            const font = getCustomChatFont();
            chatFontStatus.textContent = chatFont.value === 'custom' && font ? `Загружен: ${font.name}` : '';
        } else {
            chatFont.value = getChatFont();
            chatFontStatus.textContent = 'Сначала загрузите свой шрифт';
        }
    });
    chatFontFile.addEventListener('change', async () => {
        try {
            const name = await uploadChatFont(chatFontFile.files[0]);
            chatFont.value = 'custom';
            el.querySelector('[data-act="chat-font-reset"]').disabled = false;
            chatFontStatus.textContent = `Загружен: ${name}`;
        } catch (error) {
            chatFont.value = getChatFont();
            chatFontStatus.textContent = error.message;
        }
        chatFontFile.value = '';
    });
    chatFontFile.addEventListener('cancel', () => { chatFont.value = getChatFont(); });

    const mark = () => el.querySelectorAll('[data-sz]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sz === S.size)));
    mark();
    el.querySelector('.t7-szb').addEventListener('click', (e) => {
        const b = e.target.closest('[data-sz]');
        if (!b || b.dataset.sz === S.size) return;
        S.size = b.dataset.sz;
        store.set(STORE.emoteSize, S.size);
        applySize();
        mark();
        rescanAll();
    });

    const recentLimit = el.querySelector('.t7-recent-limit');
    recentLimit.value = String(getRecentLimit());
    recentLimit.addEventListener('change', () => {
        recentLimit.value = String(setRecentLimit(recentLimit.value));
    });

    const chatTabList = el.querySelector('.t7-chat-tab-list');
    const renderChatTabPrefs = () => {
        const prefs = getChatTabPrefs();
        const visibleCount = prefs.order.filter((id) => !prefs.hidden.has(id)).length;
        chatTabList.replaceChildren(...prefs.order.map((id, index) => {
            const tab = CHAT_TABS.find((item) => item.id === id);
            const row = document.createElement('div');
            row.className = 't7-chat-tab-row';
            const name = createNode('span', { className: 't7-chat-tab-name' }, [tab.label]);
            const visibility = createNode('label', { className: 't7-chat-tab-visible t7-toggle-switch' }, [
                createNode('input', {
                    type: 'checkbox',
                    'data-tab-visible': id,
                    checked: !prefs.hidden.has(id),
                    disabled: !prefs.hidden.has(id) && visibleCount === 1
                }),
                createNode('span', { className: 't7-toggle-track', 'aria-hidden': 'true' }),
                createNode('span', {}, ['Показать'])
            ]);
            const move = createNode('span', { className: 't7-chat-tab-move' }, [
                createNode('button', {
                    type: 'button', 'data-tab-move': 'up', 'data-tab-id': id,
                    'aria-label': `Переместить ${tab.label} выше`, title: 'Переместить выше',
                    disabled: index === 0
                }, ['↑']),
                createNode('button', {
                    type: 'button', 'data-tab-move': 'down', 'data-tab-id': id,
                    'aria-label': `Переместить ${tab.label} ниже`, title: 'Переместить ниже',
                    disabled: index === prefs.order.length - 1
                }, ['↓'])
            ]);
            row.append(name, visibility, move);
            return row;
        }));
    };
    chatTabList.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[data-tab-visible]');
        if (!checkbox) return;
        const prefs = getChatTabPrefs();
        if (checkbox.checked) prefs.hidden.delete(checkbox.dataset.tabVisible);
        else prefs.hidden.add(checkbox.dataset.tabVisible);
        setChatTabPrefs(prefs);
        renderChatTabPrefs();
    });
    chatTabList.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-tab-move]');
        if (!button || button.disabled) return;
        const prefs = getChatTabPrefs();
        const index = prefs.order.indexOf(button.dataset.tabId);
        const nextIndex = index + (button.dataset.tabMove === 'up' ? -1 : 1);
        if (index < 0 || nextIndex < 0 || nextIndex >= prefs.order.length) return;
        [prefs.order[index], prefs.order[nextIndex]] = [prefs.order[nextIndex], prefs.order[index]];
        setChatTabPrefs(prefs);
        renderChatTabPrefs();
    });
    renderChatTabPrefs();

    const linkEncoding = el.querySelector('.t7-link-encoding');
    linkEncoding.checked = isLinkEncodingEnabled();
    linkEncoding.addEventListener('change', () => {
        setLinkEncodingEnabled(linkEncoding.checked);
        rescanAll();
    });
    const imagePreviews = el.querySelector('.t7-image-previews');
    imagePreviews.checked = areImagePreviewsEnabled();
    imagePreviews.addEventListener('change', () => {
        setImagePreviewsEnabled(imagePreviews.checked);
        rescanAll();
    });

    el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'custom-sound') {
            pingFile.click();
        }
        else if (b.dataset.act === 'custom-dm-sound') {
            dmPingFile.click();
        }
        else if (b.dataset.act === 'chat-font') chatFontFile.click();
        else if (b.dataset.act === 'chat-font-reset') {
            await removeCustomChatFont();
            chatFont.value = getChatFont();
            b.disabled = true;
            chatFontStatus.textContent = 'Свой шрифт удалён';
        }
        else if (b.dataset.act === 'test-ping') {
            pingSystem.play(true).catch((error) => console.warn('[7TV] не удалось воспроизвести звук пинга', error));
        } else if (b.dataset.act === 'test-dm-ping') {
            pingSystem.playDm(true).catch((error) => console.warn('[7TV] не удалось воспроизвести звук ЛС', error));
        }
        else if (b.dataset.act === 'refresh') reload(true);
        else if (b.dataset.act === 'cache') {
            clearResolvedImageCache();
            await clearImgs();
            setStatus('Кеш картинок очищен');
            st.hooks.emotes();   // перерисовать чат и список (картинки скачаются заново)
        } else if (b.dataset.act === 'pos') {
            st.pos = null;
            st.win = null;
            store.set(STORE.popupPosition, null);
            store.set(STORE.popupSize, null);
            st.hooks.place();
            SOFF = { x: 0, y: 0 };
            store.set(STORE.settingsPosition, null);
            el.querySelector('.t7-sw').style.transform = '';
            setStatus('Положение окошка сброшено');
        }
    });

    getOverlayRoot().appendChild(el);
    const px = el.querySelector('.t7-px'), pxs = el.querySelector('.t7-pxs');
    setupDrag(el);
    updateSetStatus(st.status);
    document.addEventListener('keydown', onKey, true);
}