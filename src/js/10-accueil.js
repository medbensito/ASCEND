  // ---------- Morceaux communs ----------
  // Événement sur la journée (flou) : « Toute la journée », ou sa période s'il dure plusieurs jours (finLe)
  const jourCourt = k => fmt(k, { day: 'numeric', month: 'short' });
  const periode = el => el.date.slice(0, 7) === el.finLe.slice(0, 7) ? `Du ${parse(el.date).getDate()} au ${jourCourt(el.finLe)}` : `Du ${jourCourt(el.date)} au ${jourCourt(el.finLe)}`;
  const plage = el => el.type === 'evenement' && el.flou ? (el.finLe ? periode(el) : 'Toute la journée') : el.flou ? `Dans la journée · ${duree(el.fin - el.debut)}` : `${hhmm(el.debut)} – ${finTexte(el.fin)}`;
  const ptsTexte = n => `${n > 0 ? '+' : ''}${n} pt${Math.abs(n) > 1 ? 's' : ''}`;
  function description(o) {
    const el = o.el, l = look(el);
    let d = `${el.titre}, ${o.k === aujourdhui() ? '' : jourLong(o.k) + ', '}${el.type === 'evenement' && el.flou ? (el.finLe ? `du ${jourLong(el.date).toLowerCase()} au ${jourLong(el.finLe).toLowerCase()}, jour ${ecart(el.date, o.k) + 1} sur ${ecart(el.date, el.finLe) + 1}` : 'toute la journée') : el.flou ? 'dans la journée' : `de ${hhmm(el.debut)} à ${finTexte(el.fin)}`}, ${l.nom}`;
    if (el.rep) d += ', ' + REPET[el.rep.freq].toLowerCase();
    if (el.type === 'libre') d += ', ' + ETAT_LIBRE[etatLibre(o)];
    if (el.type === 'sansecran') d += ', ' + ETAT_ECRAN[etatSansEcran(o)];
    if (el.type === 'tache') d += o.fait ? ', faite' : S.partis[o.cle] ? ', laissée partir' : ', à faire';
    const p = S.payes[o.cle];
    if (p && p.pts) d += `, +${p.pts} points gagnés`;
    else if (el.type === 'tache' && !prevue(o)) d += ', ne rapporte pas de points (ajoutée après son début)';
    else if (el.type === 'tache') d += `, rapporte ${valeur(el)} points`;
    return d;
  }
  // Ce que rapporte un élément, à droite de sa ligne
  function ptsElement(o) {
    if (o.el.type === 'evenement') return '';
    const p = S.payes[o.cle];
    if (p) return p.pts ? `<span class="pts gagne" aria-hidden="true">+${p.pts}</span>` : `<span class="pts nul" aria-hidden="true">0 pt</span>`;
    if (o.el.type === 'tache' && !o.fait && S.partis[o.cle]) return `<span class="pts nul" aria-hidden="true">🍃</span>`;
    if (o.el.type === 'tache' && !prevue(o)) return `<span class="pts nul" aria-hidden="true">0 pt</span>`;
    if (o.el.type === 'libre' && etatLibre(o) === 'grignote') return `<span class="pts nul" aria-hidden="true">grignoté</span>`;
    return `<span class="pts" aria-hidden="true">+${valeur(o.el)} pts</span>`;
  }
  const rondCoche = (cle, coche, label, attr) => `<button type="button" class="rond-coche" role="checkbox" aria-checked="${coche}" ${attr}="${esc(cle)}" aria-label="${esc(label)}" data-focus="${attr.replace('data-', '')}${esc(cle)}">${ICONE.coche}</button>`;
  function sousTitre(o) {
    const el = o.el;
    if (el.type === 'libre') return `${plage(el)} · Pour moi · ${ETAT_LIBRE[etatLibre(o)]}`;
    if (el.type === 'sansecran') return `${plage(el)} · Sans écran · ${ETAT_ECRAN[etatSansEcran(o)]}`;
    if (el.type === 'evenement') return `${plage(el)}${el.finLe ? ` · jour ${ecart(el.date, o.k) + 1}/${ecart(el.date, el.finLe) + 1}` : ''} · Événement`;
    const ob = el.objectif && S.objectifs.find(x => x.id === el.objectif);
    return `${plage(el)} · ${cat(el.cat).nom}${!o.fait && courage(el) ? ` · 🔥 repoussée ${el.reports} fois` : ''}${!o.fait && S.partis[o.cle] ? ' · laissée partir' : ''}${ob ? ' · 🎯 ' + ob.titre : ''}`;
  }
  // Ligne d'un élément. cocheGauche : la case à gauche (accueil), sinon à droite après l'icône (calendrier)
  function ligneOcc(o, cocheGauche) {
    const el = o.el, l = look(el);
    const coche = el.type === 'tache' ? rondCoche(o.cle, o.fait, `${el.titre} : ${o.fait ? 'faite' : 'à faire'}`, 'data-cocher') : '';
    const ouvrir = `<button type="button" class="ouvrir" data-ouvrir="${o.cle}" aria-label="${esc(description(o))}" data-focus="o${o.cle}">
        ${cocheGauche ? '' : `<span class="tuile" style="--c:${l.couleur}" aria-hidden="true">${l.icone}</span>`}
        <span class="quoi" aria-hidden="true"><b>${esc(el.titre)}</b><small>${esc(sousTitre(o))}</small></span>${ptsElement(o)}</button>`;
    return `<div class="carte ligne${o.fait ? ' faite' : ''}${U.repere === o.cle ? ' repere' : ''}" style="--c:${l.couleur}"${el.type === 'tache' ? ` data-glisse="${o.cle}"` : ''}>
      ${cocheGauche ? (coche || `<span class="tuile petite" style="--c:${l.couleur}" aria-hidden="true">${l.icone}</span>`) : ''}${ouvrir}${cocheGauche ? '' : coche}</div>`;
  }
  function ligneHabitude(h, k, cocheGauche) {
    const fait = !!h.faits[k], c = cat(h.cat), s = serieHabitude(h);
    const p = S.payes[cleHab(h, k)];
    const pts = p && p.pts ? `<span class="pts gagne" aria-hidden="true">+${p.pts}</span>` : `<span class="pts" aria-hidden="true">+${ptsHabitude(h, k)} pts</span>`;
    const coche = rondCoche(h.id + '|' + k, fait, `${titreHabitude(h, k)}, habitude : ${fait ? 'faite' : 'à faire'}`, 'data-habitude');
    return `<div class="carte ligne${fait ? ' faite' : ''}" style="--c:${c.couleur}">
      ${cocheGauche ? coche : ''}
      <button type="button" class="ouvrir" data-ouvrir-hab="${h.id}" aria-label="${esc(h.titre)}, habitude ${esc(c.nom)}, série de ${pluriel(s, 'jour')}, ${fait ? 'faite' : 'à faire'} : ouvrir" data-focus="oh${h.id}">
        ${cocheGauche ? '' : `<span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span>`}
        <span class="quoi" aria-hidden="true"><b>${esc(titreHabitude(h, k))}</b><small>${difficile(k) ? 'Version mini' : 'Habitude'} · ${esc(c.nom)}${s ? ` · 🔥 ${s} j` : ''}</small></span>${pts}</button>
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
    const plat = max === min;
    const pts = valeurs.map((v, i) => [3 + i / 13 * 194, plat ? 46 - 10 * Math.sin(i / 13 * Math.PI * 1.6) - i * 1.2 : 62 - (v - min) / et * 46]);
    const ligne = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    const doux = pts.map((p, i) => { if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`; const q = pts[i - 1], m = (q[0] + p[0]) / 2; return `C${m.toFixed(1)} ${q[1].toFixed(1)} ${m.toFixed(1)} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; }).join('');
    const fin = pts[13];
    return `<svg class="courbe" viewBox="0 -8 200 86" preserveAspectRatio="none" aria-hidden="true"><defs>
      <linearGradient id="cp-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="cp-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff"/></linearGradient>
      <filter id="cp-g" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
      <path d="${doux}L197 78L3 78z" fill="url(#cp-f)"/>
      <path d="${doux}" fill="none" stroke="url(#cp-l)" stroke-width="5" filter="url(#cp-g)" opacity=".8" vector-effect="non-scaling-stroke"/>
      <path d="${doux}" fill="none" stroke="url(#cp-l)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
      <circle cx="${fin[0].toFixed(1)}" cy="${fin[1].toFixed(1)}" r="1.6" fill="#fff"/></svg>`;
  }
  function aValider() {
    const auj = aujourdhui(), res = [];
    for (let i = CONFIG.validation; i >= 0; i--) duJour(decaler(auj, -i)).forEach(o => { if (o.el.type === 'sansecran' && etatSansEcran(o) === 'a-valider') res.push(o); });
    return res;
  }
  // « Ta progression cette semaine » : part des objectifs de la semaine déjà atteinte ; ouvre le bilan en cours
  function carteSemaine() {
    const st = statsSemaine(lundiDe(aujourdhui()));
    if (st.taux == null) return '';
    const pc = Math.round(st.taux * 100), d = st.diff;
    return `<button type="button" class="carte mini sem-carte" data-action="bilan-semaine" data-focus="sem" aria-label="Ta progression cette semaine : ${pc} % de tes objectifs${d == null ? '' : `, ${d > 0 ? '+' : ''}${Math.round(d * 100)} % de points par rapport à la semaine dernière`}. Ouvrir le bilan">
        <span class="titre-mini" aria-hidden="true">📈 Semaine</span><b aria-hidden="true">${pc}<small> %</small></b>
        <small aria-hidden="true">${d == null ? 'des objectifs' : `<b class="${d > .005 ? 'hausse' : d < -.005 ? 'baisse' : ''}">${d > 0 ? '+' : ''}${Math.round(d * 100)} %</b> de points`}</small></button>`;
  }
  function vueAccueil() {
    const auj = aujourdhui(), P = palier(), suiv = palierSuivant(), g = gainDuJour(auj);
    const occs = duJour(auj), habs = S.habitudes.filter(h => habitudeDue(h, auj));
    const prevues = minutesPrevues(auj), plafond = S.reglages.plafond;
    const M = S.minuteur, sd = serieDetail(), s = sd.n, foc = focusEntre(auj, auj);
    const dur = difficile(auj), resteT = occs.filter(o => o.el.type === 'tache' && !o.fait && o.el.debut > minNow()).length;
    const val = aValider();
    return `
      <header class="tete salut">
        <div><h1>Bonjour ${esc(S.profil.prenom || '')}</h1><p>Continue d'avancer.</p></div>
        <button type="button" class="avatar" data-action="profil" aria-label="Profil et réglages" data-focus="profil">${esc((S.profil.initiales || '?').slice(0, 2))}</button>
      </header>
      <section class="points" aria-labelledby="tes-points">
        <h2 class="masque" id="tes-points">Tes points</h2>
        <p class="total"><b class="${U.reaction ? 'monte' : ''}">${nombre(S.points)}</b><small>pts</small>
          <span class="${g ? '' : 'zero'}">${g > 0 ? ICONE.hausse : ''}${g ? (g > 0 ? '+' : '') + nombre(g) : '+0'}<span class="masque"> aujourd'hui</span></span></p>
        ${courbePoints()}
        <div class="niveau-rang"><p class="niveau palier"><button type="button" data-action="niveaux" data-focus="niveaux" aria-label="Niveau ${niveauIdx() + 1}, ${P.nom}${suiv ? `, encore ${nombre(suiv.seuil - S.points)} points avant ${suiv.nom}` : ''}. Voir les niveaux et les looks">${embleme(P.id)}<b aria-hidden="true">Niveau ${niveauIdx() + 1} · ${P.nom}</b>${suiv ? `<small aria-hidden="true">encore ${nombre(suiv.seuil - S.points)} pts</small>` : ''}</button></p>
        <p class="niveau">${pastilleRecompenses()}</p></div>
      </section>
      ${carteMaintenant()}
      ${carteEnergie(false)}
      ${carteCoach()}
      ${prevues > plafond ? `<div class="carte alerte" role="note"><span class="ic" aria-hidden="true">⚠️</span><p><b>Journée chargée : ${duree(prevues)} prévues</b> pour un plafond de ${duree(plafond)}. Allège ta journée ou garde un moment pour toi.</p></div>` : ''}
      ${val.map(o => `<div class="carte a-valider" style="--c:${JOMO.sansecran.couleur}">
        <p>📵 Moment sans écran terminé : <b>${esc(o.el.titre)}</b>. Tu l'as tenu ?<small>${o.k === auj ? '' : cap(quandJour(o.k)) + ', '}${plage(o.el)} · +${CONFIG.points.sansecran} pts si tenu</small></p>
        <div class="boutons deux"><button type="button" class="bouton petit" data-tenu="${o.cle}" data-focus="tenu${o.cle}">Tenu</button><button type="button" class="bouton petit secondaire" data-pas-tenu="${o.cle}" data-focus="pas${o.cle}">Pas tenu</button></div></div>`).join('')}
      ${dur ? `<section class="carte difficile" aria-labelledby="dur-titre"><h2 id="dur-titre"><span aria-hidden="true">🌧️</span> Jour difficile</h2>
        <p>Fais le minimum : tes habitudes sont en version mini, et ta série continue. Le reste peut attendre.</p>
        <div class="boutons${resteT ? ' deux' : ''}">${resteT ? `<button type="button" class="bouton petit" data-action="alleger" data-focus="alleger">Reporter ${resteT > 1 ? 'mes ' + resteT + ' tâches' : 'ma tâche'} à demain</button>` : ''}
          <button type="button" class="bouton petit secondaire" data-action="fin-difficile" data-focus="dur">Finalement, ça va</button></div></section>` : ''}
      ${cartePasFaites()}
      <section aria-labelledby="auj-titre">
        <div class="section-tete"><h2 id="auj-titre">Aujourd'hui</h2><button type="button" class="lien" data-action="voir-tout" data-focus="voir-tout">Voir tout ${ICONE.fleche}</button></div>
        <div class="lignes">
          ${occs.map(o => ligneOcc(o, true)).join('')}
          ${habs.map(h => ligneHabitude(h, auj, true)).join('')}
          ${!occs.length && !habs.length ? '<p class="carte vide">Rien de prévu aujourd\'hui. Ajoute une tâche, une habitude… ou garde la journée pour toi.</p>' : ''}
        </div>
        ${!dur && (habs.some(h => !h.faits[auj]) || resteT) ? `<button type="button" class="lien dur-lien" data-action="difficile" data-focus="dur">🌧️ Journée difficile ? Passe en version mini</button>` : ''}
      </section>
      ${cartePriorites()}
      ${rappelChange()}
      <div class="duo${carteSemaine() ? ' trio' : ''}">
        ${carteSemaine()}
        <button type="button" class="carte mini" data-action="serie" data-focus="serie" aria-label="Série actuelle : ${pluriel(s, 'jour')} d'affilée avec toutes tes habitudes. Meilleure : ${pluriel(Math.max(S.meilleureSerie, s), 'jour')}.">
          <span class="titre-mini" aria-hidden="true">🔥 Série</span><b aria-hidden="true">${s} j</b><small aria-hidden="true">${sd.pardons.length && ecart(sd.pardons[0], auj) < CONFIG.pardon ? '🛟 1 jour pardonné' : 'Meilleure : ' + Math.max(S.meilleureSerie, s) + ' j'}</small></button>
        <button type="button" class="carte mini" data-action="minuteur" data-focus="minuteur" aria-label="${M ? 'Concentration en cours : ouvrir le minuteur' : `Concentration : ${duree(foc.total)} aujourd'hui. Lancer une session`}">
          <span class="titre-mini" aria-hidden="true">⏱️ Focus</span>
          <b aria-hidden="true" ${M ? 'data-reste-mini' : ''}>${M ? texteMinuteurCourt() : duree(foc.total)}</b>
          <small aria-hidden="true">${M ? ({ travail: 'Session en cours', pause: 'Pause', pret: 'Prêt à reprendre' }[M.phase]) : 'Lancer une session'}</small></button>
      </div>
      ${carteIdentites()}
      ${carteEnergie(true)}`;
  }
