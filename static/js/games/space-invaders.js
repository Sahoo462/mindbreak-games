(() => {
  const canvas = document.querySelector("#arcade-canvas");
  const ctx = canvas.getContext("2d");
  const scoreLabel = document.querySelector("#arcade-score");
  const livesLabel = document.querySelector("#arcade-lives");
  const waveLabel = document.querySelector("#arcade-wave");
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
  const height = 430;
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-label", "Space Invaders. Move with arrow keys or A and D, fire with space.");
  document.querySelector("#arcade-help").textContent = "Move with ← → or A / D, and fire with Space. On a phone, use the touch controls. Clear a wave before the invaders reach you!";
  const stars = Array.from({ length: 45 }, () => ({ x: Math.random() * width, y: Math.random() * height, size: Math.random() * 2 + 1 }));
  let player;
  let enemies = [];
  let bullets = [];
  let keys = new Set();
  let score = 0;
  let lives = 3;
  let wave = 1;
  let enemyDirection = 1;
  let enemyStep = 0;
  let lastShot = 0;
  let raf = 0;
  let lastFrame = 0;
  let running = false;
  let paused = false;

  const populateWave = () => {
    enemies = [];
    for (let row = 0; row < 4; row += 1) for (let column = 0; column < 9; column += 1) enemies.push({ x: 90 + column * 58, y: 55 + row * 43, alive: true, row });
    enemyDirection = 1;
    enemyStep = 0;
    bullets = [];
    waveLabel.textContent = wave;
  };

  const draw = () => {
    const look = art.getConfig("space-invaders").look;
    const palette = {
      dreamscape: { space: "#17243b", ground: "#7ed0ae", ships: ["#a999ed", "#90d4b4", "#ffc17f", "#8bb9e9"], bullet: "#ffe28b" },
      pixel: { space: "#19342d", ground: "#a5d4a9", ships: ["#9cb6e6", "#8fc89f", "#f0c87b", "#79a8d0"], bullet: "#f5df8e" },
      cosmic: { space: "#251b3b", ground: "#e891b6", ships: ["#d17bd4", "#91c9e0", "#ffc17f", "#a599ee"], bullet: "#ffe09d" },
    }[look];
    ctx.fillStyle = palette.space;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgb(216 229 255 / 70%)";
    stars.forEach((star) => { ctx.fillRect(star.x, star.y, star.size, star.size); });
    ctx.fillStyle = palette.ground;
    ctx.fillRect(30, 385, width - 60, 2);
    if (player) {
      art.draw(ctx, "space-invaders", "player", player.x - 23, player.y - 22, 46, 42, () => {
        ctx.fillStyle = "#aa98f0";
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 19);
        ctx.lineTo(player.x - 19, player.y + 13);
        ctx.lineTo(player.x + 19, player.y + 13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff0bb";
        ctx.fillRect(player.x - 3, player.y - 5, 6, 13);
      });
    }
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      art.draw(ctx, "space-invaders", "enemy", enemy.x - 22, enemy.y - 18, 44, 36, () => {
        ctx.fillStyle = palette.ships[enemy.row];
        ctx.fillRect(enemy.x - 15, enemy.y - 10, 30, 19);
        ctx.fillRect(enemy.x - 20, enemy.y - 3, 5, 10);
        ctx.fillRect(enemy.x + 15, enemy.y - 3, 5, 10);
        ctx.fillRect(enemy.x - 11, enemy.y + 8, 5, 7);
        ctx.fillRect(enemy.x + 6, enemy.y + 8, 5, 7);
        ctx.fillStyle = "#263346";
        ctx.fillRect(enemy.x - 8, enemy.y - 3, 4, 4);
        ctx.fillRect(enemy.x + 5, enemy.y - 3, 4, 4);
      });
    });
    bullets.forEach((bullet) => {
      art.draw(ctx, "space-invaders", "projectile", bullet.x - 7, bullet.y - 11, 14, 20, () => {
        ctx.fillStyle = palette.bullet;
        ctx.fillRect(bullet.x - 2, bullet.y - 9, 4, 14);
      });
    });
  };

  const endGame = (message) => {
    running = false;
    paused = false;
    window.cancelAnimationFrame(raf);
    pauseButton.hidden = true;
    overlayTitle.textContent = "Galaxy cleared for now";
    overlayMessage.textContent = message;
    overlayStart.textContent = "Play again";
    overlay.hidden = false;
    status.textContent = message;
  };

  const nextWave = () => {
    wave += 1;
    populateWave();
    status.textContent = `Wave ${wave}! They're getting quicker.`;
  };

  const shoot = (now = performance.now()) => {
    if (!running || paused || now - lastShot < 300) return;
    bullets.push({ x: player.x, y: player.y - 22 });
    lastShot = now;
  };

  const frame = (now) => {
    if (!running || paused) return;
    const delta = Math.max(0, Math.min((now - lastFrame) / 1000 || 0, .04));
    lastFrame = now;
    if (keys.has("arrowleft") || keys.has("a")) player.x -= 300 * delta;
    if (keys.has("arrowright") || keys.has("d")) player.x += 300 * delta;
    player.x = Math.max(24, Math.min(width - 24, player.x));
    if (keys.has(" ") || keys.has("space")) shoot(now);
    bullets.forEach((bullet) => { bullet.y -= 410 * delta; });
    bullets = bullets.filter((bullet) => bullet.y > 0);
    const alive = enemies.filter((enemy) => enemy.alive);
    const speed = 35 + wave * 11 + (36 - alive.length) * 2;
    enemyStep += speed * delta;
    const leftEdge = alive.length ? Math.min(...alive.map((enemy) => enemy.x)) : 50;
    const rightEdge = alive.length ? Math.max(...alive.map((enemy) => enemy.x)) : width - 50;
    if ((enemyDirection > 0 && rightEdge > width - 38) || (enemyDirection < 0 && leftEdge < 38)) {
      enemyDirection *= -1;
      enemies.forEach((enemy) => { if (enemy.alive) enemy.y += 19; });
    } else if (enemyStep > 3) {
      enemies.forEach((enemy) => { if (enemy.alive) enemy.x += enemyDirection * 6; });
      enemyStep = 0;
    }
    for (const bullet of bullets) {
      const target = enemies.find((enemy) => enemy.alive && Math.abs(enemy.x - bullet.x) < 19 && Math.abs(enemy.y - bullet.y) < 17);
      if (target) {
        target.alive = false;
        bullet.y = -20;
        score += 10 + target.row * 5;
        scoreLabel.textContent = score;
      }
    }
    bullets = bullets.filter((bullet) => bullet.y > 0);
    if (enemies.some((enemy) => enemy.alive && enemy.y >= 350)) {
      lives -= 1;
      livesLabel.textContent = lives;
      if (lives <= 0) {
        draw();
        endGame(`The invaders reached your ship. Final score: ${score}.`);
        return;
      }
      populateWave();
      status.textContent = `The fleet got close. ${lives} ${lives === 1 ? "life" : "lives"} left.`;
    }
    if (enemies.every((enemy) => !enemy.alive)) nextWave();
    draw();
    raf = window.requestAnimationFrame(frame);
  };

  const start = () => {
    window.cancelAnimationFrame(raf);
    score = 0;
    lives = 3;
    wave = 1;
    scoreLabel.textContent = score;
    livesLabel.textContent = lives;
    player = { x: width / 2, y: height - 28 };
    keys.clear();
    populateWave();
    running = true;
    paused = false;
    restart.textContent = "Restart";
    pauseButton.hidden = false;
    pauseButton.textContent = "Pause";
    overlay.hidden = true;
    status.textContent = "Defend your tiny corner of space!";
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
      status.textContent = "Back to the stars!";
      lastFrame = performance.now();
      raf = window.requestAnimationFrame(frame);
    } else {
      paused = true;
      running = false;
      window.cancelAnimationFrame(raf);
      pauseButton.textContent = "Resume";
      overlayTitle.textContent = "A little pause in space";
      overlayMessage.textContent = "Your ship and the invaders will wait right here.";
      overlayStart.textContent = "Resume";
      overlay.hidden = false;
      status.textContent = "Game paused.";
    }
  };

  const makeControl = (text, label, down, up = () => {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); down(); });
    for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) button.addEventListener(eventName, up);
    controls.append(button);
  };
  makeControl("←", "Move left", () => keys.add("arrowleft"), () => keys.delete("arrowleft"));
  makeControl("●", "Fire", () => shoot(), () => {});
  makeControl("→", "Move right", () => keys.add("arrowright"), () => keys.delete("arrowright"));

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", " ", "space"].includes(key)) event.preventDefault();
    keys.add(key);
  });
  document.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  restart.addEventListener("click", start);
  pauseButton.addEventListener("click", togglePause);
  overlayStart.addEventListener("click", () => paused ? togglePause() : start());
  window.addEventListener("mindbreak:customization-change", draw);
  window.addEventListener("mindbreak:asset-loaded", draw);
  draw();
})();
