function onComponentLoaded(id, callback) {
  const existing = document.getElementById(id);
  if (existing && existing.children.length > 0) {
    callback();
    return;
  }

  document.addEventListener("component:loaded", (event) => {
    if (event.detail?.id === id) {
      callback();
    }
  });
}

let bootstrapLoaderPromise = null;
let scrollRevealObserver = null;

function isElementInRevealViewport(element, offset = 0.9) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewportHeight * offset && rect.bottom > 0;
}

function animateInitialReveal(element, className, delay = 0) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        element.classList.add(className);
      }, delay);
    });
  });
}

function ensureBootstrapBundle() {
  if (typeof bootstrap !== "undefined") {
    return Promise.resolve(bootstrap);
  }

  if (bootstrapLoaderPromise) {
    return bootstrapLoaderPromise;
  }

  bootstrapLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-home-bootstrap="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.bootstrap), {
        once: true,
      });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
    script.async = true;
    script.dataset.homeBootstrap = "true";
    script.addEventListener("load", () => resolve(window.bootstrap), {
      once: true,
    });
    script.addEventListener("error", reject, { once: true });
    document.body.appendChild(script);
  });

  return bootstrapLoaderPromise;
}

function scheduleBootstrapBundle() {
  let started = false;

  const startLoading = () => {
    if (started) return;
    started = true;
    ensureBootstrapBundle()
      .then(() => {
        initHeroCarousel();
        initDesktopDropdownHover();
        initSidebarState();
        initGalleryVideoPopup();
        initImpactVideoPopup();
      })
      .catch((error) => {
        console.error("Failed to load Bootstrap bundle:", error);
      });
  };

  const kickoffEvents = ["touchstart", "pointerdown", "mousemove", "keydown"];
  const onInteraction = () => {
    kickoffEvents.forEach((eventName) => {
      window.removeEventListener(eventName, onInteraction, listenerOptions);
    });
    startLoading();
  };

  const listenerOptions = { passive: true };
  kickoffEvents.forEach((eventName) => {
    window.addEventListener(eventName, onInteraction, listenerOptions);
  });

  window.addEventListener(
    "load",
    () => {
      window.setTimeout(
        startLoading,
        window.matchMedia("(max-width: 767.98px)").matches ? 1800 : 900,
      );
    },
    { once: true },
  );
}

function optimizeMediaResources(root = document) {
  if (!root) return;

  root.querySelectorAll("img").forEach((img) => {
    if (!img.getAttribute("decoding")) {
      img.setAttribute("decoding", "async");
    }

    const keepEager =
      img.closest(".hero-section, .main-header, .mobile-topbar") ||
      img.closest(".carousel-item.active");

    if (keepEager) {
      if (!img.getAttribute("loading")) {
        img.setAttribute("loading", "eager");
      }
      if (!img.getAttribute("fetchpriority")) {
        img.setAttribute("fetchpriority", "high");
      }
      return;
    }

    if (!img.getAttribute("loading")) {
      img.setAttribute("loading", "lazy");
    }
  });

  root.querySelectorAll("iframe").forEach((frame) => {
    if (!frame.getAttribute("loading")) {
      frame.setAttribute("loading", "lazy");
    }
  });
}

function normalizePath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0];
  const last = clean.substring(clean.lastIndexOf("/") + 1);
  return last || "index.html";
}

function initActiveNav() {
  const current = normalizePath(window.location.pathname);

  document.querySelectorAll(".navbar-nav .nav-link[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    link.classList.toggle("active", normalizePath(href) === current);
  });

  document.querySelectorAll(".mobile-bottom-nav a[href]").forEach((link) => {
    link.classList.toggle(
      "active",
      normalizePath(link.getAttribute("href") || "") === current,
    );
  });
}

