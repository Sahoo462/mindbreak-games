(() => {
  const canvas = document.querySelector("#arcade-canvas");
  const ctx = canvas.getContext("2d");
  const scoreLabel = document.querySelector("#arcade-score");
  const livesLabel = document.querySelector("#arcade-lives");
  const bestLabel = document.querySelector("#arcade-best");
  const status = document.querySelector("#arcade-status");
  const overlay = document.querySelector("#canvas-overlay");
  const overlayTitle = document.querySelector("#canvas-overlay-title");
  const overlayMessage = document.querySelector("#canvas-overlay-message");
  const overlayStart = document.querySelector("#canvas-start");
  const restart = document.querySelector("#arcade-restart");
  const pauseButton = document.querySelector("#arcade-pause");
  const art = window.MindBreakAssets;
  const width = 700;
  const height = 400;
  const ground = 350;
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-label", "Flappy Bird. Press Space or tap to flap through the pipes.");
  document.querySelector("#arcade-help").textContent = "Tap or press Space / ↑ to flap through the gaps. Avoid the pipes and the ground. Press P to pause.";
  const paletteFor = () => ({
    dreamscape: { sky: "#c5e8f3", ground: "#90cca0", pipe: "#71ad81", bird: "#ffcc68" },
    pixel: { sky: "#e6efcf", ground: "#a7ce98", pipe: "#769e71", bird: "#f3c679" },
    cosmic: { sky: "#f7dff0", ground: "#d798b8", pipe: "#a97bb6", bird: "#ffa8cf" },
  }[art.getConfig("flappy-bird").look]);
  let bird;
  let pipes = [];
  let score = 0;
  let best = 0;
  let raf = 0;
  let lastFrame = 0;
  let running = false;
  let paused = false;

  try { best = Number(localStorage.getItem("mindbreak-flappy-best")) || 0; }
  catch (error) { console.warn("MindBreak could not read the Flappy Bird best score.", error); }
  bestLabel.textContent = best;

  const saveBest = () => {
    if (score <= best) return;
    best = score;
    bestLabel.textContent = best;
    try { localStorage.setItem("mindbreak-flappy-best", String(best)); }
    catch (error) { console.warn("MindBreak could not save the Flappy Bird best score.", error); }
  };

  const draw = () => {
    const palette = paletteFor();
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, width, height);
    const background = art.getImage("flappy-bird", "background");
    if (background) {
      ctx.save();
      ctx.globalAlpha = .1;
      ctx.drawImage(background, 0, 0, width, ground);
      ctx.restore();
    } else art.draw(ctx, "flappy-bird", "background", 0, 0, width, ground, () => {});
    for (let index = 0; index < 5; index += 1) {
      const x = (index * 177 + 45) % width;
      const y = 47 + (index % 3) * 48;
      ctx.fillStyle = "rgb(255 255 255 / 68%)";
      ctx.beginPath();
      ctx.ellipse(x, y, 29, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    pipes.forEach((pipe) => {
      const topHeight = pipe.gapY - pipe.gap / 2;
      const bottomY = pipe.gapY + pipe.gap / 2;
      art.draw(ctx, "flappy-bird", "pipe", pipe.x, 0, pipe.width, topHeight, () => {
        ctx.fillStyle = palette.pipe;
        ctx.fillRect(pipe.x, 0, pipe.width, topHeight);
        ctx.fillRect(pipe.x - 5, topHeight - 14, pipe.width + 10, 14);
      });
      art.draw(ctx, "flappy-bird", "pipe", pipe.x, bottomY, pipe.width, ground - bottomY, () => {
        ctx.fillStyle = palette.pipe;
        ctx.fillRect(pipe.x, bottomY, pipe.width, ground - bottomY);
        ctx.fillRect(pipe.x - 5, bottomY, pipe.width + 10, 14);
      });
    });
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, ground, width, height - ground);
    ctx.fillStyle = "rgb(255 255 255 / 28%)";
    for (let x = 0; x < width; x += 34) ctx.fillRect(x, ground + 8, 17, 3);
    if (bird) {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.max(-.4, Math.min(.8, bird.velocity * .001)));
      art.draw(ctx, "flappy-bird", "bird", -17, -14, 34, 28, () => {
        ctx.fillStyle = palette.bird;
        ctx.beginPath();
        ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(8, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#413b53";
        ctx.beginPath();
        ctx.arc(10, -5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ef9b7e";
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(27, 4);
        ctx.lineTo(14, 7);
        ctx.fill();
      });
      ctx.restore();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "800 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(score), width / 2, 39);
    ctx.textAlign = "start";
  };

  const finish = () => {
    running = false;
    paused = false;
    window.cancelAnimationFrame(raf);
    livesLabel.textContent = "0";
    pauseButton.hidden = true;
    overlayTitle.textContent = "A breezy little flight";
    overlayMessage.textContent = `You made it past ${score} ${score === 1 ? "pipe" : "pipes"}. Ready for another flap?`;
    overlayStart.textContent = "Fly again";
    overlay.hidden = false;
    status.textContent = `Flight over — ${score} ${score === 1 ? "pipe" : "pipes"} passed.`;
    saveBest();
    draw();
  };

  const flap = () => {
    if (!running || paused) return;
    bird.velocity = -360;
  };

  const frame = (now) => {
    if (!running || paused) return;
    const delta = Math.min(.04, Math.max(0, (now - lastFrame) / 1000 || 0));
    lastFrame = now;
    bird.velocity += 1120 * delta;
    bird.y += bird.velocity * delta;
    pipes.forEach((pipe) => {
      pipe.x -= (210 + Math.min(110, score * 4)) * delta;
      if (!pipe.passed && pipe.x + pipe.width < bird.x) {
        pipe.passed = true;
        score += 1;
        scoreLabel.textContent = score;
        saveBest();
        status.textContent = "Lovely flight! Keep flapping through.";
      }
    });
    pipes = pipes.filter((pipe) => pipe.x + pipe.width > -10);
    if (!pipes.length || pipes[pipes.length - 1].x < width - 225) {
      pipes.push({ x: width + 10, width: 60, gap: Math.max(128, 158 - score), gapY: 115 + Math.random() * 135, passed: false });
    }
    const hitPipe = pipes.some((pipe) => bird.x + 12 > pipe.x && bird.x - 12 < pipe.x + pipe.width &&
      (bird.y - 10 < pipe.gapY - pipe.gap / 2 || bird.y + 10 > pipe.gapY + pipe.gap / 2));
    if (bird.y - 13 < 0 || bird.y + 13 > ground || hitPipe) {
      finish();
      return;
    }
    draw();
    raf = window.requestAnimationFrame(frame);
  };

  const start = () => {
    window.cancelAnimationFrame(raf);
    bird = { x: 160, y: height / 2, velocity: 0 };
    pipes = [];
    score = 0;
    livesLabel.textContent = "1";
    scoreLabel.textContent = "0";
    running = true;
    paused = false;
    restart.textContent = "Restart";
    pauseButton.hidden = false;
    pauseButton.textContent = "Pause";
    overlay.hidden = true;
    status.textContent = "Tap or press Space to flap!";
    lastFrame = performance.now();
    draw();
    raf = window.requestAnimationFrame(frame);
  };

  const togglePause = () => {
    if (!running && !paused) return;
    if (paused) {
      paused = false;
      running = true;
      pauseButton.textContent = "Pause";
      overlay.hidden = true;
      lastFrame = performance.now();
      raf = window.requestAnimationFrame(frame);
    } else {
      paused = true;
      running = false;
      window.cancelAnimationFrame(raf);
      pauseButton.textContent = "Resume";
      overlayTitle.textContent = "A little pause in the clouds";
      overlayMessage.textContent = "Your flier will wait right here.";
      overlayStart.textContent = "Resume";
      overlay.hidden = false;
    }
  };

  canvas.addEventListener("pointerdown", flap);
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "w"].includes(key) && running) {
      event.preventDefault();
      flap();
    } else if (key === "p" && running) togglePause();
  });
  restart.addEventListener("click", start);
  pauseButton.addEventListener("click", togglePause);
  overlayStart.addEventListener("click", () => paused ? togglePause() : start());
  window.addEventListener("mindbreak:customization-change", draw);
  window.addEventListener("mindbreak:asset-loaded", draw);
  draw();
})();
