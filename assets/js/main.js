let faqInitialized = false;
let dropdownHoverInitialized = false;
let impactVideoInitialized = false;
let topNotchRevealInitialized = false;
let sidebarStateInitialized = false;
let sectionRevealObserver = null;
let trustedSectionAnimated = false;
let serviceLightRevealInitialized = false;

// Run `callback` once the named placeholder component has been injected.
// components.js loads header/footer/etc. asynchronously and dispatches a
// "component:loaded" CustomEvent (with detail.id) after setting each
// component's innerHTML. Init code that touches a component's DOM must wait
// for this event, otherwise the elements don't exist yet. If the component is
// already populated when this is called, run the callback immediately.
function onComponentLoaded(id, callback) {
  const existing = document.getElementById(id);
  if (existing && existing.children.length > 0) {
    callback();
    return;
  }
  document.addEventListener("component:loaded", (event) => {
    if (event.detail && event.detail.id === id) {
      callback();
    }
  });
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

function initReadingProgress() {
  let progress = document.querySelector(".reading-progress");
  if (!progress) {
    progress = document.createElement("div");
    progress.className = "reading-progress";
    progress.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.id = "readingBar";
    progress.appendChild(bar);
    document.body.appendChild(progress);
  }

  const bar = progress.querySelector("span");
  if (!bar || progress.dataset.initialized === "true") return;

  let rafId = null;

  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    bar.style.width = `${pct}%`;
  };

  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      update();
    });
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", update);
  update();

  progress.dataset.initialized = "true";
}

