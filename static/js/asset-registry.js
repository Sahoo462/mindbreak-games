(() => {
  const packs = [
    { id: "anime", label: "Anime-inspired" },
    { id: "comic", label: "Comic heroes" },
    { id: "cartoon", label: "Cartoon" },
    { id: "fantasy", label: "Fantasy" },
    { id: "pixel", label: "Pixel art" },
    { id: "cozy", label: "Cute & cozy" },
  ];
  const assets = [
    { id: "anime-fox", name: "Ember Fox", pack: "anime", src: "/static/graphics/characters/ember-fox.svg" },
    { id: "comic-star", name: "Star Guardian", pack: "comic", src: "/static/graphics/characters/star-guardian.svg" },
    { id: "cartoon-cloud", name: "Cloud Pal", pack: "cartoon", src: "/static/graphics/characters/cloud-pal.svg" },
    { id: "fantasy-mage", name: "Moon Mage", pack: "fantasy", src: "/static/graphics/characters/moon-mage.svg" },
    { id: "pixel-bot", name: "Pixel Buddy", pack: "pixel", src: "/static/graphics/characters/pixel-buddy.svg" },
    { id: "cozy-bear", name: "Cozy Bear", pack: "cozy", src: "/static/graphics/characters/cozy-bear.svg" },
    { id: "pixel-owl", name: "Orbit Owl", pack: "pixel", src: "/static/graphics/characters/orbit-owl.svg" },
    { id: "cozy-bunny", name: "Moss Bunny", pack: "cozy", src: "/static/graphics/characters/moss-bunny.svg" },
  ];
  const games = {
    "tic-tac-toe": { label: "Tic-Tac-Toe", roles: [{ id: "playerX", label: "Player X" }, { id: "playerO", label: "Player O" }] },
    "connect-four": { label: "Connect Four", roles: [{ id: "red", label: "Red player" }, { id: "yellow", label: "Yellow player" }] },
    sudoku: { label: "Sudoku", roles: [{ id: "symbols", label: "Number symbols", optional: true }] },
    "space-invaders": { label: "Space Invaders", roles: [{ id: "player", label: "Player ship" }, { id: "enemy", label: "Invaders" }, { id: "projectile", label: "Projectiles" }] },
    snake: { label: "Snake", roles: [{ id: "head", label: "Snake head" }, { id: "body", label: "Snake body" }, { id: "food", label: "Food" }, { id: "background", label: "Background" }] },
    "memory-match": { label: "Memory Match", roles: [{ id: "cards", label: "Card characters" }, { id: "back", label: "Card backs" }] },
    "bubble-shooter": { label: "Bubble Shooter", roles: [{ id: "bubble", label: "Bubbles" }] },
    "endless-runner": { label: "Endless Runner", roles: [{ id: "player", label: "Runner" }, { id: "collectible", label: "Collectibles" }, { id: "obstacle", label: "Obstacles" }, { id: "background", label: "Background" }] },
    "2048": { label: "2048", roles: [{ id: "tile2", label: "2 tile" }, { id: "tile4", label: "4 tile" }, { id: "tileHigh", label: "Higher-value tiles" }] },
    breakout: { label: "Breakout", roles: [{ id: "paddle", label: "Paddle" }, { id: "ball", label: "Ball" }, { id: "brick", label: "Bricks" }] },
    "whack-a-mole": { label: "Whack-a-Mole", roles: [{ id: "mole", label: "Garden visitor" }] },
    "flappy-bird": { label: "Flappy Bird", roles: [{ id: "bird", label: "Flier" }, { id: "pipe", label: "Pipes" }, { id: "background", label: "Background" }] },
  };
  const availableGameRoles = Object.entries(games).flatMap(([gameId, game]) => game.roles.map((role) => `${gameId}/${role.id}`));
  assets.forEach((asset) => {
    asset.category = asset.pack;
    asset.roles = availableGameRoles;
  });
  const defaultSelections = Object.fromEntries(Object.entries(games).map(([game, value]) => [
    game,
    Object.fromEntries(value.roles.map((role, index) => [role.id, role.id === "symbols" ? "" : assets[(index + Object.keys(games).indexOf(game)) % assets.length].id])),
  ]));
  const storageKey = "mindbreak-customizations-v1";
  const dbName = "mindbreak-artwork";
  const dbStore = "uploads";
  const imageCache = new Map();
  const pendingImages = new Map();
  const unavailableAssets = new Set();
  let databasePromise;

  const openDatabase = () => {
    if (!("indexedDB" in window)) return Promise.reject(new Error("This browser does not provide local artwork storage."));
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(dbStore)) request.result.createObjectStore(dbStore, { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open the artwork library."));
      });
    }
    return databasePromise;
  };

  const withStore = async (mode, callback) => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(dbStore, mode);
      const store = transaction.objectStore(dbStore);
      let request;
      try { request = callback(store); } catch (error) { reject(error); return; }
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not access saved artwork."));
      } else {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Could not update saved artwork."));
        transaction.onabort = () => reject(transaction.error || new Error("Artwork storage was interrupted."));
      }
    });
  };

  const readState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch (error) {
      console.warn("MindBreak customization settings could not be read.", error);
      return {};
    }
  };

  let state = readState();
  const savedGames = state.games && typeof state.games === "object" && !Array.isArray(state.games) ? state.games : {};
  state.games = {};
  for (const [gameId, gameState] of Object.entries(savedGames)) {
    if (!games[gameId] || !gameState || typeof gameState !== "object" || Array.isArray(gameState)) continue;
    const savedSelections = gameState.selections && typeof gameState.selections === "object" && !Array.isArray(gameState.selections) ? gameState.selections : {};
    const selections = {};
    for (const [roleId, assetId] of Object.entries(savedSelections)) {
      const allowedRole = games[gameId].roles.some((role) => role.id === roleId);
      const allowedAsset = !assetId || assets.some((asset) => asset.id === assetId) || (typeof assetId === "string" && /^upload-[a-zA-Z0-9-]+$/.test(assetId));
      if (allowedRole && allowedAsset) selections[roleId] = assetId;
    }
    const cleanGame = { selections, symbolsEnabled: Boolean(gameState.symbolsEnabled) };
    if (["dreamscape", "pixel", "cosmic"].includes(gameState.look)) cleanGame.look = gameState.look;
    if (Object.keys(selections).length || cleanGame.look || cleanGame.symbolsEnabled) state.games[gameId] = cleanGame;
  }
  if (!["dreamscape", "pixel", "cosmic"].includes(state.globalTheme)) {
    let legacyTheme = "dreamscape";
    try { legacyTheme = localStorage.getItem("mindbreak-look") || "dreamscape"; }
    catch (error) { console.warn("MindBreak could not read the saved theme.", error); }
    state.globalTheme = ["dreamscape", "pixel", "cosmic"].includes(legacyTheme) ? legacyTheme : "dreamscape";
  }

  const saveState = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      localStorage.setItem("mindbreak-look", state.globalTheme);
    } catch (error) {
      console.warn("MindBreak customization settings could not be saved.", error);
      throw new Error("Could not save your settings. Check available browser storage.");
    }
    window.dispatchEvent(new CustomEvent("mindbreak:customization-change"));
  };

  const isKnown = (assetId) => assets.some((asset) => asset.id === assetId);
  const getConfig = (gameId) => {
    const gameState = state.games[gameId] || {};
    const validTheme = ["dreamscape", "pixel", "cosmic"].includes(gameState.look) ? gameState.look : state.globalTheme;
    const selections = { ...defaultSelections[gameId], ...(gameState.selections || {}) };
    for (const role of games[gameId]?.roles || []) {
      const value = selections[role.id];
      if (value && !isKnown(value) && !String(value).startsWith("upload-")) selections[role.id] = defaultSelections[gameId]?.[role.id] || "";
    }
    if (!["dreamscape", "pixel", "cosmic"].includes(state.globalTheme)) state.globalTheme = "dreamscape";
    if (games[gameId]) document.documentElement.dataset.look = validTheme;
    return { look: validTheme, lookOverride: gameState.look || "", selections, symbolsEnabled: Boolean(gameState.symbolsEnabled) };
  };

  const getAssetId = (gameId, role) => {
    if (!games[gameId]?.roles.some((candidate) => candidate.id === role)) return "";
    return getConfig(gameId).selections[role] || "";
  };

  const getAsset = (assetId) => {
    if (!assetId || unavailableAssets.has(assetId)) return Promise.resolve(null);
    if (imageCache.has(assetId)) return Promise.resolve(imageCache.get(assetId));
    if (pendingImages.has(assetId)) return pendingImages.get(assetId);
    const promise = (async () => {
      let source;
      if (isKnown(assetId)) source = assets.find((asset) => asset.id === assetId).src;
      else if (String(assetId).startsWith("upload-")) {
        let upload;
        try { upload = await withStore("readonly", (store) => store.get(assetId)); }
        catch (error) {
          unavailableAssets.add(assetId);
          console.warn("MindBreak could not load an uploaded character image.", error);
          return null;
        }
        if (!upload?.blob) {
          unavailableAssets.add(assetId);
          return null;
        }
        source = URL.createObjectURL(upload.blob);
      } else {
        return null;
      }
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => { imageCache.set(assetId, image); resolve(image); };
        image.onerror = () => {
          if (source.startsWith("blob:")) URL.revokeObjectURL(source);
          unavailableAssets.add(assetId);
          resolve(null);
        };
        image.src = source;
      });
    })();
    pendingImages.set(assetId, promise);
    return promise.finally(() => pendingImages.delete(assetId));
  };

  const getRoleAsset = async (gameId, role, assetId = getAssetId(gameId, role)) => {
    const id = assetId;
    if (!id) return null;
    let image;
    try { image = await getAsset(id); } catch (error) { console.warn("MindBreak artwork could not be loaded.", error); }
    if (image) return image;
    const fallback = defaultSelections[gameId]?.[role];
    if (!fallback || fallback === id) return null;
    try { return await getAsset(fallback); } catch (error) {
      console.warn("MindBreak default artwork could not be loaded.", error);
      return null;
    }
  };

  const getImage = (gameId, role) => getRoleAsset(gameId, role);

  const draw = (context, gameId, role, x, y, width, height, fallback) => {
    const id = getAssetId(gameId, role);
    const defaultId = defaultSelections[gameId]?.[role];
    const image = imageCache.get(id) || imageCache.get(defaultId);
    if (image && image.complete && image.naturalWidth) {
      context.drawImage(image, x, y, width, height);
      return true;
    }
    const request = (assetId) => {
      if (!assetId || unavailableAssets.has(assetId) || pendingImages.has(assetId) || imageCache.has(assetId)) return;
      getAsset(assetId).then((loaded) => {
        if (loaded) window.dispatchEvent(new CustomEvent("mindbreak:asset-loaded", { detail: { gameId, role } }));
        else if (assetId !== defaultId) request(defaultId);
      }).catch((error) => {
        console.warn("MindBreak canvas artwork could not be loaded.", error);
        if (assetId !== defaultId) request(defaultId);
      });
    };
    request(id && !unavailableAssets.has(id) ? id : defaultId);
    if (fallback) fallback();
    return false;
  };

  const setSelection = (gameId, role, assetId) => {
    if (!games[gameId]?.roles.some((candidate) => candidate.id === role)) throw new Error("That game role is not supported.");
    if (assetId && !isKnown(assetId) && !String(assetId).startsWith("upload-")) throw new Error("That character artwork is unavailable.");
    state.games[gameId] ||= {};
    state.games[gameId].selections ||= {};
    state.games[gameId].selections[role] = assetId;
    saveState();
  };

  const setLook = (gameId, look) => {
    state.games[gameId] ||= {};
    if (!look) delete state.games[gameId].look;
    else {
      if (!["dreamscape", "pixel", "cosmic"].includes(look)) throw new Error("Choose one of the available visual themes.");
      state.games[gameId].look = look;
    }
    document.documentElement.dataset.look = state.games[gameId].look || state.globalTheme;
    saveState();
  };

  const setGlobalTheme = (look) => {
    if (!["dreamscape", "pixel", "cosmic"].includes(look)) throw new Error("Choose one of the available visual themes.");
    state.globalTheme = look;
    document.documentElement.dataset.look = look;
    saveState();
  };

  const setSymbolsEnabled = (gameId, enabled) => {
    state.games[gameId] ||= {};
    state.games[gameId].symbolsEnabled = Boolean(enabled);
    saveState();
  };

  const resetGame = (gameId) => {
    delete state.games[gameId];
    saveState();
  };

  const resetAll = () => {
    state = { globalTheme: "dreamscape", games: {} };
    saveState();
  };

  const getUploads = () => withStore("readonly", (store) => store.getAll());
  const saveUpload = async (file) => {
    const supported = ["image/png", "image/jpeg", "image/webp"];
    const extensionSupported = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!supported.includes(file.type) || !extensionSupported) throw new Error("Please choose a PNG, JPEG, or WebP image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("That image is larger than 5 MB. Choose a smaller image.");
    if (!file.size) throw new Error("That image file is empty.");
    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise((resolve, reject) => {
        const preview = new Image();
        preview.onload = () => resolve();
        preview.onerror = () => reject(new Error("This image could not be opened. Try another PNG, JPEG, or WebP file."));
        preview.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    const id = `upload-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    await withStore("readwrite", (store) => store.put({
      id, name: file.name.slice(0, 120), type: file.type, category: "user-upload",
      roles: availableGameRoles, blob: file.slice(0, file.size, file.type), created: Date.now(),
    }));
    return id;
  };

  const removeUpload = async (assetId) => {
    await withStore("readwrite", (store) => store.delete(assetId));
    const cached = imageCache.get(assetId);
    if (cached?.src.startsWith("blob:")) URL.revokeObjectURL(cached.src);
    imageCache.delete(assetId);
    unavailableAssets.delete(assetId);
    const gameEntries = Object.values(state.games);
    for (const game of gameEntries) {
      if (!game.selections) continue;
      for (const [role, selected] of Object.entries(game.selections)) if (selected === assetId) delete game.selections[role];
    }
    saveState();
  };

  const currentGame = document.querySelector("[data-mindbreak-game]")?.dataset.mindbreakGame;
  if (currentGame) getConfig(currentGame);

  window.MindBreakAssets = {
    assets, packs, games, defaultSelections, getConfig, getAssetId, getAsset, getRoleAsset, getImage, draw,
    setSelection, setLook, setGlobalTheme, getGlobalTheme: () => state.globalTheme,
    setSymbolsEnabled, resetGame, resetAll,
    getUploads, saveUpload, removeUpload, ready: openDatabase().catch(() => null),
  };
})();
