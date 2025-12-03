if (typeof window !== 'undefined') {
  const setParallaxOffset = () => {
    const offset = window.scrollY;
    document.documentElement.style.setProperty('--parallax-offset', `${offset}px`);
  };

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        setParallaxOffset();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('DOMContentLoaded', setParallaxOffset);
}