function optimizeMediaResources(root = document) {
  if (!root) return;

  const images = root.querySelectorAll("img");
  images.forEach((img) => {
    if (!img.getAttribute("decoding")) {
      img.setAttribute("decoding", "async");
    }

    const keepEager =
      img.closest(
        ".hero-section, #hero-section, .page-loader, .main-header, .mobile-topbar",
      ) ||
      img.closest(".carousel-item.active");

    if (keepEager) {
      if (!img.getAttribute("loading")) {
        img.setAttribute("loading", "eager");
      }

      if (
        img.closest(".hero-section, #hero-section, .carousel-item.active") &&
        !img.getAttribute("fetchpriority")
      ) {
        img.setAttribute("fetchpriority", "high");
      }
      return;
    }

    if (!img.getAttribute("loading")) {
      img.setAttribute("loading", "lazy");
    }
    if (!img.getAttribute("fetchpriority")) {
      img.setAttribute("fetchpriority", "low");
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
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link[href]");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    const target = normalizePath(href);
    const isContactAnchor = href.includes("#") && current === "index.html";
    const isActive = target === current || isContactAnchor;
    link.classList.toggle("active", isActive);
  });

  const mobileNavLinks = document.querySelectorAll(
    ".mobile-bottom-nav a[href]",
  );
  mobileNavLinks.forEach((link) => {
    const target = normalizePath(link.getAttribute("href") || "");
    link.classList.toggle("active", target === current);
  });
}

function initTestimonialSlider() {
  const slider = document.getElementById("testimonialSlider");
  const track = document.getElementById("testimonialTrack");
  if (!slider || !track || slider.dataset.initialized === "true") return;

  const shiftNext = () => {
    const firstItem = track.querySelector(".testimonial-item");
    if (!firstItem) return;
    const itemWidth = firstItem.getBoundingClientRect().width;

    track.style.transition = "transform 0.9s ease";
    track.style.transform = `translateX(-${itemWidth}px)`;

    const onDone = () => {
      track.appendChild(firstItem);
      track.style.transition = "none";
      track.style.transform = "translateX(0)";
      void track.offsetWidth;
      track.style.transition = "transform 0.9s ease";
      track.removeEventListener("transitionend", onDone);
    };

    track.addEventListener("transitionend", onDone);
  };

  let autoShiftId = window.setInterval(shiftNext, 2800);
  const stopAuto = () => {
    if (autoShiftId) {
      window.clearInterval(autoShiftId);
      autoShiftId = null;
    }
  };
  const startAuto = () => {
    stopAuto();
    autoShiftId = window.setInterval(shiftNext, 2800);
  };

  slider.addEventListener("mouseenter", stopAuto);
  slider.addEventListener("mouseleave", startAuto);

  let isDragging = false;
  let startX = 0;
  let deltaX = 0;
  let itemWidth = 0;
  let activePointerId = null;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const firstItem = track.querySelector(".testimonial-item");
    if (!firstItem) return;
    itemWidth = firstItem.getBoundingClientRect().width;
    isDragging = true;
    startX = e.clientX;
    deltaX = 0;
    activePointerId = e.pointerId;
    stopAuto();
    track.style.transition = "none";
    slider.classList.add("is-dragging");
    try {
      slider.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onPointerMove = (e) => {
    if (!isDragging || e.pointerId !== activePointerId) return;
    deltaX = e.clientX - startX;
    track.style.transform = `translateX(${deltaX}px)`;
  };

  const endDrag = (e) => {
    if (!isDragging || (e && e.pointerId !== activePointerId)) return;
    isDragging = false;
    slider.classList.remove("is-dragging");
    try {
      if (e) slider.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const threshold = Math.max(60, itemWidth * 0.15);

    if (deltaX < -threshold) {
      track.style.transition = "transform 0.5s ease";
      track.style.transform = `translateX(-${itemWidth}px)`;
      const onDone = () => {
        const firstItem = track.querySelector(".testimonial-item");
        if (firstItem) track.appendChild(firstItem);
        track.style.transition = "none";
        track.style.transform = "translateX(0)";
        void track.offsetWidth;
        track.style.transition = "transform 0.9s ease";
        track.removeEventListener("transitionend", onDone);
      };
      track.addEventListener("transitionend", onDone);
    } else if (deltaX > threshold) {
      const items = track.querySelectorAll(".testimonial-item");
      const lastItem = items[items.length - 1];
      if (lastItem) {
        track.style.transition = "none";
        track.insertBefore(lastItem, track.firstChild);
        track.style.transform = `translateX(${deltaX - itemWidth}px)`;
        void track.offsetWidth;
      }
      track.style.transition = "transform 0.5s ease";
      track.style.transform = "translateX(0)";
    } else {
      track.style.transition = "transform 0.3s ease";
      track.style.transform = "translateX(0)";
    }

    activePointerId = null;
    startAuto();
  };

  slider.addEventListener("pointerdown", onPointerDown);
  slider.addEventListener("pointermove", onPointerMove);
  slider.addEventListener("pointerup", endDrag);
  slider.addEventListener("pointercancel", endDrag);
  slider.addEventListener("pointerleave", endDrag);

  window.addEventListener("resize", () => {
    track.style.transition = "none";
    track.style.transform = "translateX(0)";
    window.setTimeout(() => {
      track.style.transition = "transform 1.1s ease";
    }, 60);
  });

  slider.dataset.initialized = "true";
}

function initTrustedCarousels() {
  const slider = document.getElementById("trustedLogoSlider");
  const track = document.getElementById("trustedLogoTrack");
  if (!slider || !track || slider.dataset.initialized === "true") return;
  slider.style.touchAction = "pan-y";

  let isAnimating = false;

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
    const fromOffset =
      typeof startOffset === "number" ? startOffset - itemWidth : -itemWidth;
    track.style.transform = `translateX(${fromOffset}px)`;
    void track.offsetWidth;
    track.style.transition = "transform 0.95s ease";
    track.style.transform = "translateX(0)";
    const onDone = () => {
      isAnimating = false;
      track.removeEventListener("transitionend", onDone);
    };
    track.addEventListener("transitionend", onDone);
  };

  let autoShiftId = null;
  const startAutoShift = () => {
    if (autoShiftId) window.clearInterval(autoShiftId);
    autoShiftId = window.setInterval(stepShift, 2400);
  };
  const stopAutoShift = () => {
    if (autoShiftId) {
      window.clearInterval(autoShiftId);
      autoShiftId = null;
    }
  };
  startAutoShift();

  slider.addEventListener("mouseenter", () => {
    stopAutoShift();
  });

  slider.addEventListener("mouseleave", () => {
    startAutoShift();
  });

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

  slider.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    startDrag(event.clientX);
  });

  window.addEventListener("mousemove", (event) => {
    moveDrag(event.clientX);
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

function initHeroCarousel() {
  if (typeof bootstrap === "undefined") return;
  const heroCarousel = document.getElementById("carouselExampleIndicators");
  if (!heroCarousel || heroCarousel.dataset.initialized === "true") return;

  const instance = bootstrap.Carousel.getOrCreateInstance(heroCarousel, {
    interval: 5200,
    ride: "carousel",
    pause: false,
    touch: true,
    wrap: true,
  });

  heroCarousel.setAttribute("data-bs-touch", "true");
  heroCarousel.style.touchAction = "pan-y";
  instance.cycle();
  heroCarousel.dataset.initialized = "true";
}

function initProjectGalleryCarousel() {
  if (typeof bootstrap === "undefined") return;
  const mobileCarousel = document.getElementById("pgMobileCarousel");
  if (!mobileCarousel || mobileCarousel.dataset.initialized === "true") return;

  const instance = bootstrap.Carousel.getOrCreateInstance(mobileCarousel, {
    interval: false,
    ride: false,
    pause: true,
    touch: true,
    wrap: true,
  });

  mobileCarousel.setAttribute("data-bs-touch", "true");
  mobileCarousel.style.touchAction = "pan-y";

  // Manual grab/drag navigation for mouse and touch
  let startX = 0;
  let dragging = false;
  let pointerType = "";
  const swipeThreshold = 45;

  const onPointerDown = (event) => {
    dragging = true;
    pointerType = event.pointerType || "mouse";
    startX = event.clientX;
    mobileCarousel.setPointerCapture?.(event.pointerId);
    mobileCarousel.style.cursor = "grabbing";
  };

  const onPointerUp = (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    dragging = false;
    mobileCarousel.style.cursor = pointerType === "mouse" ? "grab" : "default";

    if (Math.abs(deltaX) < swipeThreshold) return;
    if (deltaX < 0) {
      instance.next();
    } else {
      instance.prev();
    }
  };

  mobileCarousel.style.cursor = "grab";
  mobileCarousel.addEventListener("pointerdown", onPointerDown);
  mobileCarousel.addEventListener("pointerup", onPointerUp);
  mobileCarousel.addEventListener("pointercancel", () => {
    dragging = false;
    mobileCarousel.style.cursor = pointerType === "mouse" ? "grab" : "default";
  });

  mobileCarousel.dataset.initialized = "true";
}

function initProjectGalleryMobilePreview() {
  const hero = document.querySelector(".pg-mobile-hero.pg-video-trigger");
  if (!hero || hero.dataset.previewInitialized === "true") return;

  const heroImg = hero.querySelector("img");
  const heroCaption = hero.querySelector(".pg-mobile-hero-caption");
  const previewTriggers = document.querySelectorAll(
    ".pg-mobile-preview-trigger",
  );
  if (!heroImg || !previewTriggers.length) return;

  previewTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const previewImg = trigger.querySelector("img");
      const nextVideo = trigger.getAttribute("data-video") || "";
      const nextCaption = trigger.getAttribute("data-caption") || "";

      if (previewImg) {
        heroImg.setAttribute("src", previewImg.getAttribute("src") || "");
        heroImg.setAttribute(
          "alt",
          previewImg.getAttribute("alt") || "featured video",
        );
      }

      if (nextVideo) {
        hero.setAttribute("data-video", nextVideo);
      }

      if (heroCaption && nextCaption) {
        heroCaption.textContent = nextCaption;
      }
    });
  });

  hero.dataset.previewInitialized = "true";
}

function initFaq() {
  if (faqInitialized) return;

  const faqItems = document.querySelectorAll(".faq-item");
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

      if (typeof gsap !== "undefined") {
        gsap.fromTo(
          item.querySelector(".faq-answer"),
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        );
      }

      syncFaqState();
    });
  });

  if (typeof gsap !== "undefined") {
    gsap.from(".faq-item", {
      y: 30,
      opacity: 0,
      duration: 0.7,
      stagger: 0.15,
      ease: "power3.out",
    });

    gsap.from(".faq-title, .faq-subtitle", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
    });
  }

  syncFaqState();
  faqInitialized = true;
}