function initDesktopDropdownHover() {
  if (typeof bootstrap === "undefined") return;
  if (window.matchMedia("(max-width: 991.98px)").matches) return;

  document.querySelectorAll(".navbar-nav .dropdown").forEach((dropdown) => {
    if (dropdown.dataset.hoverInitialized === "true") return;

    const toggle = dropdown.querySelector(".dropdown-toggle");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!toggle) return;

    const instance = bootstrap.Dropdown.getOrCreateInstance(toggle);
    let closeTimer = null;

    const openMenu = () => {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
      instance.show();
    };

    const closeMenu = () => {
      closeTimer = window.setTimeout(() => instance.hide(), 180);
    };

    dropdown.addEventListener("mouseenter", openMenu);
    dropdown.addEventListener("mouseleave", closeMenu);
    if (menu) {
      menu.addEventListener("mouseenter", openMenu);
      menu.addEventListener("mouseleave", closeMenu);
    }

    dropdown.dataset.hoverInitialized = "true";
  });
}

function initSidebarState() {
  if (typeof bootstrap === "undefined") return;

  const sidebar = document.getElementById("mobileSidebar");
  if (!sidebar || sidebar.dataset.stateInitialized === "true") return;

  sidebar.addEventListener("show.bs.offcanvas", () => {
    document.body.classList.add("sidebar-open");
  });

  sidebar.addEventListener("hidden.bs.offcanvas", () => {
    document.body.classList.remove("sidebar-open");
  });

  sidebar.dataset.stateInitialized = "true";
}

function initHeroCarousel() {
  if (typeof bootstrap === "undefined") return;

  const heroCarousel = document.getElementById("carouselExampleIndicators");
  if (!heroCarousel || heroCarousel.dataset.initialized === "true") return;

  const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
  if (isMobile) {
    heroCarousel.dataset.initialized = "true";
    return;
  }

  const instance = bootstrap.Carousel.getOrCreateInstance(heroCarousel, {
    interval: 5200,
    ride: "carousel",
    pause: false,
    touch: true,
    wrap: true,
  });

  heroCarousel.style.touchAction = "pan-y";
  instance.cycle();
  heroCarousel.dataset.initialized = "true";
}

function initScrollReveal() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const sectionSelectors = [
    ".hero-section",
    ".stat-component",
    ".top-notch",
    ".testimonial-section",
    ".why-choose-us",
    ".gallery-section",
    ".works",
    ".faq-section",
    ".map-section",
  ];

  const itemSelectors = [
    ".trustedBox",
    ".service-card-link",
    ".testimonial-item",
    ".feature-card",
    ".gallery-item",
    ".faq-item",
  ];

  sectionSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element.dataset.sectionRevealReady === "true") return;
      element.classList.add("section-reveal");
      element.dataset.sectionRevealReady = "true";
    });
  });

  itemSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.dataset.sectionRevealItemReady === "true") return;
      element.classList.add("section-reveal-item");
      element.style.setProperty(
        "--reveal-delay",
        `${Math.min(index % 4, 3) * 90}ms`,
      );
      element.dataset.sectionRevealItemReady = "true";
    });
  });

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    document
      .querySelectorAll(".section-reveal, .section-reveal-item")
      .forEach((element) => element.classList.add("is-visible"));
    return;
  }

  if (!scrollRevealObserver) {
    scrollRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          scrollRevealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px",
      },
    );
  }

  document
    .querySelectorAll(".section-reveal, .section-reveal-item")
    .forEach((element) => {
      if (element.dataset.sectionRevealObserved === "true") return;
      const className = element.classList.contains("section-reveal-item")
        ? "is-visible"
        : "is-visible";
      const delay = Number(
        element.style.getPropertyValue("--reveal-delay").replace("ms", "") || 0,
      );
      if (isElementInRevealViewport(element)) {
        animateInitialReveal(element, className, delay);
      } else {
        scrollRevealObserver.observe(element);
      }
      element.dataset.sectionRevealObserved = "true";
    });
}

