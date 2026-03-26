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
                surface: {
                    0: "#09090b",
                    1: "#0f0f12",
                    2: "#16161a",
                    3: "#1c1c22",
                    4: "#23232b",
                },
                accent: {
                    blue: "#a7efff",
                    violet: "#d7d9de",
                    cyan: "#84e1f7",
                },
                border: {
                    subtle: "rgba(255, 255, 255, 0.06)",
                    DEFAULT: "rgba(255, 255, 255, 0.1)",
                    strong: "rgba(255, 255, 255, 0.15)",
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-accent":
                    "linear-gradient(135deg, #ffffff 0%, #ebedf0 45%, #a7efff 100%)",
                "gradient-accent-subtle":
                    "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(167, 239, 255, 0.12) 100%)",
                "gradient-glow":
                    "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(167, 239, 255, 0.08), transparent 40%)",
            },
            boxShadow: {
                glow: "0 0 20px rgba(167, 239, 255, 0.12)",
                "glow-lg": "0 0 40px rgba(167, 239, 255, 0.14)",
                card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)",
                "card-hover":
                    "0 10px 30px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "shimmer": "shimmer 2s linear infinite",
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.5s ease-out",
                "scale-in": "scaleIn 0.3s ease-out",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
