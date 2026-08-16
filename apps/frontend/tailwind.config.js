import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
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
          blue: "hsl(var(--accent-blue))",
          "blue-light": "hsl(var(--accent-blue-light))",
          green: "hsl(var(--accent-green))",
          "green-light": "hsl(var(--accent-green-light))",
          yellow: "hsl(var(--accent-yellow))",
          "yellow-light": "hsl(var(--accent-yellow-light))",
          red: "hsl(var(--accent-red))",
          "red-light": "hsl(var(--accent-red-light))",
          purple: "hsl(var(--accent-purple))",
          "purple-light": "hsl(var(--accent-purple-light))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        content: {
          bg: "hsl(var(--content-bg))",
          "bg-secondary": "hsl(var(--content-bg-secondary))",
          text: "hsl(var(--content-text))",
          "text-secondary": "hsl(var(--content-text-secondary))",
          "text-muted": "hsl(var(--content-text-muted))",
          "text-tertiary": "hsl(var(--content-text-tertiary))",
          border: "hsl(var(--content-border))",
          "border-light": "hsl(var(--content-border-light))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        "input-background": "hsl(var(--input-background))",
        "switch-background": "hsl(var(--switch-background))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-control)",
        sm: "calc(var(--radius-control) - 2px)",
        xl: "calc(var(--radius) + 4px)",
        chip: "var(--radius-chip)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "slide-in-right": {
          from: {
            transform: "translateX(100%)",
          },
          to: {
            transform: "translateX(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
      },
      zIndex: {
        41: "41",
        1000: "1000",
        1001: "1001",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
