if (typeof window !== 'undefined') {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 767px)');

  // Store scroll position for RAF updates
  let scrollY = 0;
  let isTicking = false;

  const resetParallaxOffsets = () => {
    root.style.setProperty('--parallax-svg-offset', '0px');
    root.style.setProperty('--parallax-photo-offset', '0px');
  };

  const updateParallaxOffsets = () => {
    // Disable parallax when reduced motion is preferred
    if (prefersReducedMotion.matches) {
      resetParallaxOffsets();
      isTicking = false;
      return;
    }

    // Use reduced parallax values on mobile for better performance
    if (isMobile.matches) {
      // Reduced parallax effect for mobile (50% of desktop values)
      root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.125}px`);
      root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.04}px`);
    } else {
      // Full parallax effect for desktop
      // SVG scrollt schneller nach oben weg (größerer positiver Offset bedeutet Verschiebung nach oben durch calc Subtraktion)
      root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.25}px`);
      // Burger scrollt langsamer nach oben und wird sichtbar
      root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.08}px`);
    }

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

  // Initial setup
  scrollY = window.scrollY || 0;
  updateParallaxOffsets();

  // Use RAF-throttled scroll handler for better performance
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Update on media query changes
  prefersReducedMotion.addEventListener('change', () => {
    scrollY = window.scrollY || 0;
    updateParallaxOffsets();
  });
  isMobile.addEventListener('change', () => {
    scrollY = window.scrollY || 0;
    updateParallaxOffsets();
  });
}
