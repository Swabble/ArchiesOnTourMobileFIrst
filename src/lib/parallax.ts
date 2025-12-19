if (typeof window !== 'undefined') {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 767px)');

  // Store scroll position for RAF updates
  let scrollY = 0;
  let isTicking = false;
  let scrollHandler: (() => void) | null = null;

  const resetParallaxOffsets = () => {
    root.style.setProperty('--parallax-svg-offset', '0px');
    root.style.setProperty('--parallax-photo-offset', '0px');
  };

  const updateParallaxOffsets = () => {
    // Disable parallax when reduced motion is preferred OR on mobile
    // Mobile Safari has fundamental issues with scroll-based parallax (jank, throttled events)
    // Industry best practice: disable parallax on mobile for better UX
    if (prefersReducedMotion.matches || isMobile.matches) {
      resetParallaxOffsets();
      isTicking = false;
      return;
    }

    // Full parallax effect for desktop only
    // SVG scrollt schneller nach oben weg (größerer positiver Offset bedeutet Verschiebung nach oben durch calc Subtraktion)
    root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.25}px`);
    // Burger scrollt langsamer nach oben und wird sichtbar
    root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.08}px`);

    isTicking = false;
  };

  const handleScroll = () => {
    // Store the latest scroll position
    scrollY = window.scrollY || 0;

    // Only schedule one RAF update at a time
    if (!isTicking) {
      requestAnimationFrame(updateParallaxOffsets);
      isTicking = true;
    }
  };

  const enableParallax = () => {
    // Only enable parallax on desktop (non-mobile, non-reduced-motion)
    if (!prefersReducedMotion.matches && !isMobile.matches) {
      scrollY = window.scrollY || 0;
      updateParallaxOffsets();

      if (!scrollHandler) {
        scrollHandler = handleScroll;
        window.addEventListener('scroll', scrollHandler, { passive: true });
      }
    }
  };

  const disableParallax = () => {
    resetParallaxOffsets();

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

  // Update on media query changes - add/remove scroll listener dynamically
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
