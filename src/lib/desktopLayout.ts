function initDesktopLayout() {
  if (typeof window === 'undefined' || window.innerWidth < 768) return;

  const header = document.querySelector('.site-header') as HTMLElement | null;
  const main = document.querySelector('main') as HTMLElement | null;

  if (!header || !main) return;

  const heroArt = new Image();
  heroArt.src = '/assets/your-background.svg';

  const getHeroHeight = () => {
    const naturalWidth = heroArt.naturalWidth || heroArt.width;
    const naturalHeight = heroArt.naturalHeight || heroArt.height;

    if (!naturalWidth || !naturalHeight) {
      return window.innerHeight * 0.6;
    }

    const scaledHeight = (naturalHeight / naturalWidth) * window.innerWidth;
    return Math.min(scaledHeight, window.innerHeight * 0.9);
  };

  const applyOffsets = () => {
    if (window.innerWidth < 768) {
      main.style.removeProperty('padding-top');
      document.documentElement.style.removeProperty('--main-offset');
      return;
    }

    const heroHeight = getHeroHeight();
    const totalOffset = Math.round(heroHeight);

    document.documentElement.style.setProperty('--main-offset', `${totalOffset}px`);
  };

  if (heroArt.complete) {
    applyOffsets();
  } else {
    heroArt.addEventListener('load', applyOffsets, { once: true });
  }

  let resizeTimer: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(applyOffsets, 200);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDesktopLayout);
} else {
  initDesktopLayout();
}