function initDesktopDropdownHover() {
  if (dropdownHoverInitialized || typeof bootstrap === "undefined") return;
  if (window.matchMedia("(max-width: 991.98px)").matches) return;

  const dropdowns = document.querySelectorAll(".navbar-nav .dropdown");
  if (!dropdowns.length) return;

  dropdowns.forEach((dropdown) => {
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
      closeTimer = window.setTimeout(() => {
        instance.hide();
      }, 180);
    };

    dropdown.addEventListener("mouseenter", openMenu);
    dropdown.addEventListener("mouseleave", closeMenu);
    if (menu) {
      menu.addEventListener("mouseenter", openMenu);
      menu.addEventListener("mouseleave", closeMenu);
    }
    // Keep Bootstrap's native click toggle behavior enabled.
  });

  dropdownHoverInitialized = true;
}

function initImpactVideoPopup() {
  if (impactVideoInitialized || typeof bootstrap === "undefined") return;

  const modal = document.getElementById("impactVideoModal");
  const frame = document.getElementById("impactVideoFrame");
  if (!modal || !frame) return;

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = modal.querySelector(".impact-video-close");
  const stopVideo = () => {
    frame.setAttribute("src", "");
  };

  // Read the video URL from whichever element opened the modal
  // (Bootstrap passes it as event.relatedTarget), falling back to the
  // page's impact trigger. This avoids relying on a shared variable that
  // can go stale.
  const resolveVideoUrl = (event) => {
    const trigger =
      (event && event.relatedTarget) ||
      document.querySelector(".impact-video-trigger");
    return trigger ? trigger.getAttribute("data-video") || "" : "";
  };

  // Set the src on `shown` (AFTER the open animation finishes) so the
  // iframe has real dimensions when YouTube initializes. Setting it on
  // `show` lets the player init against a still-animating/zero-size box,
  // which renders a black screen intermittently.
  modal.addEventListener("shown.bs.modal", (event) => {
    const url = resolveVideoUrl(event);
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

  impactVideoInitialized = true;
}

function initGalleryVideoPopup() {
  if (typeof bootstrap === "undefined") return;

  const modal = document.getElementById("galleryVideoModal");
  const frame = document.getElementById("galleryVideoFrame");
  if (!modal || !frame) return;
  if (modal.dataset.initialized === "true") return;

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = modal.querySelector(".impact-video-close");
  const stopVideo = () => {
    frame.setAttribute("src", "");
  };

  // Set the src on `shown` (AFTER the open animation finishes) so the
  // iframe has real dimensions when YouTube initializes — setting it while
  // the modal is still animating renders a black screen intermittently.
  // The URL is read from event.relatedTarget (the trigger that opened the
  // modal), so it stays correct even for cloned/dynamic triggers and the
  // mobile hero whose data-video is updated on the fly.
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

function initTopNotchReveal() {
  if (topNotchRevealInitialized) return;

  const cards = document.querySelectorAll(".service-card-link");
  if (!cards.length) return;

  cards.forEach((card) => card.classList.add("reveal-init"));

  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    topNotchRevealInitialized = true;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const visibleCards = Array.from(cards).filter((card) =>
          card.classList.contains("reveal-init"),
        );

        visibleCards.forEach((card, index) => {
          window.setTimeout(() => {
            card.classList.add("is-visible");
          }, index * 180);
        });

        observer.disconnect();
      });
    },
    { threshold: 0.2 },
  );

  const section = document.querySelector("#top-notch-component");
  if (section) observer.observe(section);

  topNotchRevealInitialized = true;
}

function initSidebarState() {
  if (sidebarStateInitialized || typeof bootstrap === "undefined") return;

  const sidebar = document.getElementById("mobileSidebar");
  if (!sidebar) return;

  sidebar.addEventListener("show.bs.offcanvas", () => {
    document.body.classList.add("sidebar-open");
  });

  sidebar.addEventListener("hidden.bs.offcanvas", () => {
    document.body.classList.remove("sidebar-open");
  });

  sidebarStateInitialized = true;
}

function initSectionReveal() {
  const revealTargets = document.querySelectorAll(
    ".hero-section, .stat-component, .top-notch, .testimonial-section, .why-choose-us, .about-section, .works, .faq-section, .map-section",
  );
  if (!revealTargets.length) return;

  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((section) => {
      section.classList.add("section-reveal", "is-visible");
    });
    return;
  }

  if (!sectionRevealObserver) {
    sectionRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          sectionRevealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" },
    );
  }

  revealTargets.forEach((section) => {
    if (section.dataset.revealReady === "true") return;
    section.classList.add("section-reveal");
    sectionRevealObserver.observe(section);
    section.dataset.revealReady = "true";
  });
}

function initServiceLightReveal() {
  if (serviceLightRevealInitialized) return;

  const cards = document.querySelectorAll(".service-card");
  if (!cards.length) return;

  cards.forEach((card) => card.classList.add("scroll-light-init"));

  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("scroll-light-in"));
    serviceLightRevealInitialized = true;
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const card = entry.target;
        const delay = Number(card.dataset.revealDelay || "0");
        window.setTimeout(() => {
          card.classList.add("scroll-light-in");
        }, delay);

        observer.unobserve(card);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -30px 0px" },
  );

  cards.forEach((card, index) => {
    card.dataset.revealDelay = String((index % 4) * 80);
    observer.observe(card);
  });

  serviceLightRevealInitialized = true;
}

function initTrustedSectionReveal() {
  if (trustedSectionAnimated) return;

  const section = document.querySelector(".stat-component");
  if (!section) return;

  const runAnimation = () => {
    const header = section.querySelector(".trusted-header");
    const slider = section.querySelector(".trusted-logo-slider");
    const boxes = section.querySelectorAll(".trustedBox");

    if (typeof gsap !== "undefined") {
      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.95, ease: "power4.out" },
        );
      }

      if (slider) {
        gsap.fromTo(
          slider,
          { opacity: 0, y: 24, scale: 0.975 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.05,
            ease: "power4.out",
            delay: 0.1,
          },
        );
      }

      if (boxes.length) {
        gsap.fromTo(
          boxes,
          { opacity: 0, y: 30, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.95,
            stagger: 0.16,
            ease: "power4.out",
            delay: 0.22,
          },
        );
      }
    } else {
      section.classList.add("trusted-animated-fallback");
    }

    trustedSectionAnimated = true;
  };

  if (!("IntersectionObserver" in window)) {
    runAnimation();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runAnimation();
        observer.disconnect();
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" },
  );

  observer.observe(section);
}

