if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

    revealElements.forEach((el, index) => {
      const delay = Math.min(index * 120, 600);
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      observer.observe(el);
    });
  });
}
