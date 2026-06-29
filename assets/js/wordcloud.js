/* ============================================================
   Research word cloud (home page)
   Progressive enhancement: turns the semantic <ul class="wordcloud">
   into a spiral-packed cloud — largest words placed first from the
   centre outward, a subset (.wc-v) rotated vertical. Falls back to a
   centred flex wrap if JS is off or layout fails.
   ============================================================ */
(function () {
  "use strict";

  var cloud = document.getElementById("wordcloud");
  if (!cloud) return;

  var items = Array.prototype.slice.call(cloud.querySelectorAll(".wc"));
  if (!items.length) return;

  // Hide during the (brief) measure/layout pass to avoid a flex→cloud flash.
  // A safety timer guarantees the cloud is shown even if fonts.ready never settles.
  cloud.style.visibility = "hidden";
  var revealed = false;
  function reveal() { revealed = true; cloud.style.visibility = "visible"; }

  function weightOf(el) {
    for (var i = 5; i >= 1; i--) { if (el.classList.contains("wc-" + i)) return i; }
    return 1;
  }
  function isVertical(el) { return el.classList.contains("wc-v"); }

  // Measure each term's box in its FINAL orientation at the current viewport.
  // Vertical terms use writing-mode (not a rotate transform) so their layout
  // box is genuinely narrow/tall — otherwise the wide un-rotated box would
  // inflate the document width and overflow the page.
  function measure() {
    return items.map(function (el) {
      var vert = isVertical(el);
      el.style.position = "absolute";
      el.style.left = "-9999px";
      el.style.top = "0";
      el.style.transform = "none";
      el.style.whiteSpace = "nowrap";
      el.style.writingMode = vert ? "vertical-rl" : "horizontal-tb";
      var r = el.getBoundingClientRect();
      return { el: el, w: r.width, h: r.height, weight: weightOf(el), vert: vert };
    });
  }

  function overlaps(a, b, pad) {
    return Math.abs(a.cx - b.cx) < (a.fw + b.fw) / 2 + pad &&
           Math.abs(a.cy - b.cy) < (a.fh + b.fh) / 2 + pad;
  }

  function layout() {
    cloud.classList.remove("is-cloud");      // measure in natural metrics
    var data = measure();

    var containerWidth = cloud.clientWidth ||
      (cloud.parentNode && cloud.parentNode.clientWidth) || 900;

    // Boxes were measured in final orientation, so the footprint is just (w,h).
    data.forEach(function (d) { d.fw = d.w; d.fh = d.h; });

    // Place biggest words first so they cluster at the centre.
    var order = data.slice().sort(function (a, b) {
      return (b.weight - a.weight) || (b.fw * b.fh - a.fw * a.fh);
    });

    var placed = [];
    var pad = 14;
    // Squarer cloud on narrow screens so it fits the column without shrinking much.
    var aspect = containerWidth < 600 ? 1.05 : 1.6;
    var step = 0.3;

    order.forEach(function (d, idx) {
      if (idx === 0) { d.cx = 0; d.cy = 0; placed.push(d); return; }
      var a = 0;
      for (var t = 0; t < 8000; t++) {
        a += step;
        var r = 3.5 * a;
        d.cx = Math.cos(a) * r * aspect;
        d.cy = Math.sin(a) * r;
        var hit = false;
        for (var j = 0; j < placed.length; j++) {
          if (overlaps(d, placed[j], pad)) { hit = true; break; }
        }
        if (!hit) break;
      }
      placed.push(d);
    });

    // Bounding box of the whole cloud (using rotated footprints).
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    data.forEach(function (d) {
      minX = Math.min(minX, d.cx - d.fw / 2);
      maxX = Math.max(maxX, d.cx + d.fw / 2);
      minY = Math.min(minY, d.cy - d.fh / 2);
      maxY = Math.max(maxY, d.cy + d.fh / 2);
    });
    var cloudW = maxX - minX, cloudH = maxY - minY;

    // Uniformly shrink the whole cloud if it is wider than the container
    // (keeps the packed arrangement; scales positions + glyphs together).
    // Leave a small margin so no glyph touches the clipped edge.
    var avail = Math.max(40, containerWidth - 8);
    var s = cloudW > 0 ? Math.min(1, avail / cloudW) : 1;
    var scaledW = cloudW * s, scaledH = cloudH * s;

    // Centre the cloud horizontally inside the container.
    var offsetX = -minX * s + Math.max(0, (containerWidth - scaledW) / 2);
    var offsetY = -minY * s + 3;

    cloud.classList.add("is-cloud");
    cloud.style.height = Math.ceil(scaledH) + 6 + "px";

    data.forEach(function (d) {
      var el = d.el;
      var cx = d.cx * s + offsetX;   // desired visual centre
      var cy = d.cy * s + offsetY;
      // left/top set the (unscaled) box centre to (cx, cy); scale() then
      // shrinks about that centre, so the visual centre stays put.
      el.style.left = (cx - d.w / 2) + "px";
      el.style.top = (cy - d.h / 2) + "px";
      el.style.transform = s !== 1 ? "scale(" + s + ")" : "none";
    });
  }

  function run() {
    try {
      layout();
    } catch (e) {
      cloud.classList.remove("is-cloud");   // fall back to the flex wrap
      cloud.style.height = "";
    } finally {
      reveal();
    }
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run);
  }
  window.addEventListener("load", run);
  setTimeout(function () { if (!revealed) run(); }, 1200);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(run, 180);
  });
})();