function initMobileContactOverlay() {
  const openBtn = document.getElementById("mobileContactOpen");
  const overlay = document.getElementById("mobileContactOverlay");
  const closeBtn = document.getElementById("mobileContactClose");
  const cancelBtn = document.getElementById("mobileFormCancel");
  if (!openBtn || !overlay || !closeBtn) return;

  if (openBtn.dataset.initialized === "true") return;

  const isSmallScreen = () => window.matchMedia("(max-width: 574px)").matches;

  const closeOverlay = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-contact-open");
  };

  const ensureCancelConfirmModal = () => {
    const existing = document.getElementById("cancelConfirmOverlay");
    if (existing) return existing;

    const confirmOverlay = document.createElement("div");
    confirmOverlay.id = "cancelConfirmOverlay";
    confirmOverlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:1200;padding:16px;";
    confirmOverlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="Cancel confirmation" style="background:#fff;max-width:360px;width:100%;border-radius:14px;padding:20px;box-shadow:0 12px 34px rgba(0,0,0,.2);">
        <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#0f172a;">Are you sure you want to cancel?</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" id="confirmStayBtn" class="btn btn-outline-secondary btn-sm">No</button>
          <button type="button" id="confirmCancelBtn" class="btn btn-danger btn-sm">Yes</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmOverlay);
    return confirmOverlay;
  };

  const openCancelConfirm = () => {
    const confirmOverlay = ensureCancelConfirmModal();
    const confirmCancelBtn = confirmOverlay.querySelector("#confirmCancelBtn");
    const confirmStayBtn = confirmOverlay.querySelector("#confirmStayBtn");
    if (!confirmCancelBtn || !confirmStayBtn) return;

    confirmOverlay.style.display = "flex";

    const handleYes = () => {
      confirmOverlay.style.display = "none";
      closeOverlay();
      confirmCancelBtn.removeEventListener("click", handleYes);
      confirmStayBtn.removeEventListener("click", handleNo);
    };

    const handleNo = () => {
      confirmOverlay.style.display = "none";
      confirmCancelBtn.removeEventListener("click", handleYes);
      confirmStayBtn.removeEventListener("click", handleNo);
    };

    confirmCancelBtn.addEventListener("click", handleYes);
    confirmStayBtn.addEventListener("click", handleNo);
  };

  openBtn.addEventListener("click", () => {
    if (!isSmallScreen()) return;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-contact-open");
  });

  closeBtn.addEventListener("click", openCancelConfirm);
  if (cancelBtn) cancelBtn.addEventListener("click", openCancelConfirm);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOverlay();
  });

  window.addEventListener("resize", () => {
    if (!isSmallScreen()) closeOverlay();
  });

  openBtn.dataset.initialized = "true";
}

function initLoginMethodToggle() {
  const tabs = document.querySelectorAll(".tab-btn[data-login-method]");
  const form = document.getElementById("loginForm");
  const input = document.getElementById("loginInput");
  const label = document.getElementById("loginInputLabel");
  const icon = document.getElementById("loginInputIcon");
  const emailFields = document.getElementById("emailLoginFields");
  const passwordInput = document.getElementById("loginPasswordInput");
  const passwordToggleBtn = document.getElementById("passwordToggleBtn");
  const inputBox = input?.closest(".input-box");
  const passwordBox = passwordInput?.closest(".input-box");
  if (!tabs.length || !input || !label || !icon || !inputBox) return;
  if (input.dataset.toggleInitialized === "true") return;

  const clearFieldError = (box) => {
    if (box) box.classList.remove("is-invalid");
  };

  const setFieldError = (box) => {
    if (box) box.classList.add("is-invalid");
  };

  const getActiveMethod = () => {
    const activeTab = document.querySelector(
      ".tab-btn[data-login-method].active",
    );
    return activeTab?.getAttribute("data-login-method") || "mobile";
  };

  const validateLoginForm = () => {
    const method = getActiveMethod();
    const isEmail = method === "email";
    let isValid = true;

    clearFieldError(inputBox);
    clearFieldError(passwordBox);

    const mainValue = input.value.trim();
    if (!mainValue) {
      setFieldError(inputBox);
      isValid = false;
    } else if (isEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailPattern.test(mainValue)) {
        setFieldError(inputBox);
        isValid = false;
      }
    } else {
      const digitsOnly = mainValue.replace(/[^\d]/g, "");
      if (digitsOnly.length < 10) {
        setFieldError(inputBox);
        isValid = false;
      }
    }

    if (isEmail) {
      const passwordValue = passwordInput?.value.trim() || "";
      if (!passwordValue) {
        setFieldError(passwordBox);
        isValid = false;
      } else if (passwordValue.length < 6) {
        setFieldError(passwordBox);
        isValid = false;
      }
    }

    return isValid;
  };

  const applyMethod = (method) => {
    const isEmail = method === "email";

    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-login-method") === method;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    label.textContent = isEmail ? "Email" : "Mobile Number";
    inputBox.classList.toggle("email-mode", isEmail);
    if (emailFields) emailFields.hidden = !isEmail;
    input.value = "";
    input.type = isEmail ? "email" : "tel";
    input.inputMode = isEmail ? "email" : "tel";
    input.autocomplete = isEmail ? "email" : "tel";
    input.placeholder = isEmail ? "you@example.com" : "+880 000-000-0000";
    icon.innerHTML = isEmail
      ? '<i class="bi bi-envelope"></i>'
      : '<i class="bi bi-phone"></i>';

    if (passwordInput) {
      passwordInput.value = "";
      passwordInput.type = "password";
    }
    if (passwordToggleBtn) {
      passwordToggleBtn.setAttribute("aria-label", "Show password");
      passwordToggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
    }
    clearFieldError(inputBox);
    clearFieldError(passwordBox);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const method = tab.getAttribute("data-login-method") || "mobile";
      applyMethod(method);
    });
  });

  if (passwordToggleBtn && passwordInput) {
    passwordToggleBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      passwordToggleBtn.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password",
      );
      passwordToggleBtn.innerHTML = isHidden
        ? '<i class="bi bi-eye-slash"></i>'
        : '<i class="bi bi-eye"></i>';
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      const isValid = validateLoginForm();
      if (!isValid) event.preventDefault();
    });
  }

  input.addEventListener("input", () => clearFieldError(inputBox));
  if (passwordInput) {
    passwordInput.addEventListener("input", () => clearFieldError(passwordBox));
  }

  applyMethod("mobile");
  input.dataset.toggleInitialized = "true";
}

