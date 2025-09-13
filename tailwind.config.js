/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'msn-blue': '#0054E3',
                'msn-blue-dark': '#0046C7',
                'msn-border': '#7A96DF',
                'msn-gray': '#ECE9D8',
            }
        },
    },
    plugins: [],
}