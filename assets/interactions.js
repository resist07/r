/**
 * Pointer micro-interactions, set up once and delegated so they keep working
 * as the single-page app re-renders.
 *
 *  1. Sticky navbar that shrinks once the page is scrolled.
 *  2. 3D tilt + cursor-following glow on any `.tilt` card (product cards).
 *
 * Tilt only runs for fine pointers (mouse) and is disabled for touch and for
 * prefers-reduced-motion. All transforms are written once per frame via rAF,
 * using GPU-friendly properties only, to stay at 60fps.
 */
(function () {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 1. Shrinking sticky navbar ──
  const header = document.querySelector(".site-header");
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  // ── 2. 3D tilt + glow on cards ──
  if (fine && !reduce) {
    const MAX = 8; // degrees
    let active = null;
    let ev = null;
    let raf = 0;

    const apply = () => {
      raf = 0;
      if (!active || !ev) return;
      const r = active.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      const ry = (px - 0.5) * 2 * MAX;
      const rx = (0.5 - py) * 2 * MAX;
      active.style.transform =
        `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px) scale(1.03)`;
      active.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      active.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    };

    const reset = (el) => {
      el.classList.remove("tilting");
      el.style.transform = "";
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    };

    document.addEventListener(
      "pointermove",
      (e) => {
        const card = e.target.closest(".tilt");
        if (card !== active) {
          if (active) reset(active);
          active = card;
          if (card) {
            card.classList.add("tilting");
            // Take ownership of the transform so a still-running entrance
            // reveal can't fight the tilt.
            if (window.gsap) gsap.killTweensOf(card);
          }
        }
        if (!card) return;
        ev = e;
        if (!raf) raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    // Make sure cards relax if the pointer leaves the window entirely.
    const relax = () => {
      if (active) {
        reset(active);
        active = null;
      }
    };
    document.addEventListener("mouseleave", relax);
    window.addEventListener("blur", relax);
  }
})();
