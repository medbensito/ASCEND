  // ---------- Énergie du jour ----------
  // Une note de 1 à 5, une fois par jour : S.energie = { jour : 1..5 }. Elle nourrit le coach.
  const ENERGIES = [['😴', 'À plat'], ['😕', 'Basse'], ['😐', 'Moyenne'], ['🙂', 'Bonne'], ['⚡', 'Au top']];
  function carteEnergie(bas) {
    const auj = aujourdhui(), e = S.energie[auj];
    if (bas ? !e : e) return '';
    return `<section class="carte pad energie${e ? ' notee' : ''}" aria-labelledby="en-titre">
        <h2 id="en-titre">${e ? 'Ton énergie aujourd\'hui' : 'Ton énergie aujourd\'hui ?'}</h2>
        <div class="en-choix" role="radiogroup" aria-labelledby="en-titre">${ENERGIES.map((x, i) => `<button type="button" role="radio" aria-checked="${e === i + 1}" aria-label="${x[1]} (${i + 1} sur 5)" data-energie="${i + 1}" data-focus="en${i + 1}"><span aria-hidden="true">${x[0]}</span><small aria-hidden="true">${x[1]}</small></button>`).join('')}</div></section>`;
  }
  function noterEnergie(n) {
    const auj = aujourdhui();
    if (S.energie[auj] === n) delete S.energie[auj]; else S.energie[auj] = n;
    sauver();
    U.garderDefilement = true;
    render('en' + n);
    if (S.energie[auj]) dire(n <= 2 ? `Énergie ${ENERGIES[n - 1][1].toLowerCase()} : noté. Ménage-toi. 🌿` : `Énergie ${ENERGIES[n - 1][1].toLowerCase()} : noté.`);
  }

  // ---------- Réflexion de la semaine (dans le bilan) ----------
  // S.reflexions = { lundi : { marche, change } } ; modifiable pour la semaine en cours et la précédente.
  function reflexionBilan(lundi) {
    const r = S.reflexions[lundi] || {}, modifiable = lundi >= decaler(lundiDe(aujourdhui()), -7);
    if (!modifiable && !r.marche && !r.change) return '';
    const champ = (cle, titre, aide) => modifiable
      ? `<label class="refl-champ"><span>${titre}</span><textarea data-refl="${cle}" rows="2" maxlength="200" placeholder="${aide}">${esc(r[cle] || '')}</textarea></label>`
      : (r[cle] ? `<div class="refl-champ"><span>${titre}</span><p>${esc(r[cle])}</p></div>` : '');
    return `<section aria-labelledby="b-refl" class="refl"><div class="section-tete"><h3 id="b-refl">Deux phrases pour toi</h3></div>
        <div class="groupe">${champ('marche', 'Ce qui a marché', 'Le sport le matin, couper le téléphone…')}${champ('change', 'Ce que je change', 'Une seule chose, concrète.')}</div></section>`;
  }
  function lireReflexion() {
    const champs = [...BD.querySelectorAll('[data-refl]')];
    if (!champs.length || !B.lundi) return;
    const r = {};
    champs.forEach(c => { const t = c.value.trim().slice(0, 200); if (t) r[c.dataset.refl] = t; });
    const avant = JSON.stringify(S.reflexions[B.lundi] || {});
    if (JSON.stringify(r) === avant) return;
    if (Object.keys(r).length) S.reflexions[B.lundi] = r; else delete S.reflexions[B.lundi];
    sauver();
  }
  BD.addEventListener('change', e => { if (e.target.matches('[data-refl]')) lireReflexion(); });
  BD.addEventListener('click', e => { if (e.target.closest('[data-b-nav], [data-b]')) lireReflexion(); }, true);
  BD.addEventListener('close', lireReflexion);
  // Ce que tu as décidé de changer (dernière réflexion), rappelé sur l'accueil
  function rappelChange() {
    const l = lundiDe(aujourdhui()), r = S.reflexions[decaler(l, -7)];
    return r && r.change ? `<p class="carte refl-rappel"><span aria-hidden="true">🔁</span><span><small>Cette semaine, je change</small>${esc(r.change)}</span></p>` : '';
  }

  // ---------- Le coach : des remarques tirées de tes propres données ----------
  // Chaque conseil : { id, icone, texte, action?: { nom, type, arg } }. « Compris » le masque 7 jours (S.conseilsVus).
  const virgule = n => String(Math.round(n * 10) / 10).replace('.', ',');
  function conseils() {
    const auj = aujourdhui(), lundi = lundiDe(auj), dim = decaler(lundi, 6), res = [];
    const depuis = S.depuis || auj;
    // 1. Énergie basse plusieurs jours de suite
    const e3 = [0, 1, 2].map(i => S.energie[decaler(auj, -i)]);
    if (e3.every(x => x && x <= 2) && !difficile(auj)) res.push({ id: 'energie-basse', icone: '🌧️', texte: 'Ton énergie est basse depuis 3 jours. Ce n\'est pas le moment de forcer : passe en version mini aujourd\'hui, et protège un temps pour toi.', action: { nom: 'Jour difficile', type: 'difficile' } });
    // 2. Un jour à venir dépasse le plafond
    for (let i = 0; i < 7; i++) { const k = decaler(auj, i), m = minutesPrevues(k);
      if (m > S.reglages.plafond) { res.push({ id: 'charge-' + k, icone: '⚖️', texte: `${cap(quandJour(k))} dépasse ton plafond : ${duree(m)} prévues pour ${duree(S.reglages.plafond)}. Allège-le tant qu'il est encore temps.`, action: { nom: 'Voir la journée', type: 'jour', arg: k } }); break; } }
    // 3. Une identité en sommeil
    const dort = S.identites.find(enSommeil);
    if (dort) { const c = catsIdentite(dort.id).find(x => x.active); res.push({ id: 'sommeil-' + dort.id, icone: dort.icone, texte: `« ${dort.nom} » dort depuis 7 jours. Pas besoin d'un exploit : un seul petit acte la réveille.`, action: c ? { nom: `Prévoir ${c.nom}`, type: 'ajouter', arg: c.id } : null }); }
    // 4. Un objectif jamais atteint sur 3 semaines : le baisser
    if (decaler(lundi, -21) >= lundiDe(depuis)) S.categories.filter(c => c.active && c.objectif > 1).some(c => {
      const faits = [1, 2, 3].map(i => faitsCat(c.id, decaler(lundi, -7 * i), decaler(lundi, -7 * i + 6)));
      if (faits.some(n => n >= c.objectif)) return false;
      const moy = (faits[0] + faits[1] + faits[2]) / 3, vise = Math.max(1, Math.ceil(moy));
      if (!moy || vise >= c.objectif) return false;       // une catégorie jamais utilisée n'est pas un objectif raté
      res.push({ id: 'objectif-' + c.id, icone: c.icone, texte: `${c.nom} : ${c.objectif} par semaine, jamais atteint en 3 semaines (${virgule(moy)} en moyenne). Vise ${vise} : un objectif tenu vaut mieux qu'un objectif rêvé.`, action: { nom: `Passer à ${vise} / semaine`, type: 'objectif', arg: c.id + '|' + vise } });
      return true;
    });
    // 5. Le meilleur moment pour une catégorie (4 dernières semaines)
    const debut = decaler(auj, -28) > depuis ? decaler(auj, -28) : depuis;
    const moments = {};
    for (let k = debut; k < auj; k = decaler(k, 1)) duJour(k).forEach(o => { if (o.el.type !== 'tache') return;
      const m = o.el.debut < 720 ? 0 : o.el.debut < 1080 ? 1 : 2, x = (moments[o.el.cat] = moments[o.el.cat] || [[0, 0], [0, 0], [0, 0]]); x[m][1]++; if (o.fait) x[m][0]++; });
    const NOMS = ['le matin', 'l\'après-midi', 'le soir'];
    let meilleur = null;
    Object.keys(moments).forEach(id => { const x = moments[id].map((v, i) => ({ i, f: v[0], n: v[1], t: v[1] ? v[0] / v[1] : 0 })).filter(v => v.n >= 3);
      if (x.length < 2) return; x.sort((a, b) => b.t - a.t); const haut = x[0], bas = x[x.length - 1], d = haut.t - bas.t;
      if (d >= .4 && (!meilleur || d > meilleur.d)) meilleur = { d, id, haut, bas }; });
    if (meilleur) { const c = cat(meilleur.id); res.push({ id: 'moment-' + c.id, icone: c.icone, texte: `Tu tiens ${c.nom} ${NOMS[meilleur.haut.i]} (${meilleur.haut.f} sur ${meilleur.haut.n}), rarement ${NOMS[meilleur.bas.i]} (${meilleur.bas.f} sur ${meilleur.bas.n}). Planifie-le ${NOMS[meilleur.haut.i]}.`, action: { nom: `Prévoir ${c.nom}`, type: 'ajouter', arg: c.id + '|' + [8 * 60, 14 * 60, 19 * 60][meilleur.haut.i] } }); }
    // 6. Ce qui te donne de l'énergie
    const notes = Object.keys(S.energie).filter(k => k >= decaler(auj, -60));
    if (notes.length >= 8) { let top = null;
      S.categories.filter(c => c.active).map(c => ({ nom: c.nom, icone: c.icone, test: k => faitsCat(c.id, k, k) > 0 }))
        .concat([{ nom: 'un temps pour toi', icone: '🌿', test: k => duJour(k).some(o => o.el.type === 'libre' && S.payes[o.cle] && S.payes[o.cle].pts > 0) }]).forEach(x => {
        const avec = notes.filter(x.test), sans = notes.filter(k => !x.test(k));
        if (avec.length < 4 || sans.length < 4) return;
        const a = avec.reduce((t, k) => t + S.energie[k], 0) / avec.length, s = sans.reduce((t, k) => t + S.energie[k], 0) / sans.length;
        if (a - s >= .5 && (!top || a - s > top.d)) top = { d: a - s, a, s, x };
      });
      if (top) res.push({ id: 'energie-' + top.x.nom, icone: top.x.icone, texte: `Les jours avec ${top.x.nom}, ton énergie est à ${virgule(top.a)} sur 5, contre ${virgule(top.s)} les autres jours. Ce n'est pas un hasard : garde-lui sa place.` }); }
    // 7. Aucun temps pour toi cette semaine (à partir du mercredi)
    if (indexJour(auj) >= 2) { let libre = false; for (let k = lundi; k <= dim; k = decaler(k, 1)) if (duJour(k).some(o => o.el.type === 'libre')) libre = true;
      if (!libre) res.push({ id: 'libre-' + lundi, icone: '🌿', texte: 'Aucun temps pour toi cette semaine. Choisir ses priorités, c\'est aussi se choisir : bloque un créneau.', action: { nom: 'Protéger un moment', type: 'libre' } }); }
    return res.filter(c => { const v = S.conseilsVus[c.id]; return !v || ecart(v, auj) >= 7; });
  }
  function carteCoach() {
    const l = conseils();
    if (!l.length) return '';
    const c = l[0];
    return `<section class="carte coach" aria-labelledby="coach-titre">
        <h2 id="coach-titre"><span class="tuile petite" aria-hidden="true">${c.icone}</span>Ton coach${l.length > 1 ? `<small>1 / ${l.length}</small>` : ''}</h2>
        <p>${esc(c.texte)}</p>
        <div class="boutons${c.action ? ' deux' : ''}">${c.action ? `<button type="button" class="bouton petit" data-coach="agir" data-focus="coach-agir">${esc(c.action.nom)}</button>` : ''}
          <button type="button" class="bouton petit secondaire" data-coach="compris" data-focus="coach">${l.length > 1 ? 'Compris, suivant' : 'Compris'}</button></div></section>`;
  }
  function actionCoach(quoi) {
    const c = conseils()[0];
    if (!c) return;
    const auj = aujourdhui();
    if (quoi === 'compris') { S.conseilsVus[c.id] = auj; sauver(); U.garderDefilement = true; return render('coach'); }
    const a = c.action;
    if (!a) return;
    if (a.type === 'difficile') return jourDifficile();
    if (a.type === 'libre') return ouvrirTache(null, { type: 'libre' });
    if (a.type === 'ajouter') { const [id, debut] = String(a.arg).split('|'); return ouvrirTache(null, debut ? { cat: id, debut: +debut, fin: +debut + 60, date: decaler(auj, 1) } : { cat: id }); }
    if (a.type === 'jour') { U.onglet = S.onglet = 'calendrier'; S.vueCal = 'jour'; U.date = a.arg; U.recentrer = true; ecrire(); return render('tab-calendrier'); }
    if (a.type === 'objectif') { const [id, n] = a.arg.split('|'), k = S.categories.find(x => x.id === id); if (!k) return; k.objectif = +n; S.conseilsVus[c.id] = auj; sauver(); U.garderDefilement = true; render('coach'); return dire(`${k.nom} : ${n} par semaine. Tiens-le, puis remonte. 💪`); }
  }
