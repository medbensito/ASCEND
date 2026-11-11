  // ---------- Niveaux et looks ----------
  // Dix niveaux (CONFIG.paliers). Chaque niveau atteint débloque un look : la couleur d'accent de toute l'app et l'emblème.
  // S.look = null : on porte le look de son niveau ; sinon l'identifiant d'un niveau déjà atteint (S.niveauMax).
  // S.niveauFete = le dernier niveau fêté : un niveau perdu puis regagné n'est pas fêté deux fois.
  function lookActif() { return CONFIG.paliers.find((p, i) => p.id === S.look && i <= S.niveauMax) || palier(); }
  const degrade = p => `linear-gradient(135deg, ${p.c.map((c, i) => `${c} ${Math.round(i * 100 / (p.c.length - 1))}%`).join(', ')})`;
  let lookPose = null;
  function appliquerLook(force) {
    const p = force || lookActif();
    if (lookPose === p.id) return;
    lookPose = p.id;
    const st = document.documentElement.style;
    st.setProperty('--accent', degrade(p));
    st.setProperty('--accent-texte', p.texte);
    st.setProperty('--arc', p.arc);
  }

  const ND = $('#niveaux');
  function ouvrirNiveaux() { renderNiveaux(); if (!ND.open) ND.showModal(); }
  function renderNiveaux(focus) {
    const i = niveauIdx(), P = palier(), suiv = palierSuivant(), porte = lookActif();
    ND.querySelector('.f-icone').innerHTML = ICONE.croix;
    const pc = suiv ? Math.max(2, Math.round((S.points - P.seuil) / (suiv.seuil - P.seuil) * 100)) : 100;
    $('#n-corps').innerHTML = `
      <section class="carte n-tete" aria-label="Niveau ${i + 1}, ${P.nom}. ${nombre(S.points)} points${suiv ? `, encore ${nombre(suiv.seuil - S.points)} avant ${suiv.nom}` : ''}">
        <span class="n-embleme" aria-hidden="true">${embleme(P.id)}</span>
        <div aria-hidden="true"><small>Niveau ${i + 1} sur ${CONFIG.paliers.length}</small><b>${P.nom}</b>
          <span class="barre-obj"><i style="width:${pc}%"></i></span>
          <span class="note">${suiv ? `Encore ${nombre(suiv.seuil - S.points)} pts avant ${suiv.nom}` : 'Le sommet. Tu y es.'}</span></div>
      </section>
      <label class="carte rang n-auto"><span><span>Suivre mon niveau<span class="sous">Le look change tout seul à chaque niveau</span></span></span><span class="interrupteur"><input type="checkbox" data-n-auto${S.look ? '' : ' checked'}><i></i></span></label>
      <div><span class="etiquette" id="n-looks">Tes looks</span>
      <div class="lignes" role="group" aria-labelledby="n-looks">${CONFIG.paliers.map((p, n) => {
        const ouvert = n <= S.niveauMax, mis = p.id === porte.id;
        return `<button type="button" class="carte n-ligne${ouvert ? '' : ' ferme'}${mis ? ' mis' : ''}" data-n-look="${p.id}" data-focus="nl${n}" aria-pressed="${mis}"${ouvert ? '' : ' aria-disabled="true"'}
          aria-label="Niveau ${n + 1}, ${p.nom}, look ${p.look}. ${ouvert ? (mis ? 'Porté' : 'Débloqué, toucher pour le porter') : `Verrouillé, à ${nombre(p.seuil)} points`}">
          <span class="n-embleme petit" aria-hidden="true">${embleme(p.id)}</span>
          <span class="quoi" aria-hidden="true"><b>${p.nom}</b><small>Niveau ${n + 1} · ${nombre(p.seuil)} pts</small></span>
          <span class="n-look" aria-hidden="true"><i style="background:${degrade(p)}"></i>${p.look}</span>
          <span class="n-etat" aria-hidden="true">${mis ? ICONE.coche : ouvert ? '' : '🔒'}</span></button>`; }).join('')}</div></div>
      <p class="note" style="text-align:center">Un niveau atteint reste débloqué, même si tes points redescendent.</p>`;
    if (focus) { const c = ND.querySelector(`[data-focus="${CSS.escape(focus)}"]`); if (c) c.focus(); }
  }
  ND.addEventListener('change', e => {
    if (!e.target.matches('[data-n-auto]')) return;
    S.look = e.target.checked ? null : lookActif().id;
    sauver(); appliquerLook(); renderNiveaux();
    ND.querySelector('[data-n-auto]').focus();
    dire(S.look ? `Tu gardes le look ${lookActif().look}, même en changeant de niveau.` : `Le look suit ton niveau : ${lookActif().look}.`);
  });
  ND.addEventListener('click', e => {
    const b = e.target.closest('[data-n-look]');
    if (!b) return;
    const n = CONFIG.paliers.findIndex(p => p.id === b.dataset.nLook), p = CONFIG.paliers[n];
    if (n > S.niveauMax) return dire(`🔒 ${p.nom} se débloque à ${nombre(p.seuil)} pts : encore ${nombre(p.seuil - S.points)}.`);
    S.look = p.id === palier().id ? null : p.id;
    sauver(); appliquerLook(); renderNiveaux(b.dataset.focus);
    dire(`Look ${p.look} porté.`);
  });
  ND.addEventListener('close', () => { U.garderDefilement = true; render(); });

  // ----- L'écran de célébration : à chaque niveau franchi, une fois
  const FD = $('#fete');
  function feterNiveau() {
    const i = niveauIdx();
    if (i <= S.niveauFete || i === 0) return;
    if (V.etat !== 'ouvert' || document.querySelector('dialog[open]')) return;      // on attend que l'écran soit libre
    const P = CONFIG.paliers[i], suiv = palierSuivant(), nouveaux = i - S.niveauFete, garde = S.look && S.look !== P.id ? lookActif() : null;
    S.niveauFete = i; S.niveauMax = Math.max(S.niveauMax, i);
    ecrire();
    const faites = Object.keys(S.payes).filter(k => S.payes[k].type === 'tache' && S.payes[k].pts > 0).length;
    const jours = S.depuis ? ecart(S.depuis, aujourdhui()) + 1 : 0;
    appliquerLook(P);
    FD.querySelector('#fe-corps').innerHTML = `
      <div class="fe-rayons" aria-hidden="true"></div>
      <div class="fe-embleme" aria-hidden="true">${embleme(P.id)}</div>
      <p class="fe-sur">Niveau ${i + 1}</p>
      <h2 id="fe-titre">${P.nom}</h2>
      <p id="fe-texte">${nombre(P.seuil)} points franchis. ${nouveaux > 1 ? `Tes niveaux t'ont débloqué ${nouveaux} looks, jusqu'au look ${P.look}.` : `Tu débloques le look ${P.look}.`}</p>
      <ul class="fe-chiffres" aria-label="Ton chemin jusqu'ici">
        <li><b>${nombre(S.points)}</b><small>points</small></li>
        <li><b>${nombre(faites)}</b><small>${faites > 1 ? 'tâches faites' : 'tâche faite'}</small></li>
        <li><b>${nombre(Math.max(S.meilleureSerie || 0, serie()))}</b><small>meilleure série</small></li>
      </ul>
      <p class="fe-suite">${suiv ? `Prochain niveau : ${suiv.nom}, à ${nombre(suiv.seuil)} pts` : 'Tu es au sommet. Make everyday matter.'}${jours > 1 ? ` · jour ${nombre(jours)} sur ASCEND` : ''}</p>
      <div class="fe-boutons">
        ${garde ? `<button type="button" class="bouton" data-fe="porter">Porter le look ${P.look}</button><button type="button" class="lien" data-fe="garder">Garder mon look ${garde.look}</button>`
          : `<button type="button" class="bouton" data-fe="ok">Continuer</button>${nouveaux > 1 ? `<button type="button" class="lien" data-fe="looks">Voir mes looks</button>` : ''}`}
      </div>`;
    FD.showModal();
    FD.querySelector('.bouton').focus();
  }
  FD.addEventListener('click', e => {
    const b = e.target.closest('[data-fe]');
    if (!b) return;
    if (b.dataset.fe === 'porter') { S.look = null; sauver(); }
    FD.close();
    if (b.dataset.fe === 'looks') ouvrirNiveaux();
  });
  FD.addEventListener('close', () => { lookPose = null; appliquerLook(); U.garderDefilement = true; render(); });
  // Un gain peut tomber pendant qu'une feuille est ouverte : on fête dès qu'elle se ferme
  document.addEventListener('close', e => { if (e.target !== FD && e.target.tagName === 'DIALOG') setTimeout(feterNiveau, 500); }, true);
