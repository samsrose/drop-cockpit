/* ══════════════════════════════════════════════════════
   DROP Cockpit — Interactive Logic
   - Dark mode toggle
   - Step checkbox state (localStorage)
   - Risk meter updates from checked steps
   - Tracker stats (DROP ID, notes, progress)
   ══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DARK MODE ──────────────────────────────────────────
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let currentTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  // Restore saved theme
  const savedTheme = getTheme();
  if (savedTheme) currentTheme = savedTheme;
  root.setAttribute('data-theme', currentTheme);
  updateThemeIcon();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', currentTheme);
      saveTheme(currentTheme);
      updateThemeIcon();
    });
  }

  function updateThemeIcon() {
    if (!themeToggle) return;
    themeToggle.setAttribute('aria-label', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`);
    themeToggle.innerHTML = currentTheme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }

  function saveTheme(t) {
    try { localStorage.setItem('drop-cockpit-theme', t); } catch(e) {}
  }
  function getTheme() {
    try { return localStorage.getItem('drop-cockpit-theme'); } catch(e) { return null; }
  }

  // ── RISK METER STATE ────────────────────────────────────
  // Base risk levels per category (start at 100%)
  const risk = { ads: 100, location: 100, people: 100, scam: 100 };

  // Step definitions: each step reduces risk by these amounts
  // Data is pulled from data attributes on step cards
  const steps = {};
  document.querySelectorAll('.step-card').forEach(card => {
    const id = card.getAttribute('data-step');
    if (!id) return;
    steps[id] = {
      ads: parseInt(card.getAttribute('data-risk-ads')) || 0,
      location: parseInt(card.getAttribute('data-risk-location')) || 0,
      people: parseInt(card.getAttribute('data-risk-people')) || 0,
      scam: parseInt(card.getAttribute('data-risk-scam')) || 0,
    };
  });

  // ── STEP CHECKBOXES ────────────────────────────────────
  const checkboxes = document.querySelectorAll('.step-check');
  const totalSteps = checkboxes.length;

  // Load saved state
  checkboxes.forEach(cb => {
    const id = cb.id;
    try {
      if (localStorage.getItem(`drop-step-${id}`) === 'true') {
        cb.checked = true;
        cb.closest('.step-card')?.classList.add('step-done');
      }
    } catch(e) {}
    cb.addEventListener('change', () => onStepChange(cb));
  });

  function onStepChange(cb) {
    const id = cb.id;
    const card = cb.closest('.step-card');
    try {
      localStorage.setItem(`drop-step-${id}`, cb.checked ? 'true' : 'false');
    } catch(e) {}
    if (card) {
      card.classList.toggle('step-done', cb.checked);
    }
    recalcRisk();
    updateTrackerStats();
  }

  function recalcRisk() {
    // Reset to 100%
    const current = { ads: 100, location: 100, people: 100, scam: 100 };

    // Subtract reduction for each checked step
    checkboxes.forEach(cb => {
      if (!cb.checked) return;
      const id = cb.id;
      const reduction = steps[id] || {};
      current.ads = Math.max(0, current.ads - (reduction.ads || 0));
      current.location = Math.max(0, current.location - (reduction.location || 0));
      current.people = Math.max(0, current.people - (reduction.people || 0));
      current.scam = Math.max(0, current.scam - (reduction.scam || 0));
    });

    // Update meters
    updateMeter('ads', current.ads);
    updateMeter('location', current.location);
    updateMeter('people', current.people);
    updateMeter('scam', current.scam);

    // Overall: average of all four
    const overall = Math.round((current.ads + current.location + current.people + current.scam) / 4);
    const overallFill = document.getElementById('overallFill');
    const overallPct = document.getElementById('overallPct');
    if (overallFill) overallFill.style.width = overall + '%';
    if (overallPct) {
      overallPct.textContent = overall + '%';
      // Change color based on risk level
      if (overall <= 25) {
        overallPct.style.color = 'var(--color-risk-safe)';
      } else if (overall <= 50) {
        overallPct.style.color = 'var(--color-risk-medium)';
      } else if (overall <= 75) {
        overallPct.style.color = 'var(--color-risk-high)';
      } else {
        overallPct.style.color = 'var(--color-risk-critical)';
      }
    }

    // Tracker risk reduced stat
    const trackerRiskReduced = document.getElementById('trackerRiskReduced');
    if (trackerRiskReduced) {
      trackerRiskReduced.textContent = (100 - overall) + '%';
    }
  }

  function updateMeter(riskId, pct) {
    const fill = document.querySelector(`.risk-fill-${riskId}`);
    const pctEl = document.querySelector(`[data-risk-id="${riskId}"]`);
    const badge = document.querySelector(`[data-risk="${riskId}"] .risk-badge`);
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (badge) {
      if (pct <= 25) {
        badge.textContent = 'Low Risk';
        badge.className = 'risk-badge';
        badge.style.cssText = 'background: var(--color-risk-safe-bg); color: var(--color-risk-safe); border: 1px solid var(--color-risk-safe-border);';
      } else if (pct <= 50) {
        badge.textContent = 'Medium Risk';
        badge.className = 'risk-badge';
        badge.style.cssText = 'background: var(--color-risk-medium-bg); color: var(--color-risk-medium); border: 1px solid var(--color-risk-medium-border);';
      } else if (pct <= 75) {
        badge.textContent = 'High Exposure';
        badge.className = 'risk-badge';
        badge.style.cssText = 'background: var(--color-risk-high-bg); color: var(--color-risk-high); border: 1px solid var(--color-risk-high-border);';
      } else {
        badge.className = 'risk-badge ' + (riskId === 'location' ? 'risk-critical' : 'risk-high');
        badge.style.cssText = '';
        badge.textContent = riskId === 'location' ? 'Critical' : 'High Exposure';
      }
    }
  }

  // ── TRACKER STATS ────────────────────────────────────
  function updateTrackerStats() {
    const completed = Array.from(checkboxes).filter(cb => cb.checked).length;
    const pct = Math.round((completed / totalSteps) * 100);

    const stepsCompletedEl = document.getElementById('trackerStepsCompleted');
    const stepsTotalEl = document.getElementById('trackerStepsTotal');
    const progressFill = document.getElementById('progressFill');
    const progressPct = document.getElementById('progressPct');

    if (stepsCompletedEl) stepsCompletedEl.textContent = completed;
    if (stepsTotalEl) stepsTotalEl.textContent = totalSteps;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
  }

  // ── DROP ID ──────────────────────────────────────────
  const dropIdInput = document.getElementById('dropIdInput');
  const saveDropIdBtn = document.getElementById('saveDropId');
  const trackerDropIdEl = document.getElementById('trackerDropId');

  // Load saved DROP ID
  try {
    const savedId = localStorage.getItem('drop-cockpit-drop-id');
    if (savedId && dropIdInput) {
      dropIdInput.value = savedId;
      if (trackerDropIdEl) trackerDropIdEl.textContent = savedId;
    }
  } catch(e) {}

  if (saveDropIdBtn && dropIdInput) {
    saveDropIdBtn.addEventListener('click', () => {
      const val = dropIdInput.value.trim();
      try { localStorage.setItem('drop-cockpit-drop-id', val); } catch(e) {}
      if (trackerDropIdEl) trackerDropIdEl.textContent = val || '—';
      // Brief visual feedback
      saveDropIdBtn.textContent = 'Saved ✓';
      saveDropIdBtn.style.background = 'var(--color-success)';
      setTimeout(() => {
        saveDropIdBtn.textContent = 'Save';
        saveDropIdBtn.style.background = '';
      }, 1500);
    });
  }

  // ── NOTES ────────────────────────────────────────────
  const notesEl = document.getElementById('trackerNotes');
  const saveNotesBtn = document.getElementById('saveNotes');

  try {
    const savedNotes = localStorage.getItem('drop-cockpit-notes');
    if (savedNotes && notesEl) notesEl.value = savedNotes;
  } catch(e) {}

  if (saveNotesBtn && notesEl) {
    saveNotesBtn.addEventListener('click', () => {
      try { localStorage.setItem('drop-cockpit-notes', notesEl.value); } catch(e) {}
      saveNotesBtn.textContent = 'Saved ✓';
      saveNotesBtn.style.background = 'var(--color-success)';
      setTimeout(() => {
        saveNotesBtn.textContent = 'Save Notes';
        saveNotesBtn.style.background = '';
      }, 1500);
    });
  }

  // Auto-save notes on input (debounced)
  if (notesEl) {
    let saveTimer;
    notesEl.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem('drop-cockpit-notes', notesEl.value); } catch(e) {}
      }, 800);
    });
  }

  // ── RESET TRACKER ────────────────────────────────────
  const resetBtn = document.getElementById('resetTracker');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Reset all progress? This will uncheck all steps and clear your saved data.')) return;
      checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.step-card')?.classList.remove('step-done');
        try { localStorage.removeItem(`drop-step-${cb.id}`); } catch(e) {}
      });
      if (dropIdInput) dropIdInput.value = '';
      if (notesEl) notesEl.value = '';
      if (trackerDropIdEl) trackerDropIdEl.textContent = '—';
      try {
        localStorage.removeItem('drop-cockpit-drop-id');
        localStorage.removeItem('drop-cockpit-notes');
      } catch(e) {}
      recalcRisk();
      updateTrackerStats();
    });
  }

  // ── SCROLL ANIMATION ─────────────────────────────────
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.risk-card, .step-card, .broker-cat, .alt-card, .explainer-col').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      observer.observe(el);
    });
  }

  // ── INIT ────────────────────────────────────────────
  recalcRisk();
  updateTrackerStats();

})();
