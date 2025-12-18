/**
 * Mobile Parallax Effect
 * Uses IntersectionObserver for better performance - animations trigger once when in view
 * instead of continuously calculating during scroll
 */

function initMobileParallax() {
  // Only run on mobile devices
  if (window.innerWidth > 767) return;

  const parallaxContainer = document.querySelector('.mobile-parallax');
  const svgLayer = document.querySelector('.mobile-parallax__layer--svg') as HTMLElement;
  const burgerLayer = document.querySelector('.mobile-parallax__layer--burger') as HTMLElement;

  if (!parallaxContainer || !svgLayer || !burgerLayer) return;

  // Set initial state
  svgLayer.style.opacity = '1';
  svgLayer.style.transform = 'translate3d(0, 0, 0)';
  burgerLayer.style.opacity = '0';
  burgerLayer.style.transform = `translate3d(0, ${window.innerHeight}px, 0)`;

  // Track animation state
  let hasAnimated = false;

  // Create IntersectionObserver to trigger animation once when in view
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% visible
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Only animate once when entering viewport
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;

        // Add animation classes for CSS-driven animations
        svgLayer.classList.add('parallax-animate');
        burgerLayer.classList.add('parallax-animate');

        // Start CSS animations - smoother and more predictable
        animateParallaxLayers();
      }
    });
  }, observerOptions);

  // Observe the parallax container
  observer.observe(parallaxContainer);

  function animateParallaxLayers() {
    // Use CSS transitions for smooth, GPU-accelerated animations
    svgLayer.style.transition = 'opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    burgerLayer.style.transition = 'opacity 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s, transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s';

    // Set will-change before animation
    svgLayer.style.willChange = 'transform, opacity';
    burgerLayer.style.willChange = 'transform, opacity';

    // Trigger animations with RAF for better timing
    requestAnimationFrame(() => {
      // SVG fades out and moves up
      svgLayer.style.opacity = '0';
      svgLayer.style.transform = 'translate3d(0, -150px, 0)';

      // Burger fades in and moves into position
      burgerLayer.style.opacity = '1';
      burgerLayer.style.transform = 'translate3d(0, 0, 0)';
    });

    // Clean up will-change after animations complete
    setTimeout(() => {
      svgLayer.style.willChange = 'auto';
      burgerLayer.style.willChange = 'auto';
      svgLayer.style.transition = '';
      burgerLayer.style.transition = '';
    }, 2000);
  }

  // Clean up on resize if switching to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
      observer.disconnect();
    }
  }, { passive: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileParallax);
} else {
  initMobileParallax();
}