function initGalleryVideoPopup() {
  if (typeof bootstrap === "undefined") return;

  const modal = document.getElementById("galleryVideoModal");
  const frame = document.getElementById("galleryVideoFrame");
  if (!modal || !frame || modal.dataset.initialized === "true") return;

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = modal.querySelector(".impact-video-close");
  const stopVideo = () => {
    frame.setAttribute("src", "");
  };

  modal.addEventListener("shown.bs.modal", (event) => {
    const trigger = event.relatedTarget;
    const url = trigger ? trigger.getAttribute("data-video") || "" : "";
    if (url && frame.getAttribute("src") !== url) {
      frame.setAttribute("src", url);
    }
  });

  modal.addEventListener("hide.bs.modal", stopVideo);
  modal.addEventListener("hidden.bs.modal", () => {
    stopVideo();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      bootstrap.Modal.getOrCreateInstance(modal).hide();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      bootstrap.Modal.getOrCreateInstance(modal).hide();
    });
  }

  modal.dataset.initialized = "true";
}

function initImpactVideoPopup() {
  if (typeof bootstrap === "undefined") return;

  const modal = document.getElementById("impactVideoModal");
  const frame = document.getElementById("impactVideoFrame");
  if (!modal || !frame || modal.dataset.initialized === "true") return;

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = modal.querySelector(".impact-video-close");
  const stopVideo = () => {
    frame.setAttribute("src", "");
  };

  modal.addEventListener("shown.bs.modal", (event) => {
    const trigger =
      event.relatedTarget || document.querySelector(".impact-video-trigger");
    const url = trigger ? trigger.getAttribute("data-video") || "" : "";
    if (url && frame.getAttribute("src") !== url) {
      frame.setAttribute("src", url);
    }
  });

  modal.addEventListener("hide.bs.modal", stopVideo);
  modal.addEventListener("hidden.bs.modal", () => {
    stopVideo();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      bootstrap.Modal.getOrCreateInstance(modal).hide();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      bootstrap.Modal.getOrCreateInstance(modal).hide();
    });
  }

  modal.dataset.initialized = "true";
}

function initProjectGalleryMobilePreview() {
  const hero = document.querySelector(".pg-mobile-hero.pg-video-trigger");
  if (!hero || hero.dataset.previewInitialized === "true") return;

  const heroImg = hero.querySelector("img");
  const heroCaption = hero.querySelector(".pg-mobile-hero-caption");
  if (!heroImg || !heroCaption) return;

  document.querySelectorAll(".pg-mobile-preview-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const previewImg = trigger.querySelector("img");
      if (previewImg) {
        heroImg.src = previewImg.getAttribute("src") || heroImg.src;
        heroImg.alt = previewImg.getAttribute("alt") || heroImg.alt;
      }

      hero.setAttribute("data-video", trigger.getAttribute("data-video") || "");
      heroCaption.textContent = trigger.getAttribute("data-caption") || "";
    });
  });

  hero.dataset.previewInitialized = "true";
}

