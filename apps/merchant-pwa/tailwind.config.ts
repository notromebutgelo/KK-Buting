import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        merchant: {
          ink: '#10243F',
          blue: '#07549A',
          teal: '#0F9B8E',
          gold: '#F5B331',
          paper: '#F6F9FC',
        },
      },
      boxShadow: {
        soft: '0 22px 60px rgba(15, 35, 63, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
