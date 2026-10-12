(() => {
  const board = document.querySelector("#memory-board");
  const status = document.querySelector("#memory-status");
  const movesLabel = document.querySelector("#memory-moves");
  const timerLabel = document.querySelector("#memory-timer");
  const pairsLabel = document.querySelector("#memory-pairs");
  const art = window.MindBreakAssets;
  const pairIds = ["sun", "moon", "flower", "star", "cloud", "heart", "spark", "song"];
  let deck = [];
  let flipped = [];
  let matched = new Set();
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let mismatchTimer = null;
  let locked = false;

  const updateTimer = () => {
    timerLabel.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const startTimer = () => {
    if (!timer) timer = window.setInterval(() => { seconds += 1; updateTimer(); }, 1000);
  };

  const render = () => {
    board.replaceChildren();
    deck.forEach((cardData, index) => {
      const card = document.createElement("button");
      const isMatched = matched.has(index);
      const isRevealed = flipped.includes(index);
      const pairLabel = cardData.pairId.charAt(0).toUpperCase() + cardData.pairId.slice(1);
      card.type = "button";
      card.className = `memory-card${isMatched ? " is-matched-card" : ""}${isRevealed || isMatched ? "" : " is-hidden-card"}`;
      card.textContent = "";
      card.disabled = locked || isMatched || isRevealed;
      card.setAttribute("aria-label", isMatched || isRevealed ? `Card ${index + 1}, ${pairLabel}${isMatched ? ", matched" : ""}` : `Card ${index + 1}, face down`);
      if (isMatched || isRevealed) {
        const face = document.createElement("span");
        face.className = "memory-face-art";
        card.append(face);
        const artworkId = cardData.pairId === "sun" ? art.getAssetId("memory-match", "cards") || cardData.artworkId : cardData.artworkId;
        art.getRoleAsset("memory-match", "cards", artworkId).then((image) => {
          if (!image || !card.isConnected || (!flipped.includes(index) && !matched.has(index))) return;
          const portrait = image.cloneNode();
          portrait.className = "game-character-image";
          portrait.alt = `${pairLabel} character artwork`;
          face.prepend(portrait);
        });
      } else {
        art.getImage("memory-match", "back").then((image) => {
          if (!image || !card.isConnected || card.classList.contains("is-hidden-card") === false) return;
          const portrait = image.cloneNode();
          portrait.className = "memory-back-image";
          portrait.alt = "Card back artwork";
          card.classList.add("has-back-image");
          card.append(portrait);
        });
      }
      card.addEventListener("click", () => reveal(index));
      board.append(card);
    });
  };

  const reveal = (index) => {
    if (locked || matched.has(index) || flipped.includes(index)) return;
    startTimer();
    flipped.push(index);
    render();
    if (flipped.length < 2) return;
    moves += 1;
    movesLabel.textContent = moves;
    const [first, second] = flipped;
    if (deck[first].pairId === deck[second].pairId) {
      matched.add(first);
      matched.add(second);
      flipped = [];
      pairsLabel.textContent = `${matched.size / 2} / ${pairIds.length}`;
      if (matched.size === deck.length) {
        window.clearInterval(timer);
        timer = null;
        status.textContent = `All matched in ${moves} moves and ${timerLabel.textContent}! Lovely memory.`;
      } else {
        status.textContent = "A match! Find another lovely pair.";
      }
      render();
      return;
    }
    locked = true;
    status.textContent = "Not a match this time. Keep those faces in mind!";
    mismatchTimer = window.setTimeout(() => {
      flipped = [];
      locked = false;
      render();
    }, 850);
  };

  const reset = () => {
    window.clearInterval(timer);
    window.clearTimeout(mismatchTimer);
    timer = null;
    mismatchTimer = null;
    const featuredId = art.getAssetId("memory-match", "cards") || art.assets[0].id;
    const faceAssets = [featuredId, ...art.assets.map((asset) => asset.id).filter((id) => id !== featuredId)].slice(0, pairIds.length);
    const artworkByPair = new Map(pairIds.map((pairId, index) => [pairId, faceAssets[index]]));
    deck = [...pairIds, ...pairIds].map((pairId) => ({ pairId, artworkId: artworkByPair.get(pairId) })).sort(() => Math.random() - 0.5);
    flipped = [];
    matched = new Set();
    moves = 0;
    seconds = 0;
    locked = false;
    movesLabel.textContent = "0";
    pairsLabel.textContent = `0 / ${pairIds.length}`;
    updateTimer();
    status.textContent = "Find all eight pairs. Flip two cards to begin!";
    render();
  };

  document.querySelector("#memory-restart").addEventListener("click", reset);
  window.addEventListener("mindbreak:customization-change", render);
  reset();
})();
