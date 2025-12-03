if (typeof window !== 'undefined') {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 767px)');

  const resetParallaxOffsets = () => {
    root.style.setProperty('--parallax-svg-offset', '0px');
    root.style.setProperty('--parallax-photo-offset', '0px');
  };

  const updateParallaxOffsets = () => {
    // Disable parallax when reduced motion is preferred or on mobile
    if (prefersReducedMotion.matches || isMobile.matches) {
      resetParallaxOffsets();
      return;
    }

    const scrollY = window.scrollY || 0;

    // Full parallax effect for desktop only
    // SVG scrollt schneller nach oben weg (größerer positiver Offset bedeutet Verschiebung nach oben durch calc Subtraktion)
    root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.25}px`);
    // Burger scrollt langsamer nach oben und wird sichtbar
    root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.08}px`);
  };

  updateParallaxOffsets();
  window.addEventListener('scroll', updateParallaxOffsets, { passive: true });

  prefersReducedMotion.addEventListener('change', updateParallaxOffsets);
  isMobile.addEventListener('change', updateParallaxOffsets);
}
