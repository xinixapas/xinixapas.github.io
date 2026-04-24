/* ============================================================
   map.js — Leaflet world map with cap markers
   ============================================================ */

const CapMap = (() => {

  let _map      = null;
  let _markers  = [];
  let _initiated = false;

  /* ── Init map when section enters viewport ───────────── */
  function init() {
    if (_initiated) return;
    _initiated = true;

    _map = L.map('world-map', {
      center: [20, 10],
      zoom:    2,
      minZoom: 1,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: true
    });

    // OSM tile layer (styled dark via CSS filter)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(_map);

    _addMarkers();
    _updateLegendCount();
  }

  /* ── Custom marker icon ───────────────────────────────── */
  function _makeIcon(cap) {
    const color = cap.color || '#E9C46A';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <defs>
          <radialGradient id="g" cx="38%" cy="35%">
            <stop offset="0%" stop-color="${_lighten(color, 50)}" />
            <stop offset="100%" stop-color="${color}" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="url(#g)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
        <circle cx="10" cy="10" r="4" fill="rgba(255,255,255,0.22)"/>
        <line x1="16" y1="30" x2="16" y2="39" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    return L.divIcon({
      className: '',
      html: svg,
      iconSize:   [32, 40],
      iconAnchor: [16, 40],
      popupAnchor:[0, -42]
    });
  }

  /* ── Add markers for international caps ─────────────── */
  function _addMarkers() {
    const placed = new Map(); // country → [markers]

    COLLECTIONS.international.caps.forEach(cap => {
      if (cap.lat == null || cap.lng == null) return;

      // Jitter if multiple caps at same country
      const key = `${cap.lat.toFixed(1)},${cap.lng.toFixed(1)}`;
      const count = placed.get(key) || 0;
      placed.set(key, count + 1);
      const jX = count * 1.2 - (Math.floor(count / 2) * 1.2);
      const jY = count * 0.8 * (count % 2 === 0 ? 1 : -1);

      const marker = L.marker(
        [cap.lat + jY * 0.3, cap.lng + jX * 0.3],
        { icon: _makeIcon(cap) }
      );

      const popupContent = `
        <div class="map-popup">
          <div class="map-popup-name">${cap.name}</div>
          <div class="map-popup-meta">${cap.brand} · ${cap.country} · ${cap.year || '—'}</div>
        </div>
      `;
      marker.bindPopup(popupContent, { closeButton: false, maxWidth: 220 });

      marker.on('click', () => Modal.open(cap));
      marker.addTo(_map);
      _markers.push(marker);
    });
  }

  /* ── Legend count ────────────────────────────────────── */
  function _updateLegendCount() {
    const el = document.getElementById('legend-count');
    if (el) el.textContent = `${_markers.length} ubicaciones`;
  }

  /* ── Lazy init via IntersectionObserver ─────────────── */
  function setupLazyLoad() {
    const section = document.getElementById('mapa');
    if (!section) return;

    if (!window.IntersectionObserver) {
      init(); return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        init();
        io.unobserve(section);
      }
    }, { threshold: 0.1 });
    io.observe(section);
  }

  /* ── Util ────────────────────────────────────────────── */
  function _lighten(hex, amt) {
    try {
      const c = parseInt(hex.replace('#',''), 16);
      const r = Math.min(255, (c >> 16) + amt);
      const g = Math.min(255, ((c >> 8) & 0xff) + amt);
      const b = Math.min(255, (c & 0xff) + amt);
      return `rgb(${r},${g},${b})`;
    } catch {
      return hex;
    }
  }

  return { setupLazyLoad, init };

})();
