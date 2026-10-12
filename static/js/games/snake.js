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
  const pause = document.querySelector("#arcade-pause");
  const controls = document.querySelector("#touch-controls");
  const art = window.MindBreakAssets;
  const width = 480;
  const height = 360;
  const size = 24;
  const columns = width / size;
  const rows = height / size;
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-label", "Snake game. Use arrow keys or WASD to steer.");
  document.querySelector("#arcade-help").textContent = "Steer with the arrow keys or WASD. On a phone, use the buttons below. Collect snacks, but don't run into a wall or your tail.";
  let snake = [];
  let food = { x: 0, y: 0 };
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let score = 0;
  let timer = null;
  let running = false;
  let paused = false;

  const draw = () => {
    const look = art.getConfig("snake").look;
    const palette = {
      dreamscape: { board: "#222b38", grid: "rgb(255 255 255 / 4%)", head: "#87d3ad", body: "#75bc99" },
      pixel: { board: "#24352d", grid: "rgb(220 255 226 / 8%)", head: "#a5d4a9", body: "#7bb88a" },
      cosmic: { board: "#302238", grid: "rgb(255 227 244 / 8%)", head: "#f18cb4", body: "#ca72a4" },
    }[look];
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = .14;
    art.draw(ctx, "snake", "background", 0, 0, width, height, () => {});
    ctx.restore();
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y <= height; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    snake.forEach((part, index) => {
      const isHead = index === 0;
      const x = part.x * size + 2;
      const y = part.y * size + 2;
      art.draw(ctx, "snake", isHead ? "head" : "body", x, y, size - 4, size - 4, () => {
        ctx.fillStyle = isHead ? palette.head : palette.body;
        ctx.beginPath();
        ctx.roundRect(x, y, size - 4, size - 4, isHead ? 10 : 7);
        ctx.fill();
        if (isHead) {
          ctx.fillStyle = "#243e34";
          ctx.beginPath();
          ctx.arc(x + size * .36, y + size * .38, 2, 0, Math.PI * 2);
          ctx.arc(x + size * .66, y + size * .38, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
    const foodX = food.x * size + 2;
    const foodY = food.y * size + 2;
    art.draw(ctx, "snake", "food", foodX, foodY, size - 4, size - 4, () => {
      ctx.fillStyle = "#ffb391";
      ctx.beginPath();
      ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size * .38, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const placeFood = () => {
    const available = [];
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) if (!snake.some((part) => part.x === x && part.y === y)) available.push({ x, y });
    if (available.length) food = available[Math.floor(Math.random() * available.length)];
  };

  const setDirection = (x, y) => {
    if (x !== -direction.x || y !== -direction.y) queuedDirection = { x, y };
  };

  const updateSpeed = () => {
    window.clearInterval(timer);
    timer = window.setInterval(tick, Math.max(65, 150 - Math.floor(score / 50) * 8));
  };

  const endGame = () => {
    running = false;
    paused = false;
    window.clearInterval(timer);
    timer = null;
    pause.hidden = true;
    status.textContent = `Game over — you scored ${score}. Fancy another snack run?`;
    overlayTitle.textContent = "Nice little run";
    overlayMessage.textContent = `You collected ${score / 10} snacks and scored ${score} points.`;
    overlayStart.textContent = "Play again";
    overlay.hidden = false;
  };

  function tick() {
    direction = queuedDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const eating = head.x === food.x && head.y === food.y;
    if (head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows || snake.slice(0, eating ? snake.length : -1).some((part) => part.x === head.x && part.y === head.y)) {
      endGame();
      return;
    }
    snake.unshift(head);
    if (eating) {
      score += 10;
      scoreLabel.textContent = score;
      placeFood();
      updateSpeed();
      status.textContent = "Yum! Keep going — your snake is growing.";
    } else {
      snake.pop();
    }
    draw();
  }

  const showOverlay = (title, message, buttonText) => {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayStart.textContent = buttonText;
    overlay.hidden = false;
  };

  const start = () => {
    window.clearInterval(timer);
    snake = [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }];
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    scoreLabel.textContent = score;
    placeFood();
    running = true;
    paused = false;
    pause.hidden = false;
    pause.textContent = "Pause";
    restart.textContent = "Restart";
    overlay.hidden = true;
    status.textContent = "Snack time! Keep your snake safe.";
    draw();
    updateSpeed();
  };

  const togglePause = () => {
    if (!running && !paused) return;
    if (paused) {
      paused = false;
      running = true;
      overlay.hidden = true;
      pause.textContent = "Pause";
      status.textContent = "Back in the game!";
      updateSpeed();
    } else {
      paused = true;
      running = false;
      window.clearInterval(timer);
      timer = null;
      pause.textContent = "Resume";
      showOverlay("Take a breather", "Your little snake will wait right here.", "Resume");
      status.textContent = "Game paused.";
    }
  };

  for (const [label, x, y] of [["↑", 0, -1], ["←", -1, 0], ["↓", 0, 1], ["→", 1, 0]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", `Move ${label === "↑" ? "up" : label === "↓" ? "down" : label === "←" ? "left" : "right"}`);
    button.addEventListener("click", () => setDirection(x, y));
    controls.append(button);
  }
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const moves = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
    if (moves[key]) {
      event.preventDefault();
      setDirection(...moves[key]);
    } else if (key === " " && running) {
      event.preventDefault();
      togglePause();
    }
  });
  restart.addEventListener("click", start);
  pause.addEventListener("click", togglePause);
  overlayStart.addEventListener("click", () => paused ? togglePause() : start());
  window.addEventListener("mindbreak:customization-change", draw);
  window.addEventListener("mindbreak:asset-loaded", draw);
  draw();
})();
