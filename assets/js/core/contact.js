function initContactScrollReveal() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const revealSelectors = [
    ".contact-section h1",
    ".info-card-item",
    ".contact-box",
    ".map-wrapper",
  ];

  revealSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.dataset.contactRevealReady === "true") return;
      element.classList.add("contact-reveal");
      element.style.setProperty(
        "--contact-reveal-delay",
        `${Math.min(index % 3, 2) * 120}ms`,
      );
      element.dataset.contactRevealReady = "true";
    });
  });

  const revealTargets = document.querySelectorAll(".contact-reveal");
  if (!revealTargets.length) return;

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  revealTargets.forEach((element) => {
    if (element.dataset.contactRevealObserved === "true") return;
    observer.observe(element);
    element.dataset.contactRevealObserved = "true";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(initContactScrollReveal, 120);
});

document.addEventListener("component:loaded", (event) => {
  if (event.detail?.id === "map-component") {
    initContactScrollReveal();
  }
});
