/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./*.html", "./js/**/*.js"],
    theme: {
        extend: {
            colors: {
                primary: "oklch(0.488 0.243 264.376)",
                "primary-foreground": "oklch(0.97 0.014 254.604)",
            }
        },
    },
    plugins: [],
}
