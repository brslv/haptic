const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  purge: ["./src/views/**/*.pug", "./public/js/**/*.js"],
  darkMode: "class",
  theme: {
    container: {
      screens: {
        sm: "100%",
        md: "100%",
        lg: "980px",
        xl: "980px",
      },
    },
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
