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

    // Read section spacing from CSS variables to keep vertical rhythm consistent
    const rootStyles = getComputedStyle(document.documentElement);
    const baseFontSize = parseFloat(rootStyles.fontSize) || 16;
    const toPixels = (value: string) => {
      const numeric = parseFloat(value);
      if (Number.isNaN(numeric)) return 0;
      return value.trim().endsWith('rem') ? numeric * baseFontSize : numeric;
    };

    const sectionMargin = toPixels(rootStyles.getPropertyValue('--space-7'));
    const sectionPadding = toPixels(rootStyles.getPropertyValue('--space-5'));
    const sectionSpacing = sectionMargin * 2 + sectionPadding * 2;

    // Position main content to start after header and parallax artwork
    main.style.paddingTop = `${headerHeight + scaledHeight}px`;

    // Set parallax container height to match scaled artwork plus standard section spacing
    parallaxContainer.style.height = `${scaledHeight + sectionSpacing}px`;
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
