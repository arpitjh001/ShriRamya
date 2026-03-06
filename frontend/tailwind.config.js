/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "royal-maroon": "#6A1E2D",
        "deep-emerald": "#0F3D3E",
        "royal-gold": "#C8A96A",
        "ivory": "#F7F3EC",
        "charcoal": "#1F1F1F",
        "gold-mist": "#E3D1AB",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', '"Cormorant Garamond"', "serif"],
        body: ["Inter", "Poppins", "system-ui", "sans-serif"],
        accent: ['"Cormorant Garamond"', "serif"],
        editorial: ['"Cormorant Garamond"', "serif"],
      },
      fontSize: {
        "display-1": ["4.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-2": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" }],
        "display-3": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "500" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        luxury: "0 12px 36px rgba(31, 31, 31, 0.12), 0 2px 10px rgba(106, 30, 45, 0.08)",
        "luxury-lg": "0 22px 54px rgba(31, 31, 31, 0.18), 0 10px 24px rgba(15, 61, 62, 0.12)",
        "gold-glow": "0 0 0 1px rgba(200, 169, 106, 0.26), 0 12px 30px rgba(200, 169, 106, 0.24)",
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 18px 40px rgba(31, 31, 31, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "fade-up-slow": "fadeUpSlow 1s cubic-bezier(0.2, 0.7, 0.2, 1) forwards",
        "slide-up": "slideUp 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) forwards",
        "scale-in": "scaleIn 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) forwards",
        "gold-shimmer": "goldShimmer 3.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUpSlow: {
          "0%": { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        goldShimmer: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(200, 169, 106, 0.22), 0 8px 20px rgba(200, 169, 106, 0.16)" },
          "50%": { boxShadow: "0 0 0 1px rgba(200, 169, 106, 0.45), 0 14px 28px rgba(200, 169, 106, 0.28)" },
        },
      },
      backdropBlur: {
        xs: "2px",
        luxury: "14px",
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      backgroundImage: {
        "royal-veil":
          "linear-gradient(140deg, rgba(106,30,45,0.92) 0%, rgba(31,31,31,0.82) 48%, rgba(15,61,62,0.88) 100%)",
        "ivory-glow":
          "radial-gradient(circle at 20% 15%, rgba(227,209,171,0.5) 0%, rgba(247,243,236,0.95) 42%, rgba(247,243,236,1) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
