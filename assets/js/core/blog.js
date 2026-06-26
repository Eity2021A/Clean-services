function isElementInRevealViewport(element, offset = 0.9) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewportHeight * offset && rect.bottom > 0;
}

function animateInitialReveal(element, delay = 0) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        element.classList.add("is-visible");
      }, delay);
    });
  });
}

function initBlogScrollReveal() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const revealSelectors = [
    ".blog-hero h1",
    ".featured-blog",
    ".category-box",
    ".blog-card-link",
  ];

  revealSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.dataset.blogRevealReady === "true") return;
      element.classList.add("blog-reveal");
      element.style.setProperty(
        "--blog-reveal-delay",
        `${Math.min(index % 3, 2) * 120}ms`,
      );
      element.dataset.blogRevealReady = "true";
    });
  });

  const revealTargets = document.querySelectorAll(".blog-reveal");
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
    if (element.dataset.blogRevealObserved === "true") return;
    const delay = Number(
      element.style.getPropertyValue("--blog-reveal-delay").replace("ms", "") || 0,
    );
    if (isElementInRevealViewport(element)) {
      animateInitialReveal(element, delay);
    } else {
      observer.observe(element);
    }
    element.dataset.blogRevealObserved = "true";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(initBlogScrollReveal, 120);
});
