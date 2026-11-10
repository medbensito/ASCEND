  // ---------- Bilan de la semaine ----------
  // Chaque lundi (dès 5 h, à la première ouverture), le bilan de la semaine passée s'ouvre : points, objectifs par catégorie
  // et leur bonus, priorités tenues, habitudes, JOMO, concentration ; puis on choisit 1 à 3 priorités pour la semaine qui commence.
  // Il s'ouvre aussi à la demande (Progression), avec la semaine en cours et les précédentes.
  const dimancheDe = lundi => decaler(lundi, 6);
  const cleSemaine = (lundi, id) => 's:' + lundi + ':' + id;
  // Objectif de la semaine atteint : la moitié des points de l'objectif, en plus (Sport : 2 × 50 pts → +50)
  const bonusSemaine = c => Math.round(c.points * c.objectif * CONFIG.points.bonusSemaine / 5) * 5;
  // Verse le bonus des semaines terminées depuis peu, pour chaque catégorie active dont l'objectif est atteint.
  // Une fois versé, il n'est repris que si l'on décoche sous l'objectif retenu ce jour-là.
  function verifierSemaines() {
    const lundiAuj = lundiDe(aujourdhui());
    let change = false;
    for (let i = 1; i <= 2; i++) {
      const lundi = decaler(lundiAuj, -7 * i), dim = dimancheDe(lundi);
      if (dim < (S.depuis || aujourdhui())) continue;
      S.categories.forEach(c => {
        const cle = cleSemaine(lundi, c.id), p = S.payes[cle], n = faitsCat(c.id, lundi, dim);
        if (p) { if (n < (p.obj || 1)) { reprendre(cle); change = true; } return; }
        if (!c.active || !c.objectif || n < c.objectif) return;
        gagner(cle, bonusSemaine(c), dim, 'semaine', c.id);
        S.payes[cle].obj = c.objectif;
        change = true;
      });
    }
    return change;
  }
  // Une catégorie dans le bilan : faits, objectif, bonus (versé, ou à venir pour la semaine en cours)
  function objectifsSemaine(lundi) {
    const dim = dimancheDe(lundi);
    return S.categories.filter(c => S.payes[cleSemaine(lundi, c.id)] || (c.active && c.objectif > 0)).map(c => {
      const p = S.payes[cleSemaine(lundi, c.id)], objectif = (p && p.obj) || c.objectif, n = faitsCat(c.id, lundi, dim);
      return { c, n, objectif, atteint: n >= objectif, bonus: p ? p.pts : bonusSemaine(c), paye: !!p };
    });
  }
  function statsSemaine(lundi) {
    const auj = aujourdhui(), dim = dimancheDe(lundi), enCours = auj <= dim, fin = enCours ? auj : dim;
    const G = gainsEntre(lundi, dim);
    // Comparaison : la semaine d'avant entière, ou jusqu'au même jour si la semaine est en cours
    const lundiAv = decaler(lundi, -7);
    const Gav = gainsEntre(lundiAv, enCours ? decaler(lundiAv, ecart(lundi, auj)) : dimancheDe(lundiAv));
    let prevues = 0, faites = 0, partis = 0, meilleur = null, jours = 0, complets = 0;
    for (let k = lundi; k <= dim; k = decaler(k, 1)) {
      duJour(k).forEach(o => { if (o.el.type === 'tache') { prevues++; if (o.fait) faites++; else if (S.partis[o.cle]) partis++; } });
      if (k > fin) continue;
      const g = gainDuJour(k);
      if (g > 0 && (!meilleur || g > meilleur.pts)) meilleur = { k, pts: g };
      const c = jourComplet(k);
      if (c !== null) { jours++; if (c) complets++; }
    }
    const cats = objectifsSemaine(lundi);
    const cible = cats.reduce((t, x) => t + x.objectif, 0);
    const taux = cible ? cats.reduce((t, x) => t + Math.min(x.n, x.objectif), 0) / cible : null;
    return { lundi, dim, enCours, reste: enCours ? ecart(auj, dim) : 0, G, Gav, diff: Gav.total > 0 ? (G.total - Gav.total) / Gav.total : null,
      bonus: G.src.semaine || 0, prevues, faites, partis, meilleur, jours, complets, cats, taux,
      J: jomoEntre(lundi, dim), F: focusEntre(lundi, dim), prio: S.priorites[lundi] || [] };
  }
  function phraseBilan(st) {
    if (st.enCours) return st.reste ? `Semaine en cours : encore ${pluriel(st.reste, 'jour')} pour atteindre tes objectifs.` : 'Dernier jour de la semaine : un dernier effort ?';
    if (st.taux != null && st.taux >= 1) return 'Semaine parfaite : tous tes objectifs sont atteints. 🏆';
    if (st.taux != null && st.taux >= .7) return 'Belle semaine : tu as tenu l\'essentiel. ⚡';
    if (st.diff != null && st.diff > .05) return 'Mieux que la semaine d\'avant. Continue comme ça !';
    if (!st.G.total) return 'Une semaine calme. Choisis 1 à 3 priorités et lance-toi. 🌿';
    return 'Une semaine en demi-teinte. Garde 1 à 3 priorités, et laisse le reste filer. 🌿';
  }
  const jourMois = k => { const d = parse(k); return `${d.getDate() === 1 ? '1er' : d.getDate()} ${fmt(k, { month: 'long' })}`; };
  const texteSemaine = lundi => {
    const d = dimancheDe(lundi), a = parse(lundi), b = parse(d);
    return a.getMonth() === b.getMonth() ? `du ${a.getDate() === 1 ? '1er' : a.getDate()} au ${jourMois(d)}` : `du ${jourMois(lundi)} au ${jourMois(d)}`;
  };

  // ---------- Priorités de la semaine ----------
  const prioritesDe = lundi => S.priorites[lundi] || [];
  function editeurPriorites(lundi) {
    const l = prioritesDe(lundi);
    return `<div class="groupe prio-edit">${[0, 1, 2].map(i => `<label class="prio-champ"><span class="num" aria-hidden="true">${i + 1}</span><span class="masque">Priorité ${i + 1}</span>
      <input data-prio="${i}" data-id="${l[i] ? esc(l[i].id) : ''}" maxlength="60" autocomplete="off" enterkeyhint="${i < 2 ? 'next' : 'done'}" placeholder="${['Ce qui compte le plus', 'Ensuite', 'Et enfin'][i]}" value="${l[i] ? esc(l[i].titre) : ''}"></label>`).join('')}</div>`;
  }
  // Lit les champs du bilan ; renvoie vrai si les priorités ont changé
  function lirePriorites() {
    const champs = [...BD.querySelectorAll('[data-prio]')];
    if (!B.cible || !champs.length) return false;
    const avant = prioritesDe(B.cible), l = [];
    champs.forEach(c => {
      const t = c.value.trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!t) { c.dataset.id = ''; return; }
      const a = avant.find(x => x.id === c.dataset.id);
      const e = { id: a ? a.id : uid(), titre: t, fait: !!(a && a.fait) };
      c.dataset.id = e.id;
      l.push(e);
    });
    if (JSON.stringify(avant) === JSON.stringify(l)) return false;
    if (l.length) S.priorites[B.cible] = l; else delete S.priorites[B.cible];
    sauver();
    if (B.cible === lundiDe(aujourdhui())) B.change = true;
    return true;
  }
  function cocherPriorite(v) {
    const [lundi, id] = v.split('|'), p = prioritesDe(lundi).find(x => x.id === id);
    if (!p) return;
    p.fait = !p.fait;
    sauver();
    U.garderDefilement = true;
    render();
    const l = prioritesDe(lundi), n = l.filter(x => x.fait).length;
    dire(p.fait ? (n === l.length ? `Toutes tes priorités de la semaine sont tenues ! 🎯` : `Priorité tenue 💪 · ${n} / ${l.length}`) : 'Décochée.');
  }
  // Sur l'accueil : les priorités de la semaine, ou l'invitation à les choisir
  function cartePriorites() {
    const lundi = lundiDe(aujourdhui()), l = prioritesDe(lundi);
    if (!l.length) return `<button type="button" class="carte b-entree" data-action="priorites" data-focus="prio-choisir">
        <span class="tuile" style="--c:#7b6cff" aria-hidden="true">🎯</span><span class="quoi"><b>Choisis tes priorités de la semaine</b><small>1 à 3 choses qui comptent vraiment.</small></span>${ICONE.droite}</button>`;
    const n = l.filter(x => x.fait).length;
    return `<section class="carte pad prio" aria-labelledby="prio-titre">
        <div class="section-tete"><h2 id="prio-titre">🎯 Priorités de la semaine <small>${n} / ${l.length}</small></h2><button type="button" class="lien" data-action="priorites" data-focus="prio-modifier" aria-label="Modifier les priorités de la semaine">Modifier</button></div>
        <div class="prio-liste">${l.map(p => `<div class="prio-ligne${p.fait ? ' faite' : ''}">${rondCoche(lundi + '|' + p.id, p.fait, `${p.titre} : ${p.fait ? 'tenue' : 'à faire'}`, 'data-priorite')}<span>${esc(p.titre)}</span></div>`).join('')}</div>
      </section>`;
  }

  // ---------- La feuille du bilan ----------
  const BD = $('#bilan');
  const B = { lundi: null, mode: 'bilan', auto: false, cible: null, change: false };
  const lundiMin = () => lundiDe(S.depuis || aujourdhui());
  // Semaine montrée par défaut : la dernière terminée, ou la semaine en cours si ASCEND est plus récent
  const lundiParDefaut = () => { const l = lundiDe(aujourdhui()), p = decaler(l, -7); return p >= lundiMin() ? p : l; };
  function ouvrirBilan(lundi, auto) {
    B.mode = 'bilan'; B.auto = !!auto; if (!BD.open) B.change = false;
    B.lundi = lundi || lundiParDefaut();
    renderBilan();
    if (!BD.open) { BD.showModal(); $('#b-titre').focus({ preventScroll: true }); }
    $('#b-corps').scrollTop = 0;
  }
  function ouvrirPriorites() {
    B.mode = 'priorites'; B.auto = false; if (!BD.open) B.change = false;
    renderBilan();
    if (!BD.open) BD.showModal();
    focusDepart(() => BD.querySelector('[data-prio]'));
  }
  function miniStat(icone, titre, val, sous, label) {
    return `<div class="mini carte" role="group" aria-label="${esc(label)}"><span class="titre-mini" aria-hidden="true">${icone} ${titre}</span><b aria-hidden="true">${val}</b><small aria-hidden="true">${sous}</small></div>`;
  }
  function renderBilan(focus) {
    const corps = $('#b-corps'), pied = $('#b-pied'), lundiAuj = lundiDe(aujourdhui());
    $('#bilan [data-fermer]').innerHTML = ICONE.croix;
    $('#bilan .f-msg').textContent = '';
    if (B.mode === 'priorites') {
      B.cible = lundiAuj;
      $('#b-titre').textContent = 'Priorités de la semaine';
      corps.innerHTML = `<p class="note">1 à 3 choses qui comptent vraiment, ${texteSemaine(lundiAuj)}. Elles s'affichent sur l'accueil : coche-les quand elles sont tenues.</p>${editeurPriorites(lundiAuj)}`;
      pied.innerHTML = `<button type="button" class="bouton" data-b="fermer">Enregistrer</button>`;
      return;
    }
    const st = statsSemaine(B.lundi), passee = B.lundi === decaler(lundiAuj, -7);
    B.cible = st.enCours ? B.lundi : passee ? lundiAuj : null;
    $('#b-titre').textContent = 'Bilan de la semaine';
    const pc = st.taux == null ? null : Math.round(st.taux * 100);
    const evol = st.diff == null ? '' : `<p class="evol"><b class="${st.diff > .005 ? 'hausse' : st.diff < -.005 ? 'baisse' : 'egal'}">${st.diff > .005 ? ICONE.hausse : st.diff < -.005 ? ICONE.baisse : ''}${st.diff > 0 ? '+' : ''}${Math.round(st.diff * 100)} %</b><small>${st.enCours ? 'vs le même jour, la semaine d\'avant' : 'vs la semaine d\'avant'}</small></p>`;
    const nav = `<div class="b-semaine">
        <button type="button" class="icone-bouton" data-b-nav="-1" aria-label="Semaine précédente" data-focus="b-prec"${B.lundi <= lundiMin() ? ' disabled' : ''}>${ICONE.gauche}</button>
        <p><b>${cap(texteSemaine(B.lundi))}</b><small>${st.enCours ? 'Semaine en cours' : passee ? 'La semaine passée' : `Il y a ${ecart(B.lundi, lundiAuj) / 7} semaines`}</small></p>
        <button type="button" class="icone-bouton" data-b-nav="1" aria-label="Semaine suivante" data-focus="b-suiv"${st.enCours ? ' disabled' : ''}>${ICONE.droite}</button></div>`;
    const hero = `<section class="carte b-hero" aria-label="Résumé de la semaine">
        <div class="anneau petit" role="img" aria-label="${pc == null ? 'Pas d\'objectif par semaine défini' : pc + ' % des objectifs de la semaine atteints'}">${anneau(st.taux, 'b')}
          <div class="val" aria-hidden="true"><b>${pc == null ? '—' : pc}<small>${pc == null ? '' : '%'}</small></b><span>objectifs</span></div></div>
        <div class="b-chiffres">
          <p class="b-pts"><b>${nombre(st.G.total)}</b> pts${st.enCours ? ' jusqu\'ici' : ' gagnés'}</p>
          ${evol}
          ${st.bonus ? `<p class="b-bonus">dont +${nombre(st.bonus)} de bonus 🏆</p>` : ''}
        </div>
        <p class="b-phrase">${esc(phraseBilan(st))}</p>
      </section>`;
    const cats = st.cats.length ? `<section aria-labelledby="b-obj">
        <div class="section-tete"><h3 id="b-obj">Objectifs par catégorie</h3></div>
        <div class="groupe">${st.cats.map(x => {
          const r = Math.min(1, x.n / x.objectif), manque = x.objectif - x.n;
          const etat = x.atteint ? (x.paye ? `+${x.bonus} bonus` : st.enCours ? `+${x.bonus} lundi` : 'atteint') : st.enCours ? `encore ${manque}` : 'manqué';
          const lab = `${x.c.nom} : ${x.n} sur ${x.objectif}, ${x.atteint ? 'objectif atteint' + (x.bonus ? (x.paye ? `, bonus de ${x.bonus} points` : `, bonus de ${x.bonus} points versé lundi`) : '') : st.enCours ? `encore ${manque} pour l'objectif, bonus de ${x.bonus} points` : 'objectif manqué'}`;
          return `<div class="b-cat${x.atteint ? ' ok' : ''}" role="group" aria-label="${esc(lab)}" style="--c:${x.c.couleur}">
            <span class="tuile petite" aria-hidden="true">${x.c.icone}</span>
            <span class="b-cat-nom" aria-hidden="true"><b>${esc(x.c.nom)}</b><span class="barre-obj"><i style="width:${Math.round(r * 100)}%"></i></span></span>
            <span class="b-cat-val" aria-hidden="true"><b>${x.n} / ${x.objectif}</b><small>${x.atteint ? '✓ ' : ''}${etat}</small></span></div>`;
        }).join('')}</div><p class="note b-regle">Objectif atteint : un bonus de la moitié des points visés (${esc(st.cats[0].c.nom)} : ${st.cats[0].objectif} × ${st.cats[0].c.points} pts → +${bonusSemaine(st.cats[0].c)}).</p></section>` : `<p class="carte vide">Donne un objectif par semaine à tes catégories (Profil › Catégories) : le bilan te dira lesquels sont atteints, avec un bonus.</p>`;
    const prioRevue = !st.enCours ? `<section aria-labelledby="b-prio">
        <div class="section-tete"><h3 id="b-prio">Tes priorités</h3>${st.prio.length ? `<span class="note">${st.prio.filter(p => p.fait).length} / ${st.prio.length} tenues</span>` : ''}</div>
        ${st.prio.length ? `<ul class="groupe prio-revue">${st.prio.map(p => `<li class="${p.fait ? 'faite' : ''}"><span class="marque-prio" aria-hidden="true">${p.fait ? ICONE.coche : ''}</span><span>${esc(p.titre)}<span class="masque"> : ${p.fait ? 'tenue' : 'pas tenue'}</span></span></li>`).join('')}</ul>`
          : '<p class="note">Aucune priorité choisie cette semaine-là.</p>'}</section>` : '';
    const se = st.J, sur = (n, t) => t ? `${n}<small> / ${t}</small>` : '—';
    const stats = `<section aria-labelledby="b-stats">
        <div class="section-tete"><h3 id="b-stats">En chiffres</h3></div>
        <div class="b-grille">
          ${miniStat('✅', 'Tâches', sur(st.faites, st.prevues), st.prevues ? 'faites' + (st.partis ? ` · ${st.partis} 🍃` : '') : 'aucune prévue', st.prevues ? `Tâches faites : ${st.faites} sur ${st.prevues}${st.partis ? `, ${pluriel(st.partis, 'laissée', 'laissées')} partir` : ''}` : 'Tâches : aucune prévue')}
          ${miniStat('🔥', 'Habitudes', sur(st.complets, st.jours), st.jours ? 'jours complets' : 'aucune prévue', st.jours ? `Habitudes : ${st.complets} jours complets sur ${st.jours}` : 'Habitudes : aucune prévue')}
          ${miniStat('🌿', 'Pour moi', sur(se.libres, se.libresTotal), se.libresTotal ? 'gardés' : 'aucun prévu', se.libresTotal ? `Temps pour moi gardés : ${se.libres} sur ${se.libresTotal}` : 'Temps pour moi : aucun prévu')}
          ${miniStat('📵', 'Sans écran', sur(se.tenus, se.ecransTotal), se.ecransTotal ? 'tenus' : 'aucun prévu', se.ecransTotal ? `Moments sans écran tenus : ${se.tenus} sur ${se.ecransTotal}` : 'Moments sans écran : aucun prévu')}
          ${miniStat('⚖️', 'Plafond', sur(se.sous, se.joursPrevus), se.joursPrevus ? 'jours dessous' : 'aucune tâche', se.joursPrevus ? `Jours sous le plafond : ${se.sous} sur ${se.joursPrevus}` : 'Plafond : aucune tâche prévue')}
          ${miniStat('⏱️', 'Concentration', duree(st.F.total), pluriel(st.F.sessions, 'session'), `Concentration : ${duree(st.F.total)}, ${pluriel(st.F.sessions, 'session')}`)}
        </div>
        ${st.meilleur ? `<p class="carte b-meilleur"><span aria-hidden="true">⭐</span><span>Meilleur jour : <b>${esc(jourLong(st.meilleur.k))}</b> · +${nombre(st.meilleur.pts)} pts</span></p>` : ''}
      </section>`;
    const npf = B.cible ? pasFaites().length : 0;
    const lienPf = npf ? `<button type="button" class="carte b-entree pf-entree" data-b="pas-faites"><span class="tuile" style="--c:#ffb547" aria-hidden="true">📋</span><span class="quoi"><b>${pluriel(npf, 'tâche pas faite', 'tâches pas faites')}</b><small>Coche, reporte ou laisse partir avant de commencer.</small></span>${ICONE.droite}</button>` : '';
    const edit = B.cible ? `<section aria-labelledby="b-cible" class="b-cible">
        <div class="section-tete"><h3 id="b-cible">${st.enCours ? 'Tes priorités de la semaine' : 'Ta semaine qui commence'}</h3></div>${st.enCours ? '' : lienPf}
        <p class="note">${st.enCours ? 'Coche-les sur l\'accueil quand elles sont tenues.' : `Choisis 1 à 3 priorités, ${texteSemaine(lundiAuj)}. Elles t'attendent sur l'accueil.`}</p>
        ${editeurPriorites(B.cible)}</section>` : '';
    corps.innerHTML = nav + hero + (st.enCours ? edit + cats : cats + prioRevue) + bilanIdentites(B.lundi) + stats + (st.enCours ? '' : edit);
    pied.innerHTML = B.cible ? `<button type="button" class="bouton" data-b="fermer">${B.auto ? 'C\'est parti !' : 'Enregistrer'}</button>`
      : `<button type="button" class="bouton secondaire" data-b="fermer">Fermer</button>`;
    if (focus) { const c = BD.querySelector(`[data-focus="${focus}"]`); if (c && !c.disabled) c.focus(); else { const t = BD.querySelector('[data-fermer]'); if (t) t.focus(); } }
  }
  BD.addEventListener('click', e => {
    const n = e.target.closest('[data-b-nav]');
    if (n) {
      lirePriorites();
      B.lundi = decaler(B.lundi, 7 * +n.dataset.bNav);
      renderBilan(n.dataset.focus);
      $('#b-corps').scrollTop = 0;
      return;
    }
    if (e.target.closest('[data-b="fermer"]')) BD.close();
    if (e.target.closest('[data-b="pas-faites"]')) { BD.close(); ouvrirPasFaites(); }
  });
  BD.addEventListener('change', e => { if (e.target.matches('[data-prio]')) lirePriorites(); });
  // Entrée sur un champ : au suivant, puis on range le clavier
  BD.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('[data-prio]')) return;
    e.preventDefault();
    const champs = [...BD.querySelectorAll('[data-prio]')], i = champs.indexOf(e.target);
    if (i < champs.length - 1) champs[i + 1].focus(); else e.target.blur();
  });
  BD.addEventListener('close', () => {
    lirePriorites();
    render();
    if (!B.change) return;
    B.change = false;
    const n = prioritesDe(lundiDe(aujourdhui())).length;
    dire(!n ? 'Priorités retirées.' : `${pluriel(n, 'priorité')} pour ta semaine 🎯`);
  });
  // Le lundi (dès 5 h) ou au premier passage de la semaine : le bilan de la semaine passée, une fois
  function proposerBilan() {
    if (V.etat !== 'ouvert' || document.querySelector('dialog[open]')) return;
    const auj = aujourdhui(), lundi = lundiDe(auj);
    if (S.bilanVu === lundi || decaler(lundi, -1) < (S.depuis || auj)) return;
    if (auj === lundi && minNow() < 5 * 60) return;
    S.bilanVu = lundi;
    ecrire();
    ouvrirBilan(decaler(lundi, -7), true);
  }
