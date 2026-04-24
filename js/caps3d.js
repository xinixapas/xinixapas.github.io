/* ============================================================
   caps3d.js — Three.js 3D bottle cap renderer
   Used by: tooltip mini-preview & modal large view
   ============================================================ */

const Caps3D = (() => {

  /* ── Shared geometry (created once) ──────────────────────── */
  let _sharedGeo = null;
  const _cache = new Map();          // capId → renderer/scene data

  function _getCapGeometry() {
    if (_sharedGeo) return _sharedGeo;
    const shape = new THREE.Shape();
    const segments = 21;             // corrugated rim segments
    const R = 1.0;                   // outer radius
    const r = 0.88;                  // inner radius (fluted)
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const isOdd = i % 2;
      const rad = isOdd ? R : r;
      const x = Math.cos(t) * rad;
      const y = Math.sin(t) * rad;
      if (i === 0) shape.moveTo(x, y);
      else         shape.lineTo(x, y);
    }
    const extrudeSettings = {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 4
    };
    _sharedGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    _sharedGeo.center();
    return _sharedGeo;
  }

  /* ── Build a scene for a given cap data ──────────────────── */
  function _buildScene(capData) {
    const scene    = new THREE.Scene();
    const geo      = _getCapGeometry();
    const color    = capData.color || '#E9C46A';
    const txtColor = capData.textColor || '#333';

    // Disk material
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.35,
      metalness: 0.55,
      envMapIntensity: 1.2
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = 0.2;
    scene.add(mesh);

    // Back face (slightly darker)
    const backMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.55),
      roughness: 0.6,
      metalness: 0.3
    });
    const back = new THREE.Mesh(geo, backMat);
    back.rotation.x = 0.2;
    back.position.z = -0.001;
    scene.add(back);

    // Text sprite on face (canvas texture)
    const textSprite = _makeTextSprite(capData.name, txtColor, color);
    textSprite.position.set(0, 0, 0.18);
    scene.add(textSprite);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 4, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.4);
    fill.position.set(-3, -1, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffdd88, 0.6);
    rim.position.set(0, -4, -2);
    scene.add(rim);

    return { scene, mesh, textSprite };
  }

  /* ── Canvas text sprite ───────────────────────────────────── */
  function _makeTextSprite(text, fgColor, bgColor) {
    const size   = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx    = canvas.getContext('2d');

    // Circle fill (cap face colour)
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Highlight arc
    ctx.beginPath();
    ctx.arc(size/2 - 20, size/2 - 30, size/3, 0, Math.PI * 0.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 18;
    ctx.stroke();

    // Text
    const words   = text.split(' ');
    const lineH   = words.length > 2 ? 38 : 44;
    const fSize   = words.length > 2 ? 32 : 36;
    ctx.fillStyle  = fgColor;
    ctx.font       = `bold ${fSize}px Inter, sans-serif`;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur   = 4;

    const lineCount = Math.min(words.length, 3);
    const startY    = size/2 - ((lineCount - 1) * lineH) / 2;
    for (let i = 0; i < lineCount; i++) {
      ctx.fillText(words[i], size/2, startY + i * lineH);
    }

    const texture  = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite    = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 1.6, 1);
    return sprite;
  }

  /* ── Draw a mini 2D preview onto a 2D canvas (tooltip) ───── */
  function drawMini(canvas2d, capData) {
    const ctx = canvas2d.getContext('2d');
    const w = canvas2d.width;
    const h = canvas2d.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 2;

    // Rim gradient
    const rim = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 1);
    rim.addColorStop(0, 'rgba(180,180,180,0.3)');
    rim.addColorStop(1, 'rgba(80,80,80,0.6)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();

    // Corrugation
    const segs = 21;
    ctx.beginPath();
    for (let i = 0; i <= segs * 2; i++) {
      const angle = (i / (segs * 2)) * Math.PI * 2;
      const dist  = r + (i % 2 === 0 ? 1 : -1);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(200,200,200,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Face
    const grad = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, 0, cx, cy, r);
    grad.addColorStop(0, lighten(capData.color, 40));
    grad.addColorStop(1, capData.color);
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(cx - r*0.2, cy - r*0.25, r*0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    // Text
    ctx.fillStyle = capData.textColor || '#fff';
    ctx.font = `bold ${Math.floor(r * 0.32)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    const short = capData.name.length > 10 ? capData.name.substring(0, 9) + '…' : capData.name;
    ctx.fillText(short, cx, cy);
  }

  /* ── Modal 3D renderer ───────────────────────────────────── */
  let _modalRenderer  = null;
  let _modalScene     = null;
  let _modalCamera    = null;
  let _modalMesh      = null;
  let _modalRAF       = null;
  let _modalDragging  = false;
  let _modalLastX     = 0;
  let _modalLastY     = 0;
  let _modalRotX      = 0.2;
  let _modalRotY      = 0;
  let _modalVelX      = 0;
  let _modalVelY      = 0;

  function initModalRenderer(canvas) {
    if (_modalRenderer) {
      _modalRenderer.dispose();
      cancelAnimationFrame(_modalRAF);
    }

    _modalRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    _modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _modalRenderer.setSize(canvas.clientWidth || 440, canvas.clientHeight || 400);
    _modalRenderer.setClearColor(0x000000, 0);
    _modalRenderer.shadowMap.enabled = true;

    _modalCamera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    _modalCamera.position.set(0, 0, 4);

    // Mouse drag
    canvas.addEventListener('mousedown',  _onMDown);
    canvas.addEventListener('mousemove',  _onMMove);
    canvas.addEventListener('mouseup',    _onMUp);
    canvas.addEventListener('mouseleave', _onMUp);
    canvas.addEventListener('wheel', _onWheel, { passive: true });
    // Touch
    canvas.addEventListener('touchstart',  _onTStart, { passive: true });
    canvas.addEventListener('touchmove',   _onTMove,  { passive: true });
    canvas.addEventListener('touchend',    _onMUp);
  }

  function loadCapInModal(capData) {
    if (!_modalRenderer) return;
    cancelAnimationFrame(_modalRAF);

    const { scene, mesh } = _buildScene(capData);
    _modalScene = scene;
    _modalMesh  = mesh;
    _modalRotX  = 0.2;
    _modalRotY  = 0;
    _modalVelX  = 0.008;
    _modalVelY  = 0.004;
    _animate();
  }

  function _animate() {
    _modalRAF = requestAnimationFrame(_animate);
    if (!_modalScene || !_modalRenderer) return;

    if (!_modalDragging) {
      _modalRotY += _modalVelX;
      _modalRotX += _modalVelY * 0.3;
      _modalVelX *= 0.995;
    }
    if (_modalMesh) {
      _modalMesh.rotation.y = _modalRotY;
      _modalMesh.rotation.x = _modalRotX;
    }
    // Sync sprite with mesh (remove rotation on sprite)
    if (_modalScene) {
      _modalScene.traverse(obj => {
        if (obj.isSprite) {
          obj.position.z = 0.18 + Math.sin(_modalRotX) * 0.1;
        }
      });
    }

    _modalRenderer.render(_modalScene, _modalCamera);
  }

  function stopModal() {
    cancelAnimationFrame(_modalRAF);
    _modalRAF = null;
  }

  /* Drag handlers */
  function _onMDown(e) { _modalDragging = true; _modalLastX = e.clientX; _modalLastY = e.clientY; _modalVelX = 0; _modalVelY = 0; }
  function _onMMove(e) {
    if (!_modalDragging) return;
    const dx = e.clientX - _modalLastX;
    const dy = e.clientY - _modalLastY;
    _modalLastX = e.clientX; _modalLastY = e.clientY;
    _modalRotY += dx * 0.012;
    _modalRotX += dy * 0.012;
    _modalVelX  = dx * 0.012;
    _modalVelY  = dy * 0.012;
  }
  function _onMUp()  { _modalDragging = false; }
  function _onWheel(e) {
    _modalCamera.position.z = Math.max(2, Math.min(8, _modalCamera.position.z + e.deltaY * 0.005));
  }
  function _onTStart(e) { if (e.touches.length === 1) { _modalDragging = true; _modalLastX = e.touches[0].clientX; _modalLastY = e.touches[0].clientY; } }
  function _onTMove(e) {
    if (!_modalDragging || !e.touches.length) return;
    const dx = e.touches[0].clientX - _modalLastX;
    const dy = e.touches[0].clientY - _modalLastY;
    _modalLastX = e.touches[0].clientX; _modalLastY = e.touches[0].clientY;
    _modalRotY += dx * 0.015; _modalRotX += dy * 0.015;
    _modalVelX = dx * 0.015;  _modalVelY = dy * 0.015;
  }

  /* ── Hero canvas — floating caps animation ──────────────── */
  let _heroCtx = null;
  let _heroW = 0, _heroH = 0;
  let _heroParticles = [];
  let _heroRAF = null;

  function initHeroCanvas(canvas) {
    _heroCtx = canvas.getContext('2d');
    _heroW = canvas.width  = canvas.offsetWidth;
    _heroH = canvas.height = canvas.offsetHeight;

    // Create floating cap particles
    for (let i = 0; i < 28; i++) {
      _heroParticles.push(_mkParticle());
    }

    window.addEventListener('resize', () => {
      _heroW = canvas.width  = canvas.offsetWidth;
      _heroH = canvas.height = canvas.offsetHeight;
    });
    _heroAnimate();
  }

  function _mkParticle(x) {
    const colors = ['#E63946','#E9C46A','#38B000','#0096C7','#7B2D8B','#FB8500','#1A1A1A','#52B788','#D4622A'];
    return {
      x: x !== undefined ? x : Math.random() * (_heroW || window.innerWidth),
      y: Math.random() * (_heroH || window.innerHeight),
      r: 18 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.015,
      alpha: 0.08 + Math.random() * 0.12
    };
  }

  function _heroAnimate() {
    _heroRAF = requestAnimationFrame(_heroAnimate);
    if (!_heroCtx) return;
    _heroCtx.clearRect(0, 0, _heroW, _heroH);

    for (const p of _heroParticles) {
      _drawHeroCap(_heroCtx, p);
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.rotV;
      if (p.y < -p.r * 2) Object.assign(p, _mkParticle(Math.random() * _heroW), { y: _heroH + p.r });
    }
  }

  function _drawHeroCap(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;

    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-p.r * 0.15, -p.r * 0.2, p.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();

    ctx.restore();
  }

  /* ── Utility ─────────────────────────────────────────────── */
  function lighten(hex, amount) {
    const c = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, (c >> 16) + amount);
    const g = Math.min(255, ((c >> 8) & 0xff) + amount);
    const b = Math.min(255, (c & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  return {
    drawMini,
    initModalRenderer,
    loadCapInModal,
    stopModal,
    initHeroCanvas
  };

})();
