const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

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
        lg: "920px",
        xl: "920px",
      },
    },
    extend: {
      animation: {
        "bounce-slow": "bounce 3s linear infinite",
      },
      backgroundColor: {
        ...defaultTheme.backgroundColor,
        gray: { ...colors.warmGray, 30: "#eee", 70: "#F6F7F8" },
      },
      borderColor: {
        ...defaultTheme.borderColor,
        gray: { ...colors.warmGray, 200: "#E8ECF1" },
      },
      scale: {
        98: "0.98",
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
      boxShadow: {
        ...defaultTheme.boxShadow,
        ghost: `0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)`,
        "ghost-2": `0 12px 21px -5px rgba(0, 0, 0, 0.04), 0 3px 8px -3px rgba(0, 0, 0, 0.02)`,
      },
    },
  },
  variants: {
    extend: {
      scale: ["focus", "hover", "active"],
      ringColor: ["focus", "hover"],
      ringOffsetColor: ["focus", "hover"],
      ringOffsetWidth: ["focus", "hover"],
      ringOpacity: ["focus", "hover"],
      ringWidth: ["focus", "hover"],
      borderStyle: ["focus"],
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    ({ addComponents, theme }) => {
      const screens = theme("screens", {});
      addComponents({
        ".container-2": {
          "@apply container": {},
          // [`@media (min-width: ${theme("screens.xl")})`]: {
          //   maxWidth: theme("screens.xl"),
          // },
          [`@media (min-width: 1200px)`]: {
            maxWidth: "1200px",
          },
        },
      });
    },
  ],
};
