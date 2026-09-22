/**
 * Maps Library — script.js
 * =============================================================
 * Fully static, no backend required.
 * All map metadata lives in data/maps.json.
 * Assets live in assets/<slug>/preview.png, map.svg, etc.
 *
 * Architecture:
 *   1. Fetch maps.json on load.
 *   2. Populate filters from category/region lists.
 *   3. Render card grid; wire up search + filter.
 *   4. Card click → open detail panel (slide-in).
 *   5. Format button click → open licence modal.
 *   6. Modal checkbox → enable Download button.
 *   7. Download click → browser downloads the file.
 *
 * Adding a new map: see data/maps.json for instructions.
 * =============================================================
 */

'use strict';

/* ── CONSTANTS ─────────────────────────────────────────────────── */

/**
 * Base path for all assets and data.
 * If you host this at adeepag.com/maps/ you can leave this as '.'.
 * If you host from a different sub-path, change accordingly.
 */
const BASE = '.';

/** File extensions that each format key maps to. */
const FORMAT_EXT = {
  svg:     '.svg',
  png:     '.png',
  geojson: '.geojson',
  gpkg:    '.gpkg',
  pdf:     '.pdf',
  kml:     '.kml',
};

/** Human-readable labels for format keys. */
const FORMAT_LABEL = {
  svg:     'SVG',
  png:     'PNG',
  geojson: 'GeoJSON',
  gpkg:    'GeoPackage',
  pdf:     'PDF',
  kml:     'KML',
};

/* ── STATE ─────────────────────────────────────────────────────── */
let allMaps = [];           // raw data from maps.json
let filtered = [];          // maps after search + filter
let activeMap = null;       // map object currently shown in detail
let pendingDownload = null; // { url, filename } waiting for modal confirm

/* ── DOM REFERENCES ────────────────────────────────────────────── */
const $grid           = document.getElementById('map-grid');
const $count          = document.getElementById('results-count');
const $empty          = document.getElementById('empty-state');
const $search         = document.getElementById('search-input');
const $clearSearch    = document.getElementById('search-clear');
const $catFilter      = document.getElementById('filter-category');
const $regFilter      = document.getElementById('filter-region');
const $clearFiltersBtn = document.getElementById('clear-filters-btn');

const $detailOverlay  = document.getElementById('detail-overlay');
const $detailBackdrop = document.getElementById('detail-backdrop');
const $detailClose    = document.getElementById('detail-close');
const $detailContent  = document.getElementById('detail-content');
const $detailPanel    = document.querySelector('.detail-panel');

const $modal          = document.getElementById('license-modal');
const $modalBackdrop  = document.getElementById('modal-backdrop');
const $modalClose     = document.getElementById('modal-close');
const $modalCancel    = document.getElementById('modal-cancel-btn');
const $modalLicense   = document.getElementById('modal-license-block');
const $modalCheckbox  = document.getElementById('modal-agree-checkbox');
const $modalDownload  = document.getElementById('modal-download-btn');

