(() => {
  const canvas = document.querySelector("#arcade-canvas");
  const ctx = canvas.getContext("2d");
  const scoreLabel = document.querySelector("#arcade-score");
  const shotsLabel = document.querySelector("#arcade-lives");
  const status = document.querySelector("#arcade-status");
  const overlay = document.querySelector("#canvas-overlay");
  const overlayTitle = document.querySelector("#canvas-overlay-title");
  const overlayMessage = document.querySelector("#canvas-overlay-message");
  const overlayStart = document.querySelector("#canvas-start");
  const restart = document.querySelector("#arcade-restart");
  const width = 480;
  const height = 560;
  const radius = 15;
  const rows = 17;
  const columns = 14;
  const startX = 24;
  const startY = 32;
  const rowStep = 26;
  const colors = ["#a48ce4", "#f29b7f", "#72c4a0", "#72a4e0", "#f3c65d"];
  const art = window.MindBreakAssets;
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-label", "Bubble Shooter. Aim with your pointer or finger and tap to fire.");
  document.querySelector("#arcade-help").textContent = "Aim with your mouse or finger and click or tap the playfield to shoot. Match three or more bubbles of the same color to pop them. Clear groups to drop any bubbles no longer attached to the ceiling.";
  let grid = [];
  let currentColor = colors[0];
  let nextColor = colors[1];
  let projectile = null;
  let aim = { x: width / 2, y: 100 };
  let score = 0;
  let shots = 0;
  let misses = 0;
  let raf = 0;
  let lastFrame = 0;
  let running = false;
  let shotHeld = false;

  const center = (row, column) => ({
    x: startX + column * radius * 2 + (row % 2 ? radius : 0),
    y: startY + row * rowStep,
  });

  const getNeighbors = (row, column) => {
    const adjacentColumns = row % 2 ? [column, column + 1] : [column - 1, column];
    return [[row, column - 1], [row, column + 1],
      [row - 1, adjacentColumns[0]], [row - 1, adjacentColumns[1]],
      [row + 1, adjacentColumns[0]], [row + 1, adjacentColumns[1]]]
      .filter(([r, c]) => r >= 0 && r < rows && c >= 0 && c < columns);
  };

  const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

  const drawBubble = (x, y, color, bubbleRadius = radius) => {
    const gradient = ctx.createRadialGradient(x - bubbleRadius * .35, y - bubbleRadius * .4, 1, x, y, bubbleRadius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(.15, color);
    gradient.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(x, y, bubbleRadius, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();
    const customized = art.draw(ctx, "bubble-shooter", "bubble", x - bubbleRadius, y - bubbleRadius, bubbleRadius * 2, bubbleRadius * 2, () => {
      ctx.fillStyle = gradient;
      ctx.fillRect(x - bubbleRadius, y - bubbleRadius, bubbleRadius * 2, bubbleRadius * 2);
    });
    if (customized) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = .2;
      ctx.fillStyle = color;
      ctx.fillRect(x - bubbleRadius, y - bubbleRadius, bubbleRadius * 2, bubbleRadius * 2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, bubbleRadius - .5, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, bubbleRadius * .12);
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const draw = () => {
    const look = art.getConfig("bubble-shooter").look;
    const palette = { dreamscape: "#f3f0fc", pixel: "#eff5ed", cosmic: "#fbebf4" };
    ctx.fillStyle = palette[look];
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgb(255 255 255 / 61%)";
    ctx.fillRect(0, height - 87, width, 87);
    ctx.strokeStyle = "rgb(124 108 177 / 17%)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, height - 87);
    ctx.lineTo(width, height - 87);
    ctx.stroke();
    ctx.setLineDash([]);
    grid.forEach((line, row) => line.forEach((color, column) => {
      if (!color) return;
      const position = center(row, column);
      drawBubble(position.x, position.y, color);
    }));
    const shooter = { x: width / 2, y: height - 40 };
    const dx = aim.x - shooter.x;
    const dy = aim.y - shooter.y;
    const length = Math.hypot(dx, dy) || 1;
    const endX = shooter.x + dx / length * 74;
    const endY = shooter.y + dy / length * 74;
    ctx.strokeStyle = "rgb(116 93 174 / 48%)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    drawBubble(shooter.x, shooter.y, projectile ? "#ffffff" : currentColor, radius + 2);
    drawBubble(width - 72, height - 40, nextColor, radius * .68);
    ctx.fillStyle = "#786f88";
    ctx.font = "600 10px sans-serif";
    ctx.fillText("NEXT", width - 88, height - 15);
    if (projectile) drawBubble(projectile.x, projectile.y, projectile.color);
  };

  const connectedGroup = (row, column, color) => {
    const group = [];
    const visited = new Set();
    const queue = [[row, column]];
    while (queue.length) {
      const [r, c] = queue.pop();
      const key = `${r},${c}`;
      if (visited.has(key) || !grid[r]?.[c] || grid[r][c] !== color) continue;
      visited.add(key);
      group.push([r, c]);
      getNeighbors(r, c).forEach(([nextRow, nextColumn]) => queue.push([nextRow, nextColumn]));
    }
    return group;
  };

  const removeFloatingBubbles = () => {
    const connected = new Set();
    const queue = [];
    grid[0].forEach((color, column) => { if (color) queue.push([0, column]); });
    while (queue.length) {
      const [row, column] = queue.pop();
      const key = `${row},${column}`;
      if (connected.has(key) || !grid[row]?.[column]) continue;
      connected.add(key);
      getNeighbors(row, column).forEach(([r, c]) => queue.push([r, c]));
    }
    let removed = 0;
    for (let row = 1; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (grid[row][column] && !connected.has(`${row},${column}`)) {
          grid[row][column] = null;
          removed += 1;
        }
      }
    }
    return removed;
  };

  const setOverlay = (title, message, buttonText) => {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayStart.textContent = buttonText;
    overlay.hidden = false;
  };

  const endGame = (message) => {
    running = false;
    window.cancelAnimationFrame(raf);
    setOverlay("Bubble break!", message, "Play again");
    status.textContent = message;
  };

  const addRow = () => {
    if (grid[rows - 1].some(Boolean)) {
      endGame("The bubbles reached your launcher. Ready for a rematch?");
      return false;
    }
    grid.unshift(Array.from({ length: columns }, () => randomColor()));
    grid.pop();
    status.textContent = "A new row drifted in. Keep those colors popping!";
    return true;
  };

  const placeProjectile = () => {
    let best = null;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (grid[row][column]) continue;
        const position = center(row, column);
        const distance = Math.hypot(position.x - projectile.x, position.y - projectile.y);
        if (!best || distance < best.distance) best = { row, column, distance };
      }
    }
    if (!best) {
      endGame("The bubble board is full. Fancy another go?");
      return;
    }
    grid[best.row][best.column] = projectile.color;
    const group = connectedGroup(best.row, best.column, projectile.color);
    if (group.length >= 3) {
      group.forEach(([row, column]) => { grid[row][column] = null; });
      const dropped = removeFloatingBubbles();
      score += group.length * 10 + dropped * 20;
      scoreLabel.textContent = score;
      misses = 0;
      status.textContent = dropped ? `Pop! ${group.length} bubbles and ${dropped} floaters cleared!` : `${group.length} bubbles popped! Lovely aim.`;
    } else {
      misses += 1;
      status.textContent = misses >= 6 ? "Heads up! A fresh row is drifting down." : `${misses} of 6 shots without a pop.`;
      if (misses >= 6) {
        misses = 0;
        if (!addRow()) return;
      }
    }
    shots += 1;
    shotsLabel.textContent = shots;
    currentColor = nextColor;
    nextColor = randomColor();
    projectile = null;
    if (grid.every((line) => line.every((color) => !color))) {
      endGame("Board cleared! Every bubble found its way home. Lovely aim!");
      return;
    }
    if (grid[rows - 1].some(Boolean)) {
      endGame("The bubbles reached your launcher. Ready for a rematch?");
      return;
    }
  };

  const frame = (now) => {
    if (!running) return;
    const delta = Math.max(0, Math.min((now - lastFrame) / 1000 || 0, .04));
    lastFrame = now;
    if (projectile) {
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      if (projectile.x <= radius || projectile.x >= width - radius) {
        projectile.vx *= -1;
        projectile.x = Math.max(radius, Math.min(width - radius, projectile.x));
      }
      const collision = projectile.y <= startY || grid.some((line, row) => line.some((color, column) => {
        if (!color) return false;
        const position = center(row, column);
        return Math.hypot(position.x - projectile.x, position.y - projectile.y) < radius * 1.86;
      }));
      if (collision) placeProjectile();
    }
    draw();
    raf = window.requestAnimationFrame(frame);
  };

  const start = () => {
    window.cancelAnimationFrame(raf);
    grid = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => row < 6 ? colors[(Math.floor(Math.random() * colors.length) + (column % 3 === 0 ? Math.floor(row / 2) : 0)) % colors.length] : null));
    score = 0;
    shots = 0;
    misses = 0;
    scoreLabel.textContent = score;
    shotsLabel.textContent = shots;
    projectile = null;
    currentColor = randomColor();
    nextColor = randomColor();
    aim = { x: width / 2, y: height / 2 };
    running = true;
    restart.textContent = "Restart";
    overlay.hidden = true;
    status.textContent = "Aim, match three, and let gravity do the rest!";
    lastFrame = performance.now();
    draw();
    raf = window.requestAnimationFrame(frame);
  };

  const getCanvasPoint = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * height / bounds.height };
  };
  const setAim = (point) => {
    const shooter = { x: width / 2, y: height - 40 };
    const angle = Math.atan2(point.y - shooter.y, point.x - shooter.x);
    const clampedAngle = Math.max(-Math.PI + .2, Math.min(-.2, angle));
    aim = { x: shooter.x + Math.cos(clampedAngle) * 250, y: shooter.y + Math.sin(clampedAngle) * 250 };
  };
  const shoot = () => {
    if (!running || projectile) return;
    const shooter = { x: width / 2, y: height - 40 };
    const dx = aim.x - shooter.x;
    const dy = aim.y - shooter.y;
    const length = Math.hypot(dx, dy) || 1;
    projectile = { x: shooter.x, y: shooter.y - radius, vx: dx / length * 460, vy: dy / length * 460, color: currentColor };
    status.textContent = "Your bubble is on its way!";
  };
  canvas.addEventListener("pointermove", (event) => { setAim(getCanvasPoint(event)); });
  canvas.addEventListener("pointerdown", (event) => {
    if (!running) return;
    event.preventDefault();
    setAim(getCanvasPoint(event));
    shoot();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === " " && running) {
      event.preventDefault();
      shoot();
    }
  });
  restart.addEventListener("click", start);
  overlayStart.addEventListener("click", start);
  window.addEventListener("mindbreak:customization-change", draw);
  window.addEventListener("mindbreak:asset-loaded", draw);
  draw();
})();
