import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';
import { fetchImg } from '../emotes/imgcache.js';
import { resolveImageUrl } from './imageProviders.js';

const IMAGE_ID = /^[a-z0-9]{1,32}$/i;
const RECENT_LIMIT = 10;
const FAVORITE_LIMIT = 200;
let activeDialog = null;

export function isImagePickerButtonEnabled() {
    return store.get(STORE.imagePickerButton) === true;
}

export function setImagePickerButtonEnabled(enabled) {
    const visible = !!enabled;
    store.set(STORE.imagePickerButton, visible);
    document.querySelectorAll('.t7-images-btn').forEach((button) => {
        button.hidden = !visible;
    });
}

function readIds(key, limit = FAVORITE_LIMIT) {
    const saved = store.get(key);
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter((id) => typeof id === 'string' && IMAGE_ID.test(id)))].slice(0, limit);
}

function imageId(value) {
    try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        if (!['https:', 'http:'].includes(url.protocol) || !['ibb.co', 'www.ibb.co'].includes(url.hostname))
            return null;
        const id = url.pathname.replace(/^\/|\/$/g, '');
        return IMAGE_ID.test(id) ? id : null;
    } catch {
        return null;
    }
}

function rememberImage(id) {
    const recent = readIds(STORE.imageRecent, RECENT_LIMIT).filter((item) => item !== id);
    store.set(STORE.imageRecent, [id, ...recent].slice(0, RECENT_LIMIT));
}

