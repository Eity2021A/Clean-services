// assets/js/components.js
document.addEventListener("DOMContentLoaded", () => {
  const componentBase = window.location.pathname.includes("/services/")
    ? "../"
    : "";
  const componentCache = new Map();
  const layoutBase = `${componentBase}components/layout`;
  const homeSectionBase = `${componentBase}components/sections/home`;

  const criticalTargets = [
    ["header-placeholder", `${layoutBase}/header.html`],
    ["hero-section", `${homeSectionBase}/heroSection.html`],
  ];

  const componentTargets = [
    ["footer-placeholder", `${layoutBase}/footer.html`],
    ["stats-component", `${homeSectionBase}/stats.html`],
    ["top-notch-component", `${homeSectionBase}/topNotch.html`],
    [
      "testimonial-component",
      `${homeSectionBase}/testimonial.html`,
    ],
    ["why-choose-us-component", `${homeSectionBase}/chooseUs.html`],
    ["why-works-us-component", `${homeSectionBase}/works.html`],
    ["impact", `${homeSectionBase}/impact.html`],
    ["faq-component", `${homeSectionBase}/faq.html`],
    ["map-component", `${homeSectionBase}/map.html`],
    [
      "project-gallery-component",
      `${homeSectionBase}/projectGallery.html`,
    ],
  ];

  const fetchComponentMarkup = async (file) => {
    if (!componentCache.has(file)) {
      componentCache.set(
        file,
        fetch(file, { cache: "no-cache" }).then(async (response) => {
          if (!response.ok) throw new Error(`Could not load ${file}`);
          return response.text();
        }),
      );
    }

    return componentCache.get(file);
  };

  const loadComponent = async (id, file) => {
    const element = document.getElementById(id);
    if (!element) return;

    try {
      element.innerHTML = await fetchComponentMarkup(file);
      document.dispatchEvent(
        new CustomEvent("component:loaded", {
          detail: { id, file },
        }),
      );
    } catch (error) {
      console.error("Error loading component:", error);
    }
  };

  const loadCriticalThenRest = async () => {
    const presentCriticalTargets = criticalTargets.filter(([id]) =>
      document.getElementById(id),
    );
    const presentComponentTargets = componentTargets.filter(([id]) =>
      document.getElementById(id),
    );

    await Promise.all(
      presentCriticalTargets.map(([id, file]) => loadComponent(id, file)),
    );

    document.dispatchEvent(
      new CustomEvent("components:critical-ready", {
        detail: { ids: presentCriticalTargets.map(([id]) => id) },
      }),
    );

    const scheduleRest =
      window.requestIdleCallback ||
      ((callback) => window.setTimeout(callback, 120));

    scheduleRest(() => {
      if (!presentComponentTargets.length) return;

      if (!("IntersectionObserver" in window)) {
        presentComponentTargets.forEach(([id, file]) => {
          loadComponent(id, file);
        });
        return;
      }

      const observedIds = new Set();
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const targetId = entry.target.id;
            const target = presentComponentTargets.find(([id]) => id === targetId);
            if (!target || observedIds.has(targetId)) return;

            observedIds.add(targetId);
            observer.unobserve(entry.target);
            loadComponent(target[0], target[1]);
          });
        },
        {
          rootMargin: "600px 0px",
          threshold: 0.01,
        },
      );

      presentComponentTargets.forEach(([id]) => {
        const element = document.getElementById(id);
        if (!element) return;
        observer.observe(element);
      });
    });
  };

  loadCriticalThenRest();
});

// =============================Toggle ==================================

// Function to swap language
function toggleLang(isEn) {
  const targets = document.querySelectorAll("[data-en]");
  targets.forEach((el) => {
    // Smooth fade effect
    el.style.opacity = 0;
    setTimeout(() => {
      el.innerText = isEn
        ? el.getAttribute("data-en")
        : el.getAttribute("data-bn");
      el.style.opacity = 1;
    }, 150);
  });
  localStorage.setItem("selectedLang", isEn ? "en" : "bn");
}

function initLanguageToggles() {
  const desktopToggle = document.getElementById("languageToggle");
  const mobileToggle = document.getElementById("languageToggleMobile2");
  if (!desktopToggle && !mobileToggle) return;

  const savedLang = localStorage.getItem("selectedLang");
  const isEn = savedLang ? savedLang === "en" : true;

  [desktopToggle, mobileToggle].forEach((toggle) => {
    if (toggle) toggle.checked = isEn;
  });
  toggleLang(isEn);

  const onChange = (checked) => {
    [desktopToggle, mobileToggle].forEach((toggle) => {
      if (toggle) toggle.checked = checked;
    });
    toggleLang(checked);
  };

  if (desktopToggle) {
    desktopToggle.addEventListener("change", (e) => onChange(e.target.checked));
  }
  if (mobileToggle) {
    mobileToggle.addEventListener("change", (e) => onChange(e.target.checked));
  }
}

document.addEventListener("component:loaded", (event) => {
  if (event.detail && event.detail.id === "header-placeholder") {
    initLanguageToggles();
  }
});
