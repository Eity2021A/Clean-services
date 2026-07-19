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

function initServicesScrollReveal() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const revealSelectors = [".services h1", ".service-header"];
  const serviceCards = document.querySelectorAll("#service-grid .service-card-link");

  revealSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.dataset.servicesRevealReady === "true") return;
      element.classList.add("services-reveal");
      element.style.setProperty(
        "--services-reveal-delay",
        `${index * 120}ms`,
      );
      element.dataset.servicesRevealReady = "true";
    });
  });

  serviceCards.forEach((card, index) => {
    if (card.dataset.servicesCardRevealReady === "true") return;
    card.classList.add("reveal-init");
    card.style.setProperty("--services-card-delay", `${(index % 4) * 90}ms`);
    card.dataset.servicesCardRevealReady = "true";
  });

  const revealTargets = document.querySelectorAll(".services-reveal");
  if (!revealTargets.length && !serviceCards.length) return;

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    serviceCards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(
          entry.target.style.getPropertyValue("--services-reveal-delay").replace("ms", "") || 0,
        );
        animateInitialReveal(entry.target, delay);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  revealTargets.forEach((element) => {
    if (element.dataset.servicesRevealObserved === "true") return;
    const delay = Number(
      element.style.getPropertyValue("--services-reveal-delay").replace("ms", "") || 0,
    );
    if (isElementInRevealViewport(element)) {
      animateInitialReveal(element, delay);
    } else {
      observer.observe(element);
    }
    element.dataset.servicesRevealObserved = "true";
  });

  const cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(
          entry.target.style.getPropertyValue("--services-card-delay").replace("ms", "") || 0,
        );
        animateInitialReveal(entry.target, delay);
        cardObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  serviceCards.forEach((card) => {
    if (card.dataset.servicesCardRevealObserved === "true") return;
    const delay = Number(
      card.style.getPropertyValue("--services-card-delay").replace("ms", "") || 0,
    );
    if (isElementInRevealViewport(card, 0.96)) {
      animateInitialReveal(card, delay);
    } else {
      cardObserver.observe(card);
    }
    card.dataset.servicesCardRevealObserved = "true";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(initServicesScrollReveal, 120);
});
