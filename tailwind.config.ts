import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Vayu Fitness brand tokens — keep wired to CSS vars so we can theme later
        brand: {
          primary: "#A3E635",
          dark: "#111827",
          bg: "#F9FAFB",
          text: "#1F2937",
          accent: "#22C55E",
        },
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          border: "hsl(var(--sidebar-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, hsl(var(--primary-from)) 0%, hsl(var(--primary-via)) 50%, hsl(var(--primary-to)) 100%)",
        "gradient-primary-soft":
          "linear-gradient(135deg, hsla(84, 81%, 56%, 0.12) 0%, hsla(158, 64%, 42%, 0.08) 100%)",
        "gradient-sidebar":
          "linear-gradient(180deg, hsl(var(--sidebar)) 0%, hsl(var(--sidebar-deep)) 100%)",
      },
      boxShadow: {
        "glow-sm":
          "0 0 0 1px hsla(84, 81%, 56%, 0.25), 0 4px 16px -4px hsla(84, 81%, 56%, 0.30)",
        glow: "0 0 0 1px hsla(84, 81%, 56%, 0.35), 0 8px 24px -8px hsla(84, 81%, 56%, 0.45), 0 0 32px -8px hsla(158, 64%, 42%, 0.30)",
        "glow-accent":
          "0 0 0 1px hsla(158, 64%, 42%, 0.30), 0 8px 24px -8px hsla(158, 64%, 42%, 0.45)",
      },
      keyframes: {
        "aurora-shift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(20px, -10px) scale(1.05)" },
        },
      },
      animation: {
        "aurora-shift": "aurora-shift 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