function initTrustedCarousels() {
  const slider = document.getElementById("trustedLogoSlider");
  const track = document.getElementById("trustedLogoTrack");
  if (!slider || !track || slider.dataset.initialized === "true") return;

  slider.style.touchAction = "pan-y";
  const dragCursor = slider.querySelector(".trusted-drag-cursor");
  const supportsHoverCursor =
    !!dragCursor &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const updateDragCursor = (clientX, clientY) => {
    if (!supportsHoverCursor) return;
    const rect = slider.getBoundingClientRect();
    dragCursor.style.left = `${clientX - rect.left}px`;
    dragCursor.style.top = `${clientY - rect.top}px`;
  };

  const showDragCursor = () => {
    if (!supportsHoverCursor) return;
    slider.classList.add("is-cursor-visible");
  };

  const hideDragCursor = () => {
    if (!supportsHoverCursor) return;
    slider.classList.remove("is-cursor-visible");
  };

  let isAnimating = false;
  let autoShiftId = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let wasDragged = false;

  const getClientX = (event) => {
    if (event.touches && event.touches.length) return event.touches[0].clientX;
    if (event.changedTouches && event.changedTouches.length) {
      return event.changedTouches[0].clientX;
    }
    return event.clientX;
  };

  const stepShift = (startOffset = null) => {
    if (isAnimating) return;
    const firstItem = track.querySelector(".trusted-logo-item");
    if (!firstItem) return;

    isAnimating = true;
    const itemWidth = firstItem.getBoundingClientRect().width;

    if (typeof startOffset === "number") {
      track.style.transition = "none";
      track.style.transform = `translateX(${startOffset}px)`;
      void track.offsetWidth;
    }

    track.style.transition = "transform 0.95s ease";
    track.style.transform = `translateX(-${itemWidth}px)`;

    const onDone = () => {
      track.appendChild(firstItem);
      track.style.transition = "none";
      track.style.transform = "translateX(0)";
      void track.offsetWidth;
      track.style.transition = "transform 0.95s ease";
      isAnimating = false;
      track.removeEventListener("transitionend", onDone);
    };

    track.addEventListener("transitionend", onDone);
  };

  const stepShiftPrev = (startOffset = null) => {
    if (isAnimating) return;
    const items = track.querySelectorAll(".trusted-logo-item");
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    isAnimating = true;
    const itemWidth = lastItem.getBoundingClientRect().width;

    track.style.transition = "none";
    track.insertBefore(lastItem, track.firstChild);
    track.style.transform = `translateX(${typeof startOffset === "number" ? startOffset - itemWidth : -itemWidth}px)`;
    void track.offsetWidth;
    track.style.transition = "transform 0.95s ease";
    track.style.transform = "translateX(0)";

    const onDone = () => {
      isAnimating = false;
      track.removeEventListener("transitionend", onDone);
    };

    track.addEventListener("transitionend", onDone);
  };

  const stopAutoShift = () => {
    if (autoShiftId) {
      window.clearInterval(autoShiftId);
      autoShiftId = null;
    }
  };

  const startAutoShift = () => {
    stopAutoShift();
    autoShiftId = window.setInterval(stepShift, 2400);
  };

  const startDrag = (clientX) => {
    if (isAnimating) return;

    isDragging = true;
    wasDragged = false;
    dragStartX = clientX;
    dragDeltaX = 0;
    stopAutoShift();
    slider.classList.add("is-dragging");
    track.style.transition = "none";
  };

  const moveDrag = (clientX) => {
    if (!isDragging) return;

    dragDeltaX = clientX - dragStartX;
    if (Math.abs(dragDeltaX) > 3) wasDragged = true;
    track.style.transform = `translateX(${dragDeltaX}px)`;
  };

  const endDrag = () => {
    if (!isDragging) return;

    isDragging = false;
    slider.classList.remove("is-dragging");

    const firstItem = track.querySelector(".trusted-logo-item");
    const threshold = firstItem
      ? firstItem.getBoundingClientRect().width * 0.28
      : 40;

    if (dragDeltaX <= -threshold) {
      stepShift(dragDeltaX);
    } else if (dragDeltaX >= threshold) {
      stepShiftPrev(dragDeltaX);
    } else {
      track.style.transition = "transform 0.25s ease";
      track.style.transform = "translateX(0)";
    }

    dragDeltaX = 0;
    window.setTimeout(() => {
      if (!slider.matches(":hover")) startAutoShift();
    }, 180);
  };

  startAutoShift();

  slider.addEventListener("mouseenter", () => {
    stopAutoShift();
    showDragCursor();
  });

  slider.addEventListener("mouseleave", () => {
    hideDragCursor();
    if (!isDragging) startAutoShift();
  });

  slider.addEventListener("mousemove", (event) => {
    updateDragCursor(event.clientX, event.clientY);
  });

  slider.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    updateDragCursor(event.clientX, event.clientY);
    showDragCursor();
    startDrag(event.clientX);
  });

  window.addEventListener("mousemove", (event) => {
    moveDrag(event.clientX);
    if (isDragging) updateDragCursor(event.clientX, event.clientY);
  });

  window.addEventListener("mouseup", endDrag);

  slider.addEventListener(
    "touchstart",
    (event) => {
      startDrag(getClientX(event));
    },
    { passive: true },
  );

  slider.addEventListener(
    "touchmove",
    (event) => {
      moveDrag(getClientX(event));
    },
    { passive: true },
  );

  slider.addEventListener("touchend", endDrag);
  slider.addEventListener("touchcancel", endDrag);

  slider.addEventListener("click", (event) => {
    if (!wasDragged) return;
    event.preventDefault();
    event.stopPropagation();
    wasDragged = false;
  });

  track.querySelectorAll("img").forEach((img) => {
    img.setAttribute("draggable", "false");
  });

  window.addEventListener("resize", () => {
    track.style.transition = "none";
    track.style.transform = "translateX(0)";
  });

  slider.dataset.initialized = "true";
}

