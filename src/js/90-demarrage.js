  // ---------- Rendu ----------
  const ONGLETS = [['accueil', 'Accueil'], ['calendrier', 'Calendrier'], ['objectifs', 'Objectifs'], ['progression', 'Progression']];
  function renderOnglets() {
    const onglet = ([id, nom]) => `<button type="button" class="onglet" data-onglet="${id}"${U.onglet === id ? ' aria-current="page"' : ''} data-focus="tab-${id}">${ICONE[id]}<span>${nom}</span></button>`;
    $('#onglets').innerHTML = ONGLETS.slice(0, 2).map(onglet).join('') + `<button type="button" class="onglet-plus" data-action="ajouter" data-focus="plus" aria-label="Ajouter une tâche">${ICONE.plus}</button>` + ONGLETS.slice(2).map(onglet).join('');
  }
  function signatureFocus() { const a = document.activeElement; return a && a.dataset && a.dataset.focus ? a.dataset.focus : null; }
  function render(focus) {
    const f = focus || signatureFocus();
    const E = $('#ecran');
    const ancien = $('#ecran .defile');
    if (ancien && !ancien.classList.contains('ajuste')) U.defile[ancien.dataset.defile] = ancien.scrollTop;
    if (U.recentrer) { U.defile = {}; U.recentrer = false; }
    // Téléphone couché : le calendrier seul, quel que soit l'onglet ; redressé, on retrouve l'onglet
    const couche = paysage();
    document.documentElement.classList.toggle('paysage', couche);
    const plein = couche || (U.onglet === 'calendrier' && S.vueCal === 'jour');
    E.classList.toggle('plein', plein);
    const haut = E.scrollTop;
    reglerHeure(couche && S.vueCal === 'jour');
    E.innerHTML = couche ? vuePaysage() : { accueil: vueAccueil, calendrier: vueCalendrier, objectifs: vueObjectifs, progression: vueProgression }[U.onglet]();
    if (U.garderDefilement) E.scrollTop = haut;
    U.garderDefilement = false;
    renderOnglets();
    U.reaction = false;
    const d = $('#ecran .defile');
    if (d && PLAGE.ajuste) {
      // La place réelle est connue une fois la vue posée : on s'y ajuste (une seule reprise)
      if (Math.abs(d.clientHeight - PLAGE.dispo) > 1) { PLAGE.dispo = d.clientHeight; return render(focus); }
      d.scrollTop = PLAGE.a * H - 8;
    } else if (d) {
      if (U.defile.jour != null) d.scrollTop = U.defile.jour;
      else d.scrollTop = Math.max(0, (U.date === aujourdhui() ? Math.min(Math.floor(minNow() / 60) * 60 - 60, 16 * 60) : CONFIG.ouverture * 60) / 60 * H);
    }
    if (U.repere) { const r = $('#ecran .repere'); if (r) r.scrollIntoView({ block: 'center' }); U.repere = null; }
    if (f) { const c = document.querySelector(`#ecran [data-focus="${CSS.escape(f)}"], #onglets [data-focus="${CSS.escape(f)}"]`); if (c) c.focus({ preventScroll: true }); }
  }
  function changerOnglet(id) {
    if (U.onglet === id) { $('#ecran').scrollTo({ top: 0, behavior: 'smooth' }); return; }
    U.onglet = id; S.onglet = id; U.selection = null; U.brouillon = null;
    ecrire();
    $('#ecran').scrollTop = 0;
    render('tab-' + id);
  }
  function naviguer(sens) {
    U.selection = null; U.brouillon = null;
    if (S.vueCal === 'jour') U.date = decaler(U.date, sens); else if (S.vueCal === 'mois' || paysage()) U.date = moisPlus(U.date, sens); else U.date = decaler(U.date, 7 * sens);
    U.garderDefilement = true;
    render();
  }
  function allerA(k, vue) {
    U.date = k; U.selection = null; U.brouillon = null;
    if (vue) { S.vueCal = vue; ecrire(); }
    U.garderDefilement = vue !== 'jour';
    render();
  }

  // ---------- Cocher ----------
  function cocher(cle) {
    const o = trouver(cle);
    if (!o || o.el.type !== 'tache') return;
    const msg = basculerTache(o);
    sauver();
    U.garderDefilement = true;
    render();
    dire(msg);
    feliciter();
  }

  // ---------- Gestes sur la grille (vue Jour) ----------
  // Souris : glisser sur un vide dessine une plage ; glisser une plage la déplace ; son bord bas la redimensionne.
  // Tactile : appui long puis glisser dessine ; appui long sur une plage la soulève ; les poignées la redimensionnent.
  // Un toucher simple sur un vide pose une « Nouvelle » plage d'une heure, à ajuster puis à toucher pour la remplir.
  let G = null;
  const actifG = () => G && ['creer', 'deplacer', 'redim'].includes(G.mode);
  function sous(e) {
    const r = G.cols.getBoundingClientRect(), n = G.cols.children.length;
    const i = borne(Math.floor((e.clientX - r.left) / (r.width / n)), 0, n - 1);
    return { min: (e.clientY - r.top) / H * 60, k: G.cols.children[i].dataset.jour, col: G.cols.children[i] };
  }
  function cible(blocEl) {
    if (blocEl.dataset.brouillon) return Object.assign({ brouillon: true }, U.brouillon);
    const o = trouver(blocEl.dataset.cle);
    return o ? { o, k: o.k, debut: o.el.debut, fin: o.el.fin } : null;
  }
  function demarrerG(mode) {
    G.mode = mode;
    clearTimeout(G.minuteur);
    try { G.cols.setPointerCapture(G.id); } catch (e) { /* déjà capturé */ }
    if (navigator.vibrate && G.tactile) { try { navigator.vibrate(8); } catch (e) { /* facultatif */ } }
    if (mode === 'creer') {
      const p = sous(G.depart);
      G.k = p.k;
      G.m0 = borne(Math.floor(p.min / CONFIG.pas) * CONFIG.pas, 0, 1440 - CONFIG.pas);
      G.vue = document.createElement('div');
      G.vue.className = 'bloc brouillon leve';
      G.vue.style.cssText = 'left:2px;width:calc(100% - 4px)';
      G.vue.innerHTML = '<span class="b-texte"><b>Nouvelle</b><small></small></span>';
      p.col.appendChild(G.vue);
      G.min0 = p.min; G.debut = G.m0; G.fin = Math.min(G.m0 + CONFIG.duree, 1440);
      majVueG();
      return;
    }
    G.t = cible(G.blocEl);
    if (!G.t) { G.mode = 'libre'; return; }
    G.debut = G.t.debut; G.fin = G.t.fin; G.k = G.t.k;
    G.min0 = sous(G.depart).min;
    G.vue = G.blocEl;
    G.vue.classList.add('leve');
    if (mode === 'deplacer') { G.vue.style.left = '2px'; G.vue.style.width = 'calc(100% - 4px)'; }
  }
  function majVueG() {
    const v = G.vue, h = Math.max((G.fin - G.debut) / 60 * H, 22);
    v.style.top = G.debut / 60 * H + 'px';
    v.style.height = h + 'px';
    v.classList.toggle('court', h < 42);
    const s = v.querySelector('.b-texte small');
    if (s) s.textContent = `${hhmm(G.debut)} – ${finTexte(G.fin)}`;
  }
  function suivre(e, sansBord) {
    const p = sous(e);
    if (G.mode === 'creer') {
      if (!G.bouge && Math.abs(p.min - G.min0) < CONFIG.pas) { G.debut = G.m0; G.fin = Math.min(G.m0 + CONFIG.duree, 1440); }
      else {
        G.bouge = true;
        const m = borne(caler(p.min), 0, 1440);
        if (m >= G.m0 + CONFIG.pas) { G.debut = G.m0; G.fin = m; }
        else if (m <= G.m0) { G.debut = m; G.fin = G.m0 + CONFIG.pas; }
        else { G.debut = G.m0; G.fin = G.m0 + CONFIG.pas; }
      }
    } else if (G.mode === 'deplacer') {
      const d = G.t.fin - G.t.debut;
      G.debut = borne(caler(G.t.debut + p.min - G.min0), 0, 1440 - d);
      G.fin = G.debut + d;
    } else if (G.mode === 'redim') {
      const m = borne(caler(p.min), 0, 1440);
      if (G.bord === 'haut') G.debut = Math.min(m, G.t.fin - CONFIG.pas);
      else G.fin = Math.max(m, G.t.debut + CONFIG.pas);
    }
    majVueG();
    if (!sansBord) defilerBord(e);
  }
  let rafBord = null;
  function defilerBord(e) {
    const d = G.cols.closest('.defile'), r = d.getBoundingClientRect();
    const v = e.clientY < r.top + 40 ? -8 : e.clientY > r.bottom - 40 ? 8 : 0;
    G.dernier = e;
    if (!v) { cancelAnimationFrame(rafBord); rafBord = null; return; }
    if (rafBord) return;
    const pas = () => {
      if (!actifG()) { rafBord = null; return; }
      const r2 = d.getBoundingClientRect();
      const v2 = G.dernier.clientY < r2.top + 40 ? -8 : G.dernier.clientY > r2.bottom - 40 ? 8 : 0;
      if (!v2) { rafBord = null; return; }
      d.scrollTop += v2;
      suivre(G.dernier, true);
      rafBord = requestAnimationFrame(pas);
    };
    rafBord = requestAnimationFrame(pas);
  }
  async function terminerG() {
    const g = G;
    G = null;
    cancelAnimationFrame(rafBord); rafBord = null;
    U.avaler = Date.now();
    if (g.mode === 'creer') {
      g.vue.remove();
      U.brouillon = { k: g.k, debut: g.debut, fin: g.fin };
      U.selection = null;
      ouvrirTache(null, { date: g.k, debut: g.debut, fin: g.fin });
      render();
      return;
    }
    const t = g.t;
    const change = g.debut !== t.debut || g.fin !== t.fin || g.k !== t.k;
    if (t.brouillon) { U.brouillon = { k: g.k, debut: g.debut, fin: g.fin }; render(); return; }
    if (!change) { if (g.tactile) U.selection = t.o.cle; render(); return; }
    if (t.o.el.type === 'tache' && !(await accepterPlafond(g.k, t.o.cle, g.debut, g.fin))) { render(); return; }
    let portee = 'une';
    if (t.o.el.rep) { portee = await demanderPortee('Déplacer'); if (!portee) { render(); return; } }
    const cle = appliquer(t.o, { date: g.k, debut: g.debut, fin: g.fin }, portee);
    sauver();
    U.selection = g.tactile ? cle : null;
    render();
    if (!avertirLibre(cle)) dire(`${t.o.el.titre} : ${hhmm(g.debut)} – ${finTexte(g.fin)}`);
  }
  const ECRAN = $('#ecran');
  ECRAN.addEventListener('pointerdown', e => {
    if (G || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('.rond-coche')) return;
    const tactile = e.pointerType !== 'mouse';
    const cols = e.target.closest('.colonnes');
    if (!cols) {
      // Ailleurs : seul le balayage horizontal compte (grille du mois, vue Jour)
      const zone = e.target.closest('[data-balayage], .cal-jour, .pay');
      if (zone) G = { id: e.pointerId, depart: e, x0: e.clientX, y0: e.clientY, mode: 'attente', libreSeul: true, tactile };
      return;
    }
    const poignee = e.target.closest('[data-bord]'), blocEl = e.target.closest('.bloc');
    G = { id: e.pointerId, cols, depart: e, x0: e.clientX, y0: e.clientY, tactile, blocEl, mode: 'attente' };
    G.direct = !!(blocEl && (blocEl.classList.contains('choisi') || blocEl.dataset.brouillon));
    if (poignee && blocEl && (poignee.classList.contains('poignee') || !tactile)) { G.bord = poignee.dataset.bord; demarrerG('redim'); e.preventDefault(); return; }
    if (tactile && !G.direct) G.minuteur = setTimeout(() => { if (G && G.mode === 'attente') demarrerG(blocEl ? 'deplacer' : 'creer'); }, CONFIG.appuiLong);
  });
  window.addEventListener('pointermove', e => {
    if (!G || e.pointerId !== G.id) return;
    const dist = Math.hypot(e.clientX - G.x0, e.clientY - G.y0);
    if (G.mode === 'attente') {
      if (G.direct && dist > 5) demarrerG('deplacer');
      else if (G.libreSeul || G.tactile) { if (dist > 10) { clearTimeout(G.minuteur); G.mode = 'libre'; } return; }
      else if (dist > 5) demarrerG(G.blocEl ? 'deplacer' : 'creer');
      else return;
    }
    if (actifG()) { e.preventDefault(); suivre(e); }
  });
  window.addEventListener('pointerup', e => {
    if (!G || e.pointerId !== G.id) return;
    clearTimeout(G.minuteur);
    if (actifG()) { terminerG(); return; }
    const dx = e.clientX - G.x0, dy = e.clientY - G.y0, g = G;
    G = null;
    if (g.tactile && g.mode === 'libre' && Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy) && (U.onglet === 'calendrier' || paysage())) { U.avaler = Date.now(); naviguer(dx < 0 ? 1 : -1); }
  });
  window.addEventListener('pointercancel', e => {
    if (!G || e.pointerId !== G.id) return;
    clearTimeout(G.minuteur);
    const etait = actifG();
    if (G.mode === 'creer' && G.vue) G.vue.remove();
    G = null;
    if (etait) render();
  });
  document.addEventListener('pointerdown', () => { U.avaler = 0; }, true);
  document.addEventListener('keydown', () => { U.avaler = 0; }, true);
  document.addEventListener('touchmove', e => { if (actifG()) e.preventDefault(); }, { passive: false });
  ECRAN.addEventListener('contextmenu', e => { if (e.target.closest('.colonnes')) e.preventDefault(); });

  // ---------- Clics ----------
  document.addEventListener('click', e => {
    if (e.target.closest('dialog')) return;
    if (U.avaler && Date.now() - U.avaler < 800) { U.avaler = 0; e.preventDefault(); return; }
    const b = e.target.closest('button, .colonne');
    if (!b) return;
    const d = b.dataset;
    if (d.onglet) return changerOnglet(d.onglet);
    if (d.cocher) return cocher(d.cocher);
    if (d.habitude) { U.garderDefilement = true; return cocherHabitude(d.habitude); }
    if (d.priorite) return cocherPriorite(d.priorite);
    if (d.energie) return noterEnergie(+d.energie);
    if (d.coach) return actionCoach(d.coach);
    if (d.identite) return ouvrirIdentites(d.identite);
    if (d.tenu || d.pasTenu) {
      const o = trouver(d.tenu || d.pasTenu);
      if (!o) return;
      const msg = validerSansEcran(o, !!d.tenu);
      sauver(); render(); dire(msg); feliciter();
      return;
    }
    if (d.ouvrir) { const o = trouver(d.ouvrir); if (!o) return; U.brouillon = null; if (U.selection && U.selection !== o.cle) U.selection = null; return ouvrirTache(o); }
    if (d.ouvrirHab) { const h = S.habitudes.find(x => x.id === d.ouvrirHab); return h && ouvrirHabitude(h); }
    if (d.ouvrirObj) { const ob = S.objectifs.find(x => x.id === d.ouvrirObj); return ob && ouvrirObjectif(ob); }
    if (d.vueCal) { S.vueCal = d.vueCal; U.selection = null; U.brouillon = null; ecrire(); return render('vc-' + d.vueCal); }
    if (d.vueObj) { S.vueObj = d.vueObj; ecrire(); return render(d.vueObj === 'long' ? 'vo-l' : 'vo-h'); }
    if (d.periode) { S.periode = +d.periode; ecrire(); U.garderDefilement = true; return render('per' + d.periode); }
    if (d.nav) return naviguer(+d.nav);
    if (d.saut) { U.date = decaler(U.date, +d.saut); U.selection = null; U.brouillon = null; return render(); }
    if (d.aller) return allerA(d.aller);
    if (d.choisir) { U.date = d.choisir; U.garderDefilement = true; return render(); }
    if (d.ouvrirJour) return allerA(d.ouvrirJour, 'jour');
    if (clicSemaine(d)) return;
    const a = d.action;
    if (a === 'remplir' && U.brouillon) return ouvrirTache(null, { date: U.brouillon.k, debut: U.brouillon.debut, fin: U.brouillon.fin });
    if (a === 'ajouter') {
      const auj = aujourdhui(), k = U.onglet === 'calendrier' ? U.date : auj;
      const debut = k === auj ? prochaineHeure() : 9 * 60;
      return ouvrirTache(null, { date: k < auj ? auj : k, debut, fin: Math.min(debut + CONFIG.duree, 1440) });
    }
    if (a === 'aujourdhui') { U.recentrer = true; return allerA(aujourdhui()); }
    if (a === 'voir-tout') { U.onglet = 'calendrier'; S.onglet = 'calendrier'; S.vueCal = 'jour'; U.date = aujourdhui(); ecrire(); return render(); }
    if (a === 'profil') return ouvrirProfil();
    if (a === 'chercher') return ouvrirLoupe();
    if (a === 'serie') { U.onglet = 'objectifs'; S.onglet = 'objectifs'; S.vueObj = 'habitudes'; ecrire(); $('#ecran').scrollTop = 0; return render('tab-objectifs'); }
    if (a === 'minuteur') return ouvrirMinuteur();
    if (a === 'bilan') return ouvrirBilan();
    if (a === 'bilan-semaine') return ouvrirBilan(lundiDe(aujourdhui()));
    if (a === 'priorites') return ouvrirPriorites();
    if (a === 'pas-faites') return ouvrirPasFaites();
    if (a === 'identites') return ouvrirIdentites();
    if (a === 'difficile') return jourDifficile();
    if (a === 'fin-difficile') { delete S.difficiles[aujourdhui()]; sauver(); U.garderDefilement = true; render('dur'); return dire('Mode jour difficile retiré.'); }
    if (a === 'alleger') return allegerJournee();
    if (a === 'nouvelle-habitude') return ouvrirHabitude(null);
    if (a === 'nouvel-objectif') return ouvrirObjectif(null);
    if (b.classList.contains('colonne')) {
      if (U.selection || U.brouillon) { U.selection = null; U.brouillon = null; return render(); }
      const r = b.getBoundingClientRect();
      const m = borne(Math.floor((e.clientY - r.top) / H * 60 / 30) * 30, 0, 1440 - CONFIG.duree);
      U.brouillon = { k: b.dataset.jour, debut: m, fin: m + CONFIG.duree };
      return render();
    }
  });
  // Clavier : « / » ou Ctrl+K pour chercher ; flèches pour changer de mois ou de jour dans le calendrier
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape' && (U.selection || U.brouillon)) { U.selection = null; U.brouillon = null; render(); return; }
    const t = e.target;
    if (t.closest && t.closest('input, select, textarea')) return;
    if ((e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) || ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K'))) { e.preventDefault(); ouvrirLoupe(); return; }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && (U.onglet === 'calendrier' || paysage()) && !e.altKey && !e.metaKey && !e.ctrlKey && !(t.closest && t.closest('.segments, .onglets'))) {
      e.preventDefault();
      naviguer(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  // ---------- Le temps passe ----------
  function rafraichir() {
    crediter();
    const libre = !G && !document.querySelector('dialog[open]');
    if (libre) { U.garderDefilement = true; render(); accueillir(); }
  }
  setInterval(rafraichir, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (S.coffre.actif) envoyerCoffre(); return; }
    if (S.minuteur) { avancerMinuteur(); ecrire(); }
    rafraichir();
    synchroniser();
    planifierCoffre();
  });

  // ---------- Une app, pas une page ----------
  // Safari : pas de zoom au pincement (le réglage du viewport ne suffit pas toujours sur iPhone)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  // Tourner le téléphone : plein écran calendrier, ou retour à l'onglet
  MQ_PAYSAGE.addEventListener('change', () => {
    U.selection = null; U.brouillon = null;
    delete U.defile.jour;
    render();
  });
  window.addEventListener('resize', () => { if (paysage() && S.vueCal !== 'jour' && !G) render(); });

  // ---------- Le clavier de l'iPhone ----------
  // Safari place les éléments fixes sur toute la hauteur de l'écran, même quand le clavier en cache la moitié,
  // et garde parfois un décalage après l'avoir rangé. On suit la partie réellement visible :
  // les feuilles s'y calent (au-dessus du clavier), l'app aussi dès qu'aucun champ n'est en cours de saisie.
  const VV = window.visualViewport;
  const RACINE = document.documentElement;
  const SAISIE = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable="true"]';
  const enSaisie = () => { const a = document.activeElement; return !!a && a !== document.body && a.matches(SAISIE); };
  function suivreVue() {
    if (!VV || Math.abs(VV.scale - 1) > .01) return;          // zoom d'accessibilité : on ne touche à rien
    const haut = Math.max(0, Math.round(VV.offsetTop));
    const h = Math.round(VV.height);
    const bas = Math.max(0, Math.round(window.innerHeight - haut - h));
    const st = RACINE.style;
    st.setProperty('--vv-haut', haut + 'px');
    st.setProperty('--vv-bas', bas + 'px');
    st.setProperty('--vv-h', h + 'px');
    RACINE.classList.toggle('clavier', bas > 120);
    if (!enSaisie()) { st.setProperty('--app-haut', haut + 'px'); st.setProperty('--app-bas', bas + 'px'); }
  }
  if (VV) {
    VV.addEventListener('scroll', suivreVue);
    VV.addEventListener('resize', () => {
      suivreVue();
      // Le clavier sort : le champ en cours reste en vue dans sa feuille
      const a = document.activeElement;
      if (enSaisie() && a.closest('dialog')) requestAnimationFrame(() => a.scrollIntoView({ block: 'nearest' }));
    });
    suivreVue();
  }
  // Le clavier rangé : l'écran revient à sa place
  document.addEventListener('focusout', () => setTimeout(() => {
    if (enSaisie()) return;
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    if (document.body.scrollTop) document.body.scrollTop = 0;
    suivreVue();
  }, 120));

  // ---------- Démarrage ----------
  // Mises à jour : à chaque retour dans l'app, on regarde s'il existe une nouvelle édition ; quand elle prend la main,
  // l'app se recharge d'elle-même (pendant une saisie, elle attend que la feuille se ferme).
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const avaitMain = !!navigator.serviceWorker.controller;
    let recharge = false;
    const recharger = () => {
      if (recharge) return;
      if (document.querySelector('dialog[open]')) { document.addEventListener('close', recharger, { capture: true, once: true }); return; }
      recharge = true;
      location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (avaitMain) recharger(); });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => { /* hors ligne indisponible */ });
  }
  try {
    const vue = +localStorage.getItem('ascend-edition') || 0;
    if (vue && vue < EDITION) setTimeout(() => dire(`ASCEND est à jour (édition ${EDITION}).`), 1900);
    if (vue !== EDITION) localStorage.setItem('ascend-edition', String(EDITION));
  } catch (e) { /* stockage indisponible */ }
  crediter();
  if (S.minuteur) { avancerMinuteur(); demarrerTic(); }
  // Écran de lancement : le A d'ASCEND, le temps d'un souffle
  const L0 = $('#lancement');
  L0.innerHTML = `${sceneLancement()}<div class="marque">${logo()}<b>ASCEND</b><small>Make everyday matter.</small></div>`;
  if (V.conf.actif) verrouiller(true);
  render();
  setTimeout(() => L0.classList.add('parti'), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1100);
  setTimeout(() => L0.remove(), 1800);
  setTimeout(accueillir, 1300);
  if (erreurStockage) dire('Attention : le téléphone refuse d\'enregistrer. Libère de la place.');
  synchroniser();
  if (S.coffre.actif) setTimeout(() => envoyerCoffre(), 5000);
  window.ascend = { version: VERSION, edition: EDITION };
})();
