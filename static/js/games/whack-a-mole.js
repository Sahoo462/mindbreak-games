(() => {
  const board = document.querySelector("#mole-board");
  const scoreLabel = document.querySelector("#mole-score");
  const timeLabel = document.querySelector("#mole-time");
  const bestLabel = document.querySelector("#mole-best");
  const status = document.querySelector("#mole-status");
  const art = window.MindBreakAssets;
  let buttons = [];
  let score = 0;
  let best = 0;
  let timeLeft = 30;
  let activeHole = -1;
  let running = false;
  let timer = null;
  let popTimer = null;

  try { best = Number(localStorage.getItem("mindbreak-mole-best")) || 0; }
  catch (error) { console.warn("MindBreak could not read the garden best score.", error); }
  bestLabel.textContent = best;

  const setMoleArt = (button, active) => {
    button.replaceChildren();
    if (!active) return;
    const image = document.createElement("img");
    image.alt = "";
    image.className = "mole-art";
    button.append(image);
    art.getImage("whack-a-mole", "mole").then((asset) => {
      if (asset && button.isConnected && button.classList.contains("is-active-mole")) image.src = asset.src;
    });
  };

  const render = () => {
    board.replaceChildren();
    buttons = Array.from({ length: 9 }, (_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `mole-hole${index === activeHole ? " is-active-mole" : ""}`;
      button.setAttribute("aria-label", index === activeHole ? `Garden visitor at hole ${index + 1}` : `Empty garden hole ${index + 1}`);
      if (index === activeHole) setMoleArt(button, true);
      button.addEventListener("click", () => catchMole(index));
      button.addEventListener("keydown", (event) => {
        if (index === activeHole && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          catchMole(index);
        }
      });
      board.append(button);
      return button;
    });
  };

  const showNextMole = () => {
    if (!running) return;
    let next = Math.floor(Math.random() * 9);
    if (next === activeHole) next = (next + 1 + Math.floor(Math.random() * 8)) % 9;
    activeHole = next;
    render();
    window.clearTimeout(popTimer);
    popTimer = window.setTimeout(() => {
      if (!running) return;
      activeHole = -1;
      render();
      window.setTimeout(showNextMole, 110);
    }, 720);
  };

  const end = () => {
    running = false;
    activeHole = -1;
    window.clearInterval(timer);
    window.clearTimeout(popTimer);
    timer = null;
    popTimer = null;
    status.textContent = `Time's up! You caught ${score} visitors. Fancy another round?`;
    document.querySelector("#mole-restart").textContent = "Play again";
    if (score > best) {
      best = score;
      bestLabel.textContent = best;
      try { localStorage.setItem("mindbreak-mole-best", String(best)); }
      catch (error) { console.warn("MindBreak could not save the garden best score.", error); }
    }
    render();
  };

  const catchMole = (index) => {
    if (!running || index !== activeHole) return;
    score += 1;
    scoreLabel.textContent = score;
    activeHole = -1;
    render();
    status.textContent = "Got one! Here comes another.";
    window.clearTimeout(popTimer);
    popTimer = window.setTimeout(showNextMole, 130);
  };

  const start = () => {
    window.clearInterval(timer);
    window.clearTimeout(popTimer);
    score = 0;
    timeLeft = 30;
    activeHole = -1;
    running = true;
    scoreLabel.textContent = "0";
    timeLabel.textContent = timeLeft;
    status.textContent = "Quick! Catch as many as you can.";
    document.querySelector("#mole-restart").textContent = "Restart";
    render();
    showNextMole();
    timer = window.setInterval(() => {
      timeLeft -= 1;
      timeLabel.textContent = timeLeft;
      if (timeLeft <= 0) end();
    }, 1000);
  };

  document.querySelector("#mole-restart").addEventListener("click", start);
  window.addEventListener("mindbreak:customization-change", render);
})();
