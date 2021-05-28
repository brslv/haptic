const day = require("dayjs");
const fs = require("fs");

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

module.exports = { dateFmt, loadArticleFile };
