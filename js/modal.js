/* ============================================================
   modal.js — Cap detail modal with Three.js 3D view
   ============================================================ */

const Modal = (() => {

  const modal       = document.getElementById('cap-modal');
  const backdrop    = modal.querySelector('.modal-backdrop');
  const closeBtn    = document.getElementById('modal-close');
  const mCanvas     = document.getElementById('modal-canvas');

  const mBadge      = document.getElementById('m-badge');
  const mName       = document.getElementById('m-name');
  const mBrand      = document.getElementById('m-brand');
  const mCountry    = document.getElementById('m-country');
  const mYear       = document.getElementById('m-year');
  const mDesc       = document.getElementById('m-desc');
  const mColorStrip = document.getElementById('m-color-strip');

  let _open = false;
  let _rendererInit = false;

  /* ── Open modal with cap data ────────────────────────── */
  function open(cap) {
    if (_open) close(true);

    // Populate info
    mBadge.textContent   = cap.country;
    mName.textContent    = cap.name;
    mBrand.textContent   = cap.brand;
    mCountry.textContent = cap.country;
    mYear.textContent    = cap.year || 'Desconocido';
    mDesc.textContent    = cap.description;
    mColorStrip.style.background = `linear-gradient(90deg, ${cap.color}, ${_lighten(cap.color, 40)})`;

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    _open = true;

    // Init Three.js renderer on first open
    if (!_rendererInit) {
      Caps3D.initModalRenderer(mCanvas);
      _rendererInit = true;
    }

    // Load 3D cap
    Caps3D.loadCapInModal(cap);

    // Trap focus
    setTimeout(() => closeBtn.focus(), 100);
  }

  /* ── Close modal ─────────────────────────────────────── */
  function close(immediate) {
    if (!_open) return;
    _open = false;
    Caps3D.stopModal();
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ── Event listeners ─────────────────────────────────── */
  closeBtn.addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _open) close();
  });

  /* ── Resize observer for the canvas ─────────────────── */
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      if (_open && _rendererInit) {
        const w = mCanvas.clientWidth;
        const h = mCanvas.clientHeight;
        if (w > 0 && h > 0) {
          Caps3D.initModalRenderer(mCanvas);
        }
      }
    });
    ro.observe(mCanvas);
  }

  /* ── Util ────────────────────────────────────────────── */
  function _lighten(hex, amt) {
    const c = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, (c >> 16) + amt);
    const g = Math.min(255, ((c >> 8) & 0xff) + amt);
    const b = Math.min(255, (c & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  return { open, close };

})();
