/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  safelist: [
    'translate-y-0',
    '-translate-y-full',
    'max-h-0',
    'max-h-[var(--slide-panel-height)]',
    'h-[var(--slide-panel-height)]',
    'transition-[transform,max-height]',
    'duration-[1100ms]',
    'ease-[cubic-bezier(0.22,1,0.36,1)]',
    'delay-150',
    'motion-reduce:transition-none',
    'motion-reduce:duration-0',
    'motion-reduce:transform-none',
    'motion-reduce:max-h-[var(--slide-panel-height)]'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff715b',
        secondary: '#ffb347',
        accent: '#3dd6a0',
        background: '#1a1a18',
        surface: 'rgba(255, 255, 255, 0.92)',
        'surface-strong': 'rgba(255, 255, 255, 0.98)',
        text: '#ffffff',
        muted: '#4a5568'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        xs: '6px',
        md: '12px',
        lg: '18px',
        xl: '28px',
        pill: '999px'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0, 0, 0, 0.12)',
        strong: '0 12px 36px rgba(0, 0, 0, 0.18)'
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90'
      }
    }
  },
  plugins: []
};
