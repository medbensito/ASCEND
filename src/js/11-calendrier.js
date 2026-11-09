  // ---------- Calendrier ----------
  function vueCalendrier() {
    const mois = S.vueCal !== 'jour';
    return `
      <header class="tete">
        <div><h1>Calendrier</h1><p>Planifie. Organise. Réussis.</p></div>
        <div class="actions-tete">
          <button type="button" class="icone-bouton" data-action="chercher" aria-label="Chercher" aria-keyshortcuts="/" data-focus="chercher">${ICONE.loupe}</button>
          <button type="button" class="icone-bouton" data-action="aujourdhui" aria-label="Aujourd'hui" data-focus="auj">${ICONE.calendrier}</button>
        </div>
      </header>
      <div class="segments" role="group" aria-label="Affichage">
        <button type="button" aria-pressed="${mois}" data-vue-cal="mois" data-focus="vc-mois">Mois</button>
        <button type="button" aria-pressed="${!mois}" data-vue-cal="jour" data-focus="vc-jour">Jour</button>
      </div>
      ${mois ? vueMois() : vueJour()}`;
  }

  // Mois : la grille de la maquette, avec des points sous les jours, et la liste du jour choisi en dessous
  function vueMois() {
    const k = U.date, d = parse(k), auj = aujourdhui();
    const premier = dk(new Date(d.getFullYear(), d.getMonth(), 1));
    const debut = lundiDe(premier);
    const nom = cap(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    let cases = '';
    for (let i = 0; i < 42; i++) {
      const j = decaler(debut, i);
      if (i === 35 && j.slice(0, 7) !== k.slice(0, 7)) break;      // pas de 6e ligne vide
      const occs = duJour(j);
      const couleurs = [];
      occs.forEach(o => { const c = look(o.el).couleur; if (!couleurs.includes(c)) couleurs.push(c); });
      const charge = minutesPrevues(j) > S.reglages.plafond;
      const n = occs.length;
      cases += `<button type="button" class="jour-m${j.slice(0, 7) !== k.slice(0, 7) ? ' dehors' : ''}${j === auj ? ' auj' : ''}${charge ? ' charge' : ''}" data-choisir="${j}" aria-pressed="${j === k}" data-focus="m${j}"
        aria-label="${jourLong(j)}${j === auj ? ", aujourd'hui" : ''}${n ? ', ' + pluriel(n, 'élément') : ''}${charge ? ', journée chargée' : ''}">
        <span class="n" aria-hidden="true">${parse(j).getDate()}</span>${couleurs.length ? `<span class="pts-j" aria-hidden="true">${couleurs.slice(0, 3).map(c => `<i style="--c:${c}"></i>`).join('')}</span>` : ''}</button>`;
    }
    const occs = duJour(k), habs = S.habitudes.filter(h => habitudeDue(h, k));
    const m = minutesPrevues(k);
    return `
      <section class="carte" aria-labelledby="mois-nom">
        <div class="cal-tete">
          <button type="button" class="icone-bouton" data-nav="-1" aria-label="Mois précédent" data-focus="nav-1">${ICONE.gauche}</button>
          <h2 id="mois-nom" aria-live="polite">${esc(nom)}</h2>
          <button type="button" class="icone-bouton" data-nav="1" aria-label="Mois suivant" data-focus="nav1">${ICONE.droite}</button>
        </div>
        <div class="mois-grille" data-balayage="mois">
          ${JOURS_COURTS.map((j, i) => `<span class="jsem" aria-hidden="true" title="${JOURS_LONGS[i]}">${j}</span>`).join('')}
          ${cases}
        </div>
      </section>
      <section aria-labelledby="jour-choisi">
        <div class="jour-liste-tete"><h2 id="jour-choisi">${k === auj ? "Aujourd'hui · " : ''}${jourLong(k)}</h2>
          <button type="button" class="lien fort" data-ouvrir-jour="${k}" data-focus="voir-jour">Voir la journée ${ICONE.fleche}</button></div>
        ${m ? `<p class="note" style="margin:-4px 2px 10px">${duree(m)} de tâches prévues${m > S.reglages.plafond ? ` · au-dessus du plafond (${duree(S.reglages.plafond)})` : ''}</p>` : ''}
        <div class="lignes">
          ${occs.map(o => ligneOcc(o, false)).join('')}
          ${habs.map(h => ligneHabitude(h, k, false)).join('')}
          ${!occs.length && !habs.length ? `<p class="carte vide">Rien de prévu ${quandJour(k)}.</p>` : ''}
        </div>
      </section>
      <button type="button" class="bouton" data-action="ajouter" data-focus="ajouter">${ICONE.plus} Ajouter une tâche</button>`;
  }

  // Jour : la grille horaire, avec les gestes (toucher un vide, appui long, glisser, poignées)
  function disposer(liste) {
    const items = liste.map(o => ({ o, d: o.el.debut, f: Math.max(o.el.fin, o.el.debut + 20) })).sort((a, b) => a.d - b.d || b.f - a.f);
    const res = [];
    let groupe = [], finGroupe = -1;
    const fermer = () => { const n = Math.max(...groupe.map(g => g.col)) + 1; groupe.forEach(g => { g.n = n; res.push(g); }); groupe = []; };
    items.forEach(it => {
      if (groupe.length && it.d >= finGroupe) fermer();
      const fins = [];
      groupe.forEach(g => { fins[g.col] = Math.max(fins[g.col] || 0, g.f); });
      let c = 0;
      while (fins[c] != null && fins[c] > it.d) c++;
      it.col = c;
      groupe.push(it);
      finGroupe = Math.max(finGroupe, it.f);
    });
    if (groupe.length) fermer();
    return res;
  }
  function bloc(g) {
    const o = g.o, el = o.el, l = look(el);
    const haut = el.debut / 60 * H, hauteur = Math.max((el.fin - el.debut) / 60 * H, 22);
    const court = hauteur < 42;
    const choisi = U.selection === o.cle;
    const etat = el.type === 'libre' ? etatLibre(o) : el.type === 'sansecran' ? etatSansEcran(o) : null;
    const p = S.payes[o.cle];
    return `<div class="bloc ${el.type}${etat === 'grignote' ? ' grignote' : ''}${o.fait ? ' fait' : ''}${court ? ' court' : ''}${choisi ? ' choisi' : ''}${U.repere === o.cle ? ' repere' : ''}" data-cle="${o.cle}"
        style="top:${haut}px;height:${hauteur}px;left:calc(${g.col / g.n * 100}% + 2px);width:calc(${100 / g.n}% - 4px);--c:${l.couleur}">
      <button type="button" class="b-ouvrir" data-ouvrir="${o.cle}" aria-label="${esc(description(o))}" data-focus="o${o.cle}"></button>
      ${el.type === 'tache' ? rondCoche(o.cle, o.fait, `${el.titre} : ${o.fait ? 'faite' : 'à faire'}`, 'data-cocher') : ''}
      <span class="b-texte" aria-hidden="true"><b>${l.icone} ${esc(el.titre)}</b><small>${hhmm(el.debut)}${court ? '' : ' – ' + finTexte(el.fin)}${etat ? ' · ' + (el.type === 'libre' ? ETAT_LIBRE[etat] : ETAT_ECRAN[etat]) : ''}</small></span>
      ${p && p.pts ? `<span class="gain" aria-hidden="true">+${p.pts}</span>` : ''}
      <span class="bord" data-bord="bas" aria-hidden="true"></span>
      ${choisi ? '<span class="poignee haut" data-bord="haut" aria-hidden="true"></span><span class="poignee bas" data-bord="bas" aria-hidden="true"></span>' : ''}
    </div>`;
  }
  function blocBrouillon(b) {
    const hauteur = Math.max((b.fin - b.debut) / 60 * H, 22);
    return `<div class="bloc brouillon${hauteur < 42 ? ' court' : ''}" data-brouillon="1" style="top:${b.debut / 60 * H}px;height:${hauteur}px;left:2px;width:calc(100% - 4px)">
      <button type="button" class="b-ouvrir" data-action="remplir" aria-label="Nouvelle plage de ${hhmm(b.debut)} à ${finTexte(b.fin)} : toucher pour la remplir" data-focus="brouillon"></button>
      <span class="b-texte" aria-hidden="true"><b>Nouvelle</b><small>${hhmm(b.debut)} – ${finTexte(b.fin)}</small></span>
      <span class="poignee haut" data-bord="haut" aria-hidden="true"></span><span class="poignee bas" data-bord="bas" aria-hidden="true"></span>
    </div>`;
  }
  function grille(jours) {
    const auj = aujourdhui(), mn = jours.includes(auj) ? minNow() : -99;
    let h = '';
    for (let i = 1; i < 24; i++) h += `${Math.abs(i * 60 - mn) < 14 ? '' : `<div class="heure" style="top:${i * H}px">${hhmm(i * 60)}</div>`}<div class="trait-h" style="top:${i * H}px"></div>`;
    const cols = jours.map(k => {
      const blocs = disposer(duJour(k)).map(bloc).join('');
      const br = U.brouillon && U.brouillon.k === k ? blocBrouillon(U.brouillon) : '';
      return `<div class="colonne${k === auj ? ' auj' : ''}" data-jour="${k}">${blocs}${br}</div>`;
    }).join('');
    const ligne = mn < 0 ? '' : `<div class="maintenant" style="top:${mn / 60 * H}px"><span>${hhmm(mn)}</span></div>`;
    return `<div class="grille">${h}<div class="colonnes" style="--n:${jours.length}" role="group" aria-label="Grille horaire : toucher un créneau vide pour y poser une plage">${cols}</div>${ligne}</div><div class="bas-espace"></div>`;
  }
  function bandeSemaine(k) {
    const l = lundiDe(k), auj = aujourdhui();
    return Array.from({ length: 7 }, (_, i) => {
      const d = decaler(l, i), n = duJour(d).length;
      return `<button type="button" class="jour-b${d === auj ? ' auj' : ''}" data-aller="${d}" aria-pressed="${d === k}" data-focus="j${d}"
        aria-label="${jourLong(d)}${d === auj ? ", aujourd'hui" : ''}${n ? ', ' + pluriel(n, 'élément') : ''}">
        <span aria-hidden="true">${JOURS_COURTS[i]}</span><b aria-hidden="true">${parse(d).getDate()}</b><i class="${n ? 'plein' : ''}" aria-hidden="true"></i></button>`;
    }).join('');
  }
  function vueJour() {
    const k = U.date, m = minutesPrevues(k), pl = S.reglages.plafond;
    return `<div class="cal-jour">
      <div class="bande">
        <button type="button" class="fleche" data-saut="-7" aria-label="Semaine précédente" data-focus="s-7">${ICONE.gauche}</button>
        ${bandeSemaine(k)}
        <button type="button" class="fleche" data-saut="7" aria-label="Semaine suivante" data-focus="s7">${ICONE.droite}</button>
      </div>
      <div class="jour-entete">
        <h2 aria-live="polite">${k === aujourdhui() ? "Aujourd'hui" : jourLong(k)}</h2>
        <div class="jauge${m > pl ? ' depasse' : ''}" role="img" aria-label="${duree(m)} de tâches prévues sur un plafond de ${duree(pl)}${m > pl ? ' : journée chargée' : ''}">
          <small aria-hidden="true"><b>${duree(m)}</b> / ${duree(pl)}</small><span class="barre" aria-hidden="true"><i style="width:${Math.min(100, m / pl * 100)}%"></i></span></div>
      </div>
      <div class="defile" data-defile="jour">${grille([k])}</div>
      <button type="button" class="fab" data-action="ajouter" aria-label="Ajouter une tâche" data-focus="fab">${ICONE.plus}</button>
    </div>`;
  }

  // ---------- Paysage : le calendrier seul, en plein écran (la vue en cours, en grand) ----------
  const MQ_PAYSAGE = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
  const paysage = () => MQ_PAYSAGE.matches;
  function moisPaysage() {
    const k = U.date, d = parse(k), auj = aujourdhui();
    const debut = lundiDe(dk(new Date(d.getFullYear(), d.getMonth(), 1)));
    const jours = [];
    for (let i = 0; i < 42; i++) { const j = decaler(debut, i); if (i === 35 && j.slice(0, 7) !== k.slice(0, 7)) break; jours.push(j); }
    const rangs = jours.length / 7;
    // Combien de tâches tiennent dans une case : le numéro du jour (et « +N » à côté), puis une ligne par tâche
    const hApp = ($('.app') || {}).clientHeight || window.innerHeight;
    const place = Math.max(1, Math.floor(((hApp - 78) / rangs - 4 - 8 - 18) / 17));
    const cases = jours.map(j => {
      const occs = duJour(j), charge = minutesPrevues(j) > S.reglages.plafond;
      const montrees = occs.slice(0, place);
      const reste = occs.length - montrees.length;
      return `<button type="button" class="case-m${j.slice(0, 7) !== k.slice(0, 7) ? ' dehors' : ''}${j === auj ? ' auj' : ''}"${j === k ? ' aria-current="date"' : ''} data-ouvrir-jour="${j}" data-focus="pm${j}"
          aria-label="${jourLong(j)}${j === auj ? ", aujourd'hui" : ''}${occs.length ? ' : ' + occs.map(o => `${o.el.titre} à ${hhmm(o.el.debut)}${o.fait ? ', faite' : ''}`).join(' ; ') : ', rien de prévu'}${charge ? ', journée chargée' : ''}. Voir la journée">
        <span class="n" aria-hidden="true"><span>${parse(j).getDate()}</span>${reste ? `<em class="encore">+${reste}</em>` : ''}${charge ? '<i>⚠︎</i>' : ''}</span>
        ${montrees.map(o => `<span class="chip${o.fait ? ' fait' : ''}" style="--c:${look(o.el).couleur}" aria-hidden="true">${o.el.type === 'tache' ? '' : look(o.el).icone + ' '}${esc(o.el.titre)}</span>`).join('')}</button>`;
    }).join('');
    return `<div class="pay-mois" style="--rangs:${rangs}" data-balayage="mois">${JOURS_LONGS.map(n => `<span class="jsem" aria-hidden="true">${n.slice(0, 3)}</span>`).join('')}${cases}</div>`;
  }
  function vuePaysage() {
    const jour = S.vueCal === 'jour', k = U.date, auj = aujourdhui();
    const titre = jour ? (k === auj ? "Aujourd'hui · " : '') + jourLong(k) : cap(parse(k).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    const m = minutesPrevues(k), pl = S.reglages.plafond;
    return `<h1 class="masque">Calendrier</h1>
      <div class="pay"${jour ? ' data-balayage="jour"' : ''}>
        <div class="pay-barre">
          <button type="button" class="icone-bouton" data-nav="-1" aria-label="${jour ? 'Jour précédent' : 'Mois précédent'}" data-focus="nav-1">${ICONE.gauche}</button>
          <h2 aria-live="polite">${esc(titre)}</h2>
          <button type="button" class="icone-bouton" data-nav="1" aria-label="${jour ? 'Jour suivant' : 'Mois suivant'}" data-focus="nav1">${ICONE.droite}</button>
          ${jour ? `<div class="jauge${m > pl ? ' depasse' : ''}" role="img" aria-label="${duree(m)} de tâches prévues sur un plafond de ${duree(pl)}${m > pl ? ' : journée chargée' : ''}"><small aria-hidden="true"><b>${duree(m)}</b> / ${duree(pl)}</small><span class="barre" aria-hidden="true"><i style="width:${Math.min(100, m / pl * 100)}%"></i></span></div>` : ''}
          <div class="segments" role="group" aria-label="Affichage">
            <button type="button" aria-pressed="${!jour}" data-vue-cal="mois" data-focus="vc-mois">Mois</button>
            <button type="button" aria-pressed="${jour}" data-vue-cal="jour" data-focus="vc-jour">Jour</button>
          </div>
          <button type="button" class="icone-bouton" data-action="aujourdhui" aria-label="Aujourd'hui" data-focus="auj">${ICONE.calendrier}</button>
          <button type="button" class="icone-bouton" data-action="chercher" aria-label="Chercher" data-focus="chercher">${ICONE.loupe}</button>
        </div>
        ${jour ? `<div class="defile" data-defile="jour">${grille([k])}</div>
          <button type="button" class="fab" data-action="ajouter" aria-label="Ajouter une tâche" data-focus="fab">${ICONE.plus}</button>` : moisPaysage()}
      </div>`;
  }
