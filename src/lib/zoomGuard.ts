export function preventZoom() {
  const handler = (event: WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  };
  window.addEventListener('wheel', handler, { passive: false });
}
