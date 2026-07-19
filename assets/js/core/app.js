let faqInitialized = false;
let dropdownHoverInitialized = false;
let impactVideoInitialized = false;
let topNotchRevealInitialized = false;
let sidebarStateInitialized = false;
let sectionRevealObserver = null;
let trustedSectionAnimated = false;
let serviceLightRevealInitialized = false;

function markRevealReady() {
  if (document.body?.dataset.revealReady === "true") return;
  if (document.body) {
    document.body.dataset.revealReady = "true";
  }
  document.dispatchEvent(new CustomEvent("page:reveal-ready"));
}

function isElementInRevealViewport(element, offset = 0.9) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewportHeight * offset && rect.bottom > 0;
}

function animateInitialReveal(element, className, delay = 0) {
  if (!element || element.dataset.revealTriggered === "true") return;

  const runReveal = () => {
    if (element.dataset.revealTriggered === "true") return;
    element.dataset.revealTriggered = "true";

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          element.classList.add(className);
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
  if (!loader) {
    markRevealReady();
    return;
  }
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
      markRevealReady();
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
          animateInitialReveal(card, "is-visible", index * 180);
        });

        observer.disconnect();
      });
    },
    { threshold: 0.2 },
  );

  const section = document.querySelector("#top-notch-component");
  if (section && isElementInRevealViewport(section, 0.95)) {
    cards.forEach((card, index) => {
      animateInitialReveal(card, "is-visible", index * 180);
    });
  } else if (section) {
    observer.observe(section);
  }

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
          animateInitialReveal(entry.target, "is-visible");
          sectionRevealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" },
    );
  }

  revealTargets.forEach((section) => {
    if (section.dataset.revealReady === "true") return;
    section.classList.add("section-reveal");
    if (isElementInRevealViewport(section)) {
      animateInitialReveal(section, "is-visible");
    } else {
      sectionRevealObserver.observe(section);
    }
    section.dataset.revealReady = "true";
  });
}

function initServiceLightReveal() {
  if (serviceLightRevealInitialized) return;

  const cards = document.querySelectorAll("#top-notch-component .service-card");
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
        animateInitialReveal(card, "scroll-light-in", delay);

        observer.unobserve(card);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -30px 0px" },
  );

  cards.forEach((card, index) => {
    card.dataset.revealDelay = String((index % 4) * 80);
    const delay = Number(card.dataset.revealDelay || "0");
    if (isElementInRevealViewport(card)) {
      animateInitialReveal(card, "scroll-light-in", delay);
    } else {
      observer.observe(card);
    }
  });

  serviceLightRevealInitialized = true;
}

function initServiceDetailReveal() {
  if (document.body?.dataset.serviceDetailRevealInitialized === "true") return;

  const revealGroups = [
    {
      selector: ".service_details h1",
      variant: "detail-reveal-hero",
      step: 0,
    },
    {
      selector:
        ".service-details .size-estimator-card, .service-details .price-card, .service-details .service-box, .service-details .service-video-shell, .service-details .service-video-single, .service-dropdown-card",
      variant: "detail-reveal-card",
      step: 120,
    },
    {
      selector:
        ".service-details .section-title, .service-details .info-card, .service-details .included-box, .service-details .included-item, .service-details .process-title, .service-details .process-item, .service-details .service-video-copy > *, .service-details .service-video-overlay, .service-top-indicator, .service-dropdown-panel .included-item, .service-dropdown-panel .process-item",
      variant: "detail-reveal-line",
      step: 90,
    },
  ];

  const seen = new Set();
  const revealTargets = [];

  revealGroups.forEach(({ selector, variant, step }) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (seen.has(element)) return;
      seen.add(element);
      element.classList.add("detail-reveal", variant);
      element.style.setProperty("--detail-reveal-delay", `${index * step}ms`);
      revealTargets.push(element);
    });
  });

  if (!revealTargets.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    document.body.dataset.serviceDetailRevealInitialized = "true";
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(
          entry.target
            .style.getPropertyValue("--detail-reveal-delay")
            .replace("ms", "") || 0,
        );
        animateInitialReveal(entry.target, "is-visible", delay);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  revealTargets.forEach((element) => {
    if (element.dataset.detailRevealObserved === "true") return;
    const delay = Number(
      element.style.getPropertyValue("--detail-reveal-delay").replace("ms", "") ||
        0,
    );
    if (isElementInRevealViewport(element, 0.92)) {
      animateInitialReveal(element, "is-visible", delay);
    } else {
      observer.observe(element);
    }
    element.dataset.detailRevealObserved = "true";
  });

  document.body.dataset.serviceDetailRevealInitialized = "true";
}