export function rememberSentImages(text) {
    const value = String(text || '');
    const ids = [];
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?ibb\.co\/([a-z0-9]{1,32})\/?(?=$|[\s?#.,!;:)])/gi;
    const tokenPattern = /\[ref\]\{(?:www_)?ibb_co\/([a-z0-9]{1,32})(?:[?#][^}\s]*)?\}/gi;
    for (const match of value.matchAll(urlPattern)) ids.push(match[1]);
    for (const match of value.matchAll(tokenPattern)) ids.push(match[1]);
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return;
    const recent = readIds(STORE.imageRecent, RECENT_LIMIT);
    store.set(STORE.imageRecent, [...uniqueIds.reverse(), ...recent.filter((id) => !uniqueIds.includes(id))]
        .slice(0, RECENT_LIMIT));
}

function isFavorite(id) {
    return readIds(STORE.imageFavorites).includes(id);
}

function toggleFavorite(id) {
    const favorites = readIds(STORE.imageFavorites);
    store.set(STORE.imageFavorites, favorites.includes(id)
        ? favorites.filter((item) => item !== id)
        : [id, ...favorites].slice(0, FAVORITE_LIMIT));
}

async function loadPreview(id, image, failed) {
    try {
        const imageUrl = await resolveImageUrl(`https://ibb.co/${id}`);
        if (!imageUrl) throw new Error('Не удалось получить ссылку на изображение');
        const src = await fetchImg(imageUrl, true);
        if (image.isConnected) image.src = src;
    } catch (error) {
        if (image.isConnected) failed(error);
    }
}

function createButton(text, className) {
    const button = document.createElement('button');
    button.type = 'button';
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
    const insertion = (before && !/\s$/.test(before) ? ' ' : '') + url + (after && !/^\s/.test(after) ? ' ' : '');
    const value = before + insertion + after;
    if (input.maxLength > 0 && value.length > input.maxLength) return false;
    input.value = value;
    const caret = start + insertion.length;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}

export function disposeImagePicker(form) {
    if (activeDialog && form.contains(activeDialog.input)) activeDialog.close();
}

export function openImagePicker(input) {
    if (!input || input.disabled || !input.isConnected) return;
    if (activeDialog && activeDialog.input === input) {
        activeDialog.close();
        return;
    }
    if (activeDialog) activeDialog.close();

    const overlay = document.createElement('div');
    overlay.className = 't7-paste-overlay t7-image-picker-overlay';
    const dialog = document.createElement('section');
    dialog.className = 't7-paste-dialog t7-image-picker';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Картинки imgBB');

    const header = document.createElement('div');
    header.className = 't7-paste-header';
    const title = document.createElement('strong');
    title.textContent = 'Картинки imgBB';
    const closeButton = createButton('×', 't7-paste-close');
    closeButton.setAttribute('aria-label', 'Закрыть');
    header.append(title, closeButton);

    const urlRow = document.createElement('div');
    urlRow.className = 't7-image-picker-url';
    const uploadLink = document.createElement('a');
    uploadLink.href = 'https://imgbb.com/';
    uploadLink.target = '_blank';
    uploadLink.rel = 'noopener noreferrer';
    uploadLink.title = 'Загрузить изображение на imgBB';
    uploadLink.setAttribute('aria-label', 'Загрузить изображение на imgBB');
    uploadLink.textContent = '↗';
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 't7-image-picker-input';
    urlInput.placeholder = 'https://ibb.co/код';
    urlInput.autocomplete = 'url';
    urlInput.setAttribute('aria-label', 'Ссылка на изображение imgBB');
    urlRow.append(uploadLink, urlInput);

    const preview = document.createElement('div');
    preview.className = 't7-image-picker-preview';
    preview.setAttribute('aria-live', 'polite');
    const previewMessage = document.createElement('span');
    previewMessage.textContent = 'Вставь ссылку imgBB для предпросмотра';
    preview.appendChild(previewMessage);

    const actions = document.createElement('div');
    actions.className = 't7-image-picker-actions';
    const insertButton = createButton('Вставить', 't7-paste-primary');
    const sendButton = createButton('Отправить', 't7-paste-primary');
    const favoritePreviewButton = createButton('☆ В избранное', 't7-paste-secondary t7-image-picker-favorite-preview');
    insertButton.disabled = true;
    sendButton.disabled = true;
    favoritePreviewButton.disabled = true;
    favoritePreviewButton.setAttribute('aria-pressed', 'false');
    actions.append(favoritePreviewButton, insertButton, sendButton);

    const tabs = document.createElement('div');
    tabs.className = 't7-views t7-image-picker-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Библиотека картинок');
    const recentTab = createButton('Последние 10', '');
    recentTab.setAttribute('role', 'tab');
    recentTab.dataset.imagesTab = 'recent';
    recentTab.setAttribute('aria-selected', 'true');
    const favoritesTab = createButton('Избранное', '');
    favoritesTab.setAttribute('role', 'tab');
    favoritesTab.dataset.imagesTab = 'favorites';
    favoritesTab.setAttribute('aria-selected', 'false');
    tabs.append(recentTab, favoritesTab);

    const library = document.createElement('div');
    library.className = 't7-image-library';
    dialog.append(header, urlRow, preview, actions, tabs, library);
    overlay.appendChild(dialog);

    let activeTab = 'recent';
    let selectedId = null;
    let previewToken = 0;
    let closed = false;
    const thumbObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            thumbObserver.unobserve(entry.target);
            loadPreview(entry.target.dataset.imageId, entry.target, (error) => {
                console.warn('[Images] не удалось загрузить изображение из библиотеки', error);
                entry.target.alt = 'Не удалось загрузить';
            });
        }
    }, { root: library, rootMargin: '100px' });

    const close = () => {
        if (closed) return;
        closed = true;
        previewToken++;
        thumbObserver.disconnect();
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown, true);
        if (activeDialog?.close === close) activeDialog = null;
    };
    const onKeyDown = (event) => {
        if (event.key !== 'Escape') return;
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
        favoritePreviewButton.textContent = favorite ? '★ В избранном' : '☆ В избранное';
        favoritePreviewButton.setAttribute('aria-pressed', String(favorite));
        favoritePreviewButton.title = favorite ? 'Убрать из избранного' : 'Добавить в избранное';
    };

    const renderLibrary = () => {
        thumbObserver.disconnect();
        library.replaceChildren();
        const ids = readIds(activeTab === 'recent' ? STORE.imageRecent : STORE.imageFavorites,
            activeTab === 'recent' ? RECENT_LIMIT : FAVORITE_LIMIT);
        if (!ids.length) {
            const empty = document.createElement('div');
            empty.className = 't7-image-picker-empty';
            empty.textContent = activeTab === 'recent'
                ? 'Здесь появятся последние выбранные изображения'
                : 'Избранных изображений пока нет';
            library.appendChild(empty);
            return;
        }
        for (const id of ids) {
            const item = document.createElement('div');
            item.className = 't7-image-library-item';
            const chooseButton = createButton('', 't7-image-library-choose');
            chooseButton.setAttribute('aria-label', `Выбрать изображение ${id}`);
            const image = document.createElement('img');
            image.alt = '';
            image.loading = 'lazy';
            image.dataset.imageId = id;
            const idLabel = document.createElement('span');
            idLabel.textContent = id;
            chooseButton.append(image, idLabel);
            chooseButton.addEventListener('click', () => choose(id));

            const favorite = createButton(isFavorite(id) ? '★' : '☆', 't7-image-library-favorite');
            favorite.title = isFavorite(id) ? 'Убрать из избранного' : 'Добавить в избранное';
            favorite.setAttribute('aria-label', `${favorite.title}: ${id}`);
            favorite.setAttribute('aria-pressed', String(isFavorite(id)));
            favorite.addEventListener('click', () => {
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
        preview.classList.toggle('t7-image-picker-error', !!urlInput.value.trim() && !selectedId);
        preview.replaceChildren();
        if (!selectedId) {
            const message = document.createElement('span');
            message.textContent = urlInput.value.trim()
                ? 'Нужна ссылка вида https://ibb.co/код'
                : 'Вставь ссылку imgBB для предпросмотра';
            preview.appendChild(message);
            return;
        }
        const image = document.createElement('img');
        image.alt = `Предпросмотр изображения ${selectedId}`;
        image.loading = 'eager';
        preview.appendChild(image);
        loadPreview(selectedId, image, (error) => {
            if (token !== previewToken || !image.isConnected) return;
            console.warn('[Images] не удалось загрузить предпросмотр', error);
            const message = document.createElement('span');
            message.textContent = 'Не удалось загрузить предпросмотр';
            preview.replaceChildren(message);
        });
    }

    const updateTabs = () => {
        tabs.querySelectorAll('[data-images-tab]').forEach((tab) => {
            tab.setAttribute('aria-selected', String(tab.dataset.imagesTab === activeTab));
        });
    };
    tabs.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-images-tab]');
        if (!tab) return;
        activeTab = tab.dataset.imagesTab;
        updateTabs();
        renderLibrary();
    });
    urlInput.addEventListener('input', updatePreview);

    const insertSelected = (send) => {
        if (!selectedId || !input.isConnected) return;
        const url = `https://ibb.co/${selectedId}`;
        if (!insertUrl(input, url)) {
            preview.classList.add('t7-image-picker-error');
            preview.textContent = 'Ссылка не помещается в поле сообщения';
            return;
        }
        rememberImage(selectedId);
        const form = input.closest('form');
        close();
        input.focus({ preventScroll: true });
        if (send) form?.requestSubmit();
    };
    insertButton.addEventListener('click', () => insertSelected(false));
    sendButton.addEventListener('click', () => insertSelected(true));
    favoritePreviewButton.addEventListener('click', () => {
        if (!selectedId) return;
        toggleFavorite(selectedId);
        updateFavoritePreviewButton();
        renderLibrary();
    });
    closeButton.addEventListener('click', () => {
        close();
        input.focus({ preventScroll: true });
    });
    overlay.addEventListener('pointerdown', (event) => {
        if (event.target === overlay) close();
    });
    dialog.addEventListener('keydown', (event) => event.stopPropagation());

    document.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);
    renderLibrary();
    urlInput.focus();
}
