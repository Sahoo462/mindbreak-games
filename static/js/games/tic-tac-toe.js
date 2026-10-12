(() => {
  const board = document.querySelector("#ttt-board");
  const status = document.querySelector("#ttt-status");
  const modeSelect = document.querySelector("#ttt-mode");
  const restart = document.querySelector("#ttt-restart");
  const art = window.MindBreakAssets;
  const scores = {
    X: document.querySelector("#ttt-x-score"),
    O: document.querySelector("#ttt-o-score"),
    draw: document.querySelector("#ttt-draw-score"),
  };
  const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let cells = Array(9).fill("");
  let turn = "X";
  let finished = false;
  let tally = { X: 0, O: 0, draw: 0 };
  let aiTimer;
  let buttons = [];

  const render = () => {
    board.replaceChildren();
    buttons = cells.map((mark, index) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `ttt-cell${mark ? ` mark-${mark.toLowerCase()}` : ""}`;
      if (mark) {
        const role = mark === "X" ? "playerX" : "playerO";
        cell.textContent = mark;
        cell.classList.add("has-character-art");
        art.getImage("tic-tac-toe", role).then((image) => {
          if (!image || cell.dataset.mark !== mark || !cell.isConnected) return;
          const portrait = image.cloneNode();
          portrait.className = "game-character-image";
          portrait.alt = `${mark} character`;
          cell.replaceChildren(portrait);
        });
      } else cell.textContent = "";
      cell.dataset.mark = mark;
      cell.disabled = finished || Boolean(mark) || (modeSelect.value === "ai" && turn === "O");
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}${mark ? `, ${mark}` : ", empty"}`);
      cell.addEventListener("click", () => play(index));
      board.append(cell);
      return cell;
    });
  };

  const winningLine = (state, mark) => wins.find((line) => line.every((index) => state[index] === mark));

  const scoreRound = (winner, line) => {
    finished = true;
    if (winner) {
      tally[winner] += 1;
      status.textContent = `${winner} wins! Lovely line.`;
      line.forEach((index) => buttons[index].classList.add("winning-cell"));
    } else {
      tally.draw += 1;
      status.textContent = "It's a draw! Nicely played.";
    }
    scores.X.textContent = tally.X;
    scores.O.textContent = tally.O;
    scores.draw.textContent = tally.draw;
    render();
    if (line) line.forEach((index) => buttons[index].classList.add("winning-cell"));
  };

  const findBestMove = () => {
    const solve = (state, mark, depth) => {
      const line = winningLine(state, "O");
      if (line) return { score: 10 - depth, index: -1 };
      if (winningLine(state, "X")) return { score: depth - 10, index: -1 };
      const open = state.reduce((list, value, index) => value ? list : [...list, index], []);
      if (!open.length) return { score: 0, index: -1 };
      const maximizing = mark === "O";
      let best = { score: maximizing ? -Infinity : Infinity, index: open[0] };
      for (const index of open) {
        state[index] = mark;
        const result = solve(state, mark === "O" ? "X" : "O", depth + 1);
        state[index] = "";
        if ((maximizing && result.score > best.score) || (!maximizing && result.score < best.score)) {
          best = { score: result.score, index };
        }
      }
      return best;
    };
    return solve([...cells], "O", 0).index;
  };

  const play = (index, isComputerMove = false) => {
    if (finished || cells[index] || (modeSelect.value === "ai" && turn === "O" && !isComputerMove)) return;
    cells[index] = turn;
    const line = winningLine(cells, turn);
    if (line) {
      render();
      scoreRound(turn, line);
      return;
    }
    if (cells.every(Boolean)) {
      scoreRound(null, null);
      return;
    }
    turn = turn === "X" ? "O" : "X";
    render();
    status.textContent = modeSelect.value === "ai" && turn === "O" ? "The computer is thinking…" : `${turn}'s turn. Pick a square!`;
    if (modeSelect.value === "ai" && turn === "O") {
      aiTimer = window.setTimeout(() => play(findBestMove(), true), 320);
    }
  };

  const reset = () => {
    window.clearTimeout(aiTimer);
    cells = Array(9).fill("");
    turn = "X";
    finished = false;
    tally = { X: 0, O: 0, draw: 0 };
    scores.X.textContent = scores.O.textContent = scores.draw.textContent = "0";
    status.textContent = "X goes first. Pick a square!";
    render();
  };

  modeSelect.addEventListener("change", reset);
  restart.addEventListener("click", reset);
  window.addEventListener("mindbreak:customization-change", render);
  render();
})();
