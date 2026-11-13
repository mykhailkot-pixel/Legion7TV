const buttonsByFeature = new Map([
    ['imagePicker', new Set()],
    ['pastes', new Set()]
]);

export function registerChatButton(feature, host, button, visible) {
    const buttons = buttonsByFeature.get(feature);
    if (!buttons) throw new Error(`Unknown chat button feature: ${feature}`);
    const record = { host, button, visible };
    buttons.add(record);
    return () => buttons.delete(record);
}

export function updateChatButtons(feature, isEnabled) {
    const buttons = buttonsByFeature.get(feature);
    if (!buttons) throw new Error(`Unknown chat button feature: ${feature}`);
    for (const record of buttons) {
        if (!record.host.isConnected) {
            buttons.delete(record);
            continue;
        }
        record.button.hidden = !isEnabled || !record.visible;
    }
}
