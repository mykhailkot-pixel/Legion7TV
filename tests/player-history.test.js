import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emit, EV, STORE } from '../src/core/consts.js';
import { configureExtensionStore, store } from '../src/core/store.js';

const mocks = vi.hoisted(() => ({ overlayRoot: null }));
vi.mock('../src/core/ui.js', () => ({
    cls: (name) => `t7-${name}`,
    getOverlayRoot: () => mocks.overlayRoot
}));

import { startPlayerHistory } from '../src/chat/integration/playerHistory.js';

function makeRow({ id, login, name, text, time }) {
    const row = document.createElement('li');
    row.dataset.mid = id;
    row.title = time;
    const characterClass = document.createElement('i');
    characterClass.className = 'cy-cls';
    characterClass.setAttribute('aria-label', 'Маг');
    const guild = document.createElement('i');
    guild.className = 'cy-gt';
    guild.textContent = '[TEST]';
    const nick = document.createElement('b');
    nick.dataset.nick = login;
    nick.textContent = name;
    const content = document.createElement('span');
    content.textContent = text;
    row.append(characterClass, guild, nick, content);
    return row;
}

describe('player message history windows', () => {
    beforeEach(() => {
        document.body.replaceChildren();
        mocks.overlayRoot = document.createElement('div');
        mocks.overlayRoot.replaceChildren();
        configureExtensionStore({ [STORE.playerHistoryButtonEnabled]: true }, vi.fn());
    });

    it('shows the four tab histories and opens independent collapsible windows', async () => {
        const box = document.createElement('section');
        box.className = 'cy-chat';
        const tabs = document.createElement('div');
        tabs.className = 'cy-chat-tabs';
        const general = document.createElement('button');
        general.dataset.tab = 'g';
        general.setAttribute('aria-selected', 'true');
        const guild = document.createElement('button');
        guild.dataset.tab = 'gl';
        guild.setAttribute('aria-selected', 'false');
        tabs.append(general, guild);
        const list = document.createElement('ol');
        list.className = 'cy-chat-l';
        const firstMessage = makeRow({
            id: '1',
            login: 'player',
            name: 'player',
            text: 'Привет',
            time: '12:34'
        });
        list.append(firstMessage);
        box.append(tabs, list);
        document.body.append(box);

        startPlayerHistory();

        const trigger = firstMessage.querySelector('.t7-player-history-trigger');
        expect(trigger).not.toBeNull();
        expect(firstMessage.firstChild).toBe(trigger);
        trigger.click();

        const firstWindow = mocks.overlayRoot.querySelector('.t7-player-history-window');
        expect(firstWindow.querySelector('.t7-player-history-title').textContent)
            .toBe('Класс: Маг · Гильдия: [TEST] · Player');
        expect([...firstWindow.querySelectorAll('[role=tab]')].map((button) => button.textContent))
            .toEqual(['Общее', 'Ремёсла', 'Гильдия', 'Торговля']);
        expect(firstWindow.querySelector('.t7-player-history-log').textContent)
            .toBe('12:34:00 Player: Привет');

        guild.setAttribute('aria-selected', 'true');
        general.setAttribute('aria-selected', 'false');
        list.replaceChildren(makeRow({
            id: '2',
            login: 'player',
            name: 'Player',
            text: 'В гильдии',
            time: '12:35'
        }));
        await new Promise((resolve) => setTimeout(resolve, 0));
        firstWindow.querySelector('[role=tab][data-tab=gl]').click();
        expect(firstWindow.querySelector('.t7-player-history-log').textContent)
            .toBe('12:35:00 Player: В гильдии');

        list.firstElementChild.querySelector('.t7-player-history-trigger').click();
        expect(mocks.overlayRoot.querySelectorAll('.t7-player-history-window')).toHaveLength(2);
        firstWindow.querySelector('[aria-label="Свернуть окно"]').click();
        expect(firstWindow.querySelector('.t7-player-history-body').hidden).toBe(true);

        store.set(STORE.playerHistoryButtonEnabled, false);
        emit(EV.playerHistoryButtonChange);
        expect(list.querySelector('.t7-player-history-trigger')).toBeNull();

        store.set(STORE.playerHistoryButtonEnabled, true);
        emit(EV.playerHistoryButtonChange);
        expect(list.querySelector('.t7-player-history-trigger')).not.toBeNull();
    });
});
