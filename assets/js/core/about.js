function isElementInRevealViewport(element, offset = 0.9) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewportHeight * offset && rect.bottom > 0;
}

function animateInitialReveal(element, delay = 0) {
  if (!element || element.dataset.revealTriggered === "true") return;

  const runReveal = () => {
    if (element.dataset.revealTriggered === "true") return;
    element.dataset.revealTriggered = "true";

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          element.classList.add("is-visible");
        }, delay);
      });
    });
  };

  if (document.body?.dataset.revealReady === "true") {
    runReveal();
    return;
  }

  document.addEventListener("page:reveal-ready", runReveal, { once: true });
}

function initAboutScrollReveal() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const revealGroups = [
    ".hero-section h1",
    ".best-cleaning .text-center",
    ".best-cleaning .custom-card",
    ".best-cleaning .service-bar",
    ".best-cleaning .about-tabs-nav",
    ".best-cleaning .about-mobile-tabs .tab-content",
    ".contact .contact-box",
  ];

  revealGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.dataset.aboutRevealReady === "true") return;
      element.classList.add("about-reveal");
      element.style.setProperty(
        "--about-reveal-delay",
        `${Math.min(index % 3, 2) * 120}ms`,
      );
      element.dataset.aboutRevealReady = "true";
    });
  });

  const revealTargets = document.querySelectorAll(".about-reveal");
  if (!revealTargets.length) return;

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(
          entry.target.style.getPropertyValue("--about-reveal-delay").replace("ms", "") || 0,
        );
        animateInitialReveal(entry.target, delay);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  revealTargets.forEach((element) => {
    if (element.dataset.aboutRevealObserved === "true") return;
    const delay = Number(
      element.style.getPropertyValue("--about-reveal-delay").replace("ms", "") || 0,
    );
    if (isElementInRevealViewport(element)) {
      animateInitialReveal(element, delay);
    } else {
      observer.observe(element);
    }
    element.dataset.aboutRevealObserved = "true";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(initAboutScrollReveal, 120);
});
