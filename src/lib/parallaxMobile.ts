/**
 * Mobile Parallax Effect
 * Animates SVG and Burger images with smooth scroll-based transitions
 */

function initMobileParallax() {
  // Only run on mobile devices
  if (window.innerWidth > 767) return;

  const parallaxContainer = document.querySelector('.mobile-parallax');
  const svgLayer = document.querySelector('.mobile-parallax__layer--svg') as HTMLElement;
  const burgerLayer = document.querySelector('.mobile-parallax__layer--burger') as HTMLElement;

  if (!parallaxContainer || !svgLayer || !burgerLayer) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    const containerTop = (parallaxContainer as HTMLElement).offsetTop;
    const containerHeight = (parallaxContainer as HTMLElement).offsetHeight;

    // Calculate relative scroll position within the parallax container
    const relativeScroll = scrollY - containerTop;

    // Transition zone: 0vh to 200vh (within container)
    const transitionStart = 0;
    const transitionEnd = window.innerHeight * 2; // 200vh

    // Calculate progress (0 to 1) through the transition zone
    let progress = (relativeScroll - transitionStart) / (transitionEnd - transitionStart);
    progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1

    // SVG Layer: Fade out and move up
    const svgOpacity = 1 - progress;
    const svgTranslateY = -progress * 50; // Move up 50px
    svgLayer.style.opacity = svgOpacity.toString();
    svgLayer.style.transform = `translate3d(0, ${svgTranslateY}px, 0)`;

    // Burger Layer: Fade in and move slower
    const burgerOpacity = progress;
    const burgerTranslateY = (1 - progress) * -30; // Start at -30px, end at 0
    burgerLayer.style.opacity = burgerOpacity.toString();
    burgerLayer.style.transform = `translate3d(0, ${burgerTranslateY}px, 0)`;

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  // Use passive event listener for better scroll performance
  window.addEventListener('scroll', requestTick, { passive: true });

  // Initial update
  updateParallax();

  // Update on resize (if user rotates device)
  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
      window.removeEventListener('scroll', requestTick);
    } else {
      updateParallax();
    }
  }, { passive: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileParallax);
} else {
  initMobileParallax();
}
