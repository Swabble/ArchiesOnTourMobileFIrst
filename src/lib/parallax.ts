if (typeof window !== 'undefined') {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 767px)');

  const resetParallaxOffsets = () => {
    root.style.setProperty('--parallax-svg-offset', '0px');
    root.style.setProperty('--parallax-photo-offset', '0px');
  };

  const updateParallaxOffsets = () => {
    // Disable parallax when reduced motion is preferred
    if (prefersReducedMotion.matches) {
      resetParallaxOffsets();
      return;
    }

    const scrollY = window.scrollY || 0;

    // Mobile: optimized transform-based parallax for better performance
    // SVG moves up faster, photo reveals from below more slowly
    if (isMobile.matches) {
      // SVG scrollt nach oben weg (negativer Wert für nach oben)
      root.style.setProperty('--parallax-svg-offset', `${-scrollY * 0.3}px`);
      // Foto bewegt sich langsamer nach oben und wird sichtbar
      root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.5}px`);
    } else {
      // Desktop: stronger parallax effect
      // SVG scrollt schneller nach oben weg (negativer Wert)
      root.style.setProperty('--parallax-svg-offset', `${-scrollY * 0.4}px`);
      // Foto bewegt sich langsamer und wird sichtbar
      root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.6}px`);
    }
  };

  // Use requestAnimationFrame for smoother animations
  let ticking = false;
  const requestTick = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateParallaxOffsets();
        ticking = false;
      });
      ticking = true;
    }
  };

  updateParallaxOffsets();
  window.addEventListener('scroll', requestTick, { passive: true });

  prefersReducedMotion.addEventListener('change', updateParallaxOffsets);
  isMobile.addEventListener('change', updateParallaxOffsets);
}
