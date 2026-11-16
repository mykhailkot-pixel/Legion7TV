import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore, store } from '../src/core/store.js';
import { pingSystem } from '../src/chat/pingSystem.js';

describe('ping system configuration and matching', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        pingSystem.reloadConfig();
        pingSystem.pendingSound = null;
    });

    it('defaults general ping sound on and direct-message sound off', () => {
        expect(pingSystem.config.pingSoundEnabled).toBe(true);
        expect(pingSystem.config.dmSoundEnabled).toBe(false);
        expect(pingSystem.shouldNotifyDm('alice')).toBe(false);
    });

    it('normalizes volume and validates sound presets', () => {
        pingSystem.setVolume(4);
        expect(pingSystem.config.volume).toBe(1);
        pingSystem.setVolume(-1);
        expect(pingSystem.config.volume).toBe(0);
        pingSystem.setPreset('not-a-preset');
        expect(pingSystem.config.selectedPreset).toBe('bell');
        pingSystem.setPreset('pop');
        expect(pingSystem.config.selectedPreset).toBe('pop');
    });

    it('matches aliases case-insensitively at word boundaries', () => {
        pingSystem.setList('aliases', 'Alice\nfoo.bar');
        expect(pingSystem.isPinged('hello ALICE!')).toBe(true);
        expect(pingSystem.isPinged('xalice')).toBe(false);
        expect(pingSystem.isPinged('fooXbar')).toBe(false);
        expect(pingSystem.isPinged('foo.bar')).toBe(true);
    });

    it('applies blacklist before stop-word filtering', () => {
        pingSystem.setList('blacklist', 'blocked');
        pingSystem.setList('stopWords', 'spoiler');
        expect(pingSystem.filterLabel('blocked', 'spoiler')).toBe('В ЧС');
        expect(pingSystem.filterLabel('other', 'contains spoiler')).toBe('Фильтр');
        expect(pingSystem.filterLabel('other', 'clean')).toBe('');
    });

    it('applies DM mute, self-message, blacklist and whitelist rules', () => {
        pingSystem.setDmUser('me');
        pingSystem.setList('dmNickList', 'muted, allowed');
        pingSystem.setDmSoundEnabled(true);
        expect(pingSystem.shouldNotifyDm('me')).toBe(false);
        expect(pingSystem.shouldNotifyDm('muted')).toBe(false);
        expect(pingSystem.shouldNotifyDm('other')).toBe(true);
        pingSystem.setDmNickWhitelist(true);
        expect(pingSystem.shouldNotifyDm('allowed')).toBe(true);
        expect(pingSystem.shouldNotifyDm('other')).toBe(false);
    });

    it('persists independent sound toggles and cancels queued sounds on disable', () => {
        pingSystem.pendingSound = { isDm: false };
        pingSystem.setPingSoundEnabled(false);
        expect(pingSystem.config.pingSoundEnabled).toBe(false);
        expect(pingSystem.pendingSound).toBeNull();

        pingSystem.pendingSound = { isDm: true };
        pingSystem.setDmSoundEnabled(true);
        expect(pingSystem.config.dmSoundEnabled).toBe(true);
        pingSystem.setDmSoundEnabled(false);
        expect(pingSystem.pendingSound).toBeNull();
        expect(store.get('t7ping').pingSoundEnabled).toBe(false);
        expect(store.get('t7ping').dmSoundEnabled).toBe(false);
    });

    it('does not queue a sound when its category is disabled', async () => {
        pingSystem.setPingSoundEnabled(false);
        pingSystem.setDmSoundEnabled(false);
        await pingSystem.play();
        await pingSystem.playDm();
        expect(pingSystem.pendingSound).toBeNull();
    });
});