function initTestimonialSlider() {
  const slider = document.getElementById("testimonialSlider");
  const track = document.getElementById("testimonialTrack");
  if (!slider || !track || slider.dataset.initialized === "true") return;

  slider.style.touchAction = "pan-y";
  const dragCursor = slider.querySelector(".trusted-drag-cursor");
  const supportsHoverCursor =
    !!dragCursor &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const updateDragCursor = (clientX, clientY) => {
    if (!supportsHoverCursor) return;
    const rect = slider.getBoundingClientRect();
    dragCursor.style.left = `${clientX - rect.left}px`;
    dragCursor.style.top = `${clientY - rect.top}px`;
  };

  const showDragCursor = () => {
    if (!supportsHoverCursor) return;
    slider.classList.add("is-cursor-visible");
  };

  const hideDragCursor = () => {
    if (!supportsHoverCursor) return;
    slider.classList.remove("is-cursor-visible");
  };

  let autoShiftId = null;
  let isAnimating = false;
  let isDragging = false;
  let startX = 0;
  let deltaX = 0;
  let itemWidth = 0;
  let activePointerId = null;

  const getFirstItem = () => track.querySelector(".testimonial-item");

  const measureItemWidth = () => {
    const firstItem = getFirstItem();
    if (!firstItem) return 0;
    itemWidth = firstItem.getBoundingClientRect().width;
    return itemWidth;
  };

  const resetTrackPosition = () => {
    track.style.transition = "none";
    track.style.transform = "translateX(0)";
  };

  const animateTo = (offset, duration, onDone) => {
    isAnimating = true;
    track.style.transition = `transform ${duration}ms ease`;
    track.style.transform = `translateX(${offset}px)`;

    const handleDone = () => {
      track.removeEventListener("transitionend", handleDone);
      onDone();
      isAnimating = false;
    };

    track.addEventListener("transitionend", handleDone, { once: true });
  };

  const shiftNext = () => {
    if (isAnimating || isDragging) return;
    const width = measureItemWidth();
    const firstItem = getFirstItem();
    if (!width || !firstItem) return;

    animateTo(-width, 650, () => {
      track.appendChild(firstItem);
      resetTrackPosition();
      void track.offsetWidth;
    });
  };

  const shiftPrev = () => {
    if (isAnimating || isDragging) return;
    const width = measureItemWidth();
    const items = track.querySelectorAll(".testimonial-item");
    const lastItem = items[items.length - 1];
    if (!width || !lastItem) return;

    track.style.transition = "none";
    track.insertBefore(lastItem, track.firstChild);
    track.style.transform = `translateX(-${width}px)`;
    void track.offsetWidth;

    animateTo(0, 650, () => {
      resetTrackPosition();
      void track.offsetWidth;
    });
  };

  const stopAuto = () => {
    if (autoShiftId !== null) {
      window.clearInterval(autoShiftId);
      autoShiftId = null;
    }
  };

  const startAuto = () => {
    stopAuto();
    autoShiftId = window.setInterval(shiftNext, 3200);
  };

  const endDrag = (event) => {
    if (!isDragging || (event && event.pointerId !== activePointerId)) return;

    isDragging = false;
    slider.classList.remove("is-dragging");

    try {
      if (event) slider.releasePointerCapture(event.pointerId);
    } catch (_) {}

    const width = itemWidth || measureItemWidth();
    const threshold = Math.max(50, width * 0.18);

    if (deltaX <= -threshold) {
      const firstItem = getFirstItem();
      if (width && firstItem) {
        animateTo(-width, 450, () => {
          track.appendChild(firstItem);
          resetTrackPosition();
          void track.offsetWidth;
        });
      } else {
        resetTrackPosition();
      }
    } else if (deltaX >= threshold) {
      const items = track.querySelectorAll(".testimonial-item");
      const lastItem = items[items.length - 1];

      if (width && lastItem) {
        track.style.transition = "none";
        track.insertBefore(lastItem, track.firstChild);
        track.style.transform = `translateX(${deltaX - width}px)`;
        void track.offsetWidth;

        animateTo(0, 450, () => {
          resetTrackPosition();
          void track.offsetWidth;
        });
      } else {
        resetTrackPosition();
      }
    } else {
      track.style.transition = "transform 280ms ease";
      track.style.transform = "translateX(0)";
    }

    deltaX = 0;
    activePointerId = null;
    window.setTimeout(startAuto, 500);
  };

  slider.addEventListener("mouseenter", (event) => {
    stopAuto();
    showDragCursor();
    updateDragCursor(event.clientX, event.clientY);
  });

  slider.addEventListener("mouseleave", () => {
    hideDragCursor();
    if (!isDragging) startAuto();
  });

  slider.addEventListener("pointermove", (event) => {
    updateDragCursor(event.clientX, event.clientY);
  });

  slider.addEventListener("pointerdown", (event) => {
    if (isAnimating) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const width = measureItemWidth();
    if (!width) return;

    isDragging = true;
    startX = event.clientX;
    deltaX = 0;
    activePointerId = event.pointerId;

    stopAuto();
    showDragCursor();
    updateDragCursor(event.clientX, event.clientY);
    track.style.transition = "none";
    slider.classList.add("is-dragging");

    try {
      slider.setPointerCapture(event.pointerId);
    } catch (_) {}
  });

  slider.addEventListener("pointermove", (event) => {
    if (!isDragging || event.pointerId !== activePointerId) return;

    deltaX = event.clientX - startX;
    track.style.transform = `translateX(${deltaX}px)`;

    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }
  });

  slider.addEventListener("pointerup", endDrag);
  slider.addEventListener("pointercancel", endDrag);
  slider.addEventListener("lostpointercapture", endDrag);

  window.addEventListener("resize", () => {
    stopAuto();
    isDragging = false;
    isAnimating = false;
    deltaX = 0;
    activePointerId = null;
    slider.classList.remove("is-dragging");
    resetTrackPosition();
    window.setTimeout(startAuto, 180);
  });

  resetTrackPosition();
  startAuto();
  slider.dataset.initialized = "true";
}