function initSignupMethodToggle() {
  const tabs = document.querySelectorAll(".toggle-btn[data-signup-method]");
  const slider = document.getElementById("slider");
  const form = document.getElementById("authForm");
  const mainInput = document.getElementById("dynamicInput");
  const mainLabel = document.getElementById("dynamicLabel");
  const mainIcon = document.getElementById("dynamicIcon");
  const passwordGroup = document.getElementById("passwordGroup");
  const confirmGroup = document.getElementById("confirmPasswordGroup");
  const passwordInput = document.getElementById("passwordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  const passwordToggleBtn = document.getElementById("signupPasswordToggleBtn");
  const confirmPasswordToggleBtn = document.getElementById(
    "signupConfirmPasswordToggleBtn",
  );
  const submitBtn = form?.querySelector('button[type="submit"]');
  const heroTitle = document.getElementById("signupHeroTitle");
  const heroSubtitle = document.getElementById("signupHeroSubtitle");
  const cardTitle = document.getElementById("signupCardTitle");
  const cardSubtitle = document.getElementById("signupCardSubtitle");
  const mobileHelpText = document.getElementById("signupMobileHelpText");
  const mainInputBox = mainInput?.closest(".input-group-custom");
  const passwordInputBox = passwordInput?.closest(".input-group-custom");
  const confirmInputBox = confirmPasswordInput?.closest(".input-group-custom");

  if (!tabs.length || !form || !mainInput || !mainLabel || !mainIcon) return;
  if (form.dataset.signupToggleInitialized === "true") return;

  const clearError = (box) => {
    if (box) box.classList.remove("is-invalid");
  };

  const setError = (box) => {
    if (box) box.classList.add("is-invalid");
  };

  const getMethod = () => {
    const active = document.querySelector(
      ".toggle-btn[data-signup-method].active",
    );
    return active?.getAttribute("data-signup-method") || "mobile";
  };

  const updatePasswordToggleIcon = (button, input) => {
    if (!button || !input) return;
    const isHidden = input.type === "password";
    button.setAttribute(
      "aria-label",
      isHidden ? "Show password" : "Hide password",
    );
    button.innerHTML = isHidden
      ? '<i class="bi bi-eye"></i>'
      : '<i class="bi bi-eye-slash"></i>';
  };

  const applyMethod = (method) => {
    const isEmail = method === "email";

    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-signup-method") === method;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (slider)
      slider.style.transform = isEmail ? "translateX(100%)" : "translateX(0)";

    if (heroTitle)
      heroTitle.textContent = isEmail ? "Create Account" : "Welcome Back";
    if (heroSubtitle) {
      heroSubtitle.textContent = isEmail
        ? "Join us and get started in minutes"
        : "Sign in to continue to your account";
    }
    if (cardTitle)
      cardTitle.textContent = isEmail ? "Choose signup method" : "";
    if (cardSubtitle) {
      cardSubtitle.textContent = isEmail
        ? "Select how you'd like to create your account"
        : "";
    }
    if (mobileHelpText) mobileHelpText.hidden = isEmail;

    mainLabel.textContent = isEmail ? "Email" : "Mobile Number";
    mainInput.type = isEmail ? "email" : "tel";
    mainInput.inputMode = isEmail ? "email" : "tel";
    mainInput.autocomplete = isEmail ? "email" : "tel";
    mainInput.placeholder = isEmail ? "you@example.com" : "+880 000-000-0000";
    mainIcon.className = isEmail
      ? "bi bi-envelope prefix-icon"
      : "bi bi-phone prefix-icon";

    if (passwordGroup) passwordGroup.hidden = !isEmail;
    if (confirmGroup) confirmGroup.hidden = !isEmail;
    if (passwordInput) passwordInput.required = isEmail;
    if (confirmPasswordInput) confirmPasswordInput.required = isEmail;
    if (submitBtn) {
      submitBtn.innerHTML = isEmail
        ? 'Continue <i class="bi bi-arrow-right"></i>'
        : 'Continue <i class="bi bi-arrow-right"></i>';
    }

    mainInput.value = "";
    if (passwordInput) passwordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";
    if (passwordInput) passwordInput.type = "password";
    if (confirmPasswordInput) confirmPasswordInput.type = "password";
    updatePasswordToggleIcon(passwordToggleBtn, passwordInput);
    updatePasswordToggleIcon(confirmPasswordToggleBtn, confirmPasswordInput);

    clearError(mainInputBox);
    clearError(passwordInputBox);
    clearError(confirmInputBox);
  };

  const validate = () => {
    const method = getMethod();
    const isEmail = method === "email";
    let ok = true;

    clearError(mainInputBox);
    clearError(passwordInputBox);
    clearError(confirmInputBox);

    const value = mainInput.value.trim();
    if (!value) {
      setError(mainInputBox);
      ok = false;
    } else if (isEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailPattern.test(value)) {
        setError(mainInputBox);
        ok = false;
      }
    } else {
      const digitsOnly = value.replace(/[^\d]/g, "");
      if (digitsOnly.length < 10) {
        setError(mainInputBox);
        ok = false;
      }
    }

    if (isEmail) {
      const pass = passwordInput?.value.trim() || "";
      const confirm = confirmPasswordInput?.value.trim() || "";

      if (!pass) {
        setError(passwordInputBox);
        ok = false;
      } else if (pass.length < 6) {
        setError(passwordInputBox);
        ok = false;
      }

      if (!confirm) {
        setError(confirmInputBox);
        ok = false;
      } else if (pass && pass !== confirm) {
        setError(confirmInputBox);
        ok = false;
      }
    }

    return ok;
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const method = tab.getAttribute("data-signup-method") || "mobile";
      applyMethod(method);
    });
  });

  [passwordToggleBtn, confirmPasswordToggleBtn].forEach((button) => {
    if (!button) return;
    button.addEventListener("click", () => {
      const inputId =
        button.id === "signupPasswordToggleBtn"
          ? "passwordInput"
          : "confirmPasswordInput";
      const input = document.getElementById(inputId);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      updatePasswordToggleIcon(button, input);
    });
  });

  mainInput.addEventListener("input", () => clearError(mainInputBox));
  if (passwordInput) {
    passwordInput.addEventListener("input", () => clearError(passwordInputBox));
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", () => clearError(confirmInputBox));
  }

  form.addEventListener("submit", (event) => {
    if (!validate()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    if (getMethod() === "mobile") {
      window.location.href = "otp.html";
    }
  });

  applyMethod("mobile");
  form.dataset.signupToggleInitialized = "true";
}

