if (typeof window !== 'undefined') {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const resetParallaxOffsets = () => {
    root.style.setProperty('--parallax-svg-offset', '0px');
    root.style.setProperty('--parallax-photo-offset', '0px');
  };

  const updateParallaxOffsets = () => {
    if (prefersReducedMotion.matches) {
      resetParallaxOffsets();
      return;
    }
    const scrollY = window.scrollY || 0;
    root.style.setProperty('--parallax-svg-offset', `${scrollY * 0.16}px`);
    root.style.setProperty('--parallax-photo-offset', `${scrollY * 0.1}px`);
  };

  updateParallaxOffsets();
  window.addEventListener('scroll', updateParallaxOffsets, { passive: true });

  prefersReducedMotion.addEventListener('change', updateParallaxOffsets);
}