function initFaq() {
  const faqRoot = document.getElementById("faq-component");
  if (!faqRoot || faqRoot.dataset.initialized === "true") return;

  const faqItems = faqRoot.querySelectorAll(".faq-item");
  if (!faqItems.length) return;

  const animateFaqItem = (item, shouldOpen) => {
    const answer = item.querySelector(".faq-answer");
    const answerContent = answer?.querySelector("p");
    if (!answer) return;

    if (typeof gsap !== "undefined") {
      gsap.killTweensOf(answer);
      if (answerContent) gsap.killTweensOf(answerContent);

      if (shouldOpen) {
        answer.style.display = "block";
        gsap.fromTo(
          answer,
          { height: 0, opacity: 0, marginTop: 0 },
          {
            height: answer.scrollHeight,
            opacity: 1,
            marginTop: 12,
            duration: 0.72,
            ease: "power3.out",
            onComplete: () => {
              answer.style.height = "auto";
            },
          },
        );
        if (answerContent) {
          gsap.fromTo(
            answerContent,
            { y: 16, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.62,
              delay: 0.08,
              ease: "power2.out",
            },
          );
        }
      } else {
        gsap.to(answer, {
          height: 0,
          opacity: 0,
          marginTop: 0,
          duration: 0.52,
          ease: "power2.inOut",
        });
      }
      return;
    }

    answer.style.height = shouldOpen ? `${answer.scrollHeight}px` : "0px";
    answer.style.opacity = shouldOpen ? "1" : "0";
    answer.style.marginTop = shouldOpen ? "12px" : "0px";
  };

  const syncFaqState = () => {
    faqItems.forEach((item) => {
      const question = item.querySelector(".faq-question");
      if (!question) return;

      question.setAttribute(
        "aria-expanded",
        item.classList.contains("active") ? "true" : "false",
      );
      animateFaqItem(item, item.classList.contains("active"));
    });
  };

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;

    question.addEventListener("click", () => {
      faqItems.forEach((faq) => {
        if (faq !== item) faq.classList.remove("active");
      });
      item.classList.toggle("active");
      syncFaqState();
    });
  });

  if (typeof gsap !== "undefined") {
    gsap.from(faqItems, {
      y: 32,
      opacity: 0,
      duration: 0.78,
      stagger: 0.14,
      ease: "power3.out",
    });
  }

  syncFaqState();
  faqRoot.dataset.initialized = "true";
}

