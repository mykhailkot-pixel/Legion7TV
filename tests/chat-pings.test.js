import { describe, expect, it } from 'vitest';
import { getAppendedRowsAfterSeen } from '../src/chat/integration/chatPings.js';

describe('chat ping notification rows', () => {
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
