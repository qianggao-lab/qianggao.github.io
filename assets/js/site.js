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

  /* ---- Cursor-reactive particle web + black-hole gadget ------------ */
  /* A field of drifting points linked by lines that lean toward the cursor
     ("chasing" it). On the home page a small corner button summons an
     Interstellar-style black hole (bottom-right): lead or drag the web into it
     and it devours the points with a swirling accretion animation. Devour every
     point and a white hole blooms bottom-left, spits them all back out, then
     fades — repeatable; the last few survivors blink. Click the button again to
     dismiss it. Until summoned, only the calm web shows. Colour tracks --accent. */
  var webCanvas = document.getElementById("bg-web");
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (webCanvas && webCanvas.getContext && !reduceMotion) {
    var ctx = webCanvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // The home page can host the black-hole gadget, but it stays hidden until
    // the visitor summons it with the corner button, so it isn't a distraction.
    // Until then the canvas just shows the calm ambient particle web.
    var home = webCanvas.hasAttribute("data-blackhole");
    var bhActive = false;
    var webAlpha = 1; // faded to 0.55 only while the gadget is active

    // Second canvas, layered ABOVE the UI: when only a few stars remain we pulse
    // their light here (1 Hz) so it shines through the interface instead of being
    // hidden beneath the header/content.
    var topCanvas = null, tctx = null;
    if (home) {
      topCanvas = document.createElement("canvas");
      topCanvas.id = "bg-web-top";
      topCanvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(topCanvas);
      tctx = topCanvas.getContext("2d");
    }
    var BLINK_AT = 6; // start blinking once this many (or fewer) stars remain

    // Corner button that summons / dismisses the gadget (home only).
    var bhBtn = null;
    if (home) {
      bhBtn = document.createElement("button");
      bhBtn.type = "button";
      bhBtn.id = "bh-toggle";
      bhBtn.className = "bh-toggle";
      bhBtn.setAttribute("aria-pressed", "false");
      bhBtn.setAttribute("aria-label", "Show the black-hole gadget");
      bhBtn.title = "Black hole — click to play";
      bhBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<defs><radialGradient id="bhGlyph" cx="50%" cy="50%" r="50%">' +
            '<stop offset="52%" stop-color="#05060a"/>' +
            '<stop offset="66%" stop-color="#0b0c12"/>' +
            '<stop offset="76%" stop-color="rgba(255,168,78,0.95)"/>' +
            '<stop offset="100%" stop-color="rgba(255,138,48,0)"/>' +
          '</radialGradient></defs>' +
          '<circle cx="12" cy="12" r="10" fill="url(#bhGlyph)"/>' +
          '<ellipse cx="12" cy="12" rx="11" ry="3.1" fill="none" stroke="rgba(255,182,96,0.9)" stroke-width="1.4"/>' +
        '</svg>';
      document.body.appendChild(bhBtn);
      bhBtn.addEventListener("click", function () { bhActive ? deactivate() : activate(); });
    }

    function updateBhButton() {
      if (!bhBtn) return;
      bhBtn.setAttribute("aria-pressed", String(bhActive));
      bhBtn.setAttribute("aria-label", bhActive ? "Hide the black-hole gadget" : "Show the black-hole gadget");
      bhBtn.title = bhActive ? "Black hole active — click to dismiss" : "Black hole — click to play";
    }
    function activate() {
      bhActive = true;
      webCanvas.classList.add("bg-web--home"); // full canvas opacity for the gadget
      webAlpha = 0.55;                          // fade the web so the hole reads
      phase = "idle"; captured = 0;
      WH.on = false; WH.alpha = 0; WH.emit = 0;
      updateBhButton();
    }
    function deactivate() {
      bhActive = false;
      webCanvas.classList.remove("bg-web--home");
      webAlpha = 1;
      phase = "idle"; captured = 0;
      WH.on = false; WH.alpha = 0; WH.emit = 0;
      sparks.length = 0;
      // free any in-flight points and refill the ambient field
      for (var di = 0; di < points.length; di++) { points[di].state = 0; points[di].immune = 0; }
      while (TOTAL && points.length < TOTAL) {
        points.push(makePoint(Math.random() * w, Math.random() * h,
          (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
      }
      if (tctx) tctx.clearRect(0, 0, w, h);
      updateBhButton();
    }

    var points = [];
    var w = 0, h = 0, TOTAL = null;
    var LINK = 130;          // max distance to draw a link between points
    var MOUSE_R = 200;       // cursor influence / link radius
    var pointer = { x: -9999, y: -9999, active: false, down: false };

    // Black/white-hole state (home only).
    var BH = { x: 0, y: 0 };                 // black hole, bottom-right
    var WH = { x: 0, y: 0, on: false, alpha: 0, emit: 0, gap: 0 };
    var INFLUENCE = 240;     // black-hole gravity reach
    var CAPTURE = 40;        // distance at which a point starts spiralling in
    var captured = 0;        // points devoured, not yet re-emitted
    var phase = "idle";      // "idle" = feeding | "emit" = white hole active
    var sparks = [];         // brief flashes where points are consumed
    var bhPulse = 0;
    var tick = 0;

    function tokenRGB(name, fallback) {
      var v = getComputedStyle(root).getPropertyValue(name).trim();
      var m = v.match(/^#?([0-9a-f]{6})$/i);
      if (m) {
        var n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      var p = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      return p ? [+p[1], +p[2], +p[3]] : fallback;
    }
    function readTheme() {
      rgb = tokenRGB("--accent", [110, 130, 200]);
      ink = tokenRGB("--ink", [27, 27, 26]);   // counter text
      bg = tokenRGB("--bg", [250, 249, 247]);   // counter halo / legibility
    }
    var rgb, ink, bg;
    readTheme();

    function makePoint(x, y, vx, vy) {
      // state 0 = free, 1 = spiralling into the black hole
      return { x: x, y: y, vx: vx, vy: vy, state: 0, ang: 0, rad: 0, av: 0, immune: 0 };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); // re-read for DPI changes
      w = webCanvas.clientWidth;
      h = webCanvas.clientHeight;
      webCanvas.width = Math.round(w * dpr);
      webCanvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (topCanvas) {
        topCanvas.width = Math.round(w * dpr);
        topCanvas.height = Math.round(h * dpr);
        tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      var target = Math.round((w * h) / 16000); // density by area
      target = Math.max(30, Math.min(target, 110));

      if (home) {
        // Size the field once; the game manages counts after that, so don't
        // pad/trim on resize (it would corrupt the "all devoured" trigger).
        if (TOTAL === null) {
          TOTAL = target;
          for (var i = 0; i < TOTAL; i++) {
            points.push(makePoint(Math.random() * w, Math.random() * h,
              (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
          }
        }
        var m = Math.max(78, Math.min(w, h) * 0.10);
        BH.x = w - m; BH.y = h - m;
        WH.x = m;     WH.y = h - m;
      } else {
        while (points.length < target) {
          points.push(makePoint(Math.random() * w, Math.random() * h,
            (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
        }
        points.length = target;
      }
    }

    function consume(idx) {
      points.splice(idx, 1);
      captured++;
      bhPulse = 10;
      sparks.push({ x: BH.x, y: BH.y, life: 18, max: 18 });
    }

    function update() {
      tick++;
      if (bhPulse > 0) bhPulse--;

      // Field fully devoured -> open the white hole and spit them back out.
      // Keyed on an empty field (not a counter) so it can't desync across
      // cycles or fire while a point is still spiralling in.
      if (bhActive && phase === "idle" && captured > 0 && points.length === 0) {
        phase = "emit";
        WH.on = true; WH.alpha = 0; WH.emit = captured; WH.gap = 0;
      }

      // White-hole emission: stream the devoured points back into the field.
      if (bhActive && phase === "emit") {
        if (WH.emit > 0) {
          WH.alpha = Math.min(1, WH.alpha + 0.05);
          if (--WH.gap <= 0) {
            WH.gap = 5;            // slower cadence between ejections
            var dir = -Math.PI / 4 + (Math.random() - 0.5) * Math.PI * 0.85; // up & into view
            var spd = 1.3 + Math.random() * 1.3; // gentler ejection speed
            var np = makePoint(WH.x, WH.y, Math.cos(dir) * spd, Math.sin(dir) * spd);
            np.immune = 70;          // brief grace so it isn't re-eaten instantly
            points.push(np);
            WH.emit--; captured--;
          }
        } else {
          WH.alpha -= 0.04;          // all out -> fade the white hole away
          if (WH.alpha <= 0) { WH.alpha = 0; WH.on = false; phase = "idle"; }
        }
      }

      // Physics (iterate backwards so consume()'s splice is safe).
      for (var i = points.length - 1; i >= 0; i--) {
        var p = points[i];
        if (p.immune > 0) p.immune--;

        if (p.state === 1) {         // spiralling into the black hole
          p.rad *= 0.90;
          p.av *= 1.06;
          p.ang += p.av;
          p.x = BH.x + Math.cos(p.ang) * p.rad;
          p.y = BH.y + Math.sin(p.ang) * p.rad;
          if (p.rad < 4) consume(i);
          continue;
        }

        // Cursor: a light lead on hover, a strong grab while pressed.
        if (pointer.active) {
          var R = pointer.down ? 320 : MOUSE_R;
          var dxm = pointer.x - p.x, dym = pointer.y - p.y;
          var dm = Math.hypot(dxm, dym);
          if (dm < R && dm > 0.01) {
            var pull = (pointer.down ? 0.14 : 0.05) * (1 - dm / R);
            p.vx += (dxm / dm) * pull;
            p.vy += (dym / dm) * pull;
            if (pointer.down) { p.vx *= 0.94; p.vy *= 0.94; }
          }
        }

        // Black-hole gravity while feeding (skip freshly re-emitted points).
        if (bhActive && phase === "idle" && p.immune === 0) {
          var gx = BH.x - p.x, gy = BH.y - p.y;
          var gd = Math.hypot(gx, gy);
          if (gd < CAPTURE) {
            p.state = 1;
            p.ang = Math.atan2(p.y - BH.y, p.x - BH.x);
            p.rad = Math.max(gd, 6);
            p.av = 0.18 + 0.12 * Math.random();
            continue;
          } else if (gd < INFLUENCE && gd > 0.01) {
            var f = 1 - gd / INFLUENCE;
            var g = 0.13 * f * f + 0.02;
            p.vx += (gx / gd) * g - (gy / gd) * g * 0.6;  // inward + swirl
            p.vy += (gy / gd) * g + (gx / gd) * g * 0.6;
          }
        }

        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.99; p.vy *= 0.99;
        var sp = Math.hypot(p.vx, p.vy);
        if (sp > 6) { p.vx *= 6 / sp; p.vy *= 6 / sp; }

        if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h;
      }
    }

    /* ---- Gadget rendering ---- */
    function drawBlackHoleBack(cx, cy) {
      var EH = 22, pulse = 1 + (bhPulse > 0 ? (bhPulse / 10) * 0.22 : 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(cx, cy, EH * 0.4, cx, cy, 96 * pulse);
      glow.addColorStop(0, "rgba(255,150,60,0.45)");
      glow.addColorStop(0.4, "rgba(255,110,40,0.18)");
      glow.addColorStop(1, "rgba(255,90,30,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, 96 * pulse, 0, Math.PI * 2); ctx.fill();

      // Accretion disk: flattened, rotating, brighter on one side (beaming).
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.34);
      var SEG = 48, R1 = EH * 1.2, R2 = EH * 2.5;
      for (var s = 0; s < SEG; s++) {
        var a0 = (s / SEG) * Math.PI * 2 + tick * 0.03;
        var a1 = ((s + 1) / SEG) * Math.PI * 2 + tick * 0.03;
        var bright = Math.pow((Math.cos(a0 - 0.7) + 1) / 2, 1.7);
        var gch = Math.round(90 + 150 * bright);
        var bch = Math.round(20 + 165 * bright);
        ctx.fillStyle = "rgba(255," + gch + "," + bch + "," + (0.25 + 0.6 * bright).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(0, 0, R2, a0, a1);
        ctx.arc(0, 0, R1, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Lensed photon halo wrapping the hole.
      var ring = ctx.createLinearGradient(cx - EH, cy, cx + EH, cy);
      ring.addColorStop(0, "rgba(255,210,150,0.5)");
      ring.addColorStop(0.5, "rgba(255,255,235,0.85)");
      ring.addColorStop(1, "rgba(255,170,90,0.5)");
      ctx.strokeStyle = ring;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, EH * 1.32, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    function drawBlackHoleFront(cx, cy) {
      var EH = 22;
      var g = ctx.createRadialGradient(cx, cy, EH * 0.2, cx, cy, EH);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.82, "rgba(3,4,9,1)");
      g.addColorStop(1, "rgba(12,14,22,0.15)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, EH, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,240,210,0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, EH * 1.02, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    function drawCounter(cx, cy) {
      // Devoured climbs as the hole feeds; the instant the white hole opens
      // (phase "emit") it snaps back to 0 / TOTAL while the stars stream out.
      var devoured = (phase === "emit") ? 0 : captured;
      var left = TOTAL - devoured;
      ctx.save();
      ctx.font = '600 13px "Inter", system-ui, -apple-system, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(" + bg[0] + "," + bg[1] + "," + bg[2] + ",0.85)";
      ctx.shadowBlur = 5;
      ctx.fillStyle = "rgba(" + ink[0] + "," + ink[1] + "," + ink[2] + ",0.96)";
      ctx.fillText("Stars devoured: " + devoured, cx, cy - 106);
      ctx.fillText("Stars left: " + left, cx, cy - 88);
      ctx.restore();
    }

    function drawWhiteHole(cx, cy, a) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 100);
      glow.addColorStop(0, "rgba(235,250,255,0.9)");
      glow.addColorStop(0.35, "rgba(150,205,255,0.35)");
      glow.addColorStop(1, "rgba(120,180,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2;
      for (var s = 0; s < 12; s++) {
        var ang = (s / 12) * Math.PI * 2 + tick * 0.02;
        var len = 40 + 22 * Math.abs(Math.sin(tick * 0.08 + s));
        var ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
        var grd = ctx.createLinearGradient(cx, cy, ex, ey);
        grd.addColorStop(0, "rgba(220,245,255,0.8)");
        grd.addColorStop(1, "rgba(150,205,255,0)");
        ctx.strokeStyle = grd;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      }
      var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
      core.addColorStop(0, "rgba(255,255,255,1)");
      core.addColorStop(0.6, "rgba(210,240,255,0.9)");
      core.addColorStop(1, "rgba(150,205,255,0)");
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* When few stars remain, pulse each survivor's light at 1 Hz on the
       top-layer canvas so it shines over (not under) the UI. Warm amber keeps
       it visible on both light and dark themes and matches the accretion disk. */
    function drawBlinkers() {
      tctx.clearRect(0, 0, w, h);
      if (!bhActive || TOTAL === null || phase !== "idle" || (TOTAL - captured) > BLINK_AT) return;
      // 0 -> 1 -> 0 once per second (1 Hz), driven by wall-clock time.
      var blink = 0.5 - 0.5 * Math.cos((performance.now() / 1000) * Math.PI * 2);
      var a = 0.14 + 0.86 * blink;       // pulsing opacity
      var rad = 15 + 13 * blink;         // pulsing halo radius
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        if (p.state !== 0) continue;     // skip points spiralling into the hole
        var halo = tctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        halo.addColorStop(0, "rgba(255,184,92," + (0.72 * a).toFixed(3) + ")");
        halo.addColorStop(0.5, "rgba(255,142,58," + (0.30 * a).toFixed(3) + ")");
        halo.addColorStop(1, "rgba(255,120,40,0)");
        tctx.fillStyle = halo;
        tctx.beginPath(); tctx.arc(p.x, p.y, rad, 0, Math.PI * 2); tctx.fill();
        tctx.fillStyle = "rgba(255,236,205," + a.toFixed(3) + ")";
        tctx.beginPath(); tctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); tctx.fill();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var base = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",";

      // Hole back-glow sits behind the web so points read as flowing over it.
      if (bhActive) {
        ctx.save();
        ctx.globalAlpha = (phase === "emit") ? 0.4 : 1;
        drawBlackHoleBack(BH.x, BH.y);
        ctx.restore();
        if (WH.on) drawWhiteHole(WH.x, WH.y, WH.alpha);
      }

      // Links between nearby free points.
      ctx.lineWidth = 1;
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        if (p.state === 1) continue;
        for (var j = i + 1; j < points.length; j++) {
          var q = points[j];
          if (q.state === 1) continue;
          var dx = p.x - q.x, dy = p.y - q.y;
          var d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = base + (0.18 * (1 - d / LINK) * webAlpha).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (pointer.active) {
          var cd = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          if (cd < MOUSE_R) {
            ctx.strokeStyle = base + (0.35 * (1 - cd / MOUSE_R) * webAlpha).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
          }
        }
      }

      // The points themselves.
      for (var k = 0; k < points.length; k++) {
        var pt = points[k];
        if (pt.state === 1) {                       // being devoured
          ctx.fillStyle = "rgba(255,185,95,0.95)";
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2); ctx.fill();
        } else if (pt.immune > 0) {                 // freshly spat out
          var im = pt.immune / 70;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = "rgba(190,230,255," + (0.85 * im).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.6 + 2.2 * im, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.fillStyle = base + (0.7 * webAlpha).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = base + (0.7 * webAlpha).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Event horizon on top, so spiralling points vanish beneath it.
      if (bhActive) {
        ctx.save();
        ctx.globalAlpha = (phase === "emit") ? 0.5 : 1;
        drawBlackHoleFront(BH.x, BH.y);
        ctx.restore();
      }

      // Consumption flashes.
      if (sparks.length) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var si = sparks.length - 1; si >= 0; si--) {
          var sk = sparks[si];
          var t = sk.life / sk.max;                 // 1 -> 0
          ctx.strokeStyle = "rgba(255,200,120," + (0.6 * t).toFixed(3) + ")";
          ctx.lineWidth = 2 * t + 0.5;
          ctx.beginPath(); ctx.arc(sk.x, sk.y, 6 + (1 - t) * 26, 0, Math.PI * 2); ctx.stroke();
          if (--sk.life <= 0) sparks.splice(si, 1);
        }
        ctx.restore();
      }

      // Live readout on top of the black hole.
      if (bhActive) drawCounter(BH.x, BH.y);

      // Survivor beacons: pulse the last few stars' light over the UI.
      if (tctx) drawBlinkers();
    }

    function frame() {
      update();
      draw();
      requestAnimationFrame(frame);
    }

    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      // Self-heal a missed button release (up delivered outside the window).
      if (pointer.down && e.buttons === 0) pointer.down = false;
    }, { passive: true });
    window.addEventListener("pointerdown", function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY;
      pointer.active = true; pointer.down = true;
    }, { passive: true });
    window.addEventListener("pointerup", function (e) {
      pointer.down = false;
      if (e.pointerType && e.pointerType !== "mouse") pointer.active = false;
    }, { passive: true });
    window.addEventListener("pointercancel", function () { pointer.down = false; pointer.active = false; });
    window.addEventListener("pointerleave", function () { pointer.active = false; pointer.down = false; });
    window.addEventListener("blur", function () { pointer.active = false; pointer.down = false; });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    // re-read the accent colour when the theme flips
    new MutationObserver(readTheme)
      .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    requestAnimationFrame(frame);
  }

  /* ---- Site search (command-palette overlay) ----------------------- */
  /* Injects a search button into the nav and a search overlay into the body
     on every page. The index is built lazily on first open by fetching the
     site's pages (same-origin) and extracting their text, so it never goes
     stale when content changes and needs no per-page markup. */
  (function initSearch() {
    var navMenu = document.querySelector(".nav__menu");
    if (!navMenu || !window.fetch || !window.DOMParser) return;

    // Resolve the site root from the brand link so URLs work from any page
    // (root or notes/) and under any GitHub Pages base path.
    var brand = document.querySelector(".brand");
    var base = brand ? brand.href.replace(/index\.html?(\?[^#]*)?(#.*)?$/, "") : "";
    if (base && !/\/$/.test(base)) base += "/";

    var PAGES = [
      { url: "index.html", label: "Home" },
      { url: "research.html", label: "Research" },
      { url: "publications.html", label: "Publications" },
      { url: "cv.html", label: "CV" },
      { url: "notes.html", label: "Notes" },
      { url: "gallery.html", label: "Gallery" },
      { url: "notes/bootstrapQH.html", label: "Notes · Bootstrapping the QH problem" },
      { url: "notes/other.html", label: "Notes · Other" }
    ];

    var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';

    // Nav button.
    var li = document.createElement("li");
    li.className = "nav__search";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-toggle";
    btn.setAttribute("aria-label", "Search this site");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.innerHTML = ICON + '<span class="search-toggle__label">Search</span>';
    li.appendChild(btn);
    navMenu.insertBefore(li, navMenu.querySelector(".nav__theme"));

    // Overlay.
    var overlay = document.createElement("div");
    overlay.className = "search";
    overlay.id = "site-search";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="search__backdrop" data-close></div>' +
      '<div class="search__panel" role="dialog" aria-modal="true" aria-label="Search this site">' +
        '<div class="search__bar">' + ICON +
          '<input type="search" class="search__input" placeholder="Search this site…" aria-label="Search this site" aria-controls="search-results" autocomplete="off" spellcheck="false">' +
          '<kbd class="search__esc">Esc</kbd>' +
        '</div>' +
        '<ul class="search__results" id="search-results" role="listbox" aria-label="Search results"></ul>' +
        '<p class="search__empty" hidden>No matches found.</p>' +
        '<p class="search__hint">Type to search · <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>↵</kbd> to open</p>' +
      '</div>';
    document.body.appendChild(overlay);

    var input = overlay.querySelector(".search__input");
    var resultsEl = overlay.querySelector(".search__results");
    var emptyEl = overlay.querySelector(".search__empty");
    var hintEl = overlay.querySelector(".search__hint");

    var index = null, building = null, results = [], active = -1, lastFocus = null;

    function esc(s) {
      return s.replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }
    function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

    function buildIndex() {
      if (index) return Promise.resolve();
      if (building) return building;
      building = Promise.all(PAGES.map(function (pg) {
        return fetch(base + pg.url, { credentials: "same-origin" })
          .then(function (r) { return r.ok ? r.text() : ""; })
          .then(function (html) {
            if (!html) return [];
            var doc = new DOMParser().parseFromString(html, "text/html");
            var main = doc.querySelector("main") || doc.body;
            var recs = [];
            main.querySelectorAll("h1, h2, h3, h4, p, li, figcaption").forEach(function (el) {
              if (el.querySelector("ul, ol")) return; // skip list wrappers; index leaf items
              var text = (el.textContent || "").replace(/\s+/g, " ").trim();
              if (text.length >= 3) recs.push({ url: pg.url, page: pg.label, text: text });
            });
            return recs;
          })
          .catch(function () { return []; });
      })).then(function (chunks) {
        index = [];
        var seen = {};
        chunks.forEach(function (arr) {
          arr.forEach(function (r) {
            var key = r.url + "|" + r.text;
            if (!seen[key]) { seen[key] = 1; index.push(r); }
          });
        });
      });
      return building;
    }

    function score(rec, terms, q) {
      var t = rec.text.toLowerCase();
      var hay = rec.page.toLowerCase() + " " + t;
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return 0;
      var s = 0;
      if (t.indexOf(q) !== -1) s += 50;
      if (rec.page.toLowerCase().indexOf(q) !== -1) s += 18;
      terms.forEach(function (term) {
        var idx = t.indexOf(term);
        if (idx !== -1) { s += 10; if (idx === 0 || /\W/.test(t.charAt(idx - 1))) s += 5; }
      });
      return s - Math.min(rec.text.length / 220, 5); // prefer concise blocks
    }

    function snippet(text, terms) {
      var low = text.toLowerCase(), pos = -1;
      terms.forEach(function (term) {
        var i = low.indexOf(term);
        if (i !== -1 && (pos === -1 || i < pos)) pos = i;
      });
      if (pos < 0) pos = 0;
      var start = Math.max(0, pos - 50), end = Math.min(text.length, Math.max(pos, start) + 160);
      var frag = (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
      var html = esc(frag);
      terms.forEach(function (term) {
        if (term) html = html.replace(new RegExp("(" + reEsc(esc(term)) + ")", "ig"), "<mark>$1</mark>");
      });
      return html;
    }

    function render(q) {
      q = (q || "").trim().toLowerCase();
      results = []; active = -1;
      if (!q) { resultsEl.innerHTML = ""; emptyEl.hidden = true; return; }
      var terms = q.split(/\s+/).filter(Boolean);
      var scored = [];
      (index || []).forEach(function (rec) {
        var sc = score(rec, terms, q);
        if (sc > 0) scored.push({ rec: rec, sc: sc });
      });
      scored.sort(function (a, b) { return b.sc - a.sc; });
      results = scored.slice(0, 12).map(function (x) { return x.rec; });

      if (!results.length) {
        resultsEl.innerHTML = "";
        emptyEl.hidden = index ? false : true; // don't say "no matches" mid-build
        return;
      }
      emptyEl.hidden = true;
      resultsEl.innerHTML = results.map(function (r, i) {
        return '<li role="option"><a class="search__result" href="' + base + r.url + '" data-i="' + i + '">' +
          '<span class="r-page">' + esc(r.page) + '</span>' +
          '<span class="r-text">' + snippet(r.text, terms) + "</span></a></li>";
      }).join("");
      setActive(0);
    }

    function setActive(i) {
      var items = resultsEl.querySelectorAll(".search__result");
      if (!items.length) { active = -1; return; }
      active = (i + items.length) % items.length;
      items.forEach(function (el, k) {
        var on = k === active;
        el.classList.toggle("is-active", on);
        if (on) el.scrollIntoView({ block: "nearest" });
      });
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add("search-open");
      input.value = "";
      render("");
      input.focus();
      navMenu.classList.remove("is-open"); // collapse mobile menu if open
      buildIndex().then(function () { if (!overlay.hidden && input.value) render(input.value); });
    }
    function close() {
      overlay.hidden = true;
      document.body.classList.remove("search-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    btn.addEventListener("click", open);
    overlay.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) close(); });
    resultsEl.addEventListener("mousemove", function (e) {
      var a = e.target.closest(".search__result");
      if (a) setActive(+a.getAttribute("data-i"));
    });
    input.addEventListener("input", function () { render(input.value); });
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        var items = resultsEl.querySelectorAll(".search__result");
        if (items[active]) { e.preventDefault(); window.location.href = items[active].getAttribute("href"); }
      }
    });

    // Global shortcuts: "/" or Cmd/Ctrl+K opens search.
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"))) {
        e.preventDefault();
        if (overlay.hidden) open();
      }
    });
  })();
})();
