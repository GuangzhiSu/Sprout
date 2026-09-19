/* Sprout feedback: a short, silent canvas celebration and dynamic summary. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var params = new URLSearchParams(window.location.search);

  function cleanLabel(value, fallback, maxLength) {
    if (!value) return fallback;
    var cleaned = value.replace(/[^a-zA-Z0-9 '\-]/g, "").trim().slice(0, maxLength);
    return cleaned || fallback;
  }

  function positiveNumber(value, fallback, maximum) {
    var number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number >= 0 ? Math.min(number, maximum) : fallback;
  }

  var scenario = cleanLabel(params.get("scenario"), "Playground", 32);
  var minutes = positiveNumber(params.get("minutes"), 6, 180);
  var turns = positiveNumber(params.get("turns"), 4, 100);
  var difficulty = Math.max(1, positiveNumber(params.get("difficulty"), 2, 4));
  var promptLevel = positiveNumber(params.get("prompt"), 1, 4);
  var clarifications = positiveNumber(params.get("clarifications"), 0, 100);
  var rejectionResponses = positiveNumber(params.get("rejection"), 0, 100);
  var nextDifficulty = Math.max(1, positiveNumber(params.get("next"), difficulty, 4));
  var spontaneous = params.get("spontaneous") === "1";
  var completed = params.get("completed") !== "0";

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  /* The same celebration serves the end of the tutorial, where the numbers are
     not minutes and turns and the next step is the dashboard rather than one
     more run of the same scenario. */
  if (params.get("tutorial") === "1") {
    var name = cleanLabel(params.get("name"), "", 24);

    setText("eyebrowText", "tutorial complete");
    setText("rewardTitle", name ? "You're all set, " + name + "!" : "You're all set!");

    var practiceAgain = document.getElementById("practiceAgain");
    practiceAgain.href = "/student";
    setText("primaryIcon", "→");
    setText("primaryTitle", "See my courses");
    setText("primaryNote", "Your first card is waiting");

    var secondary = document.getElementById("secondaryAction");
    if (secondary) secondary.href = "/tutorial?again=1";
    setText("secondaryIcon", "↻");
    setText("secondaryTitle", "Do the tour again");
    setText("secondaryNote", "Watch it one more time");

    setText("summaryEyebrow", "What you learned");
    setText("summaryTitle", "Now you know how Sprout works");
    setText("minutesValue", "Your break");
    setText("minutesLabel", "stop whenever you want");
    setText("turnsValue", "Your words");
    setText("turnsLabel", "I give you things to say");
    setText("braveValue", "Your voice");
    setText("braveLabel", "Talk out loud, or type instead");
    document.getElementById("practiceDetails")?.classList.add("is-hidden");
  } else {
    setText("eyebrowText", completed ? "practice complete" : "practice paused");
    setText("rewardTitle", completed ? "You did it!" : "A good stopping point");
    setText("summaryTitle", "Your playground practice summary");
    setText("minutesValue", minutes + " min");
    setText("turnsValue", turns + (turns === 1 ? " turn" : " turns"));
    setText("difficultyValue", "Level " + difficulty);
    setText("spontaneousValue", spontaneous ? "Yes" : "Not this time");
    setText("promptValue", "Level " + promptLevel);
    setText("clarificationValue", clarifications ? clarifications + (clarifications === 1 ? " repair" : " repairs") : "Not used");
    setText("changeValue", rejectionResponses ? "Practiced" : "Not in this run");
    setText("nextValue", "Level " + nextDifficulty);
    document.getElementById("practiceAgain").href = "/practice?scenario=" + encodeURIComponent(scenario.toLowerCase());
  }

  var canvas = document.getElementById("celebration");
  if (!canvas || reduceMotion) return;

  var context = canvas.getContext("2d");
  if (!context) return;

  var particles = [];
  var animationFrame = 0;
  var palette = ["#7CBFD0", "#8ECB9F", "#F8AEB2", "#D8D5EF", "#FFE2A8", "#C6E7DD"];

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function addBurst(x, y, count) {
    for (var i = 0; i < count; i += 1) {
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.18;
      var speed = 1.6 + Math.random() * 3.2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.035 + Math.random() * 0.025,
        drag: 0.985,
        life: 1,
        fade: 0.011 + Math.random() * 0.009,
        size: 4 + Math.random() * 5,
        color: palette[Math.floor(Math.random() * palette.length)],
        shape: Math.random() > 0.42 ? "circle" : "dash"
      });
    }
    startAnimation();
  }

  function drawParticle(particle) {
    context.globalAlpha = Math.max(0, particle.life);
    context.fillStyle = particle.color;
    context.strokeStyle = particle.color;
    if (particle.shape === "circle") {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.lineWidth = Math.max(2, particle.size / 2);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(particle.x, particle.y);
      context.lineTo(particle.x - particle.vx * 2.3, particle.y - particle.vy * 2.3);
      context.stroke();
    }
  }

  function animate() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = particles.filter(function (particle) {
      particle.vx *= particle.drag;
      particle.vy = particle.vy * particle.drag + particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.fade;
      if (particle.life <= 0) return false;
      drawParticle(particle);
      return true;
    });
    context.globalAlpha = 1;
    animationFrame = particles.length ? window.requestAnimationFrame(animate) : 0;
  }

  function startAnimation() {
    if (!animationFrame) animationFrame = window.requestAnimationFrame(animate);
  }

  function celebrate() {
    particles = [];
    addBurst(window.innerWidth * 0.2, Math.min(250, window.innerHeight * 0.3), 24);
    window.setTimeout(function () {
      addBurst(window.innerWidth * 0.78, Math.min(215, window.innerHeight * 0.26), 26);
    }, 260);
    window.setTimeout(function () {
      addBurst(window.innerWidth * 0.5, Math.min(150, window.innerHeight * 0.18), 20);
    }, 530);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.setTimeout(celebrate, 280);
})();