function initServiceSearchToggle() {
  const toggle = document.querySelector(".service-search-toggle");
  const searchBox = document.getElementById("service-search-box");
  if (!toggle || !searchBox || toggle.dataset.initialized === "true") return;

  const icon = toggle.querySelector("i");
  const searchInput = searchBox.querySelector("input");
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const setOpenState = (isOpen) => {
    searchBox.classList.toggle("is-open", isOpen);
    toggle.classList.toggle("is-active", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Close service search" : "Open service search",
    );

    if (icon) {
      icon.classList.toggle("bi-search", !isOpen);
      icon.classList.toggle("bi-x-lg", isOpen);
    }

    if (isOpen && searchInput) {
      window.setTimeout(() => searchInput.focus(), 180);
    }
  };

  const syncDesktopState = () => {
    if (!mobileQuery.matches) {
      setOpenState(false);
    }
  };

  toggle.addEventListener("click", () => {
    if (!mobileQuery.matches) return;
    setOpenState(!searchBox.classList.contains("is-open"));
  });

  document.addEventListener("click", (event) => {
    if (!mobileQuery.matches || !searchBox.classList.contains("is-open")) return;
    if (searchBox.contains(event.target) || toggle.contains(event.target)) return;
    setOpenState(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchBox.classList.contains("is-open")) {
      setOpenState(false);
    }
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", syncDesktopState);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(syncDesktopState);
  }

  syncDesktopState();
  toggle.dataset.initialized = "true";
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

function initOtpValidation() {
  const form = document.getElementById("otpForm");
  const otpInputs = Array.from(document.querySelectorAll(".otp-box"));
  const errorMessage = document.getElementById("otpErrorMessage");
  const verifiedMessage = document.getElementById("otpVerifiedMessage");

  if (!form || otpInputs.length !== 6) return;
  if (form.dataset.otpValidationInitialized === "true") return;

  const clearInvalidState = () => {
    otpInputs.forEach((input) => input.classList.remove("is-invalid"));
    if (errorMessage) errorMessage.hidden = true;
  };

  const showInvalidState = () => {
    otpInputs.forEach((input) => {
      if (!/^\d$/.test(input.value.trim())) {
        input.classList.add("is-invalid");
      }
    });
    if (errorMessage) errorMessage.hidden = false;
    if (verifiedMessage) verifiedMessage.hidden = true;
  };

  const sanitizeDigit = (value) => value.replace(/\D/g, "").slice(0, 1);

  const getOtpCode = () => otpInputs.map((input) => input.value.trim()).join("");

  const isOtpComplete = () => /^\d{6}$/.test(getOtpCode());

  otpInputs.forEach((input, index) => {
    input.addEventListener("input", (event) => {
      const nextDigit = sanitizeDigit(event.target.value);
      event.target.value = nextDigit;
      clearInvalidState();
      if (verifiedMessage) verifiedMessage.hidden = true;

      if (nextDigit && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
        otpInputs[index + 1].select();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        otpInputs[index - 1].focus();
        otpInputs[index - 1].select();
      }

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        otpInputs[index - 1].focus();
      }

      if (event.key === "ArrowRight" && index < otpInputs.length - 1) {
        event.preventDefault();
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pastedDigits = (event.clipboardData?.getData("text") || "")
        .replace(/\D/g, "")
        .slice(0, otpInputs.length);

      if (!pastedDigits) return;

      otpInputs.forEach((field, fieldIndex) => {
        field.value = pastedDigits[fieldIndex] || "";
      });

      clearInvalidState();
      if (verifiedMessage) verifiedMessage.hidden = true;

      const focusIndex = Math.min(pastedDigits.length, otpInputs.length) - 1;
      if (focusIndex >= 0) {
        otpInputs[focusIndex].focus();
        otpInputs[focusIndex].select();
      }
    });
  });

  form.addEventListener("submit", (event) => {
    if (!isOtpComplete()) {
      event.preventDefault();
      event.stopPropagation();
      showInvalidState();
      const firstInvalidInput = otpInputs.find(
        (input) => !/^\d$/.test(input.value.trim()),
      );
      firstInvalidInput?.focus();
      return;
    }

    event.preventDefault();
    clearInvalidState();
    if (verifiedMessage) verifiedMessage.hidden = false;
    window.setTimeout(() => {
      window.location.href = "customer_details.html";
    }, 250);
  });

  form.dataset.otpValidationInitialized = "true";
}

function initCheckoutValidation() {
  const form = document.getElementById("checkoutForm");
  const nameInput = document.getElementById("checkoutFullName");
  const phoneInput = document.getElementById("checkoutPhone");
  const emailInput = document.getElementById("checkoutEmail");
  const streetInput = document.getElementById("checkoutStreetAddress");
  const sectorBlockInput = document.getElementById("checkoutSectorBlock");
  const apartmentInput = document.getElementById("checkoutApartment");
  const areaInput = document.getElementById("checkoutArea");
  const serviceDateInput = document.getElementById("checkoutServiceDate");
  const serviceTimeInput = document.getElementById("checkoutServiceTime");

  if (
    !form ||
    !nameInput ||
    !phoneInput ||
    !streetInput ||
    !areaInput ||
    !serviceDateInput ||
    !serviceTimeInput
  ) {
    return;
  }
  if (form.dataset.checkoutValidationInitialized === "true") return;

  const normalizeBangladeshPhone = (value) =>
    value
      .trim()
      .replace(/[\s-]/g, "")
      .replace(/^\+?88/, "");

  const isValidBangladeshPhone = (value) => /^01[3-9]\d{8}$/.test(normalizeBangladeshPhone(value));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = today.toISOString().split("T")[0];
  serviceDateInput.min = minDate;

  const fieldConfigs = [
    {
      input: nameInput,
      box: nameInput.closest(".form-group-custom"),
      validate: (value) => value.trim().length >= 2,
    },
    {
      input: phoneInput,
      box: phoneInput.closest(".form-group-custom"),
      validate: isValidBangladeshPhone,
    },
    {
      input: streetInput,
      box: streetInput.closest(".form-group-custom"),
      validate: (value) => value.trim().length >= 10,
    },
    {
      input: areaInput,
      box: areaInput.closest(".form-group-custom"),
      validate: (value) => value.trim().length > 0,
    },
    {
      input: serviceDateInput,
      box: serviceDateInput.closest(".form-group-custom") || document.querySelector(".checkout-schedule-group"),
      validate: (value) => {
        if (!value.trim()) return false;
        const selectedDate = new Date(`${value}T00:00:00`);
        return !Number.isNaN(selectedDate.getTime()) && selectedDate >= today;
      },
    },
    {
      input: serviceTimeInput,
      box: serviceTimeInput.closest(".form-group-custom") || document.querySelector(".checkout-schedule-group"),
      validate: (value) => value.trim().length > 0,
    },
  ];

  if (emailInput) {
    fieldConfigs.splice(2, 0, {
      input: emailInput,
      box: emailInput.closest(".form-group-custom"),
      validate: (value) => value.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()),
    });
  }

  if (sectorBlockInput) {
    fieldConfigs.push({
      input: sectorBlockInput,
      box: sectorBlockInput.closest(".form-group-custom"),
      validate: (value) => value.trim().length > 0,
    });
  }

  if (apartmentInput) {
    fieldConfigs.push({
      input: apartmentInput,
      box: apartmentInput.closest(".form-group-custom"),
      validate: (value) => value.trim().length > 0,
    });
  }

  const clearError = (box) => {
    if (box) box.classList.remove("is-invalid");
  };

  const setError = (box) => {
    if (box) box.classList.add("is-invalid");
  };

  phoneInput.setAttribute("inputmode", "numeric");
  phoneInput.setAttribute("autocomplete", "tel-national");
  phoneInput.setAttribute("maxlength", "14");

  phoneInput.addEventListener("input", () => {
    const normalized = phoneInput.value.replace(/[^\d+]/g, "");
    const startsWithPlus = normalized.startsWith("+");
    const digits = normalized.replace(/[^\d]/g, "").slice(0, startsWithPlus ? 13 : 11);
    phoneInput.value = startsWithPlus ? `+${digits}` : digits;
  });

  const openSectionForField = (input) => {
    const section = input.closest(".checkout-section-collapsible");
    const toggle = section?.querySelector(".checkout-section-toggle");
    if (!section || !toggle) return;
    section.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  const focusField = (input) => {
    if (input.type === "hidden" && input.id === "checkoutServiceDate") {
      document.getElementById("checkoutDateTrigger")?.focus();
      return;
    }

    if (input.type === "hidden" && input.id === "checkoutServiceTime") {
      document.getElementById("checkoutTimeTrigger")?.focus();
      return;
    }

    input.focus();
  };

  const validate = () => {
    let isValid = true;
    let firstInvalidInput = null;

    fieldConfigs.forEach(({ input, box, validate: validateField }) => {
      clearError(box);

      if (!validateField(input.value)) {
        setError(box);
        openSectionForField(input);
        if (!firstInvalidInput) firstInvalidInput = input;
        isValid = false;
      }
    });

    if (!isValid && firstInvalidInput) {
      focusField(firstInvalidInput);
    }

    return isValid;
  };

  fieldConfigs.forEach(({ input, box }) => {
    const eventName = input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, () => clearError(box));
  });

  form.addEventListener("submit", (event) => {
    if (!validate()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    phoneInput.value = normalizeBangladeshPhone(phoneInput.value);
    event.preventDefault();
    window.location.href = "order_success.html";
  });

  form.dataset.checkoutValidationInitialized = "true";
}

function initCheckoutAreaSelect2() {
  const areaInput = document.getElementById("checkoutArea");

  if (
    !areaInput ||
    typeof window.jQuery === "undefined" ||
    typeof window.jQuery.fn.select2 !== "function"
  ) {
    return;
  }

  const $areaInput = window.jQuery(areaInput);

  if ($areaInput.hasClass("select2-hidden-accessible")) {
    return;
  }

  $areaInput.select2({
    placeholder: areaInput.dataset.placeholder || "Select your area",
    width: "100%",
    dropdownParent: window.jQuery(areaInput.closest(".select2-wrapper")),
  });

  $areaInput.on("change.select2Validation", () => {
    areaInput.closest(".form-group-custom")?.classList.remove("is-invalid");
  });
}

function initCheckoutSchedulePicker() {
  const serviceDateInput = document.getElementById("checkoutServiceDate");
  const serviceTimeInput = document.getElementById("checkoutServiceTime");
  const dateDropdown = document.getElementById("checkoutDateDropdown");
  const dateTrigger = document.getElementById("checkoutDateTrigger");
  const dateMenu = document.getElementById("checkoutDateMenu");
  const dateDisplay = document.getElementById("checkoutDateDisplay");
  const dateGrid = document.getElementById("checkoutDateGrid");
  const dateMonthLabel = document.getElementById("checkoutDateMonthLabel");
  const datePrevButton = document.getElementById("checkoutDatePrev");
  const dateNextButton = document.getElementById("checkoutDateNext");
  const dateClearButton = document.getElementById("checkoutDateClear");
  const dateTodayButton = document.getElementById("checkoutDateToday");
  const serviceHourInput = document.getElementById("checkoutServiceHour");
  const serviceMinuteInput = document.getElementById("checkoutServiceMinute");
  const servicePeriodInput = document.getElementById("checkoutServicePeriod");
  const hourOptions = document.getElementById("checkoutHourOptions");
  const minuteOptions = document.getElementById("checkoutMinuteOptions");
  const periodOptions = document.getElementById("checkoutPeriodOptions");
  const timeDropdown = document.getElementById("checkoutTimeDropdown");
  const timeTrigger = document.getElementById("checkoutTimeTrigger");
  const timeMenu = document.getElementById("checkoutTimeMenu");
  const timeDisplay = document.getElementById("checkoutTimeDisplay");
  const summary = document.getElementById("orderScheduleSummary");
  const scheduleGroup = document.querySelector(".checkout-schedule-group");

  if (
    !serviceDateInput ||
    !serviceTimeInput ||
    !dateDropdown ||
    !dateTrigger ||
    !dateMenu ||
    !dateDisplay ||
    !dateGrid ||
    !dateMonthLabel ||
    !datePrevButton ||
    !dateNextButton ||
    !dateClearButton ||
    !dateTodayButton ||
    !serviceHourInput ||
    !serviceMinuteInput ||
    !servicePeriodInput ||
    !hourOptions ||
    !minuteOptions ||
    !periodOptions ||
    !timeDropdown ||
    !timeTrigger ||
    !timeMenu ||
    !timeDisplay ||
    !summary ||
    !scheduleGroup
  ) {
    return;
  }

  if (scheduleGroup.dataset.schedulePickerInitialized === "true") {
    return;
  }

  const formatDisplayDate = (value) => {
    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDisplayTime = (value) => {
    const [hoursString, minutesString] = value.split(":");
    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hoursString === undefined ||
      minutesString === undefined
    ) {
      return value;
    }

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(2024, 0, 1, hours, minutes));
  };

  const toDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startOfDay = (date) => {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  };

  const today = startOfDay(new Date());
  let activeMonth = serviceDateInput.value
    ? new Date(`${serviceDateInput.value}T00:00:00`)
    : new Date(today);

  const updateDateDisplay = () => {
    if (serviceDateInput.value.trim()) {
      dateDisplay.textContent = formatDisplayDate(serviceDateInput.value);
      dateDisplay.classList.add("has-value");
      return;
    }

    dateDisplay.textContent = "Select date";
    dateDisplay.classList.remove("has-value");
  };

  const setDateMenuState = (isOpen) => {
    dateDropdown.classList.toggle("is-open", isOpen);
    dateTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    dateMenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
  };

  const syncActiveMonthToValue = () => {
    if (serviceDateInput.value.trim()) {
      activeMonth = new Date(`${serviceDateInput.value}T00:00:00`);
      return;
    }

    activeMonth = new Date(today);
  };

  const selectScheduleDate = (date) => {
    const normalizedDate = startOfDay(date);
    if (normalizedDate < today) return;

    serviceDateInput.value = toDateValue(normalizedDate);
    serviceDateInput.dispatchEvent(new Event("input", { bubbles: true }));
    syncActiveMonthToValue();
    renderCalendar();
    syncScheduleCopy();
    scheduleGroup.classList.remove("is-invalid");
    setDateMenuState(false);
  };

  function renderCalendar() {
    const monthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const selectedValue = serviceDateInput.value.trim();

    dateMonthLabel.textContent = activeMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    dateGrid.innerHTML = "";

    for (let index = 0; index < 42; index += 1) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);

      const cellButton = document.createElement("button");
      cellButton.type = "button";
      cellButton.className = "checkout-date-cell";

      const inCurrentMonth = cellDate.getMonth() === activeMonth.getMonth();
      const isToday = toDateValue(cellDate) === toDateValue(today);
      const isSelected = selectedValue && toDateValue(cellDate) === selectedValue;
      const isPast = startOfDay(cellDate) < today;

      if (!inCurrentMonth) cellButton.classList.add("is-muted");
      if (isToday) cellButton.classList.add("is-today");
      if (isSelected) cellButton.classList.add("is-selected");
      if (isPast) {
        cellButton.classList.add("is-disabled");
        cellButton.disabled = true;
      }

      cellButton.textContent = String(cellDate.getDate());
      cellButton.addEventListener("click", () => selectScheduleDate(cellDate));
      dateGrid.appendChild(cellButton);
    }
  }

  const to24HourTime = () => {
    const hour = serviceHourInput.value.trim();
    const minute = serviceMinuteInput.value.trim();
    const period = servicePeriodInput.value.trim();

    if (!hour || !minute || !period) return "";

    let parsedHour = Number(hour);
    if (Number.isNaN(parsedHour)) return "";

    if (period === "AM" && parsedHour === 12) parsedHour = 0;
    if (period === "PM" && parsedHour !== 12) parsedHour += 12;

    return `${String(parsedHour).padStart(2, "0")}:${minute}`;
  };

  const buildTimeOptions = (container, values, input) => {
    container.innerHTML = "";

    values.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "checkout-time-option";
      button.dataset.value = value;
      button.textContent = value;

      if (input.value === value) {
        button.classList.add("is-selected");
      }

      button.addEventListener("click", () => {
        input.value = value;
        container
          .querySelectorAll(".checkout-time-option")
          .forEach((option) => option.classList.toggle("is-selected", option.dataset.value === value));
        syncScheduleCopy();
        scheduleGroup.classList.remove("is-invalid");

        if (serviceTimeInput.value) {
          setTimeMenuState(false);
        }
      });

      container.appendChild(button);
    });
  };

  const updateTimeDisplay = () => {
    if (
      serviceHourInput.value.trim() &&
      serviceMinuteInput.value.trim() &&
      servicePeriodInput.value.trim()
    ) {
      timeDisplay.textContent = `${serviceHourInput.value}:${serviceMinuteInput.value} ${servicePeriodInput.value}`;
      timeDisplay.classList.add("has-value");
      return;
    }

    timeDisplay.textContent = "Select time";
    timeDisplay.classList.remove("has-value");
  };

  const setTimeMenuState = (isOpen) => {
    timeDropdown.classList.toggle("is-open", isOpen);
    timeTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    timeMenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
  };

  const setMinScheduleDate = () => {
    if (serviceDateInput.value.trim()) {
      const selectedDate = startOfDay(new Date(`${serviceDateInput.value}T00:00:00`));
      if (selectedDate < today) {
        serviceDateInput.value = "";
      }
    }
  };

  const syncScheduleCopy = () => {
    updateDateDisplay();
    serviceTimeInput.value = to24HourTime();
    updateTimeDisplay();
    serviceTimeInput.dispatchEvent(new Event("input", { bubbles: true }));

    const hasDate = serviceDateInput.value.trim().length > 0;
    const hasTime = serviceTimeInput.value.trim().length > 0;

    if (hasDate && hasTime) {
      const formattedDate = formatDisplayDate(serviceDateInput.value);
      const formattedTime = formatDisplayTime(serviceTimeInput.value);
      if (formattedDate && formattedTime) {
        summary.textContent = `Scheduled for ${formattedDate} at ${formattedTime}`;
        scheduleGroup.classList.remove("is-invalid");
        return;
      }
    }

    summary.textContent = "Select your service date and time";
  };

  setMinScheduleDate();
  syncActiveMonthToValue();
  renderCalendar();
  buildTimeOptions(hourOptions, ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"], serviceHourInput);
  buildTimeOptions(
    minuteOptions,
    Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")),
    serviceMinuteInput,
  );
  buildTimeOptions(periodOptions, ["AM", "PM"], servicePeriodInput);

  serviceDateInput.addEventListener("input", syncScheduleCopy);

  dateTrigger.addEventListener("click", () => {
    const isOpen = dateDropdown.classList.contains("is-open");
    if (!isOpen) {
      syncActiveMonthToValue();
      renderCalendar();
    }
    setDateMenuState(!isOpen);
    setTimeMenuState(false);
  });

  datePrevButton.addEventListener("click", () => {
    activeMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  dateNextButton.addEventListener("click", () => {
    activeMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  dateClearButton.addEventListener("click", () => {
    serviceDateInput.value = "";
    serviceDateInput.dispatchEvent(new Event("input", { bubbles: true }));
    syncActiveMonthToValue();
    renderCalendar();
    setDateMenuState(false);
  });

  dateTodayButton.addEventListener("click", () => {
    selectScheduleDate(today);
  });

  timeTrigger.addEventListener("click", () => {
    const isOpen = timeDropdown.classList.contains("is-open");
    setDateMenuState(false);
    setTimeMenuState(!isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!timeDropdown.contains(event.target)) setTimeMenuState(false);
    if (!dateDropdown.contains(event.target)) setDateMenuState(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDateMenuState(false);
      setTimeMenuState(false);
    }
  });

  syncScheduleCopy();
  setDateMenuState(false);
  setTimeMenuState(false);
  scheduleGroup.dataset.schedulePickerInitialized = "true";
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
  const bdtOutput = document.getElementById("sliderBdtValue");
  const valueWrap = document.querySelector(".size-estimator-value-wrap");
  const valueLine = valueWrap?.querySelector(".size-estimator-value-line");
  const editHint = valueWrap?.querySelector(".size-estimator-edit-hint");
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
    !bdtOutput ||
    !valueWrap ||
    !valueLine ||
    !editHint ||
    !baseLabel ||
    !basePriceEl ||
    !discountAmountEl ||
    !totalAmountEl
  )
    return;

  const ratePerSqft = 1.0;
  const discountRate = 0.1;
  const sliderMin = Number(slider.min || 0);
  const sliderMax = Number(slider.max || 100);
  const sliderStep = Number(slider.step || 10);
  const formatCurrency = (value) =>
    `৳ ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const editInput = document.createElement("input");
  const editPrefix = document.createElement("span");
  const confirmButton = document.createElement("button");

  editPrefix.className = "size-estimator-edit-prefix";
  editPrefix.textContent = "SFT";
  editPrefix.hidden = true;
  editPrefix.setAttribute("aria-hidden", "true");
  valueWrap.insertBefore(editPrefix, editHint);

  editInput.type = "number";
  editInput.className = "size-estimator-edit-input";
  editInput.min = String(sliderMin);
  editInput.max = String(sliderMax);
  editInput.step = String(sliderStep);
  editInput.inputMode = "numeric";
  editInput.hidden = true;
  editInput.setAttribute("aria-label", "Edit home size in square feet");
  valueWrap.insertBefore(editInput, editHint);

  confirmButton.type = "button";
  confirmButton.className = "size-estimator-edit-confirm";
  confirmButton.hidden = true;
  confirmButton.setAttribute("aria-label", "Apply home size");
  confirmButton.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i>';
  valueWrap.insertBefore(confirmButton, editHint);

  const clampToSlider = (value) => {
    const safeValue = Number.isFinite(value) ? value : sliderMin;
    const steppedValue =
      Math.round((safeValue - sliderMin) / sliderStep) * sliderStep + sliderMin;
    return Math.min(sliderMax, Math.max(sliderMin, steppedValue));
  };

  const openEditor = () => {
    slider.dispatchEvent(new CustomEvent("service-slider-manual-edit"));
    editInput.value = String(slider.value);
    valueLine.hidden = true;
    editHint.hidden = true;
    editPrefix.hidden = false;
    editInput.hidden = false;
    confirmButton.hidden = false;
    valueWrap.classList.add("is-editing");
    editInput.focus();
    editInput.select();
  };

  const closeEditor = ({ commit = false } = {}) => {
    if (commit) {
      const nextValue = clampToSlider(Number(editInput.value));
      slider.value = String(nextValue);
      updateSlider();
      slider.dispatchEvent(new CustomEvent("service-slider-manual-edit"));
    }

    editPrefix.hidden = true;
    editInput.hidden = true;
    confirmButton.hidden = true;
    valueLine.hidden = false;
    editHint.hidden = false;
    valueWrap.classList.remove("is-editing");
  };

  const updateSlider = () => {
    const sqft = Number(slider.value);
    const percentage = ((sqft - sliderMin) * 100) / (sliderMax - sliderMin);
    const basePrice = sqft * ratePerSqft;
    const discount = basePrice * discountRate;
    const total = basePrice - discount;

    slider.style.background = `linear-gradient(to right, #1CAAB8 0%, #1CAAB8 ${percentage}%, #d6eaec ${percentage}%, #d6eaec 100%)`;
    const sliderSqftEl = document.getElementById("sliderSqft");
    output.textContent = sqft.toLocaleString("en-US");
    bdtOutput.textContent = Math.round(basePrice).toLocaleString("en-US");
    if (sliderSqftEl) sliderSqftEl.textContent = "SFT";
    baseLabel.textContent = `Base Rate (${sqft.toLocaleString("en-US")} SFT)`;
    basePriceEl.textContent = formatCurrency(basePrice);
    discountAmountEl.textContent = `- ${formatCurrency(discount)}`;
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(total);
    }
  };

  slider.addEventListener("input", updateSlider);
  editHint.setAttribute("role", "button");
  editHint.setAttribute("tabindex", "0");
  editHint.addEventListener("click", openEditor);
  editHint.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openEditor();
  });
  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmButton.click();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
    }
  });
  editInput.addEventListener("blur", (event) => {
    if (editInput.hidden) return;
    if (event.relatedTarget === confirmButton) return;
    closeEditor();
  });
  confirmButton.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  confirmButton.addEventListener("click", () => {
    closeEditor({ commit: true });
  });
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