const CART_STORAGE_KEY = "clean_service_cart_v2";
const DEFAULT_CART_IMAGE = "assets/images/services/services_1.png";
const CART_SERVICE_FEE = 100;
const CART_TRANSPORT_FEE = 0;
const CART_DISCOUNT_RATE = 0.1;

function normalizeCartText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseCartNumber(value) {
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCartMoney(value) {
  return `BDT ${Math.round(value).toLocaleString("en-US")}`;
}

function readCartItems() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: normalizeCartText(item.id),
        name: normalizeCartText(item.name),
        category: normalizeCartText(item.category),
        desc: normalizeCartText(item.desc),
        image: normalizeCartText(item.image) || DEFAULT_CART_IMAGE,
        price: Math.max(0, parseCartNumber(item.price)),
        qty: Math.max(1, Math.round(parseCartNumber(item.qty) || 1)),
      }))
      .filter((item) => item.id && item.name);
  } catch (_) {
    return [];
  }
}

function writeCartItems(items) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  renderAllCartUIs();
}

function removeCartItem(itemId) {
  writeCartItems(readCartItems().filter((item) => item.id !== itemId));
}

function getCartSummary(items = readCartItems()) {
  const quantity = items.reduce(
    (total, item) => total + (Number(item.qty) || 0),
    0,
  );
  const subtotal = items.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0,
  );
  const serviceFee = quantity > 0 ? CART_SERVICE_FEE : 0;
  const transportFee = quantity > 0 ? CART_TRANSPORT_FEE : 0;
  const discount = subtotal * CART_DISCOUNT_RATE;
  const total = subtotal + serviceFee + transportFee - discount;

  return {
    quantity,
    subtotal,
    serviceFee,
    transportFee,
    discount,
    total,
  };
}

function createDrawerCartMarkup(item) {
  return `
    <div class="service-cart-item" data-cart-id="${item.id}">
      <div class="service-cart-item-head">
        <h6>${item.name}</h6>
        <button type="button" aria-label="Remove item" data-remove-cart-item="${item.id}">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
      <p class="service-cart-desc">${item.desc}${item.qty > 1 ? ` x${item.qty}` : ""}</p>
      <p class="service-cart-price">${formatCartMoney(item.price * item.qty)}</p>
    </div>
  `;
}

function renderGlobalCart() {
  const items = readCartItems();
  const summary = getCartSummary(items);
  const headerCount = document.querySelector(".cart_length small");
  const fabCount = document.querySelector(".service-cart-fab-count");
  const fabTotal = document.querySelector(".service-cart-fab-total");
  const drawerList = document.querySelector(".service-cart-list");
  const drawerTotal = document.querySelector(".service-cart-total strong");

  if (headerCount) headerCount.textContent = String(summary.quantity);
  if (fabCount) {
    fabCount.textContent =
      summary.quantity === 1 ? "1 Item" : `${summary.quantity} Items`;
  }
  if (fabTotal) fabTotal.textContent = formatCartMoney(summary.total);

  if (drawerList) {
    drawerList.innerHTML = items.length
      ? items.map(createDrawerCartMarkup).join("")
      : `
        <div class="service-cart-item">
          <div class="service-cart-item-head">
            <h6>Your cart is empty</h6>
          </div>
          <p class="service-cart-desc">Add a service to see it here.</p>
          <p class="service-cart-price">${formatCartMoney(0)}</p>
        </div>
      `;
  }

  if (drawerTotal) drawerTotal.textContent = formatCartMoney(summary.total);
}

