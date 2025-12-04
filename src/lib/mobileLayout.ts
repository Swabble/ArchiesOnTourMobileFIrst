/**
 * Mobile Layout Manager
 * Dynamically adjusts spacing based on header and SVG heights
 */

function initMobileLayout() {
  // Only run on mobile devices
  if (window.innerWidth > 767) return;

  const header = document.querySelector('.site-header') as HTMLElement;
  const main = document.querySelector('main') as HTMLElement;
  const svgLayer = document.querySelector('.mobile-parallax__layer--svg img') as HTMLImageElement;
  const parallaxContainer = document.querySelector('.mobile-parallax') as HTMLElement;

  if (!header || !main || !svgLayer || !parallaxContainer) return;

  function adjustLayout() {
    // Wait for SVG to load
    if (!svgLayer.complete) {
      svgLayer.addEventListener('load', adjustLayout, { once: true });
      return;
    }

    const headerHeight = header.offsetHeight;
    const svgHeight = svgLayer.naturalHeight || svgLayer.offsetHeight;

    // Calculate proper scale for SVG to fit viewport width
    const svgNaturalWidth = svgLayer.naturalWidth || svgLayer.offsetWidth;
    const viewportWidth = window.innerWidth;
    const scale = viewportWidth / svgNaturalWidth;
    const scaledHeight = svgHeight * scale;

    // Position main content to start after header and parallax artwork
    main.style.paddingTop = `${headerHeight + scaledHeight}px`;

    // Set parallax container height to match scaled artwork only
    // Section spacing is handled by CSS margin rules
    parallaxContainer.style.height = `${scaledHeight}px`;
  }

  // Initial adjustment
  adjustLayout();

  // Re-adjust on window resize
  let resizeTimer: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (window.innerWidth <= 767) {
        adjustLayout();
      }
    }, 250);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileLayout);
} else {
  initMobileLayout();
}
