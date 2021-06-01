const day = require("dayjs");
const fs = require("fs");
const showdown = require("showdown");

const dateFmt = (dateStr, format = "DD MMM, HH:mm") => {
  return day(dateStr).format(format);
};

const loadArticleFile = (name) => {
  return new Promise((res, rej) => {
    fs.readFile(`./src/articles/${name}`, "utf8", (err, data) => {
      if (err) {
        return rej(err);
      }
      res(data);
    });
  });
};

const mdConverter = new showdown.Converter({
  noHeaderId: true,
  simplifiedAutoLink: true,
  tasklists: true,
  openLinksInNewWindow: true,
  emoji: true,
});

module.exports = { dateFmt, loadArticleFile, mdConverter };
