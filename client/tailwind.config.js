/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brew: {
          beige: '#D5BC9E',
          brown: '#4A2511',
          light: '#F5ECD7',
          dark:  '#2C1508',
        },
      },
      fontFamily: {
        heading: ['"Oswald"', 'sans-serif'],
        body:    ['"Inter"',  'sans-serif'],
      },
    },
  },
  plugins: [],
}