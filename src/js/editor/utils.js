export const hasChosenProduct = (chosenProduct) =>
    chosenProduct !== "_" && chosenProduct !== null;

export const mdConverter = new window.showdown.Converter({
    noHeaderId: true,
    simplifiedAutoLink: true,
    tasklists: true,
    openLinksInNewWindow: true,
    emoji: true,
});
