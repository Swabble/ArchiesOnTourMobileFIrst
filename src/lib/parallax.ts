if (typeof window !== 'undefined') {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const resetParallaxOffsets = () => {
    root.style.setProperty('--parallax-svg-offset', '0px');
    root.style.setProperty('--parallax-photo-offset', '0px');
    root.style.setProperty('--svg-opacity', '1');
    root.style.setProperty('--burger-opacity', '0');
  };

  const updateParallaxOffsets = () => {
    if (prefersReducedMotion.matches) {
      resetParallaxOffsets();
      return;
    }

    const scrollY = window.scrollY || 0;
    const windowHeight = window.innerHeight;

    // Übergangsbereich: 0-2 Viewports
    const transitionRange = windowHeight * 2;
    const progress = Math.min(scrollY / transitionRange, 1);

    // SVG scrollt nach oben weg und wird transparent
    root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.5}px`);
    root.style.setProperty('--svg-opacity', `${1 - progress}`);

    // Burger scrollt von unten hoch und wird sichtbar
    root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.8}px`);
    root.style.setProperty('--burger-opacity', `${progress}`);
  };

  updateParallaxOffsets();
  window.addEventListener('scroll', updateParallaxOffsets, { passive: true });

  prefersReducedMotion.addEventListener('change', updateParallaxOffsets);
}
