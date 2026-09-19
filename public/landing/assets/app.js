/* Sprout landing page — one small bit of play, nothing else. */
(function () {
  "use strict";

  var mascot = document.getElementById("mascot");
  var say = document.getElementById("say");
  if (!mascot || !say) return;

  /* Short, literal, friendly. No surprises, no sound. */
  var lines = [
    "Hi! I'm Sprout.",
    "Hello again!",
    "Take your time.",
    "I like dinosaurs.",
    "We can practice together.",
    "You are doing fine."
  ];
  var i = 0;

  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  mascot.addEventListener("click", function () {
    i = (i + 1) % lines.length;
    say.textContent = lines[i];

    if (calm) return;
    mascot.classList.remove("is-hopping");
    void mascot.offsetWidth; /* restart the animation */
    mascot.classList.add("is-hopping");
  });

  mascot.addEventListener("animationend", function () {
    mascot.classList.remove("is-hopping");
  });
})();
