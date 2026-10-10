import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#131718',
          light: '#222729',
          muted: '#2d3335',
        },
        warm: {
          DEFAULT: '#DABA98',
          light: '#e8d2b8',
          dark: '#b8946e',
        },
        paper: {
          DEFAULT: '#F5F0E8',
          light: '#FAF7F2',
          dark: '#EBE4D8',
        },
        mutedGray: '#777777',
        borderCol: '#DED7CE',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
