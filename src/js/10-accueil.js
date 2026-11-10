  // ---------- Morceaux communs ----------
  const plage = el => `${hhmm(el.debut)} – ${finTexte(el.fin)}`;
  const ptsTexte = n => `${n > 0 ? '+' : ''}${n} pt${Math.abs(n) > 1 ? 's' : ''}`;
  function description(o) {
    const el = o.el, l = look(el);
    let d = `${el.titre}, ${o.k === aujourdhui() ? '' : jourLong(o.k) + ', '}de ${hhmm(el.debut)} à ${finTexte(el.fin)}, ${l.nom}`;
    if (el.rep) d += ', ' + REPET[el.rep.freq].toLowerCase();
    if (el.type === 'libre') d += ', ' + ETAT_LIBRE[etatLibre(o)];
    if (el.type === 'sansecran') d += ', ' + ETAT_ECRAN[etatSansEcran(o)];
    if (el.type === 'tache') d += o.fait ? ', faite' : ', à faire';
    const p = S.payes[o.cle];
    if (p && p.pts) d += `, +${p.pts} points gagnés`;
    else if (el.type === 'tache' && !prevue(o)) d += ', ne rapporte pas de points (ajoutée après son début)';
    else if (el.type === 'tache') d += `, rapporte ${valeur(el)} points`;
    return d;
  }
  // Ce que rapporte un élément, à droite de sa ligne
  function ptsElement(o) {
    const p = S.payes[o.cle];
    if (p) return p.pts ? `<span class="pts gagne" aria-hidden="true">+${p.pts}</span>` : `<span class="pts nul" aria-hidden="true">0 pt</span>`;
    if (o.el.type === 'tache' && !prevue(o)) return `<span class="pts nul" aria-hidden="true">0 pt</span>`;
    if (o.el.type === 'libre' && etatLibre(o) === 'grignote') return `<span class="pts nul" aria-hidden="true">grignoté</span>`;
    return `<span class="pts" aria-hidden="true">+${valeur(o.el)} pts</span>`;
  }
  const rondCoche = (cle, coche, label, attr) => `<button type="button" class="rond-coche" role="checkbox" aria-checked="${coche}" ${attr}="${esc(cle)}" aria-label="${esc(label)}" data-focus="${attr.replace('data-', '')}${esc(cle)}">${ICONE.coche}</button>`;
  function sousTitre(o) {
    const el = o.el;
    if (el.type === 'libre') return `${plage(el)} · Pour moi · ${ETAT_LIBRE[etatLibre(o)]}`;
    if (el.type === 'sansecran') return `${plage(el)} · Sans écran · ${ETAT_ECRAN[etatSansEcran(o)]}`;
    const ob = el.objectif && S.objectifs.find(x => x.id === el.objectif);
    return `${plage(el)} · ${cat(el.cat).nom}${ob ? ' · 🎯 ' + ob.titre : ''}`;
  }
  // Ligne d'un élément. cocheGauche : la case à gauche (accueil), sinon à droite après l'icône (calendrier)
  function ligneOcc(o, cocheGauche) {
    const el = o.el, l = look(el);
    const coche = el.type === 'tache' ? rondCoche(o.cle, o.fait, `${el.titre} : ${o.fait ? 'faite' : 'à faire'}`, 'data-cocher') : '';
    const ouvrir = `<button type="button" class="ouvrir" data-ouvrir="${o.cle}" aria-label="${esc(description(o))}" data-focus="o${o.cle}">
        ${cocheGauche ? '' : `<span class="tuile" style="--c:${l.couleur}" aria-hidden="true">${l.icone}</span>`}
        <span class="quoi" aria-hidden="true"><b>${esc(el.titre)}</b><small>${esc(sousTitre(o))}</small></span>${ptsElement(o)}</button>`;
    return `<div class="carte ligne${o.fait ? ' faite' : ''}${U.repere === o.cle ? ' repere' : ''}" style="--c:${l.couleur}">
      ${cocheGauche ? (coche || `<span class="tuile petite" style="--c:${l.couleur}" aria-hidden="true">${l.icone}</span>`) : ''}${ouvrir}${cocheGauche ? '' : coche}</div>`;
  }
  function ligneHabitude(h, k, cocheGauche) {
    const fait = !!h.faits[k], c = cat(h.cat), s = serieHabitude(h);
    const p = S.payes[cleHab(h, k)];
    const pts = p && p.pts ? `<span class="pts gagne" aria-hidden="true">+${p.pts}</span>` : `<span class="pts" aria-hidden="true">+${c.points} pts</span>`;
    const coche = rondCoche(h.id + '|' + k, fait, `${h.titre}, habitude : ${fait ? 'faite' : 'à faire'}`, 'data-habitude');
    return `<div class="carte ligne${fait ? ' faite' : ''}" style="--c:${c.couleur}">
      ${cocheGauche ? coche : ''}
      <button type="button" class="ouvrir" data-ouvrir-hab="${h.id}" aria-label="${esc(h.titre)}, habitude ${esc(c.nom)}, série de ${pluriel(s, 'jour')}, ${fait ? 'faite' : 'à faire'} : ouvrir" data-focus="oh${h.id}">
        ${cocheGauche ? '' : `<span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span>`}
        <span class="quoi" aria-hidden="true"><b>${esc(h.titre)}</b><small>Habitude · ${esc(c.nom)}${s ? ` · 🔥 ${s} j` : ''}</small></span>${pts}</button>
      ${cocheGauche ? '' : coche}</div>`;
  }

  // ---------- Accueil ----------
  // Petite courbe du total de points sur 14 jours (décor : le nombre est écrit à côté)
  function courbePoints() {
    const auj = aujourdhui(), jours = Array.from({ length: 14 }, (_, i) => decaler(auj, i - 13));
    let total = S.points;
    const valeurs = [];
    for (let i = jours.length - 1; i >= 0; i--) { valeurs[i] = total; total -= gainDuJour(jours[i]); }
    const min = Math.min(...valeurs), max = Math.max(...valeurs), et = max - min || 1;
    const pts = valeurs.map((v, i) => [i / 13 * 200, 62 - (v - min) / et * 46]);
    const ligne = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    return `<svg class="courbe" viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true"><defs>
      <linearGradient id="cp-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5cff" stop-opacity=".55"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></linearGradient>
      <linearGradient id="cp-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f6bff"/><stop offset="1" stop-color="#b38bff"/></linearGradient></defs>
      <path d="${ligne}L200 70L0 70z" fill="url(#cp-f)"/><path d="${ligne}" fill="none" stroke="url(#cp-l)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function aValider() {
    const auj = aujourdhui(), res = [];
    for (let i = CONFIG.validation; i >= 0; i--) duJour(decaler(auj, -i)).forEach(o => { if (o.el.type === 'sansecran' && etatSansEcran(o) === 'a-valider') res.push(o); });
    return res;
  }
  function vueAccueil() {
    const auj = aujourdhui(), P = palier(), suiv = palierSuivant(), g = gainDuJour(auj);
    const occs = duJour(auj), habs = S.habitudes.filter(h => habitudeDue(h, auj));
    const prevues = minutesPrevues(auj), plafond = S.reglages.plafond;
    const M = S.minuteur, s = serie(), foc = focusEntre(auj, auj);
    const val = aValider();
    return `
      <header class="tete salut">
        <div><h1>Bonjour ${esc(S.profil.prenom || '')} 👋</h1><p>Continue d'avancer.</p></div>
        <button type="button" class="avatar" data-action="profil" aria-label="Profil et réglages" data-focus="profil">${esc((S.profil.initiales || '?').slice(0, 2))}</button>
      </header>
      <section class="carte points" aria-labelledby="tes-points">
        <h2 class="libelle" id="tes-points"><span class="etoile" aria-hidden="true">${ICONE.etoile}</span>Tes points</h2>
        <p class="total"><b class="${U.reaction ? 'monte' : ''}">${nombre(S.points)}</b>
          <span class="${g ? '' : 'zero'}">${g > 0 ? ICONE.hausse : ''}${g ? (g > 0 ? '+' : '') + nombre(g) : '+0'}<span class="masque"> aujourd'hui</span></span></p>
        <p class="palier"><b>${P.nom}</b>${suiv ? ` · encore ${nombre(suiv.seuil - S.points)} pts avant ${suiv.nom}` : ' · palier ultime'}</p>
        ${embleme(P.id)}
        ${courbePoints()}
      </section>
      ${prevues > plafond ? `<div class="carte alerte" role="note"><span class="ic" aria-hidden="true">⚠️</span><p><b>Journée chargée : ${duree(prevues)} prévues</b> pour un plafond de ${duree(plafond)}. Allège ta journée ou garde un moment pour toi.</p></div>` : ''}
      ${val.map(o => `<div class="carte a-valider" style="--c:${JOMO.sansecran.couleur}">
        <p>📵 Moment sans écran terminé : <b>${esc(o.el.titre)}</b>. Tu l'as tenu ?<small>${o.k === auj ? '' : cap(quandJour(o.k)) + ', '}${plage(o.el)} · +${CONFIG.points.sansecran} pts si tenu</small></p>
        <div class="boutons deux"><button type="button" class="bouton petit" data-tenu="${o.cle}" data-focus="tenu${o.cle}">Tenu</button><button type="button" class="bouton petit secondaire" data-pas-tenu="${o.cle}" data-focus="pas${o.cle}">Pas tenu</button></div></div>`).join('')}
      ${cartePriorites()}
      <section aria-labelledby="auj-titre">
        <div class="section-tete"><h2 id="auj-titre">Aujourd'hui</h2><button type="button" class="lien" data-action="voir-tout" data-focus="voir-tout">Voir tout ${ICONE.fleche}</button></div>
        <div class="lignes">
          ${occs.map(o => ligneOcc(o, true)).join('')}
          ${habs.map(h => ligneHabitude(h, auj, true)).join('')}
          ${!occs.length && !habs.length ? '<p class="carte vide">Rien de prévu aujourd\'hui. Ajoute une tâche, une habitude… ou garde la journée pour toi.</p>' : ''}
        </div>
      </section>
      <button type="button" class="bouton" data-action="ajouter" data-focus="ajouter">${ICONE.plus} Ajouter une tâche</button>
      <div class="duo">
        <button type="button" class="carte mini" data-action="serie" data-focus="serie" aria-label="Série actuelle : ${pluriel(s, 'jour')} d'affilée avec toutes tes habitudes. Meilleure : ${pluriel(Math.max(S.meilleureSerie, s), 'jour')}.">
          <span class="titre-mini" aria-hidden="true">🔥 Série</span><b aria-hidden="true">${s} j</b><small aria-hidden="true">Meilleure : ${Math.max(S.meilleureSerie, s)} j</small></button>
        <button type="button" class="carte mini" data-action="minuteur" data-focus="minuteur" aria-label="${M ? 'Concentration en cours : ouvrir le minuteur' : `Concentration : ${duree(foc.total)} aujourd'hui. Lancer une session`}">
          <span class="titre-mini" aria-hidden="true">⏱️ Concentration</span>
          <b aria-hidden="true" ${M ? 'data-reste-mini' : ''}>${M ? texteMinuteurCourt() : duree(foc.total)}</b>
          <small aria-hidden="true">${M ? ({ travail: 'Session en cours', pause: 'Pause', pret: 'Prêt à reprendre' }[M.phase]) : 'Lancer une session'}</small></button>
      </div>`;
  }