function renderAllCartUIs() {
  renderGlobalCart();
}

function initServiceCartDrawer() {
  const drawer = document.getElementById("serviceCartDrawer");
  const backdrop = document.getElementById("serviceCartBackdrop");
  const closeBtn = document.getElementById("serviceCartClose");
  if (!drawer || !backdrop || !closeBtn || drawer.dataset.initialized === "true")
    return;

  const openDrawer = () => {
    document.body.classList.add("service-cart-open");
    drawer.setAttribute("aria-hidden", "false");
  };

  const closeDrawer = () => {
    document.body.classList.remove("service-cart-open");
    drawer.setAttribute("aria-hidden", "true");
  };

  window.openServiceCartDrawer = openDrawer;

  const fab = document.getElementById("serviceCartFab");
  if (fab) fab.addEventListener("click", openDrawer);

  closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  document.querySelectorAll("[data-open-cart]").forEach((opener) => {
    opener.addEventListener("click", (event) => {
      if (opener.tagName === "A") event.preventDefault();
      openDrawer();
    });
  });

  drawer.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-cart-item]");
    if (!removeButton) return;

    removeCartItem(removeButton.getAttribute("data-remove-cart-item"));
  });

  renderAllCartUIs();
  drawer.dataset.initialized = "true";
}

function initPageLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  const minVisibleMs = 100;
  const startedAt = Date.now();
  let pageReady = document.readyState === "complete";
  let criticalReady = !(
    document.getElementById("header-placeholder") ||
    document.getElementById("hero-section")
  );
  let hidden = false;

  const hideLoader = () => {
    if (hidden) return;
    hidden = true;
    const elapsed = Date.now() - startedAt;
    const delay = Math.max(0, minVisibleMs - elapsed);

    window.setTimeout(() => {
      loader.classList.add("is-hidden");
      window.setTimeout(() => {
        loader.remove();
      }, 320);
    }, delay);
  };

  const tryHide = () => {
    if (pageReady && criticalReady) hideLoader();
  };

  window.addEventListener(
    "load",
    () => {
      pageReady = true;
      tryHide();
    },
    { once: true },
  );

  document.addEventListener("components:critical-ready", () => {
    criticalReady = true;
    tryHide();
  });

  // Fallback so loader never gets stuck if component fetch fails.
  window.setTimeout(() => {
    if (!criticalReady) criticalReady = true;
    tryHide();
  }, 2200);

  window.addEventListener("pageshow", () => {
    pageReady = true;
    tryHide();
  });

  tryHide();
}

document.addEventListener("DOMContentLoaded", () => {
  initPageLoader();
  optimizeMediaResources();
  initScrollReveal();
  scheduleBootstrapBundle();
  window.addEventListener("storage", renderAllCartUIs);

  const scheduleAfterLoad = () => {
    window.setTimeout(() => {
      initScrollReveal();
      initActiveNav();
      initProjectGalleryMobilePreview();
      initFaq();
      initServiceCartDrawer();
      renderAllCartUIs();
    }, 800);
  };

  if (document.readyState === "complete") {
    scheduleAfterLoad();
  } else {
    window.addEventListener("load", scheduleAfterLoad, { once: true });
  }
});

document.addEventListener("component:loaded", (event) => {
  const id = event.detail?.id;
  if (!id) return;

  optimizeMediaResources(document.getElementById(id));
  initScrollReveal();
});

onComponentLoaded("header-placeholder", initActiveNav);
onComponentLoaded("header-placeholder", initDesktopDropdownHover);
onComponentLoaded("header-placeholder", initSidebarState);
onComponentLoaded("header-placeholder", initServiceCartDrawer);
onComponentLoaded("header-placeholder", renderAllCartUIs);
onComponentLoaded("impact", initImpactVideoPopup);
onComponentLoaded("project-gallery-component", initGalleryVideoPopup);
onComponentLoaded("project-gallery-component", initProjectGalleryMobilePreview);
onComponentLoaded("stats-component", initTrustedCarousels);
onComponentLoaded("testimonial-component", initTestimonialSlider);
onComponentLoaded("faq-component", initFaq);
