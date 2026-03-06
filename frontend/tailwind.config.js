/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#FFFFFF",
                "background-dark": "#000000",
                "surface-dark": "#0A0A0A",
                "border-dark": "#FFFFFF",
                "text-dark": "#FFFFFF",
                "text-muted-dark": "#A3A3A3",
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
                mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
            },
        },
    },
    plugins: [
        require("@tailwindcss/forms"),
    ],
}