/* ── INIT ──────────────────────────────────────────────────────── */
async function init() {
  try {
    const res  = await fetch(`${BASE}/data/maps.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allMaps = data.maps || [];

    populateFilters(data);
    applyFilters();   // initial render
    wireEvents();
  } catch (err) {
    console.error('Failed to load maps.json:', err);
    $grid.innerHTML = `
      <p style="color:var(--c-danger);font-family:var(--f-mono);font-size:var(--fs-sm);">
        Could not load map data. Check that data/maps.json is present and valid.
      </p>`;
  }
}

/* ── POPULATE FILTER DROPDOWNS ─────────────────────────────────── */
function populateFilters(data) {
  const cats = data.categories || [...new Set(allMaps.map(m => m.category).filter(Boolean))];
  const regs = data.regions    || [...new Set(allMaps.map(m => m.region).filter(Boolean))];

  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    $catFilter.appendChild(opt);
  });

  regs.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r; opt.textContent = r;
    $regFilter.appendChild(opt);
  });
}

/* ── FILTERING + SEARCH ────────────────────────────────────────── */
function applyFilters() {
  const q   = $search.value.trim().toLowerCase();
  const cat = $catFilter.value;
  const reg = $regFilter.value;

  filtered = allMaps.filter(m => {
    if (cat && m.category !== cat) return false;
    if (reg && m.region   !== reg) return false;
    if (q) {
      const hay = [m.title, m.description, m.category, m.region, ...(m.tags || [])]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  renderGrid();
}

/* ── RENDER CARD GRID ──────────────────────────────────────────── */
function renderGrid() {
  $grid.innerHTML = '';

  const n = filtered.length;
  const total = allMaps.length;

  if (n === 0) {
    $count.textContent = '';
    $empty.removeAttribute('hidden');
  } else {
    $empty.setAttribute('hidden', '');
    $count.textContent = n === total
      ? `${n} map${n === 1 ? '' : 's'}`
      : `${n} of ${total} map${total === 1 ? '' : 's'}`;
  }

  filtered.forEach(map => {
    const card = buildCard(map);
    $grid.appendChild(card);
  });
}

/* ── BUILD A CARD ELEMENT ──────────────────────────────────────── */
function buildCard(map) {
  const previewSrc = `${BASE}/assets/${map.slug}/preview.png`;

  const article = document.createElement('article');
  article.className = 'map-card';
  article.setAttribute('role', 'listitem');
  article.setAttribute('tabindex', '0');
  article.setAttribute('aria-label', `View ${map.title}`);
  article.dataset.slug = map.slug;

  article.innerHTML = `
    <div class="card-preview">
      <img
        class="card-preview-img"
        src="${esc(previewSrc)}"
        alt="${esc(map.title)} preview"
        loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.removeAttribute('hidden')"
      />
      <div class="card-preview-placeholder" hidden aria-hidden="true">
        ${mapPlaceholderSvg()}
      </div>
      <div class="card-view-arrow" aria-hidden="true">
        ${arrowSvg()}
      </div>
    </div>
    <div class="card-body">
      <div class="card-meta">
        ${map.category ? `<span class="tag">${esc(map.category)}</span>` : ''}
        ${map.region   ? `<span class="tag tag-region">${esc(map.region)}</span>` : ''}
      </div>
      <h2 class="card-title">${esc(map.title)}</h2>
      <p class="card-desc">${esc(map.description)}</p>
      <div class="card-footer">
        <div class="card-formats" aria-label="Available formats">
          ${(map.formats || []).map(f =>
            `<span class="format-badge" title="${FORMAT_LABEL[f] || f}">${FORMAT_LABEL[f] || f}</span>`
          ).join('')}
        </div>
        <span class="card-source" title="${esc(map.source?.name || '')}">
          ${esc(map.source?.name || '')}
        </span>
      </div>
    </div>`;

  article.addEventListener('click', () => openDetail(map));
  article.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(map); }
  });

  return article;
}

/* ── DETAIL PANEL ──────────────────────────────────────────────── */
function openDetail(map) {
  activeMap = map;
  const previewSrc = `${BASE}/assets/${map.slug}/preview.png`;

  $detailContent.innerHTML = `
    <img
      class="detail-preview"
      src="${esc(previewSrc)}"
      alt="${esc(map.title)} full preview"
      onerror="this.style.display='none'"
    />
    <div class="detail-body">
      <div class="detail-tags">
        ${map.category ? `<span class="tag">${esc(map.category)}</span>` : ''}
        ${map.region   ? `<span class="tag tag-region">${esc(map.region)}</span>` : ''}
        ${(map.tags || []).filter(t => t !== map.category && t !== map.region)
          .map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      </div>

      <h2 class="detail-title" id="detail-title">${esc(map.title)}</h2>
      <p class="detail-desc">${esc(map.description)}</p>

      <!-- Source -->
      <div class="detail-section">
        <p class="detail-section-label">Source</p>
        <p class="detail-source-name">${esc(map.source?.name || 'Unknown')}</p>
        ${map.source?.url
          ? `<a href="${esc(map.source.url)}" target="_blank" rel="noopener" class="modal-license-link">
               ${esc(map.source.url)}
             </a>`
          : ''}
      </div>

      <!-- Licence -->
      <div class="detail-section">
        <p class="detail-section-label">Licence</p>
        <span class="detail-license-name">${esc(map.license?.name || 'See source')}</span>
        ${map.license?.url
          ? `<p style="margin-top:var(--sp-2)">
               <a href="${esc(map.license.url)}" target="_blank" rel="noopener" class="modal-license-link">
                 Full licence text →
               </a>
             </p>`
          : ''}
      </div>

      <!-- Downloads -->
      <div class="detail-section">
        <p class="detail-section-label">Download</p>
        <div class="detail-formats">
          ${(map.formats || []).map(f => buildFormatBtn(map, f)).join('')}
        </div>
        <p style="margin-top:var(--sp-3);font-size:var(--fs-xs);color:var(--c-text-3);">
          A licence acknowledgement is shown before each download.
        </p>
      </div>

      ${map.addedDate
        ? `<p style="font-family:var(--f-mono);font-size:var(--fs-xs);color:var(--c-text-3);">
             Added ${formatDate(map.addedDate)}
           </p>`
        : ''}
    </div>`;

  $detailOverlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Focus the panel for keyboard users
  requestAnimationFrame(() => $detailPanel.focus());
}

function closeDetail() {
  $detailOverlay.setAttribute('hidden', '');
  document.body.style.overflow = '';
  activeMap = null;
}

function buildFormatBtn(map, fmt) {
  const ext  = FORMAT_EXT[fmt]  || `.${fmt}`;
  const label = FORMAT_LABEL[fmt] || fmt.toUpperCase();
  const filePath = `${BASE}/assets/${map.slug}/map${ext}`;
  const filename  = `${map.slug}${ext}`;

  return `
    <button
      class="format-btn"
      aria-label="Download ${esc(map.title)} as ${label}"
      data-url="${esc(filePath)}"
      data-filename="${esc(filename)}"
      data-format="${esc(fmt)}"
    >
      ${downloadSvg()}
      ${label}
    </button>`;
}

/* ── LICENCE MODAL ─────────────────────────────────────────────── */
function openModal(map, url, filename) {
  pendingDownload = { url, filename };

  const lic = map.license || {};

  $modalLicense.innerHTML = `
    <p class="modal-license-name">${esc(lic.name || 'See source for licence')}</p>
    <p class="modal-license-text">${esc(lic.acknowledgementText || 'Please review the source licence before using this file.')}</p>
    ${lic.url
      ? `<a href="${esc(lic.url)}" target="_blank" rel="noopener" class="modal-license-link">
           Full licence text →
         </a>`
      : ''}`;

  // Reset checkbox and button state
  $modalCheckbox.checked = false;
  $modalDownload.setAttribute('aria-disabled', 'true');
  $modalDownload.setAttribute('href', '#');

  $modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Focus the modal panel
  requestAnimationFrame(() => $modal.querySelector('.modal-panel').focus());
}

function closeModal() {
  $modal.setAttribute('hidden', '');
  document.body.style.overflow = activeMap ? 'hidden' : '';
  pendingDownload = null;
  $modalCheckbox.checked = false;
}

/* ── WIRE ALL EVENTS ───────────────────────────────────────────── */
function wireEvents() {

  /* Search */
  $search.addEventListener('input', () => {
    $clearSearch.hidden = $search.value.length === 0;
    applyFilters();
  });
  $clearSearch.addEventListener('click', () => {
    $search.value = '';
    $clearSearch.hidden = true;
    $search.focus();
    applyFilters();
  });

  /* Filters */
  $catFilter.addEventListener('change', applyFilters);
  $regFilter.addEventListener('change', applyFilters);
  $clearFiltersBtn.addEventListener('click', () => {
    $search.value = '';
    $clearSearch.hidden = true;
    $catFilter.value = '';
    $regFilter.value = '';
    applyFilters();
  });

  /* Detail overlay */
  $detailClose.addEventListener('click', closeDetail);
  $detailBackdrop.addEventListener('click', closeDetail);

  // Format buttons are added dynamically — delegate
  $detailContent.addEventListener('click', e => {
    const btn = e.target.closest('.format-btn');
    if (!btn || !activeMap) return;
    openModal(activeMap, btn.dataset.url, btn.dataset.filename);
  });

  /* Modal */
  $modalClose.addEventListener('click', closeModal);
  $modalCancel.addEventListener('click', closeModal);
  $modalBackdrop.addEventListener('click', closeModal);

  $modalCheckbox.addEventListener('change', () => {
    const agreed = $modalCheckbox.checked;
    $modalDownload.setAttribute('aria-disabled', agreed ? 'false' : 'true');
    if (agreed && pendingDownload) {
      $modalDownload.setAttribute('href', pendingDownload.url);
      $modalDownload.setAttribute('download', pendingDownload.filename);
    } else {
      $modalDownload.setAttribute('href', '#');
      $modalDownload.removeAttribute('download');
    }
  });

  $modalDownload.addEventListener('click', e => {
    if ($modalDownload.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      return;
    }
    // Close modal after a tick so download has started
    setTimeout(closeModal, 300);
  });

  /* Keyboard: Escape closes panels */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$modal.hasAttribute('hidden')) { closeModal(); return; }
      if (!$detailOverlay.hasAttribute('hidden')) { closeDetail(); }
    }
  });

  /* Trap focus inside detail panel */
  $detailPanel.addEventListener('keydown', trapFocus);

  /* Trap focus inside modal panel */
  $modal.querySelector('.modal-panel').addEventListener('keydown', trapFocus);
}

/* ── FOCUS TRAP ────────────────────────────────────────────────── */
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const panel = e.currentTarget;
  const focusable = Array.from(
    panel.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none');

  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

/* ── UTILITIES ─────────────────────────────────────────────────── */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

/* ── INLINE SVG ICONS ──────────────────────────────────────────── */
function mapPlaceholderSvg() {
  return `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="4" y="10" width="40" height="30" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M4 18h40M4 28h40" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
    <path d="M16 10v30M32 10v30" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
    <circle cx="24" cy="24" r="4" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
}

function arrowSvg() {
  return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function downloadSvg() {
  return `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

/* ── START ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