function initServiceDetailsSliderDemo() {
  const slider = document.getElementById("sizeSlider");
  if (!slider || slider.dataset.demoInitialized === "true") return;

  const sliderWrap = slider.closest(".size-slider-wrap");
  const sliderDemo = sliderWrap?.querySelector(".size-slider-demo");
  if (!sliderWrap || !sliderDemo) return;

  let animationFrameId = null;
  let startTime = null;
  let demoStopped = false;
  const minProgress = 0;
  const maxProgress = 0.82;
  const cycleDuration = 3200;

  const startDemo = () => {
    demoStopped = false;
    startTime = null;
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    animationFrameId = window.requestAnimationFrame(animateDemo);
  };

  const stopDemo = () => {
    if (demoStopped) return;
    demoStopped = true;
    sliderWrap.classList.remove("is-demo-active");
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const animateDemo = (timestamp) => {
    if (demoStopped) return;

    if (startTime === null) {
      startTime = timestamp;
      sliderWrap.classList.add("is-demo-active");
    }

    const elapsed = (timestamp - startTime) % cycleDuration;
    const phase = elapsed / cycleDuration;
    const eased = 0.5 - Math.cos(phase * Math.PI) / 2;
    const progress = minProgress + (maxProgress - minProgress) * eased;

    sliderWrap.style.setProperty("--slider-demo-progress", progress.toFixed(4));
    animationFrameId = window.requestAnimationFrame(animateDemo);
  };

  startDemo();

  slider.addEventListener("pointerdown", stopDemo, { passive: true });
  slider.addEventListener("touchstart", stopDemo, { passive: true });
  slider.addEventListener("focus", stopDemo);
  slider.addEventListener("input", stopDemo);
  slider.addEventListener("change", stopDemo);
  slider.addEventListener("service-slider-manual-edit", stopDemo);
  slider.addEventListener("service-slider-demo-restart", startDemo);
  slider.dataset.demoInitialized = "true";
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

    const shouldShow = window.scrollY >= 280;

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

const CART_STORAGE_KEY = "clean_service_cart_v2";
const DEFAULT_CART_IMAGE = "assets/images/services/services_1.png";

window.__cartAppManaged = true;

function normalizeCartText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return normalizeCartText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCartNumber(value) {
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCartMoney(value) {
  return `BDT ${Math.round(value).toLocaleString("en-US")}`;
}

function formatCartDiscount(value) {
  return value > 0 ? `- ${formatCartMoney(value)}` : formatCartMoney(0);
}

function formatCartItemDesc(item) {
  const desc = normalizeCartText(item?.desc);
  const qty = Math.max(1, Math.round(parseCartNumber(item?.qty) || 1));
  const match = desc.match(/^([\d,]+)\s*(SFT)\b/i);

  if (match) {
    const baseArea = parseCartNumber(match[1]);
    const unit = match[2].toUpperCase();
    return `${Math.round(baseArea * qty).toLocaleString("en-US")} ${unit}`;
  }

  return `${desc}${qty > 1 ? ` x${qty}` : ""}`;
}

function getSelectedServiceContext() {
  const params = new URLSearchParams(window.location.search);
  const serviceName = normalizeCartText(params.get("service"));
  const serviceImage = normalizeCartText(params.get("image"));
  const serviceCategory = normalizeCartText(params.get("category"));

  return {
    name: serviceName,
    image: serviceImage,
    category: serviceCategory,
  };
}

function applySelectedServiceContext() {
  const context = getSelectedServiceContext();
  if (!context.name && !context.image && !context.category) return;

  const serviceTitle = document.querySelector(".service-title");
  if (serviceTitle && context.name) {
    serviceTitle.textContent = context.name;
  }

  const pageTitle = document.querySelector(".service_details h1");
  if (pageTitle && context.name) {
    pageTitle.textContent = context.name;
  }

  const priceCard = document.querySelector(".price-card");
  if (priceCard) {
    if (context.category) {
      priceCard.dataset.cartCategory = context.category;
    } else if (context.name) {
      priceCard.dataset.cartCategory = context.name;
    }

    if (context.image) {
      priceCard.dataset.cartImage = context.image;
    }
  }
}

function initServiceCardLinks() {
  document.querySelectorAll(".service-card-link").forEach((link) => {
    const name = normalizeCartText(
      link.querySelector(".service-content h6")?.textContent,
    );
    const image = normalizeCartText(
      link.querySelector(".service-image img")?.getAttribute("src"),
    );
    const href = link.getAttribute("href");
    if (!href || !name) return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_) {
      return;
    }

    url.searchParams.set("service", name);
    url.searchParams.set("category", name);
    if (image) {
      url.searchParams.set("image", image);
    }

    const normalizedHref =
      url.pathname.replace(/^\//, "") +
      (url.search ? url.search : "") +
      (url.hash ? url.hash : "");

    link.setAttribute("href", normalizedHref);
  });
}

const CART_SERVICE_FEE = 100;
const CART_TRANSPORT_FEE = 0;
const CART_DISCOUNT_RATE = 0.1;

window.__cartFlightActive = false;

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

function getCartQuantity(items = readCartItems()) {
  return items.reduce((total, item) => total + (Number(item.qty) || 0), 0);
}

function getCartSubtotal(items = readCartItems()) {
  return items.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0,
  );
}

function getCartSummary(items = readCartItems()) {
  const quantity = getCartQuantity(items);
  const subtotal = getCartSubtotal(items);
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

function buildCartKey(name, desc) {
  return `${normalizeCartText(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${normalizeCartText(desc).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/^-+|-+$/g, "");
}

function addCartItem(item) {
  const items = readCartItems();
  const nextItem = {
    id: normalizeCartText(item.id),
    name: normalizeCartText(item.name),
    category: normalizeCartText(item.category),
    desc: normalizeCartText(item.desc),
    image: normalizeCartText(item.image) || DEFAULT_CART_IMAGE,
    price: Math.max(0, parseCartNumber(item.price)),
    qty: Math.max(1, Math.round(parseCartNumber(item.qty) || 1)),
  };

  const existingItem = items.find((entry) => entry.id === nextItem.id);
  if (existingItem) {
    existingItem.qty += nextItem.qty;
    existingItem.price = nextItem.price;
    existingItem.desc = nextItem.desc;
  } else {
    items.push(nextItem);
  }

  writeCartItems(items);
}

function removeCartItem(itemId) {
  writeCartItems(readCartItems().filter((item) => item.id !== itemId));
}

function updateCartItemQuantity(itemId, quantity) {
  const items = readCartItems();
  const target = items.find((item) => item.id === itemId);
  if (!target) return;

  target.qty = Math.max(1, Math.round(parseCartNumber(quantity) || 1));
  writeCartItems(items);
}

function buildServicePageCartItem(trigger) {
  const priceCard = trigger.closest(".price-card");
  const selectedService = getSelectedServiceContext();
  const sliderValueText = normalizeCartText(
    document.getElementById("sliderValue")?.textContent,
  );
  const sliderUnitText = normalizeCartText(
    document.getElementById("sliderSqft")?.textContent || "SFT",
  );
  const baseLabelMatch = normalizeCartText(
    priceCard?.querySelector(".base-label")?.textContent,
  ).match(/\(([^)]+)\)/);
  const name =
    selectedService.name ||
    normalizeCartText(document.querySelector(".service-title")?.textContent) ||
    "Cleaning Service";
  const desc =
    normalizeCartText(
      sliderValueText
        ? `${sliderValueText} ${sliderUnitText}`
        : baseLabelMatch?.[1],
    ) ||
    "Custom service package";
  const price = parseCartNumber(
    priceCard?.querySelector(".total-amount")?.textContent ||
      document.getElementById("sliderValue")?.textContent,
  );

  return {
    id: buildCartKey(name, desc),
    name,
    category:
      selectedService.category ||
      normalizeCartText(priceCard?.dataset.cartCategory) ||
      "Service",
    desc,
    image:
      selectedService.image ||
      normalizeCartText(priceCard?.dataset.cartImage) ||
      DEFAULT_CART_IMAGE,
    price,
    qty: 1,
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
      <p class="service-cart-desc">${formatCartItemDesc(item)}</p>
      <p class="service-cart-price">${formatCartMoney(item.price * item.qty)}</p>
    </div>
  `;
}

function createCartPageItemMarkup(item) {
  return `
    <div class="cart-item" data-cart-id="${item.id}" data-price="${item.price}">
      <div class="cart-item-thumb">
        <img src="${item.image}" alt="${item.name}" class="img-fluid" />
      </div>
      <div class="cart-item-main">
        <div class="cart-item-top">
          <div>
            <span class="cart-item-tag">${item.category || "Service"}</span>
            <h3 class="cart-item-name">${item.name}</h3>
            <ul class="cart-item-meta">
              <li><i class="bi bi-rulers"></i> ${formatCartItemDesc(item)}</li>
              <li><i class="bi bi-bag-check"></i> Quantity: ${item.qty}</li>
            </ul>
          </div>
          <button
            class="cart-remove"
            type="button"
            aria-label="Remove item"
            data-remove-cart-item="${item.id}"
          >
            <i class="bi bi-trash3"></i>
          </button>
        </div>
        <div class="cart-item-bottom">
          <div class="qty-stepper" data-qty="${item.qty}">
            <button type="button" class="qty-btn qty-minus" aria-label="Decrease">
              <i class="bi bi-dash-lg"></i>
            </button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn qty-plus" aria-label="Increase">
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
          <div class="cart-item-price">
            <span class="cart-line-price">${formatCartMoney(item.price * item.qty)}</span>
            <small>${formatCartMoney(item.price)} / unit</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

function shouldAnimateCartMotion() {
  return !window.matchMedia("(max-width: 991.98px)").matches;
}

function animateCartFabValue(element) {
  if (!element || !shouldAnimateCartMotion()) return;
  element.classList.remove("is-updating");
  void element.offsetWidth;
  element.classList.add("is-updating");

  window.setTimeout(() => {
    element.classList.remove("is-updating");
  }, 460);
}

function animateCartFabSurface() {
  const fab = document.querySelector(".service-cart-fab");
  if (!fab || !shouldAnimateCartMotion()) return;

  fab.classList.remove("is-updating");
  void fab.offsetWidth;
  fab.classList.add("is-updating");

  window.setTimeout(() => {
    fab.classList.remove("is-updating");
  }, 430);
}

function animateAddToCartFlight(sourceButton, cartItem) {
  const basket = document.querySelector(".service-cart-fab");
  if (!sourceButton || !basket || !shouldAnimateCartMotion()) return;

  const sourceRect = sourceButton.getBoundingClientRect();
  const targetRect = basket.getBoundingClientRect();
  const flyer = document.createElement("div");
  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const travel = Math.max(280, Math.hypot(deltaX, deltaY));
  const arcRise = Math.min(120, Math.max(44, travel * 0.16));

  flyer.className = "cart-flight-comet";

  if (cartItem) {
    const itemName = escapeHtml(cartItem.name) || "Service";
    const itemCategory = escapeHtml(cartItem.category) || "Service";
    const itemPrice = formatCartMoney(cartItem.price);
    const itemImage = escapeHtml(cartItem.image) || DEFAULT_CART_IMAGE;

    flyer.innerHTML = `
      <span class="cart-flight-trail trail-1"></span>
      <span class="cart-flight-trail trail-2"></span>
      <span class="cart-flight-trail trail-3"></span>
      <div class="cart-flight-comet-glow"></div>
      <div class="cart-flight-comet-body">
        <img src="${itemImage}" alt="" class="cart-flight-thumb" />
        <div class="cart-flight-copy">
          <span class="cart-flight-label">${itemCategory}</span>
          <strong>${itemName}</strong>
          <span class="cart-flight-price">${itemPrice}</span>
        </div>
      </div>
      <div class="cart-flight-spark"></div>
      <div class="cart-flight-spark spark-2"></div>
    `;
  } else {
    flyer.classList.add("cart-flight-fallback");
    flyer.innerHTML = '<i class="bi bi-basket2" aria-hidden="true"></i>';
  }

  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;
  flyer.style.setProperty("--flight-x", `${deltaX}px`);
  flyer.style.setProperty("--flight-y", `${deltaY}px`);
  flyer.style.setProperty("--flight-rise", `${arcRise}px`);
  flyer.style.setProperty("--flight-rise-soft", `${Math.round(arcRise * 0.35)}px`);
  flyer.style.setProperty(
    "--flight-duration",
    `${Math.min(1050, Math.max(650, travel * 0.92))}ms`,
  );
  document.body.appendChild(flyer);

  window.requestAnimationFrame(() => {
    flyer.classList.add("is-flying");
  });

  const cleanup = () => {
    flyer.removeEventListener("transitionend", cleanup);
    flyer.remove();
  };

  flyer.addEventListener("transitionend", cleanup);
  window.setTimeout(cleanup, 1600);
}

function ensureMobileCartToast() {
  let toast = document.getElementById("mobileCartToast");
  if (toast) return toast;

  toast = document.createElement("div");
  toast.id = "mobileCartToast";
  toast.className = "mobile-cart-toast";
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <span class="mobile-cart-toast-icon" aria-hidden="true">
      <i class="bi bi-basket2"></i>
    </span>
    <span class="mobile-cart-toast-copy">
      <span class="mobile-cart-toast-title"></span>
      <span class="mobile-cart-toast-meta"></span>
    </span>
  `;
  document.body.appendChild(toast);
  return toast;
}

function showMobileCartToast(item) {
  if (!window.matchMedia("(max-width: 991.98px)").matches) return;

  const toast = ensureMobileCartToast();
  const title = toast.querySelector(".mobile-cart-toast-title");
  const meta = toast.querySelector(".mobile-cart-toast-meta");
  const summary = getCartSummary();
  const itemName = normalizeCartText(item?.name) || "Service";

  if (title) {
    title.textContent = `${itemName} added to cart`;
  }

  if (meta) {
    meta.innerHTML = `<strong>${summary.quantity} items</strong> • ${formatCartMoney(summary.total)}`;
  }

  if (toast.hideTimerId) {
    window.clearTimeout(toast.hideTimerId);
  }

  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");

  toast.hideTimerId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function renderGlobalCart() {
  const items = readCartItems();
  const summary = getCartSummary(items);
  const headerCount = document.querySelector(".cart_length small");
  const mobileBottomCount = document.querySelector(".mobile-bottom-cart-count");
  const fabCount = document.querySelector(".service-cart-fab-count");
  const fabTotal = document.querySelector(".service-cart-fab-total");
  const drawerList = document.querySelector(".service-cart-list");
  const drawerTotal = document.querySelector(".service-cart-total strong");
  const nextCountText =
    summary.quantity === 1 ? "1 Item" : `${summary.quantity} Items`;
  const nextTotalText = formatCartMoney(summary.total);
  const shouldAnimateCount = fabCount && fabCount.textContent !== nextCountText;
  const shouldAnimateTotal = fabTotal && fabTotal.textContent !== nextTotalText;

  if (headerCount) headerCount.textContent = String(summary.quantity);
  if (mobileBottomCount) {
    mobileBottomCount.textContent = String(summary.quantity);
    mobileBottomCount.classList.toggle("has-items", summary.quantity > 0);
  }
  if (fabCount) fabCount.textContent = nextCountText;
  if (fabTotal) fabTotal.textContent = nextTotalText;

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

  if (shouldAnimateCount) animateCartFabValue(fabCount);
  if (shouldAnimateTotal) animateCartFabValue(fabTotal);
  if (
    shouldAnimateCartMotion() &&
    !window.__cartFlightActive &&
    (shouldAnimateCount || shouldAnimateTotal)
  ) {
    animateCartFabSurface();
  }
}

function renderCartPage() {
  const itemsWrap = document.getElementById("cartItems");
  if (!itemsWrap) return;

  const items = readCartItems();
  const summary = getCartSummary(items);
  const layout = document.getElementById("cartLayout");
  const emptyState = document.getElementById("cartEmpty");
  const mobileBar = document.getElementById("cartMobileBar");
  const count = document.getElementById("cartCount");

  itemsWrap.innerHTML = items.map(createCartPageItemMarkup).join("");

  if (count) {
    count.textContent =
      summary.quantity === 1 ? "1 item" : `${summary.quantity} items`;
  }

  if (layout) layout.hidden = !items.length;
  if (emptyState) emptyState.hidden = !!items.length;
  if (mobileBar) mobileBar.style.display = items.length ? "" : "none";

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("sumSubtotal", formatCartMoney(summary.subtotal));
  setText("sumFee", formatCartMoney(summary.serviceFee));
  setText("sumDiscount", formatCartDiscount(summary.discount));
  setText("sumTransport", formatCartMoney(summary.transportFee));
  setText("sumTotal", formatCartMoney(summary.total));
  setText("sumTotalMobile", formatCartMoney(summary.total));
}

function renderCheckoutSummary() {
  const summaryContent = document.querySelector(".summary-content");
  if (!summaryContent) return;

  const items = readCartItems();
  const summary = getCartSummary(items);
  const summaryRows = summaryContent.querySelectorAll(".services_amount");
  const totalAmount = summaryContent.querySelector(".total_amount");
  let itemsHost = summaryContent.querySelector("[data-checkout-cart-items]");

  if (!itemsHost) {
    const firstCard = summaryContent.querySelector(
      ".d-flex.justify-content-between.align-items-start.pb-3.mb-3.border-b",
    );
    if (firstCard) {
      itemsHost = document.createElement("div");
      itemsHost.setAttribute("data-checkout-cart-items", "true");
      firstCard.before(itemsHost);
      firstCard.remove();
    }
  }

  if (itemsHost) {
    itemsHost.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <div class="d-flex justify-content-between align-items-start pb-3 mb-3 border-b">
                <div>
                  <h6 class="house-cleaning">${item.name}</h6>
                  <p class="sft-area">${formatCartItemDesc(item)}</p>
                </div>
                <span class="bdt-amount">${formatCartMoney(item.price * item.qty)}</span>
              </div>
            `,
          )
          .join("")
      : `
        <div class="d-flex justify-content-between align-items-start pb-3 mb-3 border-b">
          <div>
            <h6 class="house-cleaning">No service selected</h6>
            <p class="sft-area">Your cart is empty</p>
          </div>
          <span class="bdt-amount">${formatCartMoney(0)}</span>
        </div>
      `;
  }

  if (summaryRows[0]) summaryRows[0].textContent = formatCartMoney(summary.subtotal);
  if (summaryRows[1]) summaryRows[1].textContent = formatCartMoney(summary.serviceFee);
  if (summaryRows[2]) summaryRows[2].textContent = formatCartDiscount(summary.discount);
  if (summaryRows[3]) summaryRows[3].textContent = formatCartMoney(summary.transportFee);
  if (totalAmount) totalAmount.textContent = formatCartMoney(summary.total);
}

function renderAllCartUIs() {
  renderGlobalCart();
  renderCartPage();
  renderCheckoutSummary();
}

function initCartButtons() {
  document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
    if (button.dataset.cartBound === "true") return;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      const cartItem = buildServicePageCartItem(button);
      addCartItem(cartItem);
      showMobileCartToast(cartItem);
      if (!shouldAnimateCartMotion()) return;
      try {
        window.__cartFlightActive = true;
        animateAddToCartFlight(button, cartItem);
        animateCartFabPulse();
        window.setTimeout(() => {
          window.__cartFlightActive = false;
        }, 2600);
      } catch (_) {
        window.__cartFlightActive = false;
      }
    });

    button.dataset.cartBound = "true";
  });
}

function initCartPageControls() {
  const itemsWrap = document.getElementById("cartItems");
  if (!itemsWrap || itemsWrap.dataset.cartControlsInitialized === "true") return;

  itemsWrap.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const cartItem = button.closest(".cart-item");
    const itemId = cartItem?.dataset.cartId;
    if (!itemId) return;

    if (button.classList.contains("cart-remove")) {
      removeCartItem(itemId);
      return;
    }

    const items = readCartItems();
    const target = items.find((item) => item.id === itemId);
    if (!target) return;

    if (button.classList.contains("qty-plus")) {
      updateCartItemQuantity(itemId, target.qty + 1);
    }

    if (button.classList.contains("qty-minus")) {
      updateCartItemQuantity(itemId, Math.max(1, target.qty - 1));
    }
  });

  itemsWrap.dataset.cartControlsInitialized = "true";
}

function initCartSystem() {
  if (document.body?.dataset.cartInitialized === "true") {
    initCartButtons();
    initCartPageControls();
    renderAllCartUIs();
    return;
  }

  window.addEventListener("storage", renderAllCartUIs);
  initCartButtons();
  initCartPageControls();
  renderAllCartUIs();
  document.body.dataset.cartInitialized = "true";
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

  window.openServiceCartDrawer = openDrawer;

  // Trigger: the floating cart FAB.
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
  drawer.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-cart-item]");
    if (!removeButton) return;

    removeCartItem(removeButton.getAttribute("data-remove-cart-item"));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  renderGlobalCart();
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

function toggleServiceBox(button) {
  if (!button) return;
  const section = button.closest(".service-box-collapsible");
  if (!section) return;
  section.classList.add("is-open");
  button.setAttribute("aria-expanded", "true");
}

function syncServiceBoxForViewport() {
  const sections = document.querySelectorAll(".service-box-collapsible");

  sections.forEach((section) => {
    const toggle = section.querySelector(".service-box-toggle");
    if (!toggle) return;

    const shouldBeOpen = window.innerWidth > 768;
    section.classList.toggle("is-open", shouldBeOpen);
    toggle.setAttribute("aria-expanded", shouldBeOpen ? "true" : "false");
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
  syncServiceBoxForViewport();
  initPageLoader();
  initActiveNav();
  initDesktopDropdownHover();
  initSidebarState();
  initHeroCarousel();
  initServiceCardLinks();
  applySelectedServiceContext();
  initServiceDetailsSlider();
  initServiceDetailsSliderFeedback();
  initServiceDetailsSliderDemo();
  initServiceTopIndicator();
  initMobileKeyboardViewportState();
  initCartSystem();

  if (document.querySelector(".checkout-section-collapsible")) {
    window.addEventListener("resize", syncCheckoutSectionsForViewport);
  }

  if (document.querySelector(".service-box-collapsible")) {
    window.addEventListener("resize", syncServiceBoxForViewport);
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
    initServiceDetailReveal();
    initMobileContactOverlay();
    initLoginMethodToggle();
    initSignupMethodToggle();
    initOtpValidation();
    initCustomerDetailsValidation();
    initCheckoutSchedulePicker();
    initCheckoutAreaSelect2();
    initCheckoutValidation();
    initContactFormValidation();
    initServiceCartDrawer();
    initBlogSuggestionsDropdown();
    initServiceSearchToggle();
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
onComponentLoaded("header-placeholder", renderAllCartUIs);
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
