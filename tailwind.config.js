const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  purge: ["./src/views/**/*.pug", "./public/js/**/*.js"],
  darkMode: "class", // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", ...defaultTheme.fontFamily.sans],
      },
      backgroundColor: {
        twitter: "#1DA1F2",
        "twitter-dark": "#1690db",
        ...defaultTheme.backgroundColor,
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
