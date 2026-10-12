(() => {
  const canvas = document.querySelector("#arcade-canvas");
  const ctx = canvas.getContext("2d");
  const scoreLabel = document.querySelector("#arcade-score");
  const status = document.querySelector("#arcade-status");
  const overlay = document.querySelector("#canvas-overlay");
  const overlayTitle = document.querySelector("#canvas-overlay-title");
  const overlayMessage = document.querySelector("#canvas-overlay-message");
  const overlayStart = document.querySelector("#canvas-start");
  const restart = document.querySelector("#arcade-restart");
  const pauseButton = document.querySelector("#arcade-pause");
  const controls = document.querySelector("#touch-controls");
  const art = window.MindBreakAssets;
  const width = 700;
  const height = 300;
  const ground = 235;
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-label", "Endless Runner. Press Space or tap to jump over obstacles.");
  document.querySelector("#arcade-help").textContent = "Jump with Space, ↑, W, or by tapping the screen. On a phone, use the Jump button. Stay light on your feet as the pace picks up!";
  let player;
  let obstacles = [];
  let score = 0;
  let speed = 255;
  let nextObstacle = 0;
  let raf = 0;
  let lastFrame = 0;
  let running = false;
  let paused = false;
  let distance = 0;
  const clouds = [{ x: 120, y: 61 }, { x: 390, y: 95 }, { x: 590, y: 48 }];

  const draw = () => {
    const look = art.getConfig("endless-runner").look;
    const palette = {
      dreamscape: { sky: "#e9f1ff", grass: "#b5dfc8", line: "#78b895" },
      pixel: { sky: "#e9f0df", grass: "#aed3a7", line: "#75aa79" },
      cosmic: { sky: "#f8e8f1", grass: "#ebc4d7", line: "#ce8bab" },
    }[look];
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = .12;
    art.draw(ctx, "endless-runner", "background", 0, 0, width, ground, () => {});
    ctx.restore();
    clouds.forEach((cloud) => {
      ctx.fillStyle = "rgb(255 255 255 / 74%)";
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, 19, 0, Math.PI * 2);
      ctx.arc(cloud.x + 21, cloud.y - 6, 25, 0, Math.PI * 2);
      ctx.arc(cloud.x + 47, cloud.y, 17, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = palette.grass;
    ctx.fillRect(0, ground, width, height - ground);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, ground);
    ctx.lineTo(width, ground);
    ctx.stroke();
    ctx.fillStyle = "rgb(73 143 104 / 32%)";
    for (let x = -(distance % 34); x < width; x += 34) ctx.fillRect(x, ground + 22, 16, 2);
    for (let index = 0; index < 3; index += 1) {
      const x = ((180 + index * 230 - (distance % 690)) + 690) % 690;
      art.draw(ctx, "endless-runner", "collectible", x, 152 + index % 2 * 18, 20, 20, () => {
        ctx.fillStyle = "#ffcf68";
        ctx.beginPath();
        ctx.arc(x + 10, 162 + index % 2 * 18, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    obstacles.forEach((obstacle) => {
      art.draw(ctx, "endless-runner", "obstacle", obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height, () => {
        ctx.fillStyle = "#f3a587";
        ctx.beginPath();
        ctx.roundRect(obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height, 5);
        ctx.fill();
        ctx.fillStyle = "#ffe0c9";
        ctx.fillRect(obstacle.x + 6, ground - obstacle.height + 8, 4, 5);
      });
    });
    if (player) {
      art.draw(ctx, "endless-runner", "player", player.x - 4, player.y - 4, player.width + 8, player.height + 12, () => {
        ctx.fillStyle = "#9a83df";
        ctx.beginPath();
        ctx.roundRect(player.x, player.y, player.width, player.height, 10);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(player.x + player.width - 8, player.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5d4c93";
        ctx.fillRect(player.x + 8, player.y + player.height - 2, 5, 8);
        ctx.fillRect(player.x + player.width - 13, player.y + player.height - 2, 5, 8);
      });
    }
    ctx.fillStyle = "#64577f";
    ctx.font = "700 14px sans-serif";
    ctx.fillText(`DISTANCE  ${score}`, width - 145, 28);
  };

  const finish = () => {
    running = false;
    paused = false;
    window.cancelAnimationFrame(raf);
    pauseButton.hidden = true;
    overlayTitle.textContent = "A lovely little sprint";
    overlayMessage.textContent = `You made it ${score} steps. Ready for another run?`;
    overlayStart.textContent = "Run again";
    overlay.hidden = false;
    status.textContent = `Run over — ${score} steps. Want to try again?`;
  };

  const jump = () => {
    if (!running || paused || player.y < ground - player.height - 1) return;
    player.velocityY = -570;
  };

  const frame = (now) => {
    if (!running || paused) return;
    const delta = Math.max(0, Math.min((now - lastFrame) / 1000 || 0, .04));
    lastFrame = now;
    distance += speed * delta;
    score = Math.floor(distance / 10);
    scoreLabel.textContent = score;
    speed = 255 + Math.min(250, score * 1.1);
    player.velocityY += 1550 * delta;
    player.y += player.velocityY * delta;
    if (player.y + player.height >= ground) {
      player.y = ground - player.height;
      player.velocityY = 0;
    }
    nextObstacle -= speed * delta;
    if (nextObstacle <= 0) {
      const heightObstacle = 24 + Math.random() * 34;
      obstacles.push({ x: width + 20, width: 18 + Math.random() * 17, height: heightObstacle });
      nextObstacle = 240 + Math.random() * 260 - Math.min(65, score * .35);
    }
    obstacles.forEach((obstacle) => { obstacle.x -= speed * delta; });
    obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -1);
    const hit = obstacles.some((obstacle) => player.x + player.width - 5 > obstacle.x && player.x + 5 < obstacle.x + obstacle.width && player.y + player.height - 5 > ground - obstacle.height);
    clouds.forEach((cloud) => { cloud.x -= speed * delta * .12; if (cloud.x < -50) cloud.x = width + 45; });
    draw();
    if (hit) {
      finish();
      return;
    }
    raf = window.requestAnimationFrame(frame);
  };

  const start = () => {
    window.cancelAnimationFrame(raf);
    player = { x: 82, y: ground - 41, width: 29, height: 41, velocityY: 0 };
    obstacles = [];
    score = 0;
    speed = 255;
    distance = 0;
    nextObstacle = 400;
    scoreLabel.textContent = "0";
    running = true;
    paused = false;
    restart.textContent = "Restart";
    pauseButton.hidden = false;
    pauseButton.textContent = "Pause";
    overlay.hidden = true;
    status.textContent = "Ready, set, little leap!";
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
      status.textContent = "Back on your feet!";
      lastFrame = performance.now();
      raf = window.requestAnimationFrame(frame);
    } else {
      paused = true;
      running = false;
      window.cancelAnimationFrame(raf);
      pauseButton.textContent = "Resume";
      overlayTitle.textContent = "Catch your breath";
      overlayMessage.textContent = "Your runner will wait right here.";
      overlayStart.textContent = "Resume";
      overlay.hidden = false;
      status.textContent = "Run paused.";
    }
  };

  const jumpButton = document.createElement("button");
  jumpButton.type = "button";
  jumpButton.textContent = "↑";
  jumpButton.setAttribute("aria-label", "Jump");
  jumpButton.addEventListener("pointerdown", (event) => { event.preventDefault(); jump(); });
  controls.append(jumpButton);
  canvas.addEventListener("pointerdown", jump);
  document.addEventListener("keydown", (event) => {
    if ([" ", "arrowup", "w"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      jump();
    }
  });
  restart.addEventListener("click", start);
  pauseButton.addEventListener("click", togglePause);
  overlayStart.addEventListener("click", () => paused ? togglePause() : start());
  window.addEventListener("mindbreak:customization-change", draw);
  window.addEventListener("mindbreak:asset-loaded", draw);
  draw();
})();
