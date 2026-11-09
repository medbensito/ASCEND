  // ---------- Dessins : logo, emblème, icônes ----------
  const ICONE = {
    accueil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5L12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
    calendrier: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2" stroke-width="2.2"/></svg>',
    objectifs: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><path d="M14.5 9.5L20 4M17 4h3v3"/></svg>',
    progression: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="4" y="13" width="4" height="7" rx="1.3"/><rect x="10" y="8.5" width="4" height="11.5" rx="1.3"/><rect x="16" y="4" width="4" height="16" rx="1.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    coche: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.4l3 3L12.8 4.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    croix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    effacer: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#0b0d26" stroke-width="2.4" stroke-linecap="round"/></svg>',
    droite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gauche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hausse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    baisse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    etoile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor"/></svg>',
    loupe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.3" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.4 15.4L20.5 20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    crayon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4.2-1L19 8.2a2 2 0 0 0 0-2.8l-.4-.4a2 2 0 0 0-2.8 0L5 15.8z"/><path d="M14.5 6.5l3 3"/></svg>',
    horloge: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    repeter: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a7 7 0 0 1 12-4.9L18 8"/><path d="M18 3.5V8h-4.5"/><path d="M20 13a7 7 0 0 1-12 4.9L6 16"/><path d="M6 20.5V16h4.5"/></svg>',
    cible: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    corbeille: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7M9 7V4.5h6V7"/></svg>',
    lecture: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    chrono: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6"/></svg>',
    reglages: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.4"/><circle cx="10" cy="17" r="2.4"/></svg>',
    tendance: '<svg viewBox="0 0 48 48" aria-hidden="true" fill="none"><defs><linearGradient id="gt" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4f6bff"/><stop offset="1" stop-color="#b38bff"/></linearGradient></defs><path d="M6 34l11-11 8 8 15-15" stroke="url(#gt)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 16h9v9" stroke="url(#gt)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    visage: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M9 9.5v1M15 9.5v1M12.2 9.5v3.3h-1M9.3 15.6c1.5 1.2 3.9 1.2 5.4 0"/></svg>'
  };

  // Le A d'ASCEND : deux pentes et un sommet
  let nLogo = 0;
  function logo() {
    const n = ++nLogo;
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
      <linearGradient id="la${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3d0ff"/><stop offset="1" stop-color="#5873ff"/></linearGradient>
      <linearGradient id="lb${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d5cff"/><stop offset="1" stop-color="#2a2f9e"/></linearGradient>
      <linearGradient id="lc${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa8ff"/><stop offset="1" stop-color="#4d4bd6"/></linearGradient></defs>
      <path d="M50 6L6 92h22L50 48z" fill="url(#la${n})"/><path d="M50 6v42l22 44h22z" fill="url(#lb${n})"/><path d="M50 66l13 26H37z" fill="url(#lc${n})"/></svg>`;
  }
  // Emblème : un cristal qui se pare à chaque palier (Éclat, Cristal, Étoile, Constellation, Nova)
  let nEmb = 0;
  function embleme(id) {
    const n = ++nEmb;
    const etoile = (cx, cy, R, r) => {
      const p = [];
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, d = i % 2 ? r : R; p.push([cx + d * Math.cos(a), cy + d * Math.sin(a)]); }
      return p;
    };
    const facettes = (cx, cy, R, r) => {
      const p = etoile(cx, cy, R, r);
      return p.map((pt, i) => { const q = p[(i + 1) % 8]; return `<path d="M${cx} ${cy}L${pt[0].toFixed(1)} ${pt[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}z" fill="${i % 2 ? `url(#ec${n})` : `url(#ef${n})`}"/>`; }).join('');
    };
    const simple = (cx, cy, R, r, c) => `<path d="M${etoile(cx, cy, R, r).map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}z" fill="${c}"/>`;
    const niveau = CONFIG.paliers.findIndex(p => p.id === id);
    const R = [26, 32, 34, 30, 32][niveau] || 26;
    let fond = '', extra = '';
    if (niveau >= 2) extra += [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2; return `<path d="M${50 + 14 * Math.cos(a)} ${50 + 14 * Math.sin(a)}L${50 + 30 * Math.cos(a)} ${50 + 30 * Math.sin(a)}" stroke="#a9b8ff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>`; }).join('');
    if (niveau >= 3) {
      const pts = [[18, 24], [84, 30], [78, 82]];
      extra += `<path d="M18 24L50 50L84 30M50 50L78 82" stroke="#8fa2ff" stroke-width=".9" opacity=".55" fill="none"/>` + pts.map(([x, y]) => simple(x, y, 6, 1.8, '#cfd8ff')).join('');
    }
    if (niveau >= 4) fond = `<circle cx="50" cy="50" r="44" fill="url(#eh${n})"/><circle cx="50" cy="50" r="40" fill="none" stroke="#b9a6ff" stroke-width="1" opacity=".5"/>`;
    const coeur = niveau === 0 ? simple(50, 50, R, R * .32, `url(#ef${n})`) : facettes(50, 50, R, R * .3);
    return `<svg viewBox="0 0 100 100" aria-hidden="true" class="embleme"><defs>
      <linearGradient id="ef${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe6ff"/><stop offset=".55" stop-color="#6f8cff"/><stop offset="1" stop-color="#3f4fe0"/></linearGradient>
      <linearGradient id="ec${n}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d6bff"/><stop offset="1" stop-color="#2a2f9e"/></linearGradient>
      <radialGradient id="eg${n}"><stop offset="0" stop-color="#7f8cff" stop-opacity=".75"/><stop offset="1" stop-color="#7f8cff" stop-opacity="0"/></radialGradient>
      <radialGradient id="eh${n}"><stop offset=".55" stop-color="#8a5cff" stop-opacity="0"/><stop offset=".85" stop-color="#8a5cff" stop-opacity=".35"/><stop offset="1" stop-color="#8a5cff" stop-opacity="0"/></radialGradient></defs>
      ${fond}<circle cx="50" cy="50" r="${R * 0.9}" fill="url(#eg${n})"/>${extra}${coeur}</svg>`;
  }
