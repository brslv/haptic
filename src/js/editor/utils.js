export const hasChosenProduct = (chosenProduct) =>
    chosenProduct !== "_" && chosenProduct !== null;

export const mdConverter = new window.showdown.Converter({
    noHeaderId: true,
    simplifiedAutoLink: true,
    tasklists: true,
    openLinksInNewWindow: true,
    emoji: true,
});

export function toast({ type, content }) {
    console.log("[Toast] Show - info", { type, content });
    if (!type || !content)
        return console.warn("[Toast] Show - not enough information", {
            type,
            content,
        });
    const event = new CustomEvent("haptic:add-toast");
    event.___td = { type, content };
    document.dispatchEvent(event);
}

export const turbo = {
    actions: {
        visit: (path) => {
            const event = new CustomEvent("haptic:turbo-visit", {
                detail: { path },
            });
            document.dispatchEvent(event);
        },
    },
};
