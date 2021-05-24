const day = require("dayjs");

const dateFmt = (dateStr, format = "DD MMM, HH:mm") => {
  return day(dateStr).format(format);
};
module.exports = { dateFmt };
