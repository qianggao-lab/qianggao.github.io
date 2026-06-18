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
})();
