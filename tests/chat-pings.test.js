import { describe, expect, it } from 'vitest';
import {
    applyReadMarker,
    getAppendedRowsAfterSeen
} from '../src/chat/integration/chatPings.js';

describe('chat ping notification rows', () => {
    it('clears only matching unread ping IDs and ignores duplicate read markers', () => {
        const state = {
            counts: { g: 2, tr: 1 },
            unreadIds: new Map([
                ['g', new Set(['first', 'second'])],
                ['tr', new Set(['third'])]
            ]),
            unreadMessageIds: new Map([['g', new Set(['first', 'second'])]]),
            trackedMessageTabs: new Set(),
            readIds: new Map()
        };

        expect(applyReadMarker(state, 'g', ['first', 'other'])).toBe(1);
        expect(state.counts.g).toBe(1);
        expect(state.counts.tr).toBe(1);
        expect(state.unreadIds.get('g')).toEqual(new Set(['second']));
        expect(state.unreadMessageIds.get('g')).toEqual(new Set(['second']));
        expect(state.unreadMessageIds.get('tr')).toEqual(new Set(['third']));
        expect(state.trackedMessageTabs.has('g')).toBe(true);
        expect(state.readIds.get('g')).toEqual(new Set(['first', 'other']));
        expect(applyReadMarker(state, 'g', ['first'])).toBe(0);
        expect(state.counts.g).toBe(1);
    });

    it('selects only newly appended rows after the previously seen tail', () => {
        const list = document.createElement('ul');
        const older = document.createElement('li');
        older.dataset.mid = 'older';
        const seen = document.createElement('li');
        seen.dataset.mid = 'seen';
        const live = document.createElement('li');
        live.dataset.mid = 'live';
        list.append(older, seen, live);

        const rows = getAppendedRowsAfterSeen(list, [
            { target: list, addedNodes: [older, live] }
        ], new Set(['seen']));

        expect(rows).toEqual(new Set([live]));
    });

    it('does not select a history batch inserted before previously seen messages', () => {
        const list = document.createElement('ul');
        const older = document.createElement('li');
        older.dataset.mid = 'older';
        const seen = document.createElement('li');
        seen.dataset.mid = 'seen';
        list.append(older, seen);

        const rows = getAppendedRowsAfterSeen(list, [
            { target: list, addedNodes: [older] }
        ], new Set(['seen']));

        expect(rows.size).toBe(0);
    });
});