function initCustomerDetailsValidation() {
  const form = document.getElementById("customerDetailsForm");
  const nameInput = document.getElementById("customerName");
  const addressInput = document.getElementById("customerAddress");
  const phoneInput = document.getElementById("customerPhone");
  const termsInput = document.getElementById("termsCheck");
  const nameBox = nameInput?.closest(".input-group-custom");
  const addressBox = addressInput?.closest(".input-group-custom");
  const phoneBox = phoneInput?.closest(".input-group-custom");
  const termsWrap = termsInput?.closest(".terms-wrap");

  if (!form || !nameInput || !addressInput || !phoneInput || !termsInput) return;
  if (form.dataset.customerValidationInitialized === "true") return;

  const clearError = (box) => {
    if (box) box.classList.remove("is-invalid");
  };

  const setError = (box) => {
    if (box) box.classList.add("is-invalid");
  };

  const validate = () => {
    let ok = true;

    clearError(nameBox);
    clearError(addressBox);
    clearError(phoneBox);
    clearError(termsWrap);

    const nameValue = nameInput.value.trim();
    const addressValue = addressInput.value.trim();
    const phoneValue = phoneInput.value.trim();

    if (!nameValue) {
      setError(nameBox);
      ok = false;
    }

    if (!addressValue) {
      setError(addressBox);
      ok = false;
    }

    if (!phoneValue) {
      setError(phoneBox);
      ok = false;
    } else {
      const digitsOnly = phoneValue.replace(/[^\d]/g, "");
      if (digitsOnly.length < 10) {
        setError(phoneBox);
        ok = false;
      }
    }

    if (!termsInput.checked) {
      setError(termsWrap);
      ok = false;
    }

    return ok;
  };

  nameInput.addEventListener("input", () => clearError(nameBox));
  addressInput.addEventListener("input", () => clearError(addressBox));
  phoneInput.addEventListener("input", () => clearError(phoneBox));
  termsInput.addEventListener("change", () => clearError(termsWrap));

  form.addEventListener("submit", (event) => {
    if (!validate()) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  form.dataset.customerValidationInitialized = "true";
}

// Contact form validation (Bootstrap custom validation)

function initContactFormValidation() {
  const forms = document.querySelectorAll("form[novalidate]");
  forms.forEach((form) => {
    if (form.dataset.validationInit === "true") return;

    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add("was-validated");
    });

    // Clear validation styling when the form is reset (Cancel).
    form.addEventListener("reset", () => {
      form.classList.remove("was-validated");
    });

    form.dataset.validationInit = "true";
  });
}

// Service Details

function initServiceDetailsSlider() {
  const slider = document.getElementById("sizeSlider");
  const output = document.getElementById("sliderValue");
  const baseLabel = document.querySelector(".price-row .base-label");
  const basePriceEl = document.querySelector(
    ".price-row strong:not(.frequency-label)",
  );
  const discountAmountEl = document.querySelector(
    ".price-row strong.frequency-label",
  );
  const totalAmountEl = document.querySelector(".total-amount");
  if (
    !slider ||
    !output ||
    !baseLabel ||
    !basePriceEl ||
    !discountAmountEl ||
    !totalAmountEl
  )
    return;

  const ratePerSqft = 1.0;
  const discountRate = 0.1;
  const formatCurrency = (value) =>
    `৳ ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const updateSlider = () => {
    const sqft = Number(slider.value);
    const min = Number(slider.min || 0);
    const max = Number(slider.max || 100);
    const percentage = ((sqft - min) * 100) / (max - min);
    const basePrice = sqft * ratePerSqft;
    const discount = basePrice * discountRate;
    const total = basePrice - discount;

    slider.style.background = `linear-gradient(to right, #1CAAB8 0%, #1CAAB8 ${percentage}%, #d6eaec ${percentage}%, #d6eaec 100%)`;
    const sliderSqftEl = document.getElementById("sliderSqft");
    output.textContent = Math.round(basePrice).toLocaleString("en-US");
    if (sliderSqftEl)
      sliderSqftEl.textContent = `${sqft.toLocaleString("en-US")} SFT`;
    baseLabel.textContent = `Base Rate (${sqft.toLocaleString("en-US")} SFT)`;
    basePriceEl.textContent = formatCurrency(basePrice);
    discountAmountEl.textContent = `- ${formatCurrency(discount)}`;
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(total);
    }
  };

  slider.addEventListener("input", updateSlider);
  updateSlider();
}

