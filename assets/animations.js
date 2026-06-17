/**
 * Advanced scroll animations for Northgate Wholesale, powered by GSAP
 * ScrollTrigger.
 *
 * Because the storefront is a single-page app that re-renders <main id="app">
 * on every navigation, app.js calls `applyScrollAnimations()` after each view
 * change. That tears down the previous view's triggers and builds a fresh set
 * for whatever is now on screen. `clearScrollAnimations()` is used for in-place
 * re-renders (cart edits) so rows don't re-animate on every click.
 *
 * Everything uses `gsap.from()` / scroll-triggered reveals, so if GSAP ever
 * fails to load the content simply stays in its natural, fully-visible state.
 */
(function () {
  // Graceful fallback: if the library is missing, expose no-ops.
  if (!window.gsap || !window.ScrollTrigger) {
    window.applyScrollAnimations = function () {};
    window.clearScrollAnimations = function () {};
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tweens = []; // tweens/timelines we created, so we can tear them down
  const track = (t) => {
    if (t) tweens.push(t);
    return t;
  };

  function clearScrollAnimations() {
    ScrollTrigger.getAll().forEach((t) => t.kill());
    tweens.forEach((t) => t.kill && t.kill());
    tweens = [];
  }

  function applyScrollAnimations() {
    clearScrollAnimations();
    if (reduceMotion) return; // honour reduced-motion: leave content visible, no motion

    const root = document.getElementById("app");
    if (!root) return;
    const all = (sel) => Array.from(root.querySelectorAll(sel));
    const one = (sel) => root.querySelector(sel);

    // Fade-and-rise reveal for a single element when it scrolls into view.
    const reveal = (el, vars) =>
      el &&
      track(
        gsap.from(
          el,
          Object.assign(
            {
              opacity: 0,
              y: 42,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            },
            vars
          )
        )
      );

    // Staggered reveal for a group of items sharing one trigger.
    const stagger = (trigger, items, vars) =>
      items.length &&
      track(
        gsap.from(
          items,
          Object.assign(
            {
              opacity: 0,
              y: 42,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.09,
              scrollTrigger: { trigger, start: "top 82%", once: true },
            },
            vars
          )
        )
      );

    // Performance-friendly reveal for long grids: hide up front, then reveal
    // batches as they enter the viewport.
    const batchIn = (items) => {
      if (!items.length) return;
      gsap.set(items, { opacity: 0, y: 48 });
      ScrollTrigger.batch(items, {
        start: "top 92%",
        onEnter: (b) =>
          gsap.to(b, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: "power3.out", overwrite: true }),
      });
    };

    // ── Home hero: orchestrated entrance + parallax artwork ──
    if (one(".hero")) {
      const tl = track(gsap.timeline({ defaults: { ease: "power3.out" } }));
      tl.from(".hero-copy .eyebrow", { opacity: 0, y: 20, duration: 0.6 })
        .from(".hero-copy h1", { opacity: 0, y: 34, duration: 0.9 }, "-=0.3")
        .from(".hero-copy p", { opacity: 0, y: 24, duration: 0.7 }, "-=0.55")
        .from(".hero-actions .btn", { opacity: 0, y: 20, duration: 0.6, stagger: 0.12 }, "-=0.45")
        .from(".hero-points li", { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, "-=0.4")
        .from(".hero-tile", { opacity: 0, scale: 0.82, y: 26, duration: 0.7, stagger: 0.08 }, "-=0.9");

      track(
        gsap.to(".hero-art", {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        })
      );
    }

    // ── About hero ──
    if (one(".about-hero")) {
      track(
        gsap.from(
          ".about-hero .eyebrow, .about-hero h1, .about-hero .about-lead, .about-hero .hero-actions",
          { opacity: 0, y: 30, duration: 0.8, stagger: 0.12, ease: "power3.out" }
        )
      );
    }

    // ── Stats band: reveal + animated count-up ──
    if (one(".stats")) {
      stagger(".stats", all(".stats .stat"), { y: 30, duration: 0.6, stagger: 0.12 });
      all(".stat-num").forEach((el) => {
        const m = el.textContent.trim().match(/^([\d,]+)(.*)$/); // numeric stats only
        if (!m) return;
        const target = parseInt(m[1].replace(/,/g, ""), 10);
        const suffix = m[2];
        const counter = { v: 0 };
        track(
          gsap.to(counter, {
            v: target,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
            onUpdate: () => {
              el.textContent = Math.round(counter.v).toLocaleString() + suffix;
            },
          })
        );
      });
    }

    // ── Section headings (home featured, about values, …) ──
    all(".section-head").forEach((el) => reveal(el, { y: 28 }));

    // ── Value cards ──
    if (one(".value-strip")) stagger(".value-strip", all(".value-strip .value"), { y: 50, scale: 0.96 });

    // ── About: story copy + parallax tile cluster ──
    if (one(".about-story")) {
      reveal(one(".about-story-copy"), { x: 40, y: 0 });
      stagger(".about-story-art", all(".about-story-art .art-tile"), { scale: 0.85, y: 30, stagger: 0.1 });
      track(
        gsap.to(".about-story-art", {
          yPercent: -8,
          ease: "none",
          scrollTrigger: { trigger: ".about-story", start: "top bottom", end: "bottom top", scrub: true },
        })
      );
    }

    // ── Featured products (home) ──
    if (one(".featured")) {
      stagger(".featured .product-grid", all(".featured .product-grid .product-card"), { y: 50 });
      reveal(one(".featured-cta"));
    }

    // ── Closing CTA band ──
    reveal(one(".cta-band .cta-inner"), { y: 36, scale: 0.98 });

    // ── Catalog (batched grid) ──
    if (one(".filters")) {
      reveal(one(".page-head"), { y: 24 });
      reveal(one(".filters"), { y: 18, duration: 0.6 });
      batchIn(all(".product-grid .product-card").filter((c) => !c.closest(".related")));
    }

    // ── Product detail ──
    if (one(".product-detail")) {
      reveal(one(".detail-media"), { x: -50, y: 0, duration: 0.9 });
      stagger(".detail-info", all(".detail-info > *"), { x: 40, y: 0, stagger: 0.08, duration: 0.7 });
      if (one(".related")) {
        reveal(one(".related h2"), { y: 24 });
        batchIn(all(".related .product-grid .product-card"));
      }
    }

    // ── Cart ──
    if (one(".cart-main")) {
      reveal(one(".cart-main h1"), { y: 24 });
      stagger(".cart-list", all(".cart-list .cart-row"), { y: 30, stagger: 0.08 });
      reveal(one(".cart-summary"), { x: 40, y: 0 });
    }
    if (one(".empty-state")) reveal(one(".empty-state"), { y: 30, scale: 0.98 });

    // ── Checkout ──
    if (one("#checkout-form")) {
      stagger(".checkout-fields", all(".checkout-fields fieldset"), { y: 34, stagger: 0.12 });
      reveal(one(".checkout-summary"), { x: 40, y: 0 });
    }

    // ── Order confirmation ──
    if (one(".confirm")) {
      const tl = track(gsap.timeline({ defaults: { ease: "power3.out" } }));
      tl.from(".confirm-badge", { scale: 0, rotate: -30, opacity: 0, duration: 0.7, ease: "back.out(1.7)" })
        .from(".confirm h1", { opacity: 0, y: 24, duration: 0.6 }, "-=0.2")
        .from(".confirm-lead", { opacity: 0, y: 20, duration: 0.5 }, "-=0.3")
        .from(".confirm-card", { opacity: 0, y: 30, duration: 0.6 }, "-=0.2")
        .from(".confirm > .btn", { opacity: 0, y: 20, duration: 0.5 }, "-=0.3");
    }

    // Recalculate trigger positions now the new view is laid out.
    ScrollTrigger.refresh();
  }

  window.applyScrollAnimations = applyScrollAnimations;
  window.clearScrollAnimations = clearScrollAnimations;
})();
