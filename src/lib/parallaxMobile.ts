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

    // Transition zone: 0vh to 100vh (within container)
    const transitionStart = 0;
    const transitionEnd = window.innerHeight; // 100vh

    // Calculate progress (0 to 1) through the transition zone
    let progress = (relativeScroll - transitionStart) / (transitionEnd - transitionStart);
    progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1

    // Apply smooth easing function for more natural movement
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easedProgress = easeInOutCubic(progress);

    // SVG Layer: Fade out from 0-50% progress, then stay at 0
    const svgOpacity = progress < 0.5 ? 1 - (progress * 2) : 0;
    const svgTranslateY = -easedProgress * 200; // Move up 200px with easing
    svgLayer.style.opacity = svgOpacity.toString();
    svgLayer.style.transform = `translate3d(0, ${svgTranslateY}px, 0)`;
    svgLayer.style.willChange = 'transform, opacity';

    // Burger Layer: Start fading in from 50-100% progress
    const burgerOpacity = progress > 0.5 ? (progress - 0.5) * 2 : 0;
    const burgerTranslateY = progress > 0.5 ? (1 - ((progress - 0.5) * 2)) * window.innerHeight : window.innerHeight;
    burgerLayer.style.opacity = burgerOpacity.toString();
    burgerLayer.style.transform = `translate3d(0, ${burgerTranslateY}px, 0)`;
    burgerLayer.style.willChange = 'transform, opacity';

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
