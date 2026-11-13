import { store } from '../core/store.js';
import { EV, STORE, emit } from '../core/consts.js';
import { cls } from '../core/ui.js';

const CONFIG_KEY = STORE.pingConfig;
const PRESETS = new Set(['bell', 'chime', 'pop', 'custom']);
const MAX_CUSTOM_SOUND_SIZE = 20 * 1024 * 1024;
const DEFAULTS = {
    volume: 0.5,
    dmVolume: 0.5,
    selectedPreset: 'bell',
    customSound: '',
    pingSoundEnabled: true,
    dmSoundEnabled: false,
    dmSelectedPreset: 'chime',
    dmCustomSound: '',
    dmNickList: [],
    dmNickWhitelist: false,
    pingColor: '#e89aa3',
    tabCompletion: true,
    emoteCompletion: true,
    aliases: [],
    blacklist: [],
    stopWords: []
};

function normalizeList(value) {
    return String(value || '').split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function readConfig() {
    const saved = store.get(CONFIG_KEY);
    const config = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    config.volume = Number.isFinite(config.volume) ? Math.max(0, Math.min(1, config.volume)) : DEFAULTS.volume;
    config.dmVolume = Number.isFinite(saved && saved.dmVolume)
        ? Math.max(0, Math.min(1, saved.dmVolume))
        : config.volume;
    config.selectedPreset = PRESETS.has(config.selectedPreset) ? config.selectedPreset : DEFAULTS.selectedPreset;
    for (const key of ['customSound', 'dmCustomSound'])
        config[key] = typeof config[key] === 'string' && config[key].startsWith('data:audio/') ? config[key] : '';
    config.pingSoundEnabled = config.pingSoundEnabled !== false;
    config.dmSoundEnabled = config.dmSoundEnabled === true;
    config.dmSelectedPreset = PRESETS.has(config.dmSelectedPreset) ? config.dmSelectedPreset : DEFAULTS.dmSelectedPreset;
    if (config.dmSelectedPreset === 'custom' && !config.dmCustomSound) {
        config.dmSelectedPreset = DEFAULTS.dmSelectedPreset;
    }
    config.dmNickWhitelist = config.dmNickWhitelist === true;
    config.pingColor = /^#[0-9a-f]{6}$/i.test(config.pingColor) ? config.pingColor : DEFAULTS.pingColor;
    config.tabCompletion = config.tabCompletion !== false;
    config.emoteCompletion = config.emoteCompletion !== false;
    for (const key of ['aliases', 'blacklist', 'stopWords', 'dmNickList']) {
        config[key] = Array.isArray(config[key]) ? normalizeList(config[key].join('\n')) : [];
    }
    return config;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class PingSystem {
    constructor() {
        this.config = readConfig();
        this.listeners = new Set();
        this.regexCache = new Map();
        this.audioContext = null;
        this.customBuffer = null;
        this.customBufferPromise = null;
        this.dmCustomBuffer = null;
        this.dmCustomBufferPromise = null;
        this.pendingSound = null;
        this.dmUser = '';
        this.audioUnlockHandler = (event) => {
            if (event.type === 'keydown'
                && (!['Enter', ' '].includes(event.key) || event.repeat || event.isComposing)) return;
            this.unlockAudio(event);
        };
        document.addEventListener('click', this.audioUnlockHandler, true);
        document.addEventListener('keydown', this.audioUnlockHandler, true);
    }

    reloadConfig() {
        Object.assign(this.config, readConfig());
        this.regexCache.clear();
        this.notify();
    }

    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        for (const listener of this.listeners) {
            try {
                listener(this.config);
            } catch (error) {
                console.warn('[7TV] обработчик настроек пингов', error);
            }
        }
    }

    save() {
        store.set(CONFIG_KEY, this.config);
    }

    setList(key, value) {
        if (!['aliases', 'blacklist', 'stopWords', 'dmNickList'].includes(key)) return;
        this.config[key] = normalizeList(value);
        if (key === 'aliases') this.regexCache.clear();
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
        const user = String(login || '').trim().toLowerCase();
        if (!user) return false;
        const blocked = this.config.blacklist.includes(user);
        const next = blocked ? this.config.blacklist.filter((item) => item !== user) : [...this.config.blacklist, user];
        this.setList('blacklist', next.join('\n'));
        return !blocked;
    }

    setVolume(value) {
        const volume = Number(value);
        this.config.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULTS.volume;
        this.save();
    }

    setDmVolume(value) {
        const volume = Number(value);
        this.config.dmVolume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULTS.dmVolume;
        this.save();
    }

    setPingColor(value) {
        const color = String(value || '').trim();
        if (!/^#[0-9a-f]{6}$/i.test(color)) return;
        this.config.pingColor = color.toLowerCase();
        this.save();
        document.querySelectorAll(`.${cls('mention')}`).forEach((mention) => {
            mention.style.color = this.config.pingColor;
        });
    }

    applyPingColor() {
        document.querySelectorAll(`.${cls('mention')}`).forEach((mention) => {
            mention.style.color = this.config.pingColor;
        });
    }

    setPreset(value) {
        if (!PRESETS.has(value) || (value === 'custom' && !this.config.customSound)) return;
        this.config.selectedPreset = value;
        this.save();
    }

    setPingSoundEnabled(enabled) {
        this.config.pingSoundEnabled = !!enabled;
        if (!this.config.pingSoundEnabled && this.pendingSound && !this.pendingSound.isDm)
            this.pendingSound = null;
        this.save();
    }

    setDmSoundEnabled(enabled) {
        this.config.dmSoundEnabled = !!enabled;
        if (!this.config.dmSoundEnabled && this.pendingSound && this.pendingSound.isDm)
            this.pendingSound = null;
        this.save();
    }

    setDmPreset(value) {
        if (!PRESETS.has(value) || (value === 'custom' && !this.config.dmCustomSound)) return;
        this.config.dmSelectedPreset = value;
        this.save();
    }

    setDmNickWhitelist(enabled) {
        this.config.dmNickWhitelist = !!enabled;
        this.save();
    }

    setDmUser(login) {
        this.dmUser = String(login || '').trim().toLowerCase();
    }

    shouldNotifyDm(sender) {
        const user = String(sender || '').trim().toLowerCase();
        if (!this.config.dmSoundEnabled || !user || user === this.dmUser) return false;
        const listed = this.config.dmNickList.includes(user);
        return this.config.dmNickWhitelist ? listed : !listed;
    }

    saveCustomSound(file, isDm = false) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('audio/')) return reject(new Error('Выберите аудиофайл'));
            if (file.size > MAX_CUSTOM_SOUND_SIZE) return reject(new Error('Размер файла должен быть не больше 20 МБ'));
            const reader = new FileReader();
            reader.onload = () => {
                if (isDm) {
                    this.config.dmCustomSound = String(reader.result || '');
                    this.config.dmSelectedPreset = 'custom';
                    this.dmCustomBuffer = null;
                    this.dmCustomBufferPromise = null;
                } else {
                    this.config.customSound = String(reader.result || '');
                    this.config.selectedPreset = 'custom';
                    this.customBuffer = null;
                    this.customBufferPromise = null;
                }
                this.save();
                resolve();
            };
            reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
            reader.readAsDataURL(file);
        });
    }

    isPinged(messageText, extraAliases = []) {
        const text = String(messageText || '');
        for (const raw of [...this.config.aliases, ...extraAliases]) {
            const alias = String(raw || '').trim().toLowerCase();
            if (!alias) continue;
            let matcher = this.regexCache.get(alias);
            if (!matcher) {
                matcher = new RegExp('(^|[^\\p{L}\\p{N}_])' + escapeRegex(alias) + '(?=$|[^\\p{L}\\p{N}_])', 'iu');
                this.regexCache.set(alias, matcher);
            }
            if (matcher.test(text)) return true;
        }
        return false;
    }

    filterLabel(sender, messageText) {
        const user = String(sender || '').toLowerCase();
        const text = String(messageText || '').toLowerCase();
        if (this.config.blacklist.includes(user)) return 'В ЧС';
        if (this.config.stopWords.some((word) => text.includes(word))) return 'Фильтр';
        return '';
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

    unlockAudio(event) {
        if (!event || !event.isTrusted) return;
        try {
            const context = this.getAudioContext();
            if (context && context.state === 'suspended') {
                context.resume().then(() => this.flushPendingSound()).catch((error) => {
                    if (error?.name !== 'NotAllowedError')
                        console.warn('[7TV] не удалось включить аудио', error);
                });
            } else if (context && context.state === 'running') {
                this.flushPendingSound();
            }
        } catch (error) {
            console.warn('[7TV] не удалось включить аудио', error);
        }
    }

    flushPendingSound() {
        const pending = this.pendingSound;
        if (!pending || !this.audioContext || this.audioContext.state !== 'running') return;
        this.pendingSound = null;
        this.playSound(pending.preset, pending.customSound, pending.isDm, pending.force)
            .catch((error) => console.warn('[7TV] не удалось воспроизвести отложенный звук', error));
    }

    async loadCustomBuffer(context) {
        if (this.customBuffer) return this.customBuffer;
        if (!this.customBufferPromise) {
            this.customBufferPromise = (async () => {
                const encoded = this.config.customSound.split(',')[1];
                if (!encoded) throw new Error('Некорректный аудиофайл');
                const binary = atob(encoded);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return context.decodeAudioData(bytes.buffer);
            })();
        }
        this.customBuffer = await this.customBufferPromise;
        return this.customBuffer;
    }

    async play(force = false) {
        return this.playSound(this.config.selectedPreset, this.config.customSound, false, force);
    }

    async playDm(force = false) {
        return this.playSound(this.config.dmSelectedPreset, this.config.dmCustomSound, true, force);
    }

    async decodeCustomBuffer(context, encodedSound) {
        const encoded = encodedSound.split(',')[1];
        if (!encoded) throw new Error('Некорректный аудиофайл');
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return context.decodeAudioData(bytes.buffer);
    }

    saveCustomDmSound(file) {
        return this.saveCustomSound(file, true);
    }

    async playSound(preset, customSound, isDm, force = false) {
        if (!force && !(isDm ? this.config.dmSoundEnabled : this.config.pingSoundEnabled)) return;
        const volume = isDm ? this.config.dmVolume : this.config.volume;
        if (volume <= 0) return;
        const context = this.audioContext;
        if (!context || context.state !== 'running') {
            this.pendingSound = { preset, customSound, isDm, force };
            return;
        }

        if (preset === 'custom' && customSound) {
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
                gain.gain.value = volume;
                source.connect(gain);
                gain.connect(context.destination);
                source.start();
            } catch (error) {
                if (isDm) this.dmCustomBufferPromise = null;
                else this.customBufferPromise = null;
                console.warn('[7TV] не удалось декодировать пользовательский звук', error);
            }
            return;
        }

        const tones = {
            bell: [[740, 0, 0.24, 'sine'], [988, 0.08, 0.3, 'sine']],
            chime: [[660, 0, 0.32, 'sine'], [880, 0.12, 0.4, 'sine']],
            pop: [[360, 0, 0.12, 'triangle'], [220, 0.04, 0.16, 'sine']]
        }[preset] || [];
        for (const [frequency, offset, duration, type] of tones) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const start = context.currentTime + offset;
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.35), start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + duration);
        }
    }

}

export const pingSystem = new PingSystem();
