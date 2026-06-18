/* Qiang Gao — site behavior: theme toggle, mobile nav, gallery lightbox.
   No dependencies. The no-flash theme bootstrap lives inline in each page <head>. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---- Theme toggle ------------------------------------------------- */
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch (e) {}
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(theme === "dark"));
    });
  }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  });

  /* ---- Mobile navigation ------------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.querySelector(".nav__menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Footer year -------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Live Google Scholar metrics --------------------------------- */
  /* Reads assets/data/scholar.json (refreshed daily by a GitHub Action).
     On any failure the static fallback values already in the HTML remain. */
  var scholarBox = document.getElementById("scholar-stats");
  if (scholarBox) {
    var src = scholarBox.getAttribute("data-scholar");
    fetch(src, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        function set(id, val) {
          var el = document.getElementById(id);
          if (el && (typeof val === "number")) el.textContent = val.toLocaleString();
        }
        set("gs-citedby", d.citedby);
        set("gs-hindex", d.hindex);
        set("gs-i10", d.i10index);
        var upd = document.getElementById("gs-updated");
        if (upd && d.updated) {
          var dt = new Date(d.updated + "T00:00:00Z");
          upd.textContent = isNaN(dt.getTime())
            ? d.updated
            : dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
        }
      })
      .catch(function () { /* keep static fallback values */ });
  }

  /* ---- Gallery lightbox -------------------------------------------- */
  var box = document.getElementById("lightbox");
  if (box) {
    var shots = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
    var imgEl = box.querySelector("img");
    var capEl = box.querySelector(".lightbox__caption");
    var index = 0;

    function show(i) {
      index = (i + shots.length) % shots.length;
      var a = shots[index];
      imgEl.src = a.getAttribute("href");
      imgEl.alt = a.getAttribute("data-caption") || "";
      capEl.textContent = a.getAttribute("data-caption") || "";
    }
    function open(i) {
      show(i);
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function close() {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    shots.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        open(i);
      });
    });
    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__prev").addEventListener("click", function () { show(index - 1); });
    box.querySelector(".lightbox__next").addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ---- Cursor-reactive particle web -------------------------------- */
  /* A field of drifting points connected by lines. They lean toward the
     cursor ("chasing" it) and link up to it when it's near. Colour is
     pulled from the live --accent token so it tracks the theme. */
  var webCanvas = document.getElementById("bg-web");
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (webCanvas && webCanvas.getContext && !reduceMotion) {
    var ctx = webCanvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var points = [];
    var w = 0, h = 0;
    var LINK = 130;          // max distance to draw a link between points
    var MOUSE_R = 200;       // cursor influence / link radius
    var pointer = { x: -9999, y: -9999, active: false };

    function accentRGB() {
      var v = getComputedStyle(root).getPropertyValue("--accent").trim();
      var m = v.match(/^#?([0-9a-f]{6})$/i);
      if (m) {
        var n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      var p = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      return p ? [+p[1], +p[2], +p[3]] : [110, 130, 200];
    }
    var rgb = accentRGB();

    function resize() {
      w = webCanvas.clientWidth;
      h = webCanvas.clientHeight;
      webCanvas.width = Math.round(w * dpr);
      webCanvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round((w * h) / 16000); // density by area
      target = Math.max(30, Math.min(target, 110));
      while (points.length < target) {
        points.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4
        });
      }
      points.length = target;
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      var base = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",";

      for (var i = 0; i < points.length; i++) {
        var p = points[i];

        // gentle pull toward the cursor when it's within range
        if (pointer.active) {
          var dxm = pointer.x - p.x, dym = pointer.y - p.y;
          var dm = Math.hypot(dxm, dym);
          if (dm < MOUSE_R && dm > 0.01) {
            var pull = (1 - dm / MOUSE_R) * 0.06;
            p.vx += (dxm / dm) * pull;
            p.vy += (dym / dm) * pull;
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;           // light damping so they don't run away
        p.vy *= 0.99;

        // wrap around the edges
        if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h;

        // link to nearby points
        for (var j = i + 1; j < points.length; j++) {
          var q = points[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = base + (0.18 * (1 - d / LINK)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // link to the cursor
        if (pointer.active) {
          var cdx = p.x - pointer.x, cdy = p.y - pointer.y;
          var cd = Math.hypot(cdx, cdy);
          if (cd < MOUSE_R) {
            ctx.strokeStyle = base + (0.35 * (1 - cd / MOUSE_R)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }

        // the point itself
        ctx.fillStyle = base + "0.7)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(step);
    }

    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerleave", function () { pointer.active = false; });
    window.addEventListener("blur", function () { pointer.active = false; });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    // re-read the accent colour when the theme flips
    new MutationObserver(function () { rgb = accentRGB(); })
      .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    requestAnimationFrame(step);
  }
})();
