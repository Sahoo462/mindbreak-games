(() => {
  const boardElement = document.querySelector("#2048-board");
  const scoreElement = document.querySelector("#2048-score");
  const bestElement = document.querySelector("#2048-best");
  const status = document.querySelector("#2048-status");
  const art = window.MindBreakAssets;
  let board;
  let score;
  let best = 0;
  let finished = false;
  let won = false;

  try { best = Number(localStorage.getItem("mindbreak-2048-best")) || 0; }
  catch (error) { console.warn("MindBreak could not read the 2048 best score.", error); }
  bestElement.textContent = best;

  const saveBest = () => {
    if (score <= best) return;
    best = score;
    bestElement.textContent = best;
    try { localStorage.setItem("mindbreak-2048-best", String(best)); }
    catch (error) { console.warn("MindBreak could not save the 2048 best score.", error); }
  };

  const spawn = () => {
    const empty = [];
    board.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      if (!value) empty.push([rowIndex, columnIndex]);
    }));
    if (!empty.length) return false;
    const [row, column] = empty[Math.floor(Math.random() * empty.length)];
    board[row][column] = Math.random() < .9 ? 2 : 4;
    return true;
  };

  const hasMoves = () => board.some((row, rowIndex) => row.some((value, columnIndex) =>
    !value || (columnIndex < 3 && value === row[columnIndex + 1]) ||
    (rowIndex < 3 && value === board[rowIndex + 1][columnIndex])));

  const render = () => {
    boardElement.replaceChildren();
    board.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      const cell = document.createElement("div");
      cell.className = `tile2048${value ? ` tile2048-${Math.min(value, 2048)}` : " tile2048-empty"}`;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${rowIndex + 1}, column ${columnIndex + 1}${value ? `, ${value}` : ", empty"}`);
      if (value) {
        const role = value === 2 ? "tile2" : value === 4 ? "tile4" : "tileHigh";
        const image = document.createElement("img");
        image.className = "tile2048-art";
        image.alt = "";
        art.getImage("2048", role).then((asset) => {
          if (asset && cell.isConnected) image.src = asset.src;
        });
        const number = document.createElement("span");
        number.className = "tile2048-value";
        number.textContent = value;
        cell.append(image, number);
      }
      boardElement.append(cell);
    }));
    scoreElement.textContent = score;
    saveBest();
    if (finished) status.textContent = "No more moves. Start a new game and try again!";
  };

  const mergeLine = (line) => {
    const compact = line.filter(Boolean);
    const merged = [];
    for (let index = 0; index < compact.length; index += 1) {
      if (compact[index] === compact[index + 1]) {
        const value = compact[index] * 2;
        merged.push(value);
        score += value;
        index += 1;
        if (value === 2048) won = true;
      } else merged.push(compact[index]);
    }
    while (merged.length < 4) merged.push(0);
    return merged;
  };

  const move = (direction) => {
    if (finished) return;
    const before = board.map((row) => [...row]);
    for (let index = 0; index < 4; index += 1) {
      let line;
      if (direction === "left" || direction === "right") {
        line = [...board[index]];
        if (direction === "right") line.reverse();
      } else {
        line = board.map((row) => row[index]);
        if (direction === "down") line.reverse();
      }
      const merged = mergeLine(line);
      if ((direction === "right" || direction === "down")) merged.reverse();
      if (direction === "left" || direction === "right") board[index] = merged;
      else for (let row = 0; row < 4; row += 1) board[row][index] = merged[row];
    }
    if (before.every((row, rowIndex) => row.every((value, columnIndex) => value === board[rowIndex][columnIndex]))) return;
    spawn();
    if (won) {
      won = false;
      status.textContent = "You made 2048! Keep going, or start a fresh board.";
    } else status.textContent = "Nice move. Keep combining those tiles!";
    if (!hasMoves()) finished = true;
    render();
  };

  const reset = () => {
    board = Array.from({ length: 4 }, () => Array(4).fill(0));
    score = 0;
    finished = false;
    won = false;
    spawn();
    spawn();
    status.textContent = "Slide the tiles and combine matching numbers!";
    render();
  };

  const handleKey = (event) => {
    const key = event.key.toLowerCase();
    const direction = { arrowleft: "left", a: "left", arrowright: "right", d: "right", arrowup: "up", w: "up", arrowdown: "down", s: "down" }[key];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    event.preventDefault();
    move(direction);
  };

  let touchStart = null;
  boardElement.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  boardElement.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }, { passive: true });
  document.addEventListener("keydown", handleKey);
  document.querySelector("#2048-restart").addEventListener("click", reset);
  window.addEventListener("mindbreak:customization-change", render);
  reset();
})();
