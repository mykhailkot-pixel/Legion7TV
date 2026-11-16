const TOKEN = /<\uE000L7N(\d+):([^\uE001>]*)\uE001>/g;

function tokenFor(index, name) {
    return `<\uE000L7N${index}:${encodeURIComponent(name || '')}\uE001>`;
}

export function extractNativeEmotes(content) {
    const images = [...content.querySelectorAll('img.cy-emo')];
    if (!images.length) return { source: content.textContent, images };

    const clone = content.cloneNode(true);
    [...clone.querySelectorAll('img.cy-emo')].forEach((image, index) => {
        image.replaceWith(document.createTextNode(tokenFor(index, images[index].alt)));
    });
    return { source: clone.textContent, images };
}

export function restoreNativeEmotes(content, images) {
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.includes('\uE000L7N')) nodes.push(walker.currentNode);
    }

    for (const node of nodes) {
        const text = node.nodeValue;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        TOKEN.lastIndex = 0;
        for (const match of text.matchAll(TOKEN)) {
            const index = Number(match[1]);
            if (match.index > offset)
                fragment.appendChild(document.createTextNode(text.slice(offset, match.index)));
            const image = images[index];
            if (image) fragment.appendChild(image);
            else {
                let name = '';
                try { name = decodeURIComponent(match[2]); } catch {}
                fragment.appendChild(document.createTextNode(name));
            }
            offset = match.index + match[0].length;
        }
        if (offset < text.length) fragment.appendChild(document.createTextNode(text.slice(offset)));
        node.replaceWith(fragment);
    }
}
