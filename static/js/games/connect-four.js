(() => {
  const board = document.querySelector("#connect-board");
  const status = document.querySelector("#c4-status");
  const art = window.MindBreakAssets;
  const scores = {
    red: document.querySelector("#c4-red-score"),
    yellow: document.querySelector("#c4-yellow-score"),
  };
  const rows = 6;
  const columns = 7;
  let state = Array.from({ length: rows }, () => Array(columns).fill(""));
  let current = "red";
  let locked = false;
  let tally = { red: 0, yellow: 0 };
  let cells = [];

  const checkWin = (row, column, color) => {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = [[row, column]];
      for (const direction of [-1, 1]) {
        let r = row + dr * direction;
        let c = column + dc * direction;
        while (r >= 0 && r < rows && c >= 0 && c < columns && state[r][c] === color) {
          line.push([r, c]);
          r += dr * direction;
          c += dc * direction;
        }
      }
      if (line.length >= 4) return line;
    }
    return null;
  };

  const render = () => {
    board.replaceChildren();
    cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        const color = state[row][column];
        cell.className = `connect-cell${color ? ` ${color}` : ""}`;
        cell.disabled = locked || Boolean(color);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `Row ${row + 1}, column ${column + 1}${color ? `, ${color} disc` : ", empty"}`);
        if (color) {
          cell.classList.add("has-character-art");
          art.getImage("connect-four", color).then((image) => {
            if (!image || cell.dataset.player !== color || !cell.isConnected) return;
            const portrait = image.cloneNode();
            portrait.className = "game-character-image";
            portrait.alt = `${color} character`;
            cell.append(portrait);
          });
        }
        cell.dataset.player = color;
        cell.addEventListener("click", () => drop(column));
        board.append(cell);
        cells.push(cell);
      }
    }
  };

  const drop = (column) => {
    if (locked) return;
    let row = rows - 1;
    while (row >= 0 && state[row][column]) row -= 1;
    if (row < 0) {
      status.textContent = "That column is full. Try another one!";
      return;
    }
    state[row][column] = current;
    const winningCells = checkWin(row, column, current);
    render();
    if (winningCells) {
      locked = true;
      tally[current] += 1;
      scores[current].textContent = tally[current];
      status.textContent = `${current === "red" ? "Red" : "Yellow"} connects four! Lovely shot.`;
      winningCells.forEach(([r, c]) => cells[r * columns + c].classList.add("connect-win"));
      return;
    }
    if (state.every((line) => line.every(Boolean))) {
      locked = true;
      status.textContent = "It's a draw! Those were some close calls.";
      return;
    }
    current = current === "red" ? "yellow" : "red";
    status.textContent = `${current === "red" ? "Red" : "Yellow"}'s turn. Choose a column!`;
  };

  const reset = () => {
    state = Array.from({ length: rows }, () => Array(columns).fill(""));
    current = "red";
    locked = false;
    tally = { red: 0, yellow: 0 };
    scores.red.textContent = scores.yellow.textContent = "0";
    status.textContent = "Red starts. Choose a column!";
    render();
  };

  board.addEventListener("keydown", (event) => {
    const index = cells.indexOf(document.activeElement);
    if (index < 0) return;
    const column = index % columns;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      drop(column);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const next = Math.max(0, Math.min(columns - 1, column + (event.key === "ArrowLeft" ? -1 : 1)));
      cells[Math.floor(index / columns) * columns + next].focus();
    }
  });
  document.querySelector("#c4-restart").addEventListener("click", reset);
  window.addEventListener("mindbreak:customization-change", render);
  render();
})();
