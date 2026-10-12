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
  const height = 420;
  canvas.width = width;
  canvas.height = height;
  document.querySelector("#arcade-help").textContent = "Move the paddle with ← → or A / D, the mouse, or your finger. Clear each brick wave and keep the ball in play. Press Space to pause.";

  const paletteFor = () => ({
    dreamscape: { background: "#25253a", bricks: ["#a999ed", "#90d4b4", "#ffc17f", "#8bb9e9"], ball: "#ffe28b", paddle: "#b1e4ce" },
    pixel: { background: "#24352d", bricks: ["#9cb6e6", "#8fc89f", "#f0c87b", "#79a8d0"], ball: "#f5df8e", paddle: "#b3dab4" },
    cosmic: { background: "#2c203b", bricks: ["#d17bd4", "#91c9e0", "#ffc17f", "#a599ee"], ball: "#ffe09d", paddle: "#f3a9ca" },
  }[art.getConfig("breakout").look]);

  let paddle;
  let ball;
  let bricks = [];
  let score = 0;
  let lives = 3;
  let best = 0;
  let level = 1;
  let raf = 0;
  let lastFrame = 0;
  let running = false;
  let paused = false;
  let targetX = width / 2;
  const keys = new Set();

  try { best = Number(localStorage.getItem("mindbreak-breakout-best")) || 0; }
  catch (error) { console.warn("MindBreak could not read the Breakout best score.", error); }
  bestLabel.textContent = best;

  const saveBest = () => {
    if (score <= best) return;
    best = score;
    bestLabel.textContent = best;
    try { localStorage.setItem("mindbreak-breakout-best", String(best)); }
    catch (error) { console.warn("MindBreak could not save the Breakout best score.", error); }
  };

  const makeBricks = () => {
    bricks = [];
    for (let row = 0; row < 5; row += 1) for (let column = 0; column < 9; column += 1) {
      bricks.push({ x: 48 + column * 68, y: 58 + row * 29, width: 60, height: 20, color: row });
    }
  };

  const draw = () => {
    const colors = paletteFor();
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgb(255 255 255 / 72%)";
    for (let index = 0; index < 34; index += 1) ctx.fillRect((index * 173) % width, (index * 97) % height, 2, 2);
    bricks.forEach((brick) => {
      if (!brick.alive) return;
      art.draw(ctx, "breakout", "brick", brick.x, brick.y, brick.width, brick.height, () => {
        ctx.fillStyle = colors.bricks[brick.color % colors.bricks.length];
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 5);
        ctx.fill();
      });
    });
    if (paddle) {
      art.draw(ctx, "breakout", "paddle", paddle.x, paddle.y, paddle.width, paddle.height, () => {
        ctx.fillStyle = colors.paddle;
        ctx.beginPath();
        ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 9);
        ctx.fill();
      });
    }
    if (ball) {
      art.draw(ctx, "breakout", "ball", ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2, () => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.ball;
        ctx.fill();
      });
    }
    ctx.fillStyle = "rgb(255 255 255 / 68%)";
    ctx.font = "700 12px sans-serif";
    ctx.fillText(`WAVE ${level}`, 18, 24);
  };

  const setBall = () => {
    ball = { x: paddle.x + paddle.width / 2, y: paddle.y - 12, radius: 8, vx: (Math.random() < .5 ? -1 : 1) * (190 + level * 12), vy: -260 - level * 12 };
  };

  const finish = (title, message) => {
    running = false;
    paused = false;
    window.cancelAnimationFrame(raf);
    pauseButton.hidden = true;
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayStart.textContent = "Play again";
    overlay.hidden = false;
    status.textContent = message;
    saveBest();
  };

  const frame = (now) => {
    if (!running || paused) return;
    const delta = Math.min(.04, Math.max(0, (now - lastFrame) / 1000 || 0));
    lastFrame = now;
    if (keys.has("arrowleft") || keys.has("a")) targetX -= 420 * delta;
    if (keys.has("arrowright") || keys.has("d")) targetX += 420 * delta;
    targetX = Math.max(paddle.width / 2 + 8, Math.min(width - paddle.width / 2 - 8, targetX));
    paddle.x += (targetX - (paddle.x + paddle.width / 2)) * Math.min(1, delta * 12);
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > width) ball.vx *= -1;
    if (ball.y - ball.radius < 0) ball.vy = Math.abs(ball.vy);
    if (ball.vy > 0 && ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height && ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
      const offset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.vx = offset * (260 + level * 8);
      ball.vy = -Math.max(210, Math.abs(ball.vy));
      ball.y = paddle.y - ball.radius;
    }
    const hitBrick = bricks.find((brick) => brick.alive && ball.x + ball.radius >= brick.x && ball.x - ball.radius <= brick.x + brick.width && ball.y + ball.radius >= brick.y && ball.y - ball.radius <= brick.y + brick.height);
    if (hitBrick) {
      hitBrick.alive = false;
      ball.vy *= -1;
      score += 10;
      scoreLabel.textContent = score;
      saveBest();
    }
    if (ball.y - ball.radius > height) {
      lives -= 1;
      livesLabel.textContent = lives;
      if (lives <= 0) {
        draw();
        finish("Lovely rally!", `The ball got away. You scored ${score}. Ready for one more?`);
        return;
      }
      setBall();
      status.textContent = `Nice save! ${lives} ${lives === 1 ? "life" : "lives"} left.`;
    }
    if (bricks.every((brick) => !brick.alive)) {
      level += 1;
      makeBricks();
      ball.vx *= 1.08;
      ball.vy *= 1.08;
      status.textContent = `Wave ${level}! The bricks are back, a little quicker.`;
    }
    draw();
    raf = window.requestAnimationFrame(frame);
  };

  const start = () => {
    window.cancelAnimationFrame(raf);
    score = 0;
    lives = 3;
    level = 1;
    keys.clear();
    targetX = width / 2;
    paddle = { x: width / 2 - 52, y: height - 37, width: 104, height: 14 };
    makeBricks();
    setBall();
    scoreLabel.textContent = score;
    livesLabel.textContent = lives;
    running = true;
    paused = false;
    restart.textContent = "Restart";
    pauseButton.hidden = false;
    pauseButton.textContent = "Pause";
    overlay.hidden = true;
    status.textContent = "Keep the ball bouncing!";
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
      overlayTitle.textContent = "Take a little pause";
      overlayMessage.textContent = "Your paddle and ball will wait here.";
      overlayStart.textContent = "Resume";
      overlay.hidden = false;
    }
  };

  const pointerMove = (event) => {
    const bounds = canvas.getBoundingClientRect();
    targetX = (event.clientX - bounds.left) * width / bounds.width;
  };
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerdown", pointerMove);
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
      keys.add(key);
      event.preventDefault();
    } else if (key === " " && running) {
      event.preventDefault();
      togglePause();
    }
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
