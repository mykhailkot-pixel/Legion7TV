const processedMessages = new WeakSet();
const originalSources = new WeakMap();

export const isMessageProcessed = (message) => processedMessages.has(message);
export const markMessageProcessed = (message) => processedMessages.add(message);
export const unmarkMessageProcessed = (message) => processedMessages.delete(message);

export function getOriginalMessageSource(content, fallback) {
    if (originalSources.has(content)) return originalSources.get(content);
    originalSources.set(content, fallback);
    return fallback;
}

export function copyOriginalMessageSource(sourceContent, targetContent) {
    if (originalSources.has(sourceContent))
        originalSources.set(targetContent, originalSources.get(sourceContent));
}
