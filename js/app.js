(() => {
  const STORAGE_KEY = "xinixapas.layout.v2";
  const RACKS = [
    { key: "spanish1", title: "Rack superior", subtitle: "Caja principal - bandeja alta", cols: 14, rows: 8 },
    { key: "spanish2", title: "Rack central", subtitle: "Caja principal - bandeja baja", cols: 14, rows: 8 },
    { key: "international", title: "Rack internacional", subtitle: "Bandeja independiente", cols: 14, rows: 8 }
  ];

  const state = {
    layout: {},
    filters: { query: "", country: "all", year: "all" },
    editMode: false,
    drag: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    normalizeData();
    state.layout = loadLayout();
    populateFilters();
    renderStats();
    renderRacks();
    bindEvents();
    applyFilters();
  }

  function cacheElements() {
    els.rackStack = document.getElementById("rack-stack");
    els.search = document.getElementById("search-input");
    els.country = document.getElementById("country-filter");
    els.year = document.getElementById("year-filter");
    els.edit = document.getElementById("edit-mode");
    els.heroEdit = document.getElementById("enable-edit-hero");
    els.reset = document.getElementById("reset-layout");
    els.export = document.getElementById("export-layout");
    els.import = document.getElementById("import-layout");
    els.dialog = document.getElementById("cap-dialog");
    els.closeDialog = document.getElementById("dialog-close");
    els.toast = document.getElementById("toast");
  }

  function normalizeData() {
    RACKS.forEach((rack) => {
      const collection = COLLECTIONS[rack.key];
      collection.title = fixText(collection.title);
      collection.subtitle = fixText(collection.subtitle);
      collection.caps = collection.caps.map((cap, index) => ({
        ...cap,
        id: String(cap.id),
        name: fixText(cap.name),
        brand: fixText(cap.brand),
        country: fixText(cap.country),
        description: fixText(cap.description || cap.desc || "Chapa de la coleccion personal."),
        year: cap.year || "",
        _rack: rack.key,
        _originalIndex: index
      }));
    });
  }

  function fixText(value) {
    if (typeof value !== "string") return value;
    if (!/[ÃÂÅâ]/.test(value)) return value;
    try {
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  }

  function allCaps() {
    return RACKS.flatMap((rack) => COLLECTIONS[rack.key].caps);
  }

  function capsById() {
    return new Map(allCaps().map((cap) => [cap.id, cap]));
  }

  function loadLayout() {
    const defaults = buildDefaultLayout();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const ids = new Set(allCaps().map((cap) => cap.id));
      RACKS.forEach((rack) => {
        const size = rack.cols * rack.rows;
        const incoming = Array.isArray(stored[rack.key]) ? stored[rack.key] : defaults[rack.key];
        defaults[rack.key] = Array.from({ length: size }, (_, index) => {
          const id = incoming[index] || null;
          return ids.has(id) ? id : null;
        });
      });
    } catch {
      return defaults;
    }
    return defaults;
  }

  function buildDefaultLayout() {
    return RACKS.reduce((layout, rack) => {
      const size = rack.cols * rack.rows;
      const ids = COLLECTIONS[rack.key].caps.map((cap) => cap.id);
      layout[rack.key] = Array.from({ length: size }, (_, index) => ids[index] || null);
      return layout;
    }, {});
  }

  function saveLayout(message = "Layout guardado") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layout));
    showToast(message);
  }

  function populateFilters() {
    const countries = uniqueSorted(allCaps().map((cap) => cap.country).filter(Boolean));
    const years = uniqueSorted(allCaps().map((cap) => cap.year).filter(Boolean), (a, b) => Number(b) - Number(a));

    countries.forEach((country) => els.country.append(new Option(country, country)));
    years.forEach((year) => els.year.append(new Option(year, year)));
  }

  function uniqueSorted(values, sorter) {
    return [...new Set(values)].sort(sorter || ((a, b) => String(a).localeCompare(String(b), "es")));
  }

  function renderStats() {
    const caps = allCaps();
    document.getElementById("stat-total").textContent = caps.length;
    document.getElementById("stat-countries").textContent = new Set(caps.map((cap) => cap.country)).size;
    document.getElementById("stat-years").textContent = new Set(caps.map((cap) => cap.year).filter(Boolean)).size;
  }

  function renderRacks() {
    const map = capsById();
    els.rackStack.innerHTML = "";

    RACKS.forEach((rack) => {
      const section = document.createElement("article");
      section.className = "rack";
      section.dataset.rack = rack.key;

      const header = document.createElement("header");
      header.className = "rack-header";
      header.innerHTML = `
        <div>
          <h3 class="rack-title">${rack.title}</h3>
          <p class="rack-meta">${rack.subtitle} - ${rack.cols} x ${rack.rows} posiciones</p>
        </div>
        <span class="rack-count">${filledSlots(rack.key)} / ${rack.cols * rack.rows}</span>
      `;

      const board = document.createElement("div");
      board.className = "rack-board";

      const grid = document.createElement("div");
      grid.className = "rack-grid";
      grid.style.setProperty("--cols", rack.cols);

      state.layout[rack.key].forEach((capId, index) => {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.dataset.rack = rack.key;
        slot.dataset.index = index;
        slot.setAttribute("aria-label", `Posicion ${index + 1} de ${rack.title}`);

        if (capId && map.has(capId)) {
          slot.append(createCapButton(map.get(capId), rack.key, index));
        }

        grid.append(slot);
      });

      board.append(grid);
      section.append(header, board);
      els.rackStack.append(section);
    });
  }

  function createCapButton(cap, rackKey, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cap";
    button.dataset.id = cap.id;
    button.dataset.country = cap.country;
    button.dataset.year = cap.year;
    button.dataset.search = `${cap.name} ${cap.brand} ${cap.country} ${cap.year} ${cap.description}`.toLowerCase();
    button.dataset.short = shortLabel(cap.name);
    button.style.setProperty("--cap-color", cap.color || "#777");
    button.style.setProperty("--cap-light", lighten(cap.color || "#777", 46));
    button.style.setProperty("--cap-text", cap.textColor || "#fff");
    button.setAttribute("aria-label", `${cap.name}, ${cap.brand}, ${cap.country}`);

    button.addEventListener("pointerdown", (event) => startDrag(event, cap, rackKey, index));
    button.addEventListener("click", (event) => {
      if (button.dataset.dragged === "true") {
        event.preventDefault();
        button.dataset.dragged = "false";
        return;
      }
      openDialog(cap, rackKey, index);
    });

    return button;
  }

  function shortLabel(name) {
    const clean = String(name).trim();
    if (clean.length <= 10) return clean;
    const words = clean.split(/\s+/);
    if (words.length > 1 && words[0].length <= 9) return words[0];
    return `${clean.slice(0, 8)}.`;
  }

  function filledSlots(rackKey) {
    return state.layout[rackKey].filter(Boolean).length;
  }

  function bindEvents() {
    els.search.addEventListener("input", () => {
      state.filters.query = els.search.value.trim().toLowerCase();
      applyFilters();
    });
    els.country.addEventListener("change", () => {
      state.filters.country = els.country.value;
      applyFilters();
    });
    els.year.addEventListener("change", () => {
      state.filters.year = els.year.value;
      applyFilters();
    });
    els.edit.addEventListener("change", () => setEditMode(els.edit.checked));
    els.heroEdit.addEventListener("click", () => {
      setEditMode(true);
      document.getElementById("racks").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.reset.addEventListener("click", resetLayout);
    els.export.addEventListener("click", exportLayout);
    els.import.addEventListener("change", importLayout);
    els.closeDialog.addEventListener("click", () => els.dialog.close());
    els.dialog.addEventListener("click", (event) => {
      const rect = els.dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) els.dialog.close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.drag) cancelDrag();
    });
  }

  function setEditMode(enabled) {
    state.editMode = enabled;
    els.edit.checked = enabled;
    document.body.classList.toggle("organizing", enabled);
    showToast(enabled ? "Modo organizar activado" : "Modo organizar desactivado");
  }

  function applyFilters() {
    const active = state.filters.query || state.filters.country !== "all" || state.filters.year !== "all";
    let matches = 0;

    document.querySelectorAll(".cap").forEach((capEl) => {
      const match =
        (!state.filters.query || capEl.dataset.search.includes(state.filters.query)) &&
        (state.filters.country === "all" || capEl.dataset.country === state.filters.country) &&
        (state.filters.year === "all" || capEl.dataset.year === state.filters.year);

      capEl.classList.toggle("dimmed", active && !match);
      capEl.classList.toggle("matched", active && match);
      if (match) matches += 1;
    });

    if (active) showToast(`${matches} chapa${matches === 1 ? "" : "s"} resaltada${matches === 1 ? "" : "s"}`);
  }

  function startDrag(event, cap, rackKey, index) {
    if (!state.editMode || event.button !== 0) return;

    const source = event.currentTarget;
    const start = { x: event.clientX, y: event.clientY };

    state.drag = {
      cap,
      source,
      fromRack: rackKey,
      fromIndex: index,
      start,
      active: false,
      ghost: null
    };

    event.preventDefault();
    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", endDrag, { once: true });
    document.addEventListener("pointercancel", cancelDrag, { once: true });
  }

  function moveDrag(event) {
    if (!state.drag) return;
    const distance = Math.hypot(event.clientX - state.drag.start.x, event.clientY - state.drag.start.y);
    if (!state.drag.active && distance < 8) return;

    if (!state.drag.active) {
      state.drag.active = true;
      state.drag.source.dataset.dragged = "true";
      state.drag.source.style.opacity = "0.24";
      state.drag.ghost = state.drag.source.cloneNode(true);
      state.drag.ghost.className = "cap drag-ghost";
      document.body.append(state.drag.ghost);
    }

    state.drag.ghost.style.left = `${event.clientX}px`;
    state.drag.ghost.style.top = `${event.clientY}px`;

    document.querySelectorAll(".slot.drop-target").forEach((slot) => slot.classList.remove("drop-target"));
    const slot = slotFromPoint(event.clientX, event.clientY);
    if (slot) slot.classList.add("drop-target");
  }

  function endDrag(event) {
    if (!state.drag) return;
    const drag = state.drag;
    const target = slotFromPoint(event.clientX, event.clientY);

    cleanupDrag();

    if (!drag.active || !target) return;

    const toRack = target.dataset.rack;
    const toIndex = Number(target.dataset.index);
    if (toRack === drag.fromRack && toIndex === drag.fromIndex) return;

    const movingId = state.layout[drag.fromRack][drag.fromIndex];
    const targetId = state.layout[toRack][toIndex];
    state.layout[toRack][toIndex] = movingId;
    state.layout[drag.fromRack][drag.fromIndex] = targetId || null;
    saveLayout("Nueva posicion guardada");
    renderRacks();
    applyFilters();
  }

  function cancelDrag() {
    cleanupDrag();
  }

  function cleanupDrag() {
    if (!state.drag) return;
    state.drag.source.style.opacity = "";
    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", cancelDrag);
    if (state.drag.ghost) state.drag.ghost.remove();
    document.querySelectorAll(".slot.drop-target").forEach((slot) => slot.classList.remove("drop-target"));
    state.drag = null;
  }

  function slotFromPoint(x, y) {
    const previous = state.drag?.ghost?.style.pointerEvents;
    if (state.drag?.ghost) state.drag.ghost.style.pointerEvents = "none";
    const el = document.elementFromPoint(x, y);
    if (state.drag?.ghost) state.drag.ghost.style.pointerEvents = previous || "none";
    return el?.closest?.(".slot") || null;
  }

  function openDialog(cap, rackKey, index) {
    document.getElementById("dialog-title").textContent = cap.name;
    document.getElementById("dialog-brand").textContent = cap.brand || "-";
    document.getElementById("dialog-country").textContent = cap.country || "-";
    document.getElementById("dialog-year").textContent = cap.year || "Sin ano";
    document.getElementById("dialog-position").textContent = `${rackTitle(rackKey)}, hueco ${index + 1}`;
    document.getElementById("dialog-note").textContent = cap.description || "Sin nota adicional.";
    document.getElementById("dialog-rack").textContent = rackTitle(rackKey);

    const capArt = document.getElementById("dialog-cap");
    capArt.dataset.label = shortLabel(cap.name);
    capArt.style.setProperty("--cap-color", cap.color || "#777");
    capArt.style.setProperty("--cap-light", lighten(cap.color || "#777", 48));
    capArt.style.setProperty("--cap-text", cap.textColor || "#fff");

    els.dialog.showModal();
  }

  function rackTitle(rackKey) {
    return RACKS.find((rack) => rack.key === rackKey)?.title || rackKey;
  }

  function resetLayout() {
    state.layout = buildDefaultLayout();
    saveLayout("Orden original restaurado");
    renderRacks();
    applyFilters();
  }

  function exportLayout() {
    const payload = {
      name: "xinixapas-layout",
      version: 2,
      exportedAt: new Date().toISOString(),
      layout: state.layout
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xinixapas-layout.json";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Layout exportado");
  }

  function importLayout(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = parsed.layout || parsed;
        const defaults = buildDefaultLayout();
        RACKS.forEach((rack) => {
          if (!Array.isArray(incoming[rack.key])) throw new Error("Layout incompleto");
          defaults[rack.key] = incoming[rack.key].slice(0, rack.cols * rack.rows);
        });
        state.layout = defaults;
        saveLayout("Layout importado");
        renderRacks();
        applyFilters();
      } catch {
        showToast("No se pudo importar ese archivo");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function lighten(hex, amount) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return hex;
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 255) + amount);
    const b = Math.min(255, (num & 255) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1700);
  }
})();
