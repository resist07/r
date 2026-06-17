/**
 * Mouse-reactive particle background for the hero, on a single <canvas>.
 *
 * Built for performance: capped particle count (scaled to viewport), a single
 * requestAnimationFrame loop, devicePixelRatio clamped to 2, and the loop is
 * paused whenever the tab is hidden or the hero scrolls out of view. Honours
 * prefers-reduced-motion (draws one static frame, no animation).
 *
 * window.HeroParticles.mount(canvas) / .unmount() are driven by the router so
 * the field only runs while the home hero is on screen.
 */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let instance = null;

  class Field {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.parts = [];
      this.w = 0;
      this.h = 0;
      this.linkDist = 130;
      this.mouse = { x: -9999, y: -9999, active: false };
      this.running = false;
      this.raf = 0;

      this._step = this._step.bind(this);
      this._onMove = (e) => {
        const r = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left;
        this.mouse.y = e.clientY - r.top;
        this.mouse.active = true;
      };
      this._onLeave = () => {
        this.mouse.active = false;
        this.mouse.x = this.mouse.y = -9999;
      };
      this._onVis = () => (document.hidden ? this.pause() : this.play());
    }

    mount() {
      this.host = this.canvas.closest(".hero") || this.canvas.parentElement;
      this._resize();
      this.host.addEventListener("pointermove", this._onMove, { passive: true });
      this.host.addEventListener("pointerleave", this._onLeave, { passive: true });
      document.addEventListener("visibilitychange", this._onVis);

      if ("ResizeObserver" in window) {
        this.ro = new ResizeObserver(() => this._resize());
        this.ro.observe(this.host);
      } else {
        window.addEventListener("resize", (this._winResize = () => this._resize()), { passive: true });
      }
      if ("IntersectionObserver" in window) {
        this.io = new IntersectionObserver(
          (entries) => entries.forEach((en) => (en.isIntersecting ? this.play() : this.pause())),
          { threshold: 0 }
        );
        this.io.observe(this.canvas);
      }

      if (reduce) this._draw(); // single static frame
      else this.play();
    }

    unmount() {
      this.pause();
      this.host.removeEventListener("pointermove", this._onMove);
      this.host.removeEventListener("pointerleave", this._onLeave);
      document.removeEventListener("visibilitychange", this._onVis);
      this.ro && this.ro.disconnect();
      this.io && this.io.disconnect();
      this._winResize && window.removeEventListener("resize", this._winResize);
    }

    play() {
      if (this.running || reduce) return;
      this.running = true;
      this.raf = requestAnimationFrame(this._step);
    }

    pause() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    _resize() {
      const w = this.canvas.clientWidth || this.host.clientWidth;
      const h = this.canvas.clientHeight || this.host.clientHeight;
      if (!w || !h) return;
      this.w = w;
      this.h = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      const target = Math.min(w < 640 ? 42 : 105, Math.floor((w * h) / 13000));
      const p = this.parts;
      while (p.length < target) p.push(this._spawn());
      p.length = target;
      this.linkDist = w < 700 ? 0 : 130; // skip the O(n²) links on small screens
      if (reduce) this._draw();
    }

    _spawn() {
      return {
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.8 + 0.8,
      };
    }

    _step() {
      if (!this.running) return;
      this._update();
      this._draw();
      this.raf = requestAnimationFrame(this._step);
    }

    _update() {
      const { w, h } = this;
      const m = this.mouse;
      const R = 120;
      for (const p of this.parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        if (m.active) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = ((R - d) / R) * 0.6; // gentle repel from the cursor
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
      }
    }

    _draw() {
      const ctx = this.ctx;
      const { w, h } = this;
      ctx.clearRect(0, 0, w, h);
      const parts = this.parts;
      const n = parts.length;
      const D = this.linkDist;

      if (D > 0) {
        for (let i = 0; i < n; i++) {
          const a = parts[i];
          for (let j = i + 1; j < n; j++) {
            const b = parts[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < D * D) {
              const alpha = (1 - Math.sqrt(d2) / D) * 0.2;
              ctx.strokeStyle = "rgba(200,172,116," + alpha + ")";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        if (this.mouse.active) {
          const m = this.mouse;
          const MD = 160;
          for (let i = 0; i < n; i++) {
            const a = parts[i];
            const dx = a.x - m.x;
            const dy = a.y - m.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < MD * MD) {
              const alpha = (1 - Math.sqrt(d2) / MD) * 0.55;
              ctx.strokeStyle = "rgba(216,195,154," + alpha + ")"; // champagne near cursor
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(m.x, m.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.fillStyle = "rgba(235,224,201,0.85)";
      for (let i = 0; i < n; i++) {
        const p = parts[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283185);
        ctx.fill();
      }
    }
  }

  window.HeroParticles = {
    mount(canvas) {
      if (!canvas) return;
      if (instance) instance.unmount();
      instance = new Field(canvas);
      instance.mount();
    },
    unmount() {
      if (instance) {
        instance.unmount();
        instance = null;
      }
    },
  };
})();
