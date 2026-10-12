(() => {
  const root = document.documentElement;
  const search = document.querySelector("#game-search");
  const cards = [...document.querySelectorAll(".game-card")];
  const filters = [...document.querySelectorAll(".filter-chip")];
  const count = document.querySelector("#results-count");
  const emptyState = document.querySelector("#empty-state");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeIcon = document.querySelector(".theme-icon");
  const themeLabel = document.querySelector(".theme-label");
  const themeChoices = [...document.querySelectorAll(".theme-option")];
  const characterChoices = [...document.querySelectorAll(".character-option")];
  const previewCharacters = [...document.querySelectorAll("[data-preview-character]")];
  let activeCategory = "All";

  const readPreference = (key, fallback) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      console.warn("MindBreak could not read a saved preference.", error);
      return fallback;
    }
  };

  const savePreference = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("MindBreak could not save a preference.", error);
    }
  };

  const setMode = (mode, persist = false) => {
    const isDark = mode === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    themeIcon.textContent = isDark ? "☀" : "☾";
    themeLabel.textContent = isDark ? "Day mode" : "Night mode";
    themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    if (persist) savePreference("mindbreak-mode", isDark ? "dark" : "light");
  };

  if (themeToggle) {
    setMode(readPreference("mindbreak-mode", "light"));
    themeToggle.addEventListener("click", () => {
      setMode(root.dataset.theme === "dark" ? "light" : "dark", true);
    });
  }

  const applyFilters = () => {
    if (!search) return;
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const matchesText = card.dataset.name.includes(query);
      const matchesCategory = activeCategory === "All" || card.dataset.category === activeCategory;
      const show = matchesText && matchesCategory;
      card.hidden = !show;
      if (show) visible += 1;
    });
    count.textContent = `${visible} ${visible === 1 ? "little escape" : "little escapes"}`;
    emptyState.hidden = visible !== 0;
  };

  if (search) search.addEventListener("input", applyFilters);
  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      activeCategory = filter.dataset.category;
      filters.forEach((choice) => {
        const selected = choice === filter;
        choice.classList.toggle("is-active", selected);
        choice.setAttribute("aria-pressed", String(selected));
      });
      applyFilters();
    });
  });

  const clearSearch = document.querySelector(".reset-search");
  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      search.value = "";
      activeCategory = "All";
      filters.forEach((filter) => {
        const selected = filter.dataset.category === "All";
        filter.classList.toggle("is-active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      });
      applyFilters();
      search.focus();
    });
  }

  const setLook = (look, persist = false) => {
    const validLooks = ["dreamscape", "pixel", "cosmic"];
    const selectedLook = validLooks.includes(look) ? look : "dreamscape";
    root.dataset.look = selectedLook;
    themeChoices.forEach((choice) => {
      const selected = choice.dataset.look === selectedLook;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    if (persist) {
      savePreference("mindbreak-look", selectedLook);
      if (window.MindBreakAssets) {
        try { window.MindBreakAssets.setGlobalTheme(selectedLook); }
        catch (error) { console.warn("MindBreak could not sync the selected game theme.", error); }
      }
    }
  };

  const characterPreviews = {
    sun: { src: "/static/graphics/characters/cloud-pal.svg", label: "Cloud Pal" },
    moon: { src: "/static/graphics/characters/moon-mage.svg", label: "Moon Mage" },
    star: { src: "/static/graphics/characters/star-guardian.svg", label: "Star Guardian" },
    flower: { src: "/static/graphics/characters/moss-bunny.svg", label: "Moss Bunny" },
  };
  const setCharacter = (character, persist = false) => {
    const selectedCharacter = characterPreviews[character] ? character : "sun";
    previewCharacters.forEach((preview) => {
      const artwork = document.createElement("img");
      artwork.src = characterPreviews[selectedCharacter].src;
      artwork.alt = characterPreviews[selectedCharacter].label;
      artwork.className = "preview-artwork";
      preview.replaceChildren(artwork);
      preview.className = `preview-character character-${selectedCharacter}`;
    });
    characterChoices.forEach((choice) => {
      const selected = choice.dataset.character === selectedCharacter;
      choice.classList.toggle("is-selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    if (persist) savePreference("mindbreak-character", selectedCharacter);
  };

  if (themeChoices.length) {
    setLook(readPreference("mindbreak-look", "dreamscape"));
    themeChoices.forEach((choice) => {
      choice.addEventListener("click", () => setLook(choice.dataset.look, true));
    });
  }
  if (characterChoices.length) {
    setCharacter(readPreference("mindbreak-character", "sun"));
    characterChoices.forEach((choice) => {
      choice.addEventListener("click", () => setCharacter(choice.dataset.character, true));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && search && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });
})();
