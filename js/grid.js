/* ============================================================
   grid.js — Render cap grids (14 × 8 = 112 per collection)
   ============================================================ */

const Grid = (() => {

  const COLS = 14;
  const ROWS = 8;

  /* ── Render a collection into a container ──────────────── */
  function render(containerId, collectionKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const collection = COLLECTIONS[collectionKey];
    if (!collection) return;

    container.innerHTML = '';

    const caps = collection.caps;
    const total = Math.min(caps.length, COLS * ROWS);

    for (let i = 0; i < total; i++) {
      const cap  = caps[i];
      const cell = _createCell(cap, collectionKey);
      container.appendChild(cell);
    }

    // Fill remaining empty spots if < 112
    for (let i = total; i < COLS * ROWS; i++) {
      const empty = document.createElement('div');
      empty.className = 'cap-cell cap-empty';
      empty.style.cssText = 'opacity:0.04; cursor:default;';
      const face = document.createElement('div');
      face.className = 'cap-face';
      face.style.background = '#222';
      empty.appendChild(face);
      container.appendChild(empty);
    }
  }

  /* ── Create a single cap cell DOM element ──────────────── */
  function _createCell(cap, collectionKey) {
    const cell = document.createElement('div');
    cell.className = 'cap-cell';
    cell.dataset.id  = cap.id;
    cell.dataset.country = cap.country;
    cell.dataset.collection = collectionKey;

    // Outer corrugation ring
    const rim = document.createElement('div');
    rim.className = 'cap-rim-outer';
    cell.appendChild(rim);

    // Face (the coloured disk)
    const face = document.createElement('div');
    face.className = 'cap-face';
    face.style.backgroundColor = cap.color;
    face.style.color = cap.textColor;

    // Abbreviate long names
    face.textContent = _abbrev(cap.name);
    cell.appendChild(face);

    // Hover: show tooltip + mini 3D
    cell.addEventListener('mouseenter', (e) => _onHover(e, cap));
    cell.addEventListener('mouseleave', _onLeave);
    cell.addEventListener('mousemove',  _onMouseMove);

    // Click: open modal
    cell.addEventListener('click', () => Modal.open(cap));

    return cell;
  }

  /* ── Abbreviate long cap names for small circles ──────── */
  function _abbrev(name) {
    if (name.length <= 12) return name;
    const words = name.split(' ');
    if (words.length === 1) return name.substring(0, 9) + '…';
    if (words[0].length <= 10) return words[0];
    return words[0].substring(0, 9) + '…';
  }

  /* ── Tooltip ──────────────────────────────────────────── */
  const tooltip     = document.getElementById('cap-tooltip');
  const ttCanvas    = document.getElementById('tooltip-canvas');
  const ttName      = document.getElementById('tt-name');
  const ttBrand     = document.getElementById('tt-brand');

  function _onHover(e, cap) {
    ttName.textContent  = cap.name;
    ttBrand.textContent = `${cap.brand} · ${cap.country}`;
    Caps3D.drawMini(ttCanvas, cap);
    tooltip.classList.remove('hidden');
    _positionTooltip(e);
  }

  function _onLeave() {
    tooltip.classList.add('hidden');
  }

  function _onMouseMove(e) {
    if (!tooltip.classList.contains('hidden')) {
      _positionTooltip(e);
    }
  }

  function _positionTooltip(e) {
    const x = e.clientX;
    const y = e.clientY;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  /* ── Filter by country ────────────────────────────────── */
  function applyFilter(country) {
    document.querySelectorAll('.cap-cell[data-id]').forEach(cell => {
      if (country === 'all' || cell.dataset.country === country) {
        cell.classList.remove('filtered-out');
      } else {
        cell.classList.add('filtered-out');
      }
    });
  }

  /* ── Build filter pills from all unique countries ──────── */
  function buildFilterPills() {
    const pContainer = document.getElementById('filter-pills');
    if (!pContainer) return;

    const countries = new Set();
    ALL_CAPS.forEach(c => countries.add(c.country));

    const sorted = [...countries].sort();
    sorted.forEach(country => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.dataset.country = country;
      btn.textContent = country;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        applyFilter(country);
      });
      pContainer.appendChild(btn);
    });

    // Wire up "Todos" pill
    const allPill = pContainer.querySelector('[data-country="all"]');
    if (allPill) {
      allPill.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        allPill.classList.add('active');
        applyFilter('all');
      });
    }
  }

  /* ── Scroll-reveal animation for grid cells ─────────────── */
  function initReveal() {
    if (!window.IntersectionObserver) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const cells = e.target.querySelectorAll('.cap-cell');
          cells.forEach((cell, i) => {
            setTimeout(() => {
              cell.style.opacity = '1';
              cell.style.transform = 'scale(1)';
            }, i * 8);
          });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll('.grid-container').forEach(g => {
      // Initial hidden state
      g.querySelectorAll('.cap-cell').forEach(c => {
        c.style.opacity = '0';
        c.style.transform = 'scale(0.6)';
        c.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
      });
      io.observe(g);
    });
  }

  return { render, buildFilterPills, applyFilter, initReveal };

})();
