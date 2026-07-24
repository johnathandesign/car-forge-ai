@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);

  --font-sans: var(--font-inter), var(--font-heebo), ui-sans-serif, system-ui, sans-serif;

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
}

:root {
  --radius: 0.625rem;

  --background: oklch(0.12 0.004 285);
  --foreground: oklch(0.97 0 0);

  --card: oklch(0.16 0.005 285);
  --card-foreground: oklch(0.97 0 0);

  --popover: oklch(0.15 0.005 285);
  --popover-foreground: oklch(0.97 0 0);

  --primary: oklch(0.58 0.21 25);
  --primary-foreground: oklch(0.99 0 0);

  --secondary: oklch(0.2 0.005 285);
  --secondary-foreground: oklch(0.97 0 0);

  --muted: oklch(0.2 0.005 285);
  --muted-foreground: oklch(0.68 0.005 285);

  --accent: oklch(0.22 0.006 285);
  --accent-foreground: oklch(0.97 0 0);

  --destructive: oklch(0.58 0.21 25);

  --border: oklch(0.28 0.006 285 / 60%);
  --input: oklch(0.28 0.006 285);
  --ring: oklch(0.58 0.21 25);

  --brand: oklch(0.58 0.21 25);
  --brand-foreground: oklch(0.99 0 0);
}

/* Language-specific typography */
.lang-he {
  font-family: var(--font-heebo), var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}
.lang-en {
  font-family: var(--font-inter), var(--font-heebo), ui-sans-serif, system-ui, sans-serif;
}

/* Accessibility: high contrast */
.a11y-contrast {
  --background: oklch(0 0 0);
  --foreground: oklch(1 0 0);
  --card: oklch(0.08 0 0);
  --card-foreground: oklch(1 0 0);
  --muted-foreground: oklch(0.9 0 0);
  --border: oklch(1 0 0 / 55%);
  --brand: oklch(0.65 0.24 25);
  --primary: oklch(0.65 0.24 25);
}

/* Accessibility: grayscale */
.a11y-grayscale {
  filter: grayscale(1);
}

/* Accessibility: reduced motion */
.a11y-reduce-motion *,
.a11y-reduce-motion *::before,
.a11y-reduce-motion *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
  :focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
    border-radius: 2px;
  }
}