function initServiceDetailsSliderFeedback() {
  const slider = document.getElementById("sizeSlider");
  if (!slider || slider.dataset.feedbackInitialized === "true") return;

  const sliderWrap = slider.closest(".size-slider-wrap");
  let visualFeedbackTimeout = null;
  const sliderMin = Number(slider.min || 0);
  const sliderStep = Number(slider.step || 10);
  const feedbackStep = Math.max(sliderStep * 2, 20);

  const sliderFeedback = {
    audioContext: null,
    audioUnlocked: false,
    lastSoundAt: 0,
    lastVibrateAt: 0,
    lastStepValue: null,
  };

  const ensureAudioContext = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext || null;
    if (!AudioContextClass) return null;

    if (!sliderFeedback.audioContext) {
      sliderFeedback.audioContext = new AudioContextClass();
    }

    if (sliderFeedback.audioContext.state === "suspended") {
      sliderFeedback.audioContext.resume().catch(() => {});
    }

    return sliderFeedback.audioContext;
  };

  const warmupAudioContext = () => {
    const audioContext = ensureAudioContext();
    if (!audioContext || sliderFeedback.audioUnlocked) return;

    const unlock = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.00001, audioContext.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);
      sliderFeedback.audioUnlocked = true;
    };

    if (audioContext.state === "running") {
      unlock();
      return;
    }

    audioContext
      .resume()
      .then(unlock)
      .catch(() => {});
  };

  const playSliderTick = () => {
    const now = Date.now();
    if (now - sliderFeedback.lastSoundAt < 90) return;

    const audioContext = ensureAudioContext();
    if (!audioContext) return;
    warmupAudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(760, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime + 0.008,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.075,
    );
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.085);

    sliderFeedback.lastSoundAt = now;
  };

  const vibrateSliderTick = () => {
    if (typeof navigator.vibrate !== "function") return;

    const now = Date.now();
    if (now - sliderFeedback.lastVibrateAt < 140) return;

    navigator.vibrate(8);
    sliderFeedback.lastVibrateAt = now;
  };

  const triggerFeedback = () => {
    const sqft = Number(slider.value);
    const stepValue = Math.round((sqft - sliderMin) / feedbackStep);
    if (sliderFeedback.lastStepValue === stepValue) return;

    sliderFeedback.lastStepValue = stepValue;
    playSliderTick();
    vibrateSliderTick();

    if (sliderWrap) {
      sliderWrap.classList.remove("is-feedback-active");
      void sliderWrap.offsetWidth;
      sliderWrap.classList.add("is-feedback-active");

      if (visualFeedbackTimeout) {
        window.clearTimeout(visualFeedbackTimeout);
      }

      visualFeedbackTimeout = window.setTimeout(() => {
        sliderWrap.classList.remove("is-feedback-active");
      }, 170);
    }
  };

  const primeFeedback = () => {
    sliderFeedback.lastStepValue = null;
    warmupAudioContext();
  };

  slider.addEventListener("pointerdown", primeFeedback);
  slider.addEventListener("touchstart", primeFeedback, { passive: true });
  slider.addEventListener("touchend", primeFeedback, { passive: true });
  slider.addEventListener("touchmove", triggerFeedback, { passive: true });
  slider.addEventListener("change", triggerFeedback);
  slider.addEventListener("focus", primeFeedback);
  slider.addEventListener("input", triggerFeedback);
  slider.dataset.feedbackInitialized = "true";
}

function initServiceCartDrawer() {
  const drawer = document.getElementById("serviceCartDrawer");
  const backdrop = document.getElementById("serviceCartBackdrop");
  const closeBtn = document.getElementById("serviceCartClose");
  if (!drawer || !backdrop || !closeBtn) return;
  if (drawer.dataset.initialized === "true") return;

  const openDrawer = () => {
    document.body.classList.add("service-cart-open");
    drawer.setAttribute("aria-hidden", "false");
  };

  const closeDrawer = () => {
    document.body.classList.remove("service-cart-open");
    drawer.setAttribute("aria-hidden", "true");
  };

  // Triggers: the side FAB and any element marked with [data-open-cart]
  // (e.g. the header cart icon).
  const fab = document.getElementById("serviceCartFab");
  if (fab) fab.addEventListener("click", openDrawer);

  document.querySelectorAll("[data-open-cart]").forEach((opener) => {
    opener.addEventListener("click", (event) => {
      if (opener.tagName === "A") event.preventDefault();
      openDrawer();
    });
  });

  closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  drawer.dataset.initialized = "true";
}

function initMobileKeyboardViewportState() {
  if (document.body?.dataset.keyboardViewportInitialized === "true") return;

  const mobileViewport = window.matchMedia("(max-width: 991.98px)");
  const editableSelector = [
    "input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']):not([type='reset'])",
    "textarea",
    "select",
    "[contenteditable='true']",
    ".select2-search__field",
  ].join(", ");

  let hasFocusedEditable = false;

  const isEditableTarget = (target) =>
    Boolean(target && target.matches && target.matches(editableSelector));

  const updateKeyboardState = () => {
    const viewport = window.visualViewport;
    const viewportHeight = viewport?.height || window.innerHeight;
    const keyboardHeight = window.innerHeight - viewportHeight;
    const keyboardLikelyOpen =
      mobileViewport.matches &&
      (keyboardHeight > 140 || (hasFocusedEditable && keyboardHeight > 80));

    document.body.classList.toggle("mobile-keyboard-open", keyboardLikelyOpen);
  };

  document.addEventListener("focusin", (event) => {
    hasFocusedEditable = isEditableTarget(event.target);
    updateKeyboardState();
  });

  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      hasFocusedEditable = isEditableTarget(document.activeElement);
      updateKeyboardState();
    }, 80);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateKeyboardState);
    window.visualViewport.addEventListener("scroll", updateKeyboardState);
  }

  window.addEventListener("resize", updateKeyboardState);

  if (typeof mobileViewport.addEventListener === "function") {
    mobileViewport.addEventListener("change", updateKeyboardState);
  } else if (typeof mobileViewport.addListener === "function") {
    mobileViewport.addListener(updateKeyboardState);
  }

  updateKeyboardState();
  document.body.dataset.keyboardViewportInitialized = "true";
}

function initServiceTopIndicator() {
  const indicator = document.getElementById("serviceTopIndicator");
  if (!indicator || indicator.dataset.initialized === "true") return;

  const mobileViewport = window.matchMedia("(max-width: 991.98px)");
  let rafId = null;

  const updateVisibility = () => {
    if (!mobileViewport.matches) {
      indicator.classList.remove("is-visible");
      indicator.setAttribute("aria-hidden", "true");
      return;
    }

    const scrollBottom = window.scrollY + window.innerHeight;
    const pageBottom = document.documentElement.scrollHeight;
    const shouldShow = scrollBottom >= pageBottom - 420;

    indicator.classList.toggle("is-visible", shouldShow);
    indicator.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  };

  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      updateVisibility();
    });
  };

  indicator.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);

  if (typeof mobileViewport.addEventListener === "function") {
    mobileViewport.addEventListener("change", scheduleUpdate);
  } else if (typeof mobileViewport.addListener === "function") {
    mobileViewport.addListener(scheduleUpdate);
  }

  updateVisibility();
  indicator.dataset.initialized = "true";
}

