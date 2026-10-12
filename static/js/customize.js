(() => {
  const api = window.MindBreakAssets;
  const gameSelect = document.querySelector("#custom-game-select");
  const lookSelect = document.querySelector("#custom-look-select");
  const globalLookSelect = document.querySelector("#custom-global-look-select");
  const roleList = document.querySelector("#custom-role-list");
  const uploadsList = document.querySelector("#uploaded-assets");
  const uploadInput = document.querySelector("#character-upload");
  const uploadMessage = document.querySelector("#upload-message");
  const saveStatus = document.querySelector("#custom-save-status");
  const lookLabels = { dreamscape: "Dreamscape", pixel: "Pixel grove", cosmic: "Cosmic pop" };
  const queryGame = new URLSearchParams(window.location.search).get("game");
  if (api.games[queryGame]) gameSelect.value = queryGame;

  const setStatus = (message, isError = false) => {
    saveStatus.textContent = message;
    saveStatus.classList.toggle("has-error", isError);
  };

  const makeImage = async (assetId, alt) => {
    const image = document.createElement("img");
    image.alt = alt;
    image.loading = "lazy";
    image.className = "role-preview-image";
    const loaded = await api.getAsset(assetId);
    if (loaded) image.src = loaded.src;
    else image.alt = `${alt} preview unavailable`;
    return image;
  };

  const choicesFor = (uploads) => {
    const choiceList = [...api.assets.map((asset) => ({ id: asset.id, label: asset.name, group: api.packs.find((pack) => pack.id === asset.pack)?.label || "Character packs" })),
      ...uploads.map((upload) => ({ id: upload.id, label: upload.name, group: "Your uploads" }))];
    return choiceList;
  };

  const renderRoles = async () => {
    const gameId = gameSelect.value;
    const game = api.games[gameId];
    const uploads = await api.getUploads().catch((error) => {
      uploadMessage.textContent = `Your local artwork library is unavailable: ${error.message}`;
      return [];
    });
    const choices = choicesFor(uploads);
    const config = api.getConfig(gameId);
    lookSelect.value = config.lookOverride;
    roleList.replaceChildren();
    for (const role of game.roles) {
      const card = document.createElement("article");
      card.className = "custom-role-card";
      const preview = document.createElement("div");
      preview.className = "role-preview";
      const selectedId = config.selections[role.id] || "";
      const selectedAsset = choices.find((choice) => choice.id === selectedId) || choices[0];
      if (role.id === "symbols") {
        const symbolSetting = document.createElement("label");
        symbolSetting.className = "symbol-setting";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = config.symbolsEnabled;
        checkbox.addEventListener("change", () => {
          try {
            api.setSymbolsEnabled(gameId, checkbox.checked);
            setStatus(checkbox.checked ? "Sudoku symbol display is on." : "Sudoku numbers are restored.");
          } catch (error) { setStatus(error.message, true); }
        });
        symbolSetting.append(checkbox, document.createTextNode("Use a decorative symbol set instead of digits"));
        card.append(symbolSetting);
        preview.textContent = "△　□　◇　☆　○　⬡　✚　≋　✿";
        const note = document.createElement("p");
        note.className = "symbol-note";
        note.textContent = "The puzzle still stores and checks its original numbers.";
        card.append(preview, note);
        roleList.append(card);
        continue;
      } else if (selectedAsset) {
        preview.append(await makeImage(selectedAsset.id, selectedAsset.label));
      }
      const controls = document.createElement("div");
      controls.className = "role-controls";
      const label = document.createElement("label");
      label.className = "role-label";
      label.textContent = role.label;
      const select = document.createElement("select");
      select.setAttribute("aria-label", `${role.label} artwork`);
      for (const groupName of [...new Set(choices.map((choice) => choice.group))]) {
        const group = document.createElement("optgroup");
        group.label = groupName;
        for (const choice of choices.filter((item) => item.group === groupName)) {
          const option = document.createElement("option");
          option.value = choice.id;
          option.textContent = choice.label;
          group.append(option);
        }
        select.append(group);
      }
      select.value = choices.some((choice) => choice.id === selectedId) ? selectedId : choices[0]?.id || "";
      select.addEventListener("change", async () => {
        try {
          const playerGame = ["tic-tac-toe", "connect-four"].includes(gameId);
          const otherRole = game.roles.find((candidate) => candidate.id !== role.id);
          if (playerGame && otherRole && select.value && api.getAssetId(gameId, otherRole.id) === select.value) {
            select.value = api.getAssetId(gameId, role.id);
            setStatus("Choose a different character for each player.", true);
            return;
          }
          api.setSelection(gameId, role.id, select.value);
          const chosen = choices.find((item) => item.id === select.value);
          preview.replaceChildren();
          if (chosen) preview.append(await makeImage(chosen.id, chosen.label));
          setStatus(`${role.label} artwork saved for ${game.label}.`);
        } catch (error) {
          setStatus(error.message, true);
        }
      });
      controls.append(label, select);
      card.append(preview, controls);
      roleList.append(card);
    }
    renderUploads(uploads);
  };

  const renderUploads = (uploads) => {
    uploadsList.replaceChildren();
    if (!uploads.length) {
      const empty = document.createElement("p");
      empty.className = "uploaded-empty";
      empty.textContent = "Your uploaded artwork will appear here.";
      uploadsList.append(empty);
      return;
    }
    const availableRole = api.games[gameSelect.value].roles.find((role) => role.id !== "symbols");
    for (const upload of uploads) {
      const card = document.createElement("article");
      card.className = "uploaded-card";
      const preview = document.createElement("div");
      preview.className = "uploaded-preview";
      api.getAsset(upload.id).then((image) => { if (image) preview.append(image); });
      const name = document.createElement("span");
      name.textContent = upload.name;
      const assign = document.createElement("button");
      assign.type = "button";
      assign.className = "game-button";
      assign.textContent = availableRole ? "Use in this game" : "No character-art role";
      assign.disabled = !availableRole;
      assign.addEventListener("click", async () => {
        const role = availableRole;
        if (!role) return;
        const select = roleList.querySelector(`[aria-label="${CSS.escape(role.label)} artwork"]`);
        if (select) {
          select.value = upload.id;
          select.dispatchEvent(new Event("change"));
          setStatus(`${upload.name} assigned to ${role.label}.`);
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-upload";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${upload.name}`);
      remove.addEventListener("click", async () => {
        try {
          await api.removeUpload(upload.id);
          setStatus(`${upload.name} removed. Any game using it now uses default artwork.`);
          await renderRoles();
        } catch (error) {
          uploadMessage.textContent = error.message;
        }
      });
      card.append(preview, name, assign, remove);
      uploadsList.append(card);
    }
  };

  uploadInput.addEventListener("change", async () => {
    const files = [...uploadInput.files];
    const messages = [];
    for (const file of files) {
      try {
        await api.saveUpload(file);
        messages.push(`${file.name}: uploaded successfully.`);
      } catch (error) {
        messages.push(`${file.name}: ${error.message}`);
      }
    }
    uploadMessage.textContent = messages.join(" ");
    uploadInput.value = "";
    await renderRoles();
  });

  gameSelect.addEventListener("change", renderRoles);
  globalLookSelect.value = api.getGlobalTheme();
  globalLookSelect.addEventListener("change", () => {
    try {
      api.setGlobalTheme(globalLookSelect.value);
      setStatus(`${lookLabels[globalLookSelect.value]} is now your global theme.`);
    } catch (error) { setStatus(error.message, true); }
  });
  lookSelect.addEventListener("change", () => {
    try {
      api.setLook(gameSelect.value, lookSelect.value);
      setStatus(lookSelect.value ? `${lookLabels[lookSelect.value]} saved for ${api.games[gameSelect.value].label}.` : `${api.games[gameSelect.value].label} now uses your global theme.`);
    } catch (error) { setStatus(error.message, true); }
  });
  document.querySelector("#custom-reset-game").addEventListener("click", async () => {
    try {
      api.resetGame(gameSelect.value);
      setStatus(`Artwork for ${api.games[gameSelect.value].label} has been reset.`);
      await renderRoles();
    } catch (error) { setStatus(error.message, true); }
  });
  document.querySelector("#custom-reset-all").addEventListener("click", async () => {
    try {
      api.resetAll();
      globalLookSelect.value = api.getGlobalTheme();
      setStatus("All game artwork and theme overrides have been reset. Uploaded files remain in your library.");
      await renderRoles();
    } catch (error) { setStatus(error.message, true); }
  });

  api.ready.then(renderRoles).catch((error) => {
    uploadMessage.textContent = `Local artwork storage is unavailable: ${error.message}`;
    renderRoles();
  });
})();
