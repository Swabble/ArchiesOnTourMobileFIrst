if (typeof window !== 'undefined') {
  const updateParallax = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    const subtleOffset = scrollY * 0.04;
    const deepOffset = scrollY * 0.07;

    document.documentElement.style.setProperty('--parallax-offset', `${subtleOffset}px`);
    document.documentElement.style.setProperty('--parallax-offset-strong', `${deepOffset}px`);
  };

  window.addEventListener('DOMContentLoaded', () => {
    updateParallax();
    window.addEventListener('scroll', () => window.requestAnimationFrame(updateParallax));
  });
}
