  // ---------- Profil et réglages (l'avatar « MB ») ----------
  const PD = $('#profil');
  function ouvrirProfil() { renderProfil(); PD.showModal(); setTimeout(preparerRappels, 0); setTimeout(preparerVerrou, 0); }
  function renderProfil() {
    const P = palier(), suiv = palierSuivant(), R = S.reglages;
    const plafonds = []; for (let m = 4 * 60; m <= 14 * 60; m += 30) plafonds.push(m);
    $('#p-corps').innerHTML = `
      <div class="profil-tete">
        <span class="avatar" aria-hidden="true">${esc((S.profil.initiales || '?').slice(0, 2))}</span>
        <div style="display:grid;gap:2px"><b style="font-size:18px">${esc(S.profil.prenom || 'Toi')}</b><span class="note">${nombre(S.points)} pts · ${P.nom}${suiv ? ` · ${nombre(suiv.seuil - S.points)} avant ${suiv.nom}` : ''}</span></div>
        <span class="embleme-p" aria-hidden="true">${embleme(P.id)}</span>
      </div>
      <fieldset><legend>Toi</legend><div class="groupe">
        <label class="rang"><span>Prénom</span><input type="text" data-profil="prenom" maxlength="24" autocomplete="given-name" value="${esc(S.profil.prenom || '')}" style="max-width:55%;text-align:right;border:1px solid var(--trait-fort);background:rgba(10,12,34,.8);border-radius:10px;padding:8px 10px;min-height:40px;font-size:16px"></label>
        <label class="rang"><span>Initiales</span><input type="text" data-profil="initiales" maxlength="2" autocomplete="off" value="${esc(S.profil.initiales || '')}" style="width:64px;text-align:center;text-transform:uppercase;border:1px solid var(--trait-fort);background:rgba(10,12,34,.8);border-radius:10px;padding:8px 10px;min-height:40px;font-size:16px"></label>
      </div></fieldset>
      <fieldset><legend>Ton univers</legend><div class="groupe">
        <button type="button" class="rang" data-p="categories"><span><span class="ic">🗂️</span><span>Catégories<span class="sous">${S.categories.filter(c => c.active).length} actives · points et objectifs par semaine</span></span></span><span class="val">${ICONE.droite}</span></button>
        <label class="rang"><span><span class="ic">⚖️</span><span>Plafond par jour<span class="sous">JOMO : au-delà, ASCEND te prévient</span></span></span><select data-reglage="plafond">${plafonds.map(m => `<option value="${m}"${m === R.plafond ? ' selected' : ''}>${duree(m)}</option>`).join('')}</select></label>
        <label class="rang"><span><span class="ic">⏱️</span>Concentration</span><select data-reglage="travail">${[15, 20, 25, 30, 40, 45, 50].map(m => `<option value="${m}"${m === R.travail ? ' selected' : ''}>${m} min</option>`).join('')}</select></label>
        <label class="rang"><span><span class="ic">☕</span>Pause</span><select data-reglage="pause">${[3, 5, 10, 15].map(m => `<option value="${m}"${m === R.pause ? ' selected' : ''}>${m} min</option>`).join('')}</select></label>
      </div></fieldset>
      <fieldset id="r-verrou">${htmlVerrou()}</fieldset>
      <fieldset id="r-rappels">${htmlRappels()}</fieldset>
      <fieldset id="r-coffre">${htmlCoffre()}</fieldset>
      <p class="note" style="text-align:center">ASCEND · version ${VERSION} · Make everyday matter.</p>`;
  }
  PD.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.reglage) { S.reglages[t.dataset.reglage] = Number(t.value); sauver(); render(); dire('Réglage enregistré.'); return; }
    if (t.dataset.profil) {
      let v = t.value.trim();
      if (t.dataset.profil === 'initiales') v = v.toUpperCase().slice(0, 2);
      S.profil[t.dataset.profil] = v;
      sauver(); render();
      dire('Profil enregistré.');
    }
  });
  PD.addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (b && b.dataset.p === 'categories') ouvrirCategories();
    const r = e.target.closest('[data-r]');
    if (r && r.dataset.r === 'exporter') exporter();
    if (r && r.dataset.r === 'importer') $('#fichier-import').click();
  });
  PD.addEventListener('close', () => render());

  // ---------- Sauvegarde dans un fichier ----------
  async function exporter() {
    const nom = `ascend-sauvegarde-${aujourdhui()}.json`;
    const texte = JSON.stringify({ app: 'ascend', version: VERSION, exporteLe: new Date().toISOString(), donnees: JSON.parse(texteCopie()) }, null, 1);
    const fichier = new File([texte], nom, { type: 'application/json' });
    let fait = false;
    try {
      if (IOS && navigator.canShare && navigator.canShare({ files: [fichier] })) { await navigator.share({ files: [fichier], title: nom }); fait = true; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (!fait) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(fichier); a.download = nom;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    S.derniereExport = new Date().toISOString();
    sauver();
    majCoffreUI('Données exportées.');
  }
  $('#fichier-import').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    let d;
    try { const j = JSON.parse(await f.text()); d = j && j.app === 'ascend' && j.donnees ? j.donnees : null; } catch (err) { d = null; }
    if (!d || !Array.isArray(d.elements)) { dire('Ce fichier n\'est pas une sauvegarde d\'ASCEND.'); return; }
    const ok = await demander('Restaurer ce fichier ?', `${pluriel(d.elements.length, 'élément')}, ${pluriel((d.habitudes || []).length, 'habitude')}, ${pluriel((d.objectifs || []).length, 'objectif')}, ${nombre(d.points || 0)} points. Il remplacera ce qu'il y a sur ce téléphone.`,
      [{ texte: 'Restaurer', valeur: true }, { texte: 'Annuler', valeur: false, clair: true }]);
    if (!ok) return;
    appliquerRestauration(d);
    sauver();
    if (PD.open) renderProfil();
    render();
    dire('Sauvegarde restaurée.');
  });

  // ---------- Minuteur de concentration ----------
  const MD = $('#minuteur');
  let tic = null;
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const resteMinuteur = () => { const M = S.minuteur; return !M ? S.reglages.travail * 6e4 : M.reste != null ? M.reste : M.fin ? M.fin - Date.now() : 0; };
  function texteMinuteurCourt() { const M = S.minuteur; return M && M.phase !== 'pret' ? mmss(resteMinuteur()) : 'Prêt'; }
  function ouvrirMinuteur() { U.choixFocus = U.choixFocus || (catsActives()[0] || S.categories[0]).id; renderMinuteur(); if (!MD.open) MD.showModal(); demarrerTic(); }
  function demarrerTic() { clearInterval(tic); tic = setInterval(tictac, 1000); }
  function tictac() {
    const change = avancerMinuteur();
    if (change) {
      sauver();
      if (MD.open) { renderMinuteur(); dire(change === 'pause' ? `Session terminée : +${S.reglages.travail} min de concentration. Pause !` : 'Pause terminée. On reprend ?'); }
      else render();
      return;
    }
    if (MD.open) {
      const t = MD.querySelector('[data-temps]'), arc = MD.querySelector('[data-arc]'), M = S.minuteur;
      if (t) t.textContent = mmss(resteMinuteur());
      if (arc && M && M.fin) { const tot = (M.phase === 'travail' ? S.reglages.travail : S.reglages.pause) * 6e4; arc.setAttribute('stroke-dasharray', `${(2 * Math.PI * 64 * (1 - resteMinuteur() / tot)).toFixed(1)} 999`); }
    } else {
      const m = document.querySelector('[data-reste-mini]');
      if (m) m.textContent = texteMinuteurCourt();
      if (!S.minuteur) { clearInterval(tic); tic = null; }
    }
  }
  function renderMinuteur() {
    const M = S.minuteur, R = S.reglages;
    const phase = M ? M.phase : 'reglage';
    const tot = (phase === 'pause' ? R.pause : R.travail) * 6e4;
    const reste = phase === 'reglage' || phase === 'pret' ? tot : resteMinuteur();
    const c = cat(M ? M.cat : U.choixFocus);
    const libelle = { reglage: 'Prêt', travail: 'Concentration', pause: 'Pause', pret: 'Pause finie' }[phase];
    const r = 64, circ = 2 * Math.PI * r;
    $('#m-corps').innerHTML = `
      <div class="m-haut"><button type="button" class="f-icone" data-m="fermer" aria-label="Réduire le minuteur">${ICONE.croix}</button><h2 id="m-titre">Concentration</h2><span></span></div>
      <div class="m-centre">
        <div class="m-tache"><b>${M && M.titre ? esc(M.titre) : 'Session libre'}</b><small>${c.icone} ${esc(c.nom)} · Pomodoro ${R.travail} / ${R.pause}</small></div>
        <div class="m-anneau" role="timer" aria-live="off" aria-label="${libelle} : ${mmss(reste)} restantes">
          <svg viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${phase === 'pause' ? '#2fd3c5' : '#4f6bff'}"/><stop offset="1" stop-color="${phase === 'pause' ? '#57c3ff' : '#9a5cff'}"/></linearGradient></defs>
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="rgba(129,140,255,.14)" stroke-width="8"/>
            <circle data-arc cx="80" cy="80" r="${r}" fill="none" stroke="url(#gm)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(circ * (1 - reste / tot)).toFixed(1)} 999" style="filter:drop-shadow(0 0 8px rgba(110,100,255,.8))"/></svg>
          <div class="temps" aria-hidden="true"><b data-temps>${mmss(reste)}</b><span>${libelle}</span></div>
        </div>
        ${M ? `<div class="m-cycles" role="img" aria-label="${pluriel(M.phase === 'travail' ? M.cycle - 1 : M.cycle, 'session terminée', 'sessions terminées')}">${Array.from({ length: Math.max(4, M.cycle) }, (_, i) => `<i class="${i < (M.phase === 'travail' ? M.cycle - 1 : M.cycle) ? 'fait' : ''}"></i>`).join('')}</div>` : ''}
        ${phase === 'reglage' ? `<div style="display:grid;gap:8px;width:100%"><span class="etiquette" id="m-cat-lib" style="text-align:left">Catégorie</span>
          <div class="lp-filtres" style="padding:0;justify-content:center" role="group" aria-labelledby="m-cat-lib">${catsActives().map(x => `<button type="button" class="filtre" aria-pressed="${x.id === U.choixFocus}" data-m-cat="${esc(x.id)}">${x.icone} ${esc(x.nom)}</button>`).join('')}</div></div>` : ''}
      </div>
      <div class="boutons">
        ${phase === 'reglage' ? `<button type="button" class="bouton" data-m="demarrer">${ICONE.lecture} Démarrer ${R.travail} min</button>` : ''}
        ${phase === 'travail' || phase === 'pause' ? (M.reste != null ? `<button type="button" class="bouton" data-m="reprendre">${ICONE.lecture} Reprendre</button>` : `<button type="button" class="bouton" data-m="pause">${ICONE.pause} Mettre en pause</button>`) : ''}
        ${phase === 'pause' ? '<button type="button" class="bouton secondaire" data-m="passer">Passer la pause</button>' : ''}
        ${phase === 'pret' ? `<button type="button" class="bouton" data-m="relancer">${ICONE.lecture} Nouvelle session de ${R.travail} min</button>` : ''}
        ${M ? '<button type="button" class="bouton secondaire" data-m="arreter">Terminer</button>' : ''}
      </div>`;
  }
  MD.addEventListener('click', e => {
    const ch = e.target.closest('[data-m-cat]');
    if (ch) { U.choixFocus = ch.dataset.mCat; renderMinuteur(); MD.querySelector(`[data-m-cat="${CSS.escape(U.choixFocus)}"]`).focus(); return; }
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const a = b.dataset.m, M = S.minuteur;
    if (a === 'fermer') { MD.close(); return; }
    if (a === 'demarrer') demarrerMinuteur(null, U.choixFocus);
    if (a === 'pause' && M) { M.reste = M.fin - Date.now(); }
    if (a === 'reprendre' && M) { const tot = (M.phase === 'travail' ? S.reglages.travail : S.reglages.pause) * 6e4; M.fin = Date.now() + M.reste; M.debut = M.fin - tot; M.reste = null; }
    if (a === 'passer' && M) { M.phase = 'pret'; M.fin = null; M.reste = null; }
    if (a === 'relancer' && M) { Object.assign(M, { phase: 'travail', debut: Date.now(), fin: Date.now() + S.reglages.travail * 6e4, reste: null, cycle: M.cycle + 1 }); }
    if (a === 'arreter') {
      const avant = S.focus.length;
      arreterMinuteur();
      sauver(); render();
      MD.close();
      const f = S.focus.length > avant ? S.focus[S.focus.length - 1] : null;
      dire(f ? `Session terminée : ${duree(f.min)} de concentration.` : 'Minuteur arrêté.');
      return;
    }
    sauver();
    if (S.minuteur) synchroniser(true);
    renderMinuteur();
    const f = MD.querySelector('.boutons .bouton');
    if (f) f.focus();
  });
  MD.addEventListener('close', () => { render(); if (!S.minuteur) { clearInterval(tic); tic = null; } });
