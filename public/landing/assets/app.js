/* Sprout landing page — small interactions, no dependencies. */
(function () {
  "use strict";

  /* ---- sticky nav border ---- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- scenario tabs in the hero demo ---- */
  var tabs = document.querySelectorAll(".tab[data-scene]");
  var scenes = document.querySelectorAll(".scene[data-scene]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.getAttribute("data-scene");
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      scenes.forEach(function (s) {
        s.classList.toggle("is-active", s.getAttribute("data-scene") === name);
      });
    });
  });

  /* ---- choices are illustrative: mark the picked one ---- */
  document.querySelectorAll(".choice").forEach(function (choice) {
    choice.addEventListener("click", function () {
      var scene = choice.closest(".scene");
      if (!scene) return;
      scene.querySelectorAll(".choice").forEach(function (c) {
        c.classList.toggle("is-picked", c === choice);
      });
    });
  });

  /* ---- waitlist form (demo only, nothing is sent) ---- */
  var form = document.getElementById("waitlist");
  var msg = document.getElementById("waitlistMsg");
  if (form && msg) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.reset();
      msg.hidden = false;
    });
  }

  /* ---- reveal on scroll ---- */
  var targets = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, i) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      setTimeout(function () { el.classList.add("is-in"); }, Math.min(i * 70, 280));
      io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  targets.forEach(function (el) { io.observe(el); });
})();
