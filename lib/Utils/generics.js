"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWABusinessPlatform = exports.getCodeFromWSError = exports.getCallStatusFromNode = exports.getErrorCodeFromStreamError = exports.getStatusFromReceiptType = exports.generateMdTagPrefix = exports.fetchLatestWaWebVersion = exports.fetchLatestBaileysVersion = exports.printQRIfNecessaryListener = exports.bindWaitForConnectionUpdate = exports.generateMessageID = exports.generateMessageIDV2 = exports.delayCancellable = exports.delay = exports.debouncedTimeout = exports.unixTimestampSeconds = exports.toNumber = exports.encodeBigEndian = exports.generateRegistrationId = exports.encodeWAMessage = exports.unpadRandomMax16 = exports.writeRandomPadMax16 = exports.getKeyAuthor = exports.BufferJSON = exports.getPlatformId = exports.Browsers = void 0;
exports.promiseTimeout = promiseTimeout;
exports.bindWaitForEvent = bindWaitForEvent;
exports.trimUndefined = trimUndefined;
exports.bytesToCrockford = bytesToCrockford;
const boom_1 = require("@hapi/boom");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const os_1 = require("os");
const WAProto_1 = require("../../WAProto");
const baileys_version_json_1 = require("../Defaults/baileys-version.json");
const Types_1 = require("../Types");
const WABinary_1 = require("../WABinary");
const COMPANION_PLATFORM_MAP = {
    'Chrome': '49',
    'Edge': '50',
    'Firefox': '51',
    'Opera': '53',
    'Safari': '54'
};
const PLATFORM_MAP = {
    'aix': 'AIX',
    'darwin': 'Mac OS',
    'win32': 'Windows',
    'android': 'Android',
    'freebsd': 'FreeBSD',
    'openbsd': 'OpenBSD',
    'sunos': 'Solaris'
};
exports.Browsers = {
    ubuntu: (browser) => ['Ubuntu', browser, '22.04.4'],
    macOS: (browser) => ['Mac OS', browser, '14.4.1'],
    baileys: (browser) => ['Baileys', browser, '6.5.0'],
    windows: (browser) => ['Windows', browser, '10.0.22631'],
    iOS: (browser) => ['iOS', browser, '18.2'],
    linux: (browser) => ['Linux', browser, '6.12.6'],
    appropriate: (browser) => {
        const platform = (0, os_1.platform)();
        if (!PLATFORM_MAP[platform]) {
            console.warn(`Unknown platform ${platform}; defaulting to Ubuntu`);
        }
        return [PLATFORM_MAP[platform] || 'Ubuntu', browser, (0, os_1.release)()];
    }
};
const getPlatformId = (browser) => {
    if (typeof browser !== 'string') {
        console.warn(`Invalid browser type: ${typeof browser}; defaulting to Chrome`);
        return '49'; // Chrome
    }
    const platformType = WAProto_1.proto.DeviceProps.PlatformType[browser.toUpperCase()];
    return platformType ? platformType.toString() : '49'; // Chrome
};
exports.getPlatformId = getPlatformId;
exports.BufferJSON = {
    replacer: (k, value) => {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array || (value?.type === 'Buffer')) {
            return { type: 'Buffer', data: Buffer.from(value?.data || value).toString('base64') };
        }
        return value;
    },
    reviver: (_, value) => {
        if (typeof value === 'object' && value && (value.buffer === true || value.type === 'Buffer')) {
            const val = value.data || value.value;
            if (typeof val === 'string') {
                if (!/^[A-Za-z0-9+/=]+$/.test(val)) {
                    throw new Error('Invalid base64 string in BufferJSON');
                }
                return Buffer.from(val, 'base64');
            }
            return Buffer.from(Array.isArray(val) ? val : []);
        }
        return value;
    }
};
const getKeyAuthor = (key, meId = 'me') => {
    if (!key) {
        console.warn('getKeyAuthor: key is undefined');
        return '';
    }
    return (key.fromMe ? meId : (key.participant || key.remoteJid)) || '';
};
exports.getKeyAuthor = getKeyAuthor;
const writeRandomPadMax16 = (msg) => {
    if (!Buffer.isBuffer(msg) && !(msg instanceof Uint8Array)) {
        throw new Error('writeRandomPadMax16: Input must be a Buffer or Uint8Array');
    }
    const pad = (0, crypto_1.randomBytes)(1);
    pad[0] &= 0xf;
    if (!pad[0]) {
        pad[0] = 0xf;
    }
    return Buffer.concat([msg, Buffer.alloc(pad[0], pad[0])]);
};
exports.writeRandomPadMax16 = writeRandomPadMax16;
const unpadRandomMax16 = (e) => {
    if (!Buffer.isBuffer(e) && !(e instanceof Uint8Array)) {
        throw new Error('unpadRandomMax16: Input must be a Buffer or Uint8Array');
    }
    const t = new Uint8Array(e);
    if (t.length === 0) {
        throw new Error('unpadRandomMax16: Empty bytes provided');
    }
    const r = t[t.length - 1];
    if (r === 0 || r > 16) {
        throw new Error(`unpadRandomMax16: Invalid padding length: ${r}`);
    }
    if (r > t.length) {
        throw new Error(`unpadRandomMax16: Padding ${r} exceeds buffer length ${t.length}`);
    }
    return new Uint8Array(t.buffer, t.byteOffset, t.length - r);
};
exports.unpadRandomMax16 = unpadRandomMax16;
const encodeWAMessage = (message) => {
    if (!message || typeof message !== 'object') {
        throw new Error('encodeWAMessage: Invalid message object');
    }
    return (0, exports.writeRandomPadMax16)(WAProto_1.proto.Message.encode(message).finish());
};
exports.encodeWAMessage = encodeWAMessage;
const generateRegistrationId = () => {
    return Uint16Array.from((0, crypto_1.randomBytes)(2))[0] & 16383;
};
exports.generateRegistrationId = generateRegistrationId;
const encodeBigEndian = (e, t = 4) => {
    if (!Number.isInteger(e) || e < 0) {
        throw new Error('encodeBigEndian: Input must be a non-negative integer');
    }
    if (!Number.isInteger(t) || t <= 0) {
        throw new Error('encodeBigEndian: Byte length must be a positive integer');
    }
    let r = e;
    const a = new Uint8Array(t);
    for (let i = t - 1; i >= 0; i--) {
        a[i] = 255 & r;
        r >>>= 8;
    }
    return a;
};
exports.encodeBigEndian = encodeBigEndian;
const toNumber = (t) => {
    if (t === undefined || t === null) {
        return 0;
    }
    if (typeof t === 'object' && t) {
        return 'toNumber' in t ? t.toNumber() : t.low;
    }
    return Number(t) || 0;
};
exports.toNumber = toNumber;
const unixTimestampSeconds = (date = new Date()) => {
    if (!(date instanceof Date)) {
        console.warn('unixTimestampSeconds: Invalid date object; using current time');
        date = new Date();
    }
    return Math.floor(date.getTime() / 1000);
};
exports.unixTimestampSeconds = unixTimestampSeconds;
const debouncedTimeout = (intervalMs = 1000, task) => {
    let timeout;
    let currentTask = task;
    let currentIntervalMs = intervalMs;
    return {
        start: (newIntervalMs, newTask) => {
            if (timeout) clearTimeout(timeout);
            currentTask = newTask || currentTask;
            currentIntervalMs = newIntervalMs || currentIntervalMs;
            if (typeof currentTask !== 'function') {
                console.warn('debouncedTimeout: No valid task provided');
                return;
            }
            timeout = setTimeout(() => currentTask?.(), currentIntervalMs);
        },
        cancel: () => {
            if (timeout) clearTimeout(timeout);
            timeout = undefined;
        },
        setTask: (newTask) => currentTask = newTask,
        setInterval: (newInterval) => {
            if (!Number.isInteger(newInterval) || newInterval <= 0) {
                console.warn('debouncedTimeout: Invalid interval; keeping current interval');
                return;
            }
            currentIntervalMs = newInterval;
        },
        destroy: () => {
            if (timeout) clearTimeout(timeout);
            timeout = undefined;
            currentTask = undefined;
        }
    };
};
exports.debouncedTimeout = debouncedTimeout;
const delayCancellable = (ms) => {
    if (!Number.isInteger(ms) || ms < 0) {
        throw new Error('delayCancellable: Invalid delay duration');
    }
    const stack = new Error().stack;
    let timeout;
    let reject;
    const delay = new Promise((resolve, _reject) => {
        timeout = setTimeout(resolve, ms);
        reject = _reject;
    });
    const cancel = () => {
        clearTimeout(timeout);
        reject(new boom_1.Boom('Cancelled', {
            statusCode: 500,
            data: { stack }
        }));
    };
    return { delay, cancel };
};
exports.delayCancellable = delayCancellable;
const delay = (ms) => (0, exports.delayCancellable)(ms).delay;
exports.delay = delay;
async function promiseTimeout(ms, promise) {
    if (typeof promise !== 'function') {
        throw new Error('promiseTimeout: Promise must be a function');
    }
    if (ms && (!Number.isInteger(ms) || ms < 0)) {
        throw new Error('promiseTimeout: Invalid timeout duration');
    }
    if (!ms) {
        return new Promise(promise);
    }
    const stack = new Error().stack;
    const { delay, cancel } = (0, exports.delayCancellable)(ms);
    let isSettled = false;
    const p = new Promise((resolve, reject) => {
        delay.then(() => {
            if (!isSettled) {
                reject(new boom_1.Boom('Timed Out', {
                    statusCode: Types_1.DisconnectReason.timedOut,
                    data: { stack }
                }));
            }
        }).catch(err => !isSettled && reject(err));
        promise((...args) => {
            isSettled = true;
            resolve(...args);
        }, err => {
            isSettled = true;
            reject(err);
        });
    }).finally(cancel);
    return p;
}
const generateMessageIDV2 = (userId) => {
    const data = Buffer.alloc(8 + 20 + 16);
    data.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
    if (userId) {
        const id = WABinary_1.jidDecode(userId);
        if (!id?.user) {
            console.warn(`generateMessageIDV2: Invalid userId provided: ${userId}`);
        } else {
            data.write(id.user, 8);
            data.write('@c.us', 8 + id.user.length);
        }
    }
    const random = crypto_1.randomBytes(16);
    random.copy(data, 28);
    const hash = crypto_1.createHash('sha256').update(data).digest('hex').toUpperCase();
    return `3EB${hash.substring(0, 19)}`;
};
exports.generateMessageIDV2 = generateMessageIDV2;
const generateMessageID = () => `3EB${crypto_1.randomBytes(16).toString('hex').toUpperCase().slice(0, 19)}`;
exports.generateMessageID = generateMessageID;
function bindWaitForEvent(ev, event) {
    if (!ev || typeof ev.on !== 'function' || typeof ev.off !== 'function') {
        throw new Error('bindWaitForEvent: Invalid event emitter');
    }
    return async (check, timeoutMs) => {
        if (typeof check !== 'function') {
            throw new Error('bindWaitForEvent: Check must be a function');
        }
        if (timeoutMs && (!Number.isInteger(timeoutMs) || timeoutMs < 0)) {
            throw new Error('bindWaitForEvent: Invalid timeout duration');
        }
        let listener;
        let closeListener;
        await (promiseTimeout(timeoutMs, (resolve, reject) => {
            closeListener = ({ connection, lastDisconnect }) => {
                if (connection === 'close') {
                    reject((lastDisconnect?.error)
                        || new boom_1.Boom('Connection Closed', { statusCode: Types_1.DisconnectReason.connectionClosed }));
                }
            };
            ev.on('connection.update', closeListener);
            listener = (update) => {
                if (check(update)) {
                    resolve();
                }
            };
            ev.on(event, listener);
        }).finally(() => {
            ev.off(event, listener);
            ev.off('connection.update', closeListener);
        }));
    };
}
const bindWaitForConnectionUpdate = (ev) => bindWaitForEvent(ev, 'connection.update');
exports.bindWaitForConnectionUpdate = bindWaitForConnectionUpdate;
const printQRIfNecessaryListener = (ev, logger) => {
    if (!ev || typeof ev.on !== 'function') {
        throw new Error('printQRIfNecessaryListener: Invalid event emitter');
    }
    ev.on('connection.update', async ({ qr }) => {
        if (qr) {
            try {
                const QR = await import('qrcode-terminal').then(m => m.default || m);
                if (!QR) {
                    logger.error('QR code terminal not installed; please install qrcode-terminal or scan manually');
                    return;
                }
                QR.generate(qr, { small: true });
            } catch (err) {
                logger.error('Failed to generate QR code: ' + err.message);
            }
        }
    });
};
exports.printQRIfNecessaryListener = printQRIfNecessaryListener;
const fetchLatestBaileysVersion = async (options = {}) => {
    const URL = 'https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json';
    try {
        const result = await axios_1.default.get(URL, { ...options, responseType: 'json' });
        if (!result.data?.version) {
            throw new Error('Invalid response format: version missing');
        }
        return { version: result.data.version, isLatest: true };
    } catch (error) {
        console.warn('Failed to fetch latest Baileys version; using fallback version:', baileys_version_json_1.version);
        return { version: baileys_version_json_1.version, isLatest: false, error };
    }
};
exports.fetchLatestBaileysVersion = fetchLatestBaileysVersion;
const fetchLatestWaWebVersion = async (options) => {
    try {
        const result = await axios_1.default.get('https://web.whatsapp.com/check-update?version=1&platform=web', {
            ...options,
            responseType: 'json'
        });
        if (!result.data?.currentVersion) {
            throw new Error('Invalid response format: currentVersion missing');
        }
        const version = result.data.currentVersion.split('.');
        if (version.length !== 3 || version.some(v => isNaN(+v))) {
            throw new Error('Invalid version format: ' + result.data.currentVersion);
        }
        return { version: [+version[0], +version[1], +version[2]], isLatest: true };
    } catch (error) {
        console.warn('Failed to fetch latest WhatsApp Web version; using fallback version:', baileys_version_json_1.version);
        return { version: baileys_version_json_1.version, isLatest: false, error };
    }
};
exports.fetchLatestWaWebVersion = fetchLatestWaWebVersion;
const generateMdTagPrefix = () => {
    const bytes = (0, crypto_1.randomBytes)(4);
    return `${bytes.readUInt16BE()}.${bytes.readUInt16BE(2)}-`;
};
exports.generateMdTagPrefix = generateMdTagPrefix;
const STATUS_MAP = {
    'sender': WAProto_1.proto.WebMessageInfo.Status.SERVER_ACK,
    'played': WAProto_1.proto.WebMessageInfo.Status.PLAYED,
    'read': WAProto_1.proto.WebMessageInfo.Status.READ,
    'read-self': WAProto_1.proto.WebMessageInfo.Status.READ
};
const getStatusFromReceiptType = (type) => {
    if (type && !(type in STATUS_MAP)) {
        console.warn(`getStatusFromReceiptType: Unknown receipt type: ${type}`);
    }
    return STATUS_MAP[type] || WAProto_1.proto.WebMessageInfo.Status.DELIVERY_ACK;
};
exports.getStatusFromReceiptType = getStatusFromReceiptType;
const CODE_MAP = {
    conflict: Types_1.DisconnectReason.connectionReplaced
};
const getErrorCodeFromStreamError = (node) => {
    if (!node?.attrs) {
        console.warn('getErrorCodeFromStreamError: Invalid node provided');
        return { reason: 'unknown', statusCode: Types_1.DisconnectReason.badSession };
    }
    const [reasonNode] = (0, WABinary_1.getAllBinaryNodeChildren)(node);
    let reason = reasonNode?.tag || 'unknown';
    const statusCode = +(node.attrs.code || CODE_MAP[reason] || Types_1.DisconnectReason.badSession);
    if (statusCode === Types_1.DisconnectReason.restartRequired) {
        reason = 'restart required';
    }
    return { reason, statusCode };
};
exports.getErrorCodeFromStreamError = getErrorCodeFromStreamError;
const getCallStatusFromNode = ({ tag, attrs }) => {
    if (!tag || !attrs) {
        console.warn('getCallStatusFromNode: Invalid node provided');
        return 'ringing';
    }
    let status;
    switch (tag) {
        case 'offer':
        case 'offer_notice':
            status = 'offer';
            break;
        case 'terminate':
            status = attrs.reason === 'timeout' ? 'timeout' : 'terminate';
            break;
        case 'reject':
            status = 'reject';
            break;
        case 'accept':
            status = 'accept';
            break;
        default:
            status = 'ringing';
            break;
    }
    return status;
};
exports.getCallStatusFromNode = getCallStatusFromNode;
const UNEXPECTED_SERVER_CODE_TEXT = 'Unexpected server response: ';
const getCodeFromWSError = (error) => {
    let statusCode = 500;
    if (error?.message?.includes(UNEXPECTED_SERVER_CODE_TEXT)) {
        const code = +(error.message.slice(UNEXPECTED_SERVER_CODE_TEXT.length));
        if (!Number.isNaN(code) && code >= 400) {
            statusCode = code;
        }
    } else if (error?.code?.startsWith('E') || error?.message?.includes('timed out')) {
        statusCode = 408;
    }
    return statusCode;
};
exports.getCodeFromWSError = getCodeFromWSError;
const isWABusinessPlatform = (platform) => {
    return platform === 'smbi' || platform === 'smba';
};
exports.isWABusinessPlatform = isWABusinessPlatform;
function trimUndefined(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    for (const key in obj) {
        if (typeof obj[key] === 'undefined') {
            delete obj[key];
        }
    }
    return obj;
}
const CROCKFORD_CHARACTERS = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';
function bytesToCrockford(buffer) {
    if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
        throw new Error('bytesToCrockford: Input must be a Buffer or Uint8Array');
    }
    let value = 0;
    let bitCount = 0;
    const crockford = [];
    for (const element of buffer) {
        value = (value << 8) | (element & 0xff);
        bitCount += 8;
        while (bitCount >= 5) {
            crockford.push(CROCKFORD_CHARACTERS.charAt((value >>> (bitCount - 5)) & 31));
            bitCount -= 5;
        }
    }
    if (bitCount > 0) {
        crockford.push(CROCKFORD_CHARACTERS.charAt((value << (5 - bitCount)) & 31));
    }
    return crockford.join('');
}
