// Ссылки в чате: отправка через [ref]{...}, разбор на приёме
export const SAY_RE = /^\/api\/(?:city\/say|mine\/chat\/say)(?:\?|$)/;

const HTTP_RE = /(?<![\p{L}\p{N}_])http:\/\/\S/iu;
// bare-домены: 2 латинские буквы (ccTLD) или частые общие зоны; так "кто.то" и "main.txt" ссылками не считаются
const TLD = '[a-z]{2}|com|net|org|info|dev|app|xyz|online|site|tech|gov|edu|club|shop|store|blog|cloud|live|link';
const LINK_RE = new RegExp(
    '(?<![\\p{L}\\p{N}_@/.:%-])(?:https:\\/\\/)?' +
    '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:' + TLD + ')(?![\\p{L}\\p{N}-])' +
    '(?::\\d{1,5})?(?:[/?#]\\S*)?', 'giu');

function encodeOne(raw) {
    let url = raw, tail = '';
    const m = /[.,!?;:)\]'"]+$/.exec(url);
    if (m) { tail = m[0]; url = url.slice(0, -tail.length); }
    url = url.replace(/^https:\/\//i, '');
    const i = url.search(/[/?#]/);
    const host = (i < 0 ? url : url.slice(0, i)).toLowerCase().replace(/\./g, '_');
    const rest = i < 0 ? '' : url.slice(i).replace(/\./g, '%2E').replace(/\{/g, '%7B').replace(/\}/g, '%7D');
    return '[ref]{' + host + rest + '}' + tail;
}
export const encodeLinks = (text) => text.replace(LINK_RE, encodeOne);

// [ref]{www_bergfex_at/w/geierhaupt} -> https://www.bergfex.at/w/geierhaupt
export function refToUrl(body) {
    const i = body.search(/[/?#]/);
    const host = (i < 0 ? body : body.slice(0, i)).replace(/_/g, '.');
    const rest = i < 0 ? '' : body.slice(i).replace(/%2E/gi, '.');
    return 'https://' + host + rest;
}

// call(path, body) - исходный api сайта
export async function sendWithLinks(call, path, body) {
    const text = body && body.text;
    if (typeof text !== 'string') return call(path, body);
    if (HTTP_RE.test(text)) return { ok: false, error: 'ссылки http:// не отправляются - используй https://' };
    const encoded = encodeLinks(text);
    return call(path, encoded === text ? body : { ...body, text: encoded });
}