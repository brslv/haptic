const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  purge: {
    content: ["./src/views/**/*.pug", "./src/js/**/*.js"],
    options: { safelist: ["turbo-progress-bar"] },
  },
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
      scale: {
        "98": "0.98",
        ...defaultTheme.scale,
      },
      fontFamily: {
        sans: ["Open Sans", ...defaultTheme.fontFamily.sans],
      },
      backgroundColor: {
        twitter: "#1DA1F2",
        "twitter-dark": "#1690db",
        ...defaultTheme.backgroundColor,
      },
    },
  },
  variants: {
    extend: {
      scale: ["focus", "active"],
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
