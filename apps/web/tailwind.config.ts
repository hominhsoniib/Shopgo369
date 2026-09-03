import type { Config } from 'tailwindcss';

/**
 * Design tokens — 369 SHOP ("Nông sản sạch, mộc mạc, đáng tin").
 * primary = xanh lá non (thương hiệu, nút chính, giá), secondary = nâu đất
 * (nhấn phụ), neutral = "giấy gạo" ấm thay cho gray lạnh mặc định của Tailwind.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F3F7EE',
          100: '#E3EDD6',
          200: '#C8DCAE',
          300: '#A7C77E',
          400: '#85AF54',
          500: '#669838',
          600: '#4F7A2A',
          700: '#3E5F21',
          800: '#2F481A',
          900: '#253813',
        },
        secondary: {
          50: '#FAF6F0',
          100: '#F0E6D6',
          200: '#E0CBAA',
          300: '#CBA97A',
          400: '#B0855A',
          500: '#94693F',
          600: '#785331',
          700: '#5D4027',
          800: '#45301E',
          900: '#322316',
        },
        neutral: {
          50: '#FAF9F6',
          100: '#F2F0EA',
          200: '#E4E1D8',
          300: '#CFCBBD',
          400: '#A9A495',
          500: '#837D6C',
          600: '#635E4F',
          700: '#4A463A',
          800: '#332F27',
          900: '#211E19',
        },
        danger: {
          50: '#FBEDE9',
          100: '#F5D5CB',
          400: '#C15F3F',
          600: '#A8402A',
          700: '#84331F',
        },
        warning: {
          50: '#FBF3E4',
          100: '#F3DFB4',
          400: '#D2A24E',
          600: '#C08A2E',
          700: '#966B21',
        },
      },
      fontFamily: {
        sans: ['var(--font-be-vietnam)', 'system-ui', 'sans-serif'],
        display: ['var(--font-lora)', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
};
export default config;