// checkout page specific initialization can go here

function initBlogSuggestionsDropdown() {
  const detailsEl = document.querySelector("details.category-box");
  if (!detailsEl || detailsEl.dataset.initialized === "true") return;

  const desktopMq = window.matchMedia("(min-width: 992px)");

  const sync = () => {
    if (desktopMq.matches) {
      detailsEl.setAttribute("open", "");
    } else {
      detailsEl.removeAttribute("open");
    }
  };

  sync();

  if (typeof desktopMq.addEventListener === "function") {
    desktopMq.addEventListener("change", sync);
  } else if (typeof desktopMq.addListener === "function") {
    desktopMq.addListener(sync);
  }

  detailsEl.dataset.initialized = "true";
}

function selectPaymentMethod(element) {
  // Remove the active class status from all payment option elements
  document.querySelectorAll(".payment-option-card").forEach((card) => {
    card.classList.remove("active");
    card.setAttribute("aria-checked", "false");
    card.querySelector('input[type="radio"]').checked = false;
  });

  // Assign the active state to the currently clicked item block
  element.classList.add("active");
  element.setAttribute("aria-checked", "true");
  element.querySelector('input[type="radio"]').checked = true;

  updatePaymentDropdownLabel();

  if (window.innerWidth <= 576) {
    closePaymentDropdown();
  }
}

function updatePaymentDropdownLabel() {
  const toggleLabel = document.querySelector(".payment-dropdown-label");
  const activeOption = document.querySelector(".payment-option-card.active");
  const activeTitle = activeOption?.querySelector(".payment-option-title");

  if (toggleLabel && activeTitle) {
    toggleLabel.textContent = activeTitle.textContent.trim();
  }
}

function togglePaymentDropdown() {
  const toggle = document.querySelector(".payment-dropdown-toggle");
  const list = document.querySelector(".payment-list");
  if (!toggle || !list) return;

  const isOpen = list.classList.toggle("dropdown-open");
  toggle.classList.toggle("open", isOpen);
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closePaymentDropdown() {
  const toggle = document.querySelector(".payment-dropdown-toggle");
  const list = document.querySelector(".payment-list");
  if (!toggle || !list) return;

  list.classList.remove("dropdown-open");
  toggle.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}

function toggleCheckoutSection(button) {
  const section = button.closest(".checkout-section-collapsible");
  if (!section) return;

  section.classList.add("is-open");
  button.setAttribute("aria-expanded", "true");
}

function syncCheckoutSectionsForViewport() {
  const sections = document.querySelectorAll(".checkout-section-collapsible");

  sections.forEach((section) => {
    const toggle = section.querySelector(".checkout-section-toggle");
    if (!toggle) return;

    section.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  });
}

document.addEventListener("keydown", (event) => {
  const option = event.target.closest(".payment-option-card");
  if (!option) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectPaymentMethod(option);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const scheduleNonCritical =
    window.requestIdleCallback ||
    ((callback) => window.setTimeout(callback, 180));

  optimizeMediaResources();
  updatePaymentDropdownLabel();
  syncCheckoutSectionsForViewport();
  initPageLoader();
  initActiveNav();
  initDesktopDropdownHover();
  initSidebarState();
  initHeroCarousel();
  initServiceDetailsSlider();
  initServiceDetailsSliderFeedback();
  initServiceTopIndicator();
  initMobileKeyboardViewportState();

  if (document.querySelector(".checkout-section-collapsible")) {
    window.addEventListener("resize", syncCheckoutSectionsForViewport);
  }

  scheduleNonCritical(() => {
    initReadingProgress();
    initImpactVideoPopup();
    initGalleryVideoPopup();
    initTopNotchReveal();
    initProjectGalleryCarousel();
    initProjectGalleryMobilePreview();
    initTrustedCarousels();
    initTestimonialSlider();
    initFaq();
    initSectionReveal();
    initTrustedSectionReveal();
    initServiceLightReveal();
    initMobileContactOverlay();
    initLoginMethodToggle();
    initSignupMethodToggle();
    initCustomerDetailsValidation();
    initContactFormValidation();
    initServiceCartDrawer();
    initBlogSuggestionsDropdown();
  });
});

document.addEventListener("component:loaded", (event) => {
  const id = event.detail?.id;
  if (!id) return;

  optimizeMediaResources(document.getElementById(id));
});

onComponentLoaded("header-placeholder", initActiveNav);
onComponentLoaded("header-placeholder", initDesktopDropdownHover);
onComponentLoaded("header-placeholder", initServiceCartDrawer);
onComponentLoaded("impact", initImpactVideoPopup);
onComponentLoaded("project-gallery-component", initGalleryVideoPopup);
onComponentLoaded("project-gallery-component", initProjectGalleryCarousel);
onComponentLoaded("project-gallery-component", initProjectGalleryMobilePreview);
onComponentLoaded("top-notch-component", initTopNotchReveal);
onComponentLoaded("header-placeholder", initSidebarState);
onComponentLoaded("hero-section", initHeroCarousel);
onComponentLoaded("stats-component", initTrustedCarousels);
onComponentLoaded("stats-component", initTrustedSectionReveal);
onComponentLoaded("testimonial-component", initTestimonialSlider);
onComponentLoaded("faq-component", initFaq);
onComponentLoaded("hero-section", initSectionReveal);
onComponentLoaded("stats-component", initSectionReveal);
onComponentLoaded("top-notch-component", initSectionReveal);
onComponentLoaded("testimonial-component", initSectionReveal);
onComponentLoaded("why-choose-us-component", initSectionReveal);
onComponentLoaded("impact", initSectionReveal);
onComponentLoaded("why-works-us-component", initSectionReveal);
onComponentLoaded("faq-component", initSectionReveal);
onComponentLoaded("map-component", initSectionReveal);
