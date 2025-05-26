/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "color-background-brand-default":
          "var(--color-background-brand-default)",
        "color-background-brand-hover": "var(--color-background-brand-hover)",
        "color-background-default-default-hover":
          "var(--color-background-default-default-hover)",
        "color-primitives-brand-800": "var(--color-primitives-brand-800)",
        "color-primitives-gray-100": "var(--color-primitives-gray-100)",
        "color-primitives-gray-500": "var(--color-primitives-gray-500)",
        "color-primitives-gray-900": "var(--color-primitives-gray-900)",
        "color-text-brand-on-brand": "var(--color-text-brand-on-brand)",
        "color-text-default-default": "var(--color-text-default-default)",
        "color-text-default-secondary": "var(--color-text-default-secondary)",
        "colors-black-100": "var(--colors-black-100)",
      },
      fontFamily: {
        "body-base-bold": "var(--body-base-bold-font-family)",
        "single-line-body-base": "var(--single-line-body-base-font-family)",
      },
    },
  },
  plugins: [],
};
