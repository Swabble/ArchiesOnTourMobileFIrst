/**
 * Content Background Parallax Effect
 * Applies parallax scrolling to the content background on desktop only
 * Mobile: Background is static for better performance
 */

if (typeof window !== 'undefined') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 767px)');

  const background = document.querySelector('.content-background') as HTMLElement;

  if (!background) {
    console.warn('Content background element not found');
  }

  let scrollY = 0;
  let isTicking = false;
  let scrollHandler: (() => void) | null = null;

  const updateBackgroundPosition = () => {
    if (!background) {
      isTicking = false;
      return;
    }

    // Parallax factor: background scrolls at 30% of normal scroll speed (slower = more dramatic parallax)
    const parallaxFactor = 0.3;
    const offset = scrollY * parallaxFactor;

    // Apply transform for GPU-accelerated parallax
    background.style.transform = `translate3d(0, ${offset}px, 0)`;

    isTicking = false;
  };

  const handleScroll = () => {
    scrollY = window.scrollY || 0;

    if (!isTicking) {
      requestAnimationFrame(updateBackgroundPosition);
      isTicking = true;
    }
  };

  const enableParallax = () => {
    if (!background) return;

    // Only enable parallax on desktop (non-mobile, non-reduced-motion)
    if (!prefersReducedMotion.matches && !isMobile.matches) {
      scrollY = window.scrollY || 0;
      updateBackgroundPosition();

      // Set will-change for better compositing performance
      background.style.willChange = 'transform';

      if (!scrollHandler) {
        scrollHandler = handleScroll;
        window.addEventListener('scroll', scrollHandler, { passive: true });
      }
    }
  };

  const disableParallax = () => {
    if (!background) return;

    // Reset transform
    background.style.transform = 'translate3d(0, 0, 0)';
    background.style.willChange = 'auto';

    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollHandler = null;
    }
  };

  // Initial setup based on current viewport
  if (isMobile.matches || prefersReducedMotion.matches) {
    disableParallax();
  } else {
    enableParallax();
  }

  // Update on media query changes
  prefersReducedMotion.addEventListener('change', () => {
    if (prefersReducedMotion.matches || isMobile.matches) {
      disableParallax();
    } else {
      enableParallax();
    }
  });

  isMobile.addEventListener('change', () => {
    if (isMobile.matches || prefersReducedMotion.matches) {
      disableParallax();
    } else {
      enableParallax();
    }
  });
}
