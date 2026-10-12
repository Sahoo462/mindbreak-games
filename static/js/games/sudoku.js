(() => {
  const boardElement = document.querySelector("#sudoku-board");
  const status = document.querySelector("#sudoku-status");
  const difficultySelect = document.querySelector("#sudoku-difficulty");
  const hintsLabel = document.querySelector("#sudoku-hints");
  const numberPad = document.querySelector("#sudoku-number-pad");
  const art = window.MindBreakAssets;
  const symbols = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const displaySymbols = ["△", "□", "◇", "☆", "○", "⬡", "✚", "≋", "✿"];
  const removals = { easy: 38, medium: 48, hard: 56 };
  let solution = [];
  let puzzle = [];
  let values = [];
  let selected = -1;
  let hints = 3;
  let finished = false;

  const displayValue = (value) => value && art.getConfig("sudoku").symbolsEnabled ? displaySymbols[value - 1] : value || "";

  const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };

  const makeSolution = () => {
    const bands = shuffle([0, 1, 2]);
    const rows = bands.flatMap((band) => shuffle([0, 1, 2]).map((row) => band * 3 + row));
    const stacks = shuffle([0, 1, 2]);
    const columns = stacks.flatMap((stack) => shuffle([0, 1, 2]).map((column) => stack * 3 + column));
    const digits = shuffle(symbols);
    return rows.map((row) => columns.map((column) => digits[(row * 3 + Math.floor(row / 3) + column) % 9]));
  };

  const candidatesAt = (grid, row, column) => symbols.filter((value) => {
    for (let index = 0; index < 9; index += 1) {
      if (grid[row][index] === value || grid[index][column] === value) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxColumn = Math.floor(column / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r += 1) {
      for (let c = boxColumn; c < boxColumn + 3; c += 1) {
        if (grid[r][c] === value) return false;
      }
    }
    return true;
  });

  const countSolutions = (grid, limit = 2) => {
    let bestRow = -1;
    let bestColumn = -1;
    let bestOptions = null;
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (grid[row][column] !== 0) continue;
        const options = candidatesAt(grid, row, column);
        if (!options.length) return 0;
        if (!bestOptions || options.length < bestOptions.length) {
          bestRow = row;
          bestColumn = column;
          bestOptions = options;
          if (options.length === 1) break;
        }
      }
      if (bestOptions?.length === 1) break;
    }
    if (bestRow === -1) return 1;
    let found = 0;
    for (const value of bestOptions) {
      grid[bestRow][bestColumn] = value;
      found += countSolutions(grid, limit - found);
      grid[bestRow][bestColumn] = 0;
      if (found >= limit) return found;
    }
    return found;
  };

  const generatePuzzle = () => {
    solution = makeSolution();
    puzzle = solution.map((row) => [...row]);
    const order = shuffle(Array.from({ length: 81 }, (_, index) => index));
    let removed = 0;
    for (const index of order) {
      if (removed >= removals[difficultySelect.value]) break;
      const row = Math.floor(index / 9);
      const column = index % 9;
      const saved = puzzle[row][column];
      puzzle[row][column] = 0;
      if (countSolutions(puzzle.map((line) => [...line])) === 1) removed += 1;
      else puzzle[row][column] = saved;
    }
    values = puzzle.map((row) => [...row]);
    selected = -1;
    hints = 3;
    finished = false;
    hintsLabel.textContent = hints;
    status.textContent = `${difficultySelect.value[0].toUpperCase()}${difficultySelect.value.slice(1)} puzzle ready. Choose an empty square.`;
    render();
  };

  const getConflicts = () => {
    const conflicts = new Set();
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        const value = values[row][column];
        if (!value) continue;
        for (let other = 0; other < 9; other += 1) {
          if (other !== column && values[row][other] === value) {
            conflicts.add(row * 9 + column);
            conflicts.add(row * 9 + other);
          }
          if (other !== row && values[other][column] === value) {
            conflicts.add(row * 9 + column);
            conflicts.add(other * 9 + column);
          }
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxColumn = Math.floor(column / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r += 1) {
          for (let c = boxColumn; c < boxColumn + 3; c += 1) {
            if ((r !== row || c !== column) && values[r][c] === value) {
              conflicts.add(row * 9 + column);
              conflicts.add(r * 9 + c);
            }
          }
        }
      }
    }
    return conflicts;
  };

  const render = () => {
    const conflicts = getConflicts();
    const selectedRow = Math.floor(selected / 9);
    const selectedColumn = selected % 9;
    boardElement.replaceChildren();
    for (let index = 0; index < 81; index += 1) {
      const row = Math.floor(index / 9);
      const column = index % 9;
      const value = values[row][column];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "sudoku-cell";
      if (puzzle[row][column]) cell.classList.add("fixed-cell");
      if (conflicts.has(index)) cell.classList.add("conflict-cell");
      if (selected >= 0 && (row === selectedRow || column === selectedColumn || (Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(column / 3) === Math.floor(selectedColumn / 3)))) cell.classList.add("related-cell");
      if (index === selected) cell.classList.add("selected-cell");
      if (value && selected >= 0 && value === values[selectedRow][selectedColumn]) cell.classList.add("same-value");
      cell.textContent = displayValue(value);
      cell.disabled = finished || Boolean(puzzle[row][column]);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `Row ${row + 1}, column ${column + 1}${value ? `, ${value}` : ", empty"}${puzzle[row][column] ? ", given" : ""}`);
      cell.addEventListener("click", () => {
        if (!cell.disabled) {
          selected = index;
          status.textContent = `Row ${row + 1}, column ${column + 1} selected. Choose a number.`;
          render();
        }
      });
      boardElement.append(cell);
    }
  };

  const enterValue = (value) => {
    if (finished || selected < 0 || puzzle[Math.floor(selected / 9)][selected % 9]) return;
    values[Math.floor(selected / 9)][selected % 9] = value;
    const conflicts = getConflicts();
    if (values.every((row) => row.every(Boolean)) && !conflicts.size && values.every((row, r) => row.every((item, c) => item === solution[r][c]))) {
      finished = true;
      status.textContent = "Beautifully solved! You gave every number its place.";
    } else if (value && conflicts.size) {
      status.textContent = "Those numbers clash in the same row, column, or box.";
    } else {
      status.textContent = value ? "Nice! Keep filling the empty squares." : "Square cleared.";
    }
    render();
  };

  for (const number of symbols) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = displayValue(number);
    button.setAttribute("aria-label", `Enter ${number}`);
    button.addEventListener("click", () => enterValue(number));
    numberPad.append(button);
  }
  document.querySelector("#sudoku-erase").addEventListener("click", () => enterValue(0));
  window.addEventListener("mindbreak:customization-change", () => {
    for (const [index, button] of [...numberPad.children].entries()) button.textContent = displayValue(index + 1);
    render();
  });
  document.querySelector("#sudoku-hint").addEventListener("click", () => {
    if (finished || hints < 1) {
      status.textContent = finished ? "This puzzle is already solved. Start a new one!" : "No hints left for this puzzle.";
      return;
    }
    let index = selected >= 0 && values[Math.floor(selected / 9)][selected % 9] === 0 ? selected : -1;
    if (index < 0) {
      const empty = [];
      for (let row = 0; row < 9; row += 1) for (let column = 0; column < 9; column += 1) if (!values[row][column]) empty.push(row * 9 + column);
      index = empty[Math.floor(Math.random() * empty.length)];
    }
    if (index < 0) return;
    hints -= 1;
    hintsLabel.textContent = hints;
    selected = index;
    enterValue(solution[Math.floor(index / 9)][index % 9]);
    if (!finished) status.textContent = `Hint used — ${hints} ${hints === 1 ? "hint" : "hints"} left.`;
  });
  document.querySelector("#sudoku-restart").addEventListener("click", generatePuzzle);
  difficultySelect.addEventListener("change", generatePuzzle);
  document.addEventListener("keydown", (event) => {
    if (/^[1-9]$/.test(event.key) && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) enterValue(Number(event.key));
    else if ((event.key === "Backspace" || event.key === "Delete" || event.key === "0") && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) enterValue(0);
  });
  generatePuzzle();
})();
