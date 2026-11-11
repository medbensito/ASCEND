  // ---------- Questions (remplacent confirm) ----------
  function demander(titreQ, texte, options) {
    return new Promise(resoudre => {
      const d = $('#question');
      $('#q-titre').textContent = titreQ;
      $('#q-texte').textContent = texte;
      $('#q-choix').innerHTML = options.map((o, i) => `<button type="button" class="bouton${o.clair ? ' secondaire' : ''}${o.danger ? ' danger' : ''}" data-q="${i}">${esc(o.texte)}</button>`).join('');
      let rendu = null;
      const fin = () => { d.removeEventListener('close', fin); resoudre(rendu); };
      d.addEventListener('close', fin);
      $('#q-choix').onclick = e => { const b = e.target.closest('[data-q]'); if (!b) return; rendu = options[+b.dataset.q].valeur; d.close(); };
      d.showModal();
    });
  }
  const demanderPortee = action => demander('Élément répété', `${action} seulement cette fois, ou celle-ci et toutes les suivantes ?`, [
    { texte: 'Cette fois seulement', valeur: 'une' },
    { texte: 'Celle-ci et les suivantes', valeur: 'suivantes' },
    { texte: 'Annuler', valeur: null, clair: true }
  ]);
  // Message dans la feuille ouverte la plus haute (un message bref serait caché dessous)
  let minuteurToast;
  function dire(msg) {
    const ouvertes = [...document.querySelectorAll('dialog[open]')];
    const haut = ouvertes[ouvertes.length - 1];
    const barre = haut && haut.querySelector('.f-msg');
    if (barre) { barre.textContent = msg; return; }
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('avec-action');
    t.classList.add('visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => t.classList.remove('visible'), 2800);
  }
  function feliciter() {
    if (U.objectifAtteint) { const ob = U.objectifAtteint; U.objectifAtteint = null; setTimeout(() => dire(`🎯 Objectif atteint : « ${ob.titre} » ! Bonus +${cat(ob.cat).points * CONFIG.points.bonusObjectif} pts.`), 900); }
    if (U.palierAtteint) { const p = U.palierAtteint; U.palierAtteint = null; setTimeout(() => dire(`✨ Nouveau palier : ${p.nom} !`), 1800); }
  }
  // Ferme la feuille au toucher de « data-fermer »
  document.addEventListener('click', e => { const b = e.target.closest('[data-fermer]'); if (b) { const d = b.closest('dialog'); if (d) d.close(); } });
  // Toucher le fond sombre, au-dessus d'une feuille, la ferme (comme sur iPhone)
  document.addEventListener('click', e => {
    const d = e.target;
    if (!(d instanceof HTMLDialogElement) || !d.open || !d.classList.contains('feuille')) return;
    const r = d.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) d.close();
  });
  // Mesures de la dernière feuille ouverte (affichées dans Profil, pour un iPhone qu'on n'a pas sous la main)
  let derniereFeuille = '';
  const ouvrirModale = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () {
    ouvrirModale.call(this);
    if (this.id === 'profil') return;
    setTimeout(() => {
      if (!this.open) return;
      const m = x => { const b = x.getBoundingClientRect(); return `${Math.round(b.top)}→${Math.round(b.bottom)}`; };
      const corps = this.querySelector('.f-corps'), pied = this.querySelector('.f-pied');
      derniereFeuille = `Feuille ${this.id} ${m(this)}` + (corps ? ` · corps ${m(corps)}` : '') + (pied ? ` · pied ${m(pied)}` : '');
    }, 700);
  };

  // ---------- Feuille d'une tâche (maquette « Nouvelle tâche ») ----------
  const TD = $('#tache'), TF = $('#form-tache');
  const champT = n => TF.elements.namedItem(n);
  function ouvrirTache(o, modele) {
    const el = o ? o.el : null;
    const m = el ? { type: el.type, titre: el.titre, date: o.k, debut: el.debut, fin: el.fin, rep: el.rep, cat: el.cat, objectif: el.objectif || '' }
      : Object.assign({ type: 'tache', titre: '', date: U.date, debut: 9 * 60, fin: 10 * 60, rep: null, cat: (catsActives()[0] || S.categories[0]).id, objectif: '' }, modele);
    U.edition = { o: o || null, depart: m, duree: m.fin - m.debut, cat: cat(m.cat).id };
    const objs = S.objectifs.filter(x => !x.atteintLe || x.id === m.objectif);
    TF.innerHTML = `
      <div class="f-haut"><button type="button" class="f-icone" data-t="annuler" aria-label="Fermer">${ICONE.croix}</button><h2 id="t-titre"></h2>
        <button type="submit" class="f-valider" aria-label="${o ? 'Enregistrer' : 'Créer'}">${ICONE.coche}</button></div>
      <p class="f-msg" role="status" aria-live="polite"></p>
      <div class="f-corps">
        <div class="segments types" role="radiogroup" aria-label="Type">
          ${[['tache', 'Tâche'], ['libre', 'Pour moi'], ['sansecran', 'Sans écran']].map(([v, n]) => `<label><input type="radio" name="type" value="${v}"${m.type === v ? ' checked' : ''}>${n}</label>`).join('')}
        </div>
        <label class="champ-nom">${ICONE.crayon}<span class="masque">Nom</span><input name="titre" maxlength="80" autocomplete="off" value="${esc(m.titre)}"></label>
        <div id="t-cat-zone"><span class="etiquette" id="t-cat-lib">Catégorie</span>
          <div class="puces" role="group" aria-labelledby="t-cat-lib" id="t-cats"></div></div>
        <div><span class="etiquette" id="t-quand">Quand</span>
          <div class="puces" role="group" aria-labelledby="t-quand" id="t-jours"></div>
          <div class="groupe t-date"><label class="rang"><span><span class="ic">${ICONE.calendrier}</span>Date</span><input type="date" name="date" value="${m.date}" required></label></div></div>
        <div><span class="etiquette" id="t-heure">Heure</span>
          <div class="puces" role="group" aria-labelledby="t-heure" id="t-heures"></div>
          <div class="groupe" style="margin-top:8px"><div class="horaires"><label>Début<input type="time" name="debut" step="900" value="${hhmm(m.debut)}" required></label><label>Fin<input type="time" name="fin" step="900" value="${finTexte(m.fin) === '24:00' ? '00:00' : hhmm(m.fin)}" required></label></div></div></div>
        <div><span class="etiquette" id="t-duree">Durée</span>
          <div class="puces" role="group" aria-labelledby="t-duree" id="t-durees"></div></div>
        <p class="t-resume" id="t-resume"></p>
        <details class="t-plus"${m.rep || m.objectif ? ' open' : ''}><summary>Plus d'options<small>répéter, objectif lié</small></summary>
        <div class="groupe">
          <label class="rang"><span><span class="ic">${ICONE.repeter}</span>Répéter</span><span class="interrupteur"><input type="checkbox" role="switch" name="repeter"${m.rep ? ' checked' : ''}><i></i></span></label>
          <label class="rang" id="t-freq"><span>Fréquence</span><select name="freq">${Object.keys(REPET).map(f => `<option value="${f}"${(m.rep ? m.rep.freq : 'semaine') === f ? ' selected' : ''}>${REPET[f]}</option>`).join('')}</select></label>
          <label class="rang" id="t-jusqua"><span>Jusqu'au <span class="sous">facultatif</span></span><input type="date" name="jusqua" value="${m.rep && m.rep.jusqua ? m.rep.jusqua : ''}"></label>
          <label class="rang" id="t-obj"><span><span class="ic">${ICONE.cible}</span>Objectif lié</span><select name="objectif"><option value="">Aucun</option>${objs.map(x => `<option value="${x.id}"${x.id === m.objectif ? ' selected' : ''}>${esc(x.titre)}</option>`).join('')}</select></label>
        </div></details>
        <p class="note" id="t-regle"></p>
        <p class="erreur" id="t-erreur" role="alert"></p>
        ${o ? `<div class="boutons">${el.type === 'tache' ? `<button type="button" class="bouton secondaire" data-t="minuteur">${ICONE.chrono} Lancer le minuteur</button>` : ''}
          <button type="button" class="bouton danger" data-t="supprimer">${ICONE.corbeille} Supprimer</button></div>` : ''}
      </div>
      <div class="f-pied"><button type="submit" class="bouton" id="t-ok"></button></div>`;
    majTache();
    TD.showModal();
    if (!o) focusDepart(() => champT('titre'));
  }
  function majTache() {
    const type = (TF.querySelector('input[name="type"]:checked') || {}).value || 'tache';
    const nouveau = !(U.edition && U.edition.o);
    const c = cat(U.edition.cat);
    $('#t-titre').textContent = nouveau ? { tache: 'Nouvelle tâche', libre: 'Temps pour moi', sansecran: 'Sans écran' }[type] : { tache: 'Tâche', libre: 'Temps pour moi', sansecran: 'Sans écran' }[type];
    $('#t-ok').textContent = nouveau ? { tache: 'Créer la tâche', libre: 'Protéger ce moment', sansecran: 'Prévoir ce moment' }[type] : 'Enregistrer';
    champT('titre').placeholder = type === 'tache' ? 'Nom de la tâche…' : JOMO[type].nom;
    $('#t-cat-zone').hidden = type !== 'tache';
    $('#t-obj').hidden = type !== 'tache' || !S.objectifs.length;
    // Puces : catégories, jours, heures, durées (redessinées seulement si elles changent, pour ne pas perdre un toucher en cours)
    const poser = (zone, html) => { const z = $(zone); if (z.dataset.h !== html) { z.dataset.h = html; z.innerHTML = html; } };
    const puce = (attr, val, texte, actif, label) => `<button type="button" class="puce" ${attr}="${val}" aria-pressed="${actif}"${label ? ` aria-label="${label}"` : ''}>${texte}</button>`;
    const cats = catsActives().slice(); if (!cats.some(x => x.id === c.id)) cats.unshift(c);
    poser('#t-cats', cats.map(x => puce('data-t-cat', esc(x.id), `<span aria-hidden="true">${x.icone}</span> ${esc(x.nom)}`, x.id === c.id)).join('')
      + `<button type="button" class="puce" data-t="cat" id="t-cat" aria-label="Toutes les catégories">⋯</button>`);
    const auj = aujourdhui(), date = champT('date').value, deb = versMin(champT('debut').value), du = U.edition.duree > 0 ? U.edition.duree : 60;
    poser('#t-jours', [0, 1, 2, 3, 4, 5, 6].map(i => { const k = decaler(auj, i); return puce('data-t-jour', k, i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : cap(fmt(k, { weekday: 'short', day: 'numeric' })).replace('.', ''), k === date, i > 1 ? jourLong(k) : ''); }).join(''));
    const sans = U.edition.o ? U.edition.o.cle : null;
    const libre = /^\d{4}-\d{2}-\d{2}$/.test(date) ? creneauLibre(date, du, sans, date === auj ? Math.ceil((minNow() + 5) / CONFIG.pas) * CONFIG.pas : 8 * 60) : null;
    const heures = [9 * 60, 12 * 60, 14 * 60, 18 * 60, 20 * 60].filter(h => !libre || h !== libre.debut);
    poser('#t-heures', (libre ? puce('data-t-heure', libre.debut, `Libre · ${hhmm(libre.debut)}`, deb === libre.debut, `Prochain créneau libre : ${hhmm(libre.debut)}`) : '') + heures.map(h => puce('data-t-heure', h, hhmm(h), deb === h)).join(''));
    poser('#t-durees', [15, 30, 60, 90, 120].map(x => puce('data-t-duree', x, duree(x), du === x)).join(''));
    const fin = versMin(champT('fin').value);
    $('#t-resume').textContent = /^\d{4}-\d{2}-\d{2}$/.test(date) && deb != null && fin != null ? `${cap(quandJour(date))} · ${hhmm(deb)} – ${finTexte(fin === 0 ? 1440 : fin)} · ${duree(du)}` : '';
    const rep = champT('repeter').checked;
    $('#t-freq').hidden = $('#t-jusqua').hidden = !rep;
    $('#t-resume').textContent += $('#t-resume').textContent ? ` · +${type === 'tache' ? c.points : CONFIG.points[type]} pts` : '';
    $('#t-regle').textContent = {
      tache: `Rapporte les points de « ${c.nom} » une fois faite, si elle est prévue avant son début. Compte dans l'objectif de la semaine.`,
      libre: `JOMO : +${CONFIG.points.libre} pts si aucune tâche ne vient empiéter sur ce créneau jusqu'au bout (${CONFIG.points.libreMin} min au moins, ${CONFIG.points.libresParJour} par jour).`,
      sansecran: `JOMO : à la fin, ASCEND te demande si tu l'as tenu. +${CONFIG.points.sansecran} pts si oui.`
    }[type];
  }
  TF.addEventListener('input', e => {
    // Changer le début garde la durée ; changer la fin règle la durée
    const n = e.target.name;
    if (n === 'debut' || n === 'fin') {
      const d = versMin(champT('debut').value), f0 = versMin(champT('fin').value);
      if (n === 'debut' && d != null && U.edition.duree > 0) champT('fin').value = hhmm(Math.min(d + U.edition.duree, 1440) % 1440);
      else if (n === 'fin' && d != null && f0 != null) { const f = f0 === 0 ? 1440 : f0; if (f > d) U.edition.duree = f - d; }
    }
    majTache();
  });
  TF.addEventListener('change', majTache);
  function lireTache() {
    const type = (TF.querySelector('input[name="type"]:checked') || {}).value || 'tache';
    const titre = champT('titre').value.trim() || (type === 'tache' ? '' : JOMO[type].nom);
    if (!titre) return { erreur: 'Donne un nom à la tâche.', champ: champT('titre') };
    if (!champT('date').value) return { erreur: 'Choisis une date.', champ: champT('date') };
    const debut = versMin(champT('debut').value);
    let fin = versMin(champT('fin').value);
    if (debut == null || fin == null) return { erreur: 'Indique le début et la fin : chaque tâche a sa plage horaire.', champ: champT('debut') };
    if (fin === 0 && debut > 0) fin = 1440;
    if (fin <= debut) return { erreur: 'La fin doit être après le début.', champ: champT('fin') };
    const rep = champT('repeter').checked ? { freq: champT('freq').value, jusqua: champT('jusqua').value || null } : null;
    if (rep && rep.jusqua && rep.jusqua < champT('date').value) return { erreur: "« Jusqu'au » doit venir après la date.", champ: champT('jusqua') };
    return { champs: { type, titre, date: champT('date').value, debut, fin, rep, cat: type === 'tache' ? U.edition.cat : (U.edition.depart.cat || S.categories[0].id), objectif: type === 'tache' ? (champT('objectif').value || null) : null } };
  }
  const memeRep = (a, b) => (!a && !b) || (a && b && a.freq === b.freq && (a.jusqua || null) === (b.jusqua || null));
  // Minutes de tâches d'un jour si on y ajoute (ou déplace) une plage
  function minutesAvec(k, sans, d, f) {
    const iv = duJour(k).filter(o => o.el.type === 'tache' && o.cle !== sans).map(o => [o.el.debut, o.el.fin]).concat([[d, f]]).sort((a, b) => a[0] - b[0]);
    let total = 0, a = -1, b = -1;
    iv.forEach(([x, y]) => { if (x > b) { total += Math.max(0, b - a); a = x; b = y; } else b = Math.max(b, y); });
    return total + Math.max(0, b - a);
  }
  // JOMO : au-dessus du plafond, on demande avant d'ajouter
  async function accepterPlafond(k, sans, d, f) {
    const pl = S.reglages.plafond, avant = minutesPrevues(k, sans), apres = minutesAvec(k, sans, d, f);
    if (apres <= pl || apres <= avant) return true;
    return demander('Journée chargée', `Avec cette tâche, ${quandJour(k)} compte ${duree(apres)} de tâches pour un plafond de ${duree(pl)}. Choisir, c'est aussi renoncer : tu la gardes ?`,
      [{ texte: 'Garder quand même', valeur: true }, { texte: 'Revoir', valeur: false, clair: true }]);
  }
  TF.addEventListener('submit', async e => {
    e.preventDefault();
    const r = lireTache();
    if (r.erreur) { $('#t-erreur').textContent = r.erreur; r.champ.focus(); return; }
    const o = U.edition.o, ch = r.champs;
    if (ch.type === 'tache' && !(await accepterPlafond(ch.date, o ? o.cle : null, ch.debut, ch.fin))) return;
    let cle, message = null;
    if (!o) {
      const el = Object.assign({ id: uid(), exceptions: {}, faits: {}, creeLe: Date.now() }, ch);
      S.elements.push(el);
      cle = el.id + '|' + el.date;
      const n = trouver(cle);
      message = n && !prevue(n) ? (el.type === 'tache' ? 'Tâche ajoutée. Déjà commencée : pas de points cette fois.' : 'Ajouté. Déjà commencé : pas de points cette fois.')
        : { tache: 'Tâche ajoutée.', libre: 'Temps pour moi protégé. 🌿', sansecran: 'Moment sans écran prévu. 📵' }[el.type];
    } else {
      let portee = 'une';
      if (o.el.rep) {
        if (!memeRep(o.el.rep, ch.rep)) portee = 'suivantes';
        else {
          const dep = U.edition.depart;
          const change = ['type', 'titre', 'date', 'debut', 'fin', 'cat', 'objectif'].some(c => (dep[c] || null) !== (ch[c] || null));
          if (!change) { TD.close(); return; }
          portee = await demanderPortee('Modifier');
          if (!portee) return;
        }
      }
      const champs = Object.assign({}, ch);
      if (portee === 'une' && o.el.rep) delete champs.rep;
      cle = appliquer(o, champs, portee);
      avertirLibre(cle);
    }
    sauver();
    TD.close();
    U.brouillon = null; U.selection = null;
    const k = cle.slice(cle.lastIndexOf('|') + 1);
    if (U.onglet === 'calendrier') U.date = k;
    U.repere = cle;
    render('o' + cle);
    if (message) dire(message);
    feliciter();
  });
  // Une tâche posée sur un temps pour moi : on prévient
  function avertirLibre(cle) {
    const o = trouver(cle);
    if (!o || o.el.type !== 'tache' || finOcc(o) <= Date.now()) return false;
    const l = duJour(o.k).find(x => x.el.type === 'libre' && x.el.debut < o.el.fin && x.el.fin > o.el.debut && !S.payes[x.cle]);
    if (!l) return false;
    setTimeout(() => dire(`Attention : ça empiète sur « ${l.el.titre} » (${plage(l.el)}).`), 300);
    return true;
  }
  // Puces de la feuille courte : un toucher règle la catégorie, le jour, l'heure ou la durée
  TD.addEventListener('click', e => {
    const b = e.target.closest('.puce');
    if (!b || b.dataset.t) return;
    const d = b.dataset, dureeAct = U.edition.duree > 0 ? U.edition.duree : 60;
    const poserFin = (debut, du) => { champT('fin').value = hhmm(Math.min(debut + du, 1440) % 1440); };
    if (d.tCat) U.edition.cat = d.tCat;
    if (d.tJour) champT('date').value = d.tJour;
    if (d.tHeure) { champT('debut').value = hhmm(+d.tHeure); poserFin(+d.tHeure, dureeAct); }
    if (d.tDuree) { U.edition.duree = +d.tDuree; const deb = versMin(champT('debut').value); if (deb != null) poserFin(deb, +d.tDuree); }
    majTache();
    const sel = d.tCat ? `[data-t-cat="${CSS.escape(d.tCat)}"]` : d.tJour ? `[data-t-jour="${d.tJour}"]` : d.tHeure ? `[data-t-heure="${d.tHeure}"]` : `[data-t-duree="${d.tDuree}"]`;
    const f = TD.querySelector(sel); if (f) f.focus();
  });
  TD.addEventListener('click', async e => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const a = b.dataset.t;
    if (a === 'annuler') { TD.close(); return; }
    if (a === 'cat') { ouvrirChoixCat(U.edition.cat, id => { U.edition.cat = id; majTache(); $('#t-cat').focus(); }); return; }
    if (a === 'minuteur') { const o = U.edition.o; TD.close(); demarrerMinuteur(o); sauver(); ouvrirMinuteur(); return; }
    if (a === 'supprimer') {
      const o = U.edition.o;
      let portee = 'une';
      if (o.el.rep) { portee = await demanderPortee('Supprimer'); if (!portee) return; }
      else if (!(await demander('Supprimer ?', `« ${o.el.titre} » sera supprimée.`, [{ texte: 'Supprimer', valeur: true, danger: true }, { texte: 'Annuler', valeur: false, clair: true }]))) return;
      if (S.payes[o.cle] && o.el.type === 'tache') { reprendre(o.cle); U.decoche = true; }
      supprimerOcc(o, portee);
      sauver();
      TD.close();
      U.selection = null;
      render();
      dire({ tache: 'Tâche supprimée.', libre: 'Temps pour moi supprimé.', sansecran: 'Moment sans écran supprimé.' }[o.el.type]);
    }
  });
  TD.addEventListener('close', () => { U.edition = null; if (U.brouillon) { U.brouillon = null; render(); } });

  // ---------- Choisir une catégorie ----------
  const CC = $('#choix-cat');
  let choixCatRetour = null;
  function ouvrirChoixCat(actuelle, retour) {
    choixCatRetour = retour;
    const liste = S.categories.filter(c => c.active || c.id === actuelle);
    $('#cc-corps').innerHTML = `<div class="groupe">${liste.map(c => `<button type="button" class="rang cat-rang" role="radio" aria-checked="${c.id === actuelle}" data-choix-cat="${esc(c.id)}">
        <span><span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span><span><b>${esc(c.nom)}</b><span class="sous">${c.objectif ? c.objectif + ' / semaine' : 'sans objectif'}</span></span></span>
        <span class="val">+${c.points} pts${c.id === actuelle ? ' ' + ICONE.coche : ''}</span></button>`).join('')}</div>
      <button type="button" class="lien fort" data-action-cc="gerer">Gérer les catégories ${ICONE.fleche}</button>`;
    CC.querySelector('[data-fermer]').innerHTML = ICONE.croix;
    CC.showModal();
    const actif = CC.querySelector('[aria-checked="true"]');
    if (actif) actif.focus();
  }
  CC.addEventListener('click', e => {
    const b = e.target.closest('[data-choix-cat]');
    if (b) { const r = choixCatRetour; CC.close(); if (r) r(b.dataset.choixCat); return; }
    if (e.target.closest('[data-action-cc="gerer"]')) { CC.close(); ouvrirCategories(); }
  });
