/* ============================================================
   app.js — Main orchestrator
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Loader ─────────────────────────────────────────── */
  const loader = document.getElementById('loader');
  setTimeout(() => loader.classList.add('done'), 2200);

  /* ── 2. Hero canvas ─────────────────────────────────────── */
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) Caps3D.initHeroCanvas(heroCanvas);

  /* ── 3. Render grids ────────────────────────────────────── */
  Grid.render('grid-spanish1',    'spanish1');
  Grid.render('grid-spanish2',    'spanish2');
  Grid.render('grid-international','international');

  /* ── 4. Filter pills ────────────────────────────────────── */
  Grid.buildFilterPills();

  /* ── 5. Scroll-reveal for grid cells ────────────────────── */
  Grid.initReveal();

  /* ── 6. World map (lazy) ─────────────────────────────────── */
  CapMap.setupLazyLoad();

  /* ── 7. Navbar scroll effect ─────────────────────────────── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* ── 8. Animated counters in hero ───────────────────────── */
  const counters = document.querySelectorAll('.stat-num');
  const countIO  = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      let current  = 0;
      const step   = Math.ceil(target / 40);
      const timer  = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
      }, 35);
      countIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => countIO.observe(c));

  /* ── 9. Section reveal (section headers) ──────────────── */
  const revealEls = document.querySelectorAll('.section-header, .map-wrap');
  const revealIO  = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => {
    el.classList.add('reveal');
    revealIO.observe(el);
  });

  /* ── 10. Global search ───────────────────────────────────── */
  const searchInput   = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');

  function performSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.classList.add('hidden');
      return;
    }
    const matches = ALL_CAPS.filter(cap =>
      cap.name.toLowerCase().includes(q)    ||
      cap.brand.toLowerCase().includes(q)   ||
      cap.country.toLowerCase().includes(q)
    ).slice(0, 12);

    if (!matches.length) {
      searchResults.innerHTML = '<div style="padding:16px;color:var(--text-dim);text-align:center;font-size:0.85rem">Sin resultados</div>';
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = matches.map(cap => `
      <div class="search-result-item" data-id="${cap.id}">
        <div class="sr-dot" style="background:${cap.color};color:${cap.textColor}">
          ${cap.name.charAt(0)}
        </div>
        <div class="sr-info">
          <span class="sr-name">${cap.name}</span>
          <span class="sr-meta">${cap.brand} · ${cap.country}</span>
        </div>
      </div>
    `).join('');

    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const cap = ALL_CAPS.find(c => c.id === item.dataset.id);
        if (cap) {
          searchResults.classList.add('hidden');
          searchInput.value = '';
          // Scroll to the cell
          _scrollToCapCell(cap.id);
          // Highlight briefly then open modal
          setTimeout(() => Modal.open(cap), 400);
        }
      });
    });

    searchResults.classList.remove('hidden');
  }

  searchInput.addEventListener('input', (e) => performSearch(e.target.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchResults.classList.add('hidden');
      searchInput.value = '';
      searchInput.blur();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search-wrap') && !e.target.closest('.search-results')) {
      searchResults.classList.add('hidden');
    }
  });

  function _scrollToCapCell(capId) {
    const cell = document.querySelector(`.cap-cell[data-id="${capId}"]`);
    if (!cell) return;
    cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cell.classList.add('highlighted');
    setTimeout(() => cell.classList.remove('highlighted'), 1800);
  }

  /* ── 11. Mobile nav burger ────────────────────────────── */
  const burger = document.getElementById('burger');
  let mobileNav = document.querySelector('.mobile-nav');

  if (!mobileNav) {
    mobileNav = document.createElement('div');
    mobileNav.className = 'mobile-nav';
    mobileNav.innerHTML = `
      <a href="#española1"   onclick="this.closest('.mobile-nav').classList.remove('open')">Española I</a>
      <a href="#española2"   onclick="this.closest('.mobile-nav').classList.remove('open')">Española II</a>
      <a href="#internacional" onclick="this.closest('.mobile-nav').classList.remove('open')">Internacional</a>
      <a href="#mapa"        onclick="this.closest('.mobile-nav').classList.remove('open')">Mapa</a>
      <div class="mobile-search-wrap">
        <input type="text" placeholder="Buscar chapa…" id="mobile-search" />
      </div>
    `;
    document.body.appendChild(mobileNav);

    // Wire mobile search
    const mobileSearch = mobileNav.querySelector('#mobile-search');
    mobileSearch.addEventListener('input', (e) => {
      searchInput.value = e.target.value;
      performSearch(e.target.value);
    });
  }

  burger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });

  /* ── 12. Smooth active nav link on scroll ─────────────── */
  const sections = document.querySelectorAll('section[id], .map-section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          const href = link.getAttribute('href').replace('#','');
          link.style.color = href === id ? 'var(--text)' : '';
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => sectionIO.observe(s));

});
