@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Outfit", sans-serif;

  --color-brand-bg: #090e14;
  --color-brand-card: #111821;
  --color-brand-primary: #00a884;
  --color-brand-primary-hover: #008f70;
  --color-brand-secondary: #005a4a;
  --color-brand-danger: #ea4335;
  --color-brand-text: #f8fafc;
  --color-brand-muted: #94a3b8;
  --color-brand-border: #1e293b;
}

@layer base {
  body {
    @apply bg-brand-bg text-brand-text font-sans;
  }
}

/* Custom scrollbar to match the dark theme */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  @apply bg-brand-bg;
}
::-webkit-scrollbar-thumb {
  @apply bg-brand-border rounded-full;
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-brand-muted/20;
}

/* Mobile Responsiveness & Image Optimization */
@media (max-width: 1024px) {
  html, body {
    width: 100%;
    overflow-x: hidden;
  }

  img {
    max-width: 100%;
    height: auto;
    object-fit: contain !important;
  }

  .container {
    width: 100% !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  /* Ajuste para evitar que cards grandes quebrem o layout */
  .grid {
    width: 100%;
  }
}

@media print {
  body {
    background: white !important;
    color: black !important;
  }
  .print\:hidden {
    display: none !important;
  }
  .bg-brand-card, .bg-brand-bg {
    background: white !important;
    border: 1px solid #eee !important;
    box-shadow: none !important;
  }
  .text-brand-text, .text-brand-muted {
    color: black !important;
  }
  .border-brand-border {
    border-color: #eee !important;
  }
  canvas, svg {
    filter: invert(0) !important;
  }
}
