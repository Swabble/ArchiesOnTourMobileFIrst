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

    // Übergangsbereich: 0-1.5 Viewports für schnelleren Übergang
    const transitionRange = windowHeight * 1.5;
    const progress = Math.min(scrollY / transitionRange, 1);

    // SVG scrollt nach oben weg und wird transparent
    root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.6}px`);
    root.style.setProperty('--svg-opacity', `${Math.max(0, 1 - progress)}`);

    // Burger scrollt von Mitte hoch und wird sichtbar
    // Startet bei 50vh, bewegt sich nach oben
    root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.4}px`);
    root.style.setProperty('--burger-opacity', `${Math.min(1, progress)}`);
  };

  updateParallaxOffsets();
  window.addEventListener('scroll', updateParallaxOffsets, { passive: true });

  prefersReducedMotion.addEventListener('change', updateParallaxOffsets);
}
