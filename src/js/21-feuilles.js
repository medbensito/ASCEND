  // ---------- Habitude ----------
  const HD = $('#habitude'), HF = $('#form-hab');
  function ouvrirHabitude(h) {
    const auj = aujourdhui(), hier = decaler(auj, -1);
    U.habitude = { h: h || null, cat: h ? cat(h.cat).id : (catsActives()[0] || S.categories[0]).id };
    const jours = h ? h.jours : [0, 1, 2, 3, 4, 5, 6];
    const s = h ? serieHabitude(h) : 0;
    let mois = '';
    if (h) {
      const cases = Array.from({ length: 28 }, (_, i) => decaler(auj, i - 27));
      const dus = cases.filter(k => habitudeDue(h, k)), faits = dus.filter(k => h.faits[k]).length;
      mois = `<div class="carte pad" style="display:grid;gap:10px">
          <div class="serie-carte" style="padding:0"><span class="flamme" aria-hidden="true">🔥</span><div><b>${pluriel(s, 'jour')}</b><small>Série de cette habitude · ${faits} / ${dus.length} ces 4 dernières semaines</small></div></div>
          <span class="histo" aria-hidden="true" style="flex-wrap:wrap">${cases.map(k => `<i class="${!habitudeDue(h, k) ? 'non' : h.faits[k] ? 'ok' : ''}" style="--c:${cat(h.cat).couleur};width:calc((100% - 27 * 4px) / 28);height:14px"></i>`).join('')}</span>
          <div class="groupe">
            ${[[auj, "Aujourd'hui"], [hier, 'Hier']].filter(([k]) => habitudeDue(h, k)).map(([k, n]) => `<div class="rang"><span>${n}</span>${rondCoche(h.id + '|' + k, !!h.faits[k], `${h.titre}, ${n.toLowerCase()} : ${h.faits[k] ? 'faite' : 'à faire'}`, 'data-habitude')}</div>`).join('') || '<p class="note" style="padding:12px 14px">Pas prévue aujourd\'hui ni hier.</p>'}
          </div></div>`;
    }
    HF.innerHTML = `
      <div class="f-haut"><button type="button" class="f-icone" data-h="annuler" aria-label="Fermer">${ICONE.croix}</button><h2 id="h-titre">${h ? 'Habitude' : 'Nouvelle habitude'}</h2>
        <button type="submit" class="f-valider" aria-label="${h ? 'Enregistrer' : 'Créer'}">${ICONE.coche}</button></div>
      <p class="f-msg" role="status" aria-live="polite"></p>
      <div class="f-corps">
        <label class="champ-nom">${ICONE.crayon}<span class="masque">Nom</span><input name="titre" maxlength="60" autocomplete="off" placeholder="Méditer, lire 10 pages…" value="${h ? esc(h.titre) : ''}"></label>
        <div><span class="etiquette" id="h-cat-lib">Catégorie</span><div class="groupe"><button type="button" class="rang" data-h="cat" id="h-cat" aria-describedby="h-cat-lib"></button></div></div>
        <fieldset><legend id="h-jours">Quels jours</legend>
          <div class="choix-jours" role="group" aria-labelledby="h-jours">${JOURS_COURTS.map((j, i) => `<label title="${JOURS_LONGS[i]}"><input type="checkbox" name="jour" value="${i}"${jours.includes(i) ? ' checked' : ''} aria-label="${JOURS_LONGS[i]}"><span aria-hidden="true">${j}</span></label>`).join('')}</div></fieldset>
        <div><label class="etiquette" for="h-mini">Version minimale <span class="sous">pour les jours difficiles</span></label>
          <label class="champ-nom"><span aria-hidden="true">🌧️</span><input id="h-mini" name="mini" maxlength="60" autocomplete="off" placeholder="2 minutes, 1 page, 5 pompes…" value="${h && h.mini ? esc(h.mini) : ''}"></label></div>
        <p class="note" id="h-regle"></p>
        ${mois}
        <p class="erreur" id="h-erreur" role="alert"></p>
        ${h ? `<button type="button" class="bouton danger" data-h="supprimer">${ICONE.corbeille} Retirer l'habitude</button>` : ''}
      </div>
      <div class="f-pied"><button type="submit" class="bouton">${h ? 'Enregistrer' : 'Créer l\'habitude'}</button></div>`;
    majHabitude();
    HD.showModal();
    if (!h) focusDepart(() => HF.elements.namedItem('titre'));
  }
  function majHabitude() {
    const c = cat(U.habitude.cat);
    $('#h-cat').innerHTML = `<span><span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span><b>${esc(c.nom)}</b></span><span class="val">+${c.points} pts ${ICONE.droite}</span>`;
    $('#h-cat').setAttribute('aria-label', `Catégorie : ${c.nom}, ${c.points} points par jour fait. Changer`);
    $('#h-regle').textContent = `Chaque jour fait rapporte ${c.points} pts et compte dans l'objectif de la semaine de « ${c.nom} ». La série d'ASCEND compte les jours où toutes tes habitudes sont faites.`;
  }
  HF.addEventListener('submit', e => {
    e.preventDefault();
    const titre = HF.elements.namedItem('titre').value.trim();
    const jours = [...HF.querySelectorAll('input[name="jour"]:checked')].map(x => +x.value);
    if (!titre) { $('#h-erreur').textContent = 'Donne un nom à l\'habitude.'; HF.elements.namedItem('titre').focus(); return; }
    if (!jours.length) { $('#h-erreur').textContent = 'Choisis au moins un jour.'; HF.querySelector('input[name="jour"]').focus(); return; }
    const h = U.habitude.h;
    const mini = HF.elements.namedItem('mini').value.trim().slice(0, 60) || null;
    if (h) Object.assign(h, { titre, jours, cat: U.habitude.cat, mini });
    else S.habitudes.push({ id: uid(), titre, mini, cat: U.habitude.cat, jours, debut: aujourdhui(), fin: null, faits: {}, creeLe: Date.now() });
    sauver();
    HD.close();
    render();
    dire(h ? 'Habitude enregistrée.' : `Habitude créée : « ${titre} ».`);
  });
  HD.addEventListener('click', async e => {
    const hb = e.target.closest('[data-habitude]');
    if (hb) { cocherHabitude(hb.dataset.habitude); return; }
    const b = e.target.closest('[data-h]');
    if (!b) return;
    const a = b.dataset.h;
    if (a === 'annuler') { HD.close(); return; }
    if (a === 'cat') { ouvrirChoixCat(U.habitude.cat, id => { U.habitude.cat = id; majHabitude(); $('#h-cat').focus(); }); return; }
    if (a === 'supprimer') {
      const h = U.habitude.h;
      if (!(await demander('Retirer cette habitude ?', `« ${h.titre} » ne sera plus proposée. Les jours déjà faits et leurs points restent.`, [{ texte: 'Retirer', valeur: true, danger: true }, { texte: 'Annuler', valeur: false, clair: true }]))) return;
      if (h.debut >= aujourdhui() && !Object.keys(h.faits).length) S.habitudes = S.habitudes.filter(x => x !== h);
      else h.fin = aujourdhui();
      sauver();
      HD.close();
      render();
      dire('Habitude retirée.');
    }
  });
  // Cocher une habitude (accueil, calendrier, objectifs ou sa feuille)
  function cocherHabitude(v) {
    const i = v.lastIndexOf('|'), h = S.habitudes.find(x => x.id === v.slice(0, i)), k = v.slice(i + 1);
    if (!h || !habitudeDue(h, k) || k > aujourdhui()) return;
    const msg = basculerHabitude(h, k);
    sauver();
    if (HD.open) ouvrirHabitudeRafraichir(h, v);
    render();
    dire(msg);
    feliciter();
  }
  function ouvrirHabitudeRafraichir(h, v) {
    const b = HD.querySelector(`[data-habitude="${CSS.escape(v)}"]`);
    if (b) { const f = h.faits[v.slice(v.lastIndexOf('|') + 1)]; b.setAttribute('aria-checked', String(!!f)); b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/: (faite|à faire)$/, ': ' + (f ? 'faite' : 'à faire'))); }
  }

  // ---------- Objectif à long terme ----------
  const OD = $('#objectif'), OF = $('#form-obj');
  function ouvrirObjectif(ob) {
    U.objectif = { ob: ob || null, cat: ob ? cat(ob.cat).id : (catsActives()[0] || S.categories[0]).id, etapes: ob ? null : [] };
    OF.innerHTML = `
      <div class="f-haut"><button type="button" class="f-icone" data-o="annuler" aria-label="Fermer">${ICONE.croix}</button><h2 id="o-titre">${ob ? 'Objectif' : 'Nouvel objectif'}</h2>
        <button type="submit" class="f-valider" aria-label="${ob ? 'Enregistrer' : 'Créer'}">${ICONE.coche}</button></div>
      <p class="f-msg" role="status" aria-live="polite"></p>
      <div class="f-corps">
        <div id="o-resume"></div>
        <label class="champ-nom">${ICONE.crayon}<span class="masque">Nom</span><input name="titre" maxlength="80" autocomplete="off" placeholder="Courir un semi-marathon…" value="${ob ? esc(ob.titre) : ''}"></label>
        <div><span class="etiquette" id="o-cat-lib">Catégorie</span><div class="groupe">
          <button type="button" class="rang" data-o="cat" id="o-cat" aria-describedby="o-cat-lib"></button>
          <label class="rang"><span><span class="ic">${ICONE.calendrier}</span><span>Échéance <span class="sous">facultatif</span></span></span><input type="date" name="echeance" value="${ob && ob.echeance ? ob.echeance : ''}"></label></div></div>
        <div><span class="etiquette" id="o-et-lib">Étapes</span><div class="groupe"><div class="etapes" id="o-etapes" role="list" aria-labelledby="o-et-lib"></div>
          <div class="ajout-etape"><label class="masque" for="o-nouvelle">Nouvelle étape</label><input id="o-nouvelle" maxlength="80" autocomplete="off" placeholder="Ajouter une étape…" enterkeyhint="done">
            <button type="button" class="bouton petit secondaire" data-o="ajouter-etape">Ajouter</button></div></div></div>
        <div id="o-taches"></div>
        <p class="erreur" id="o-erreur" role="alert"></p>
        ${ob ? `<button type="button" class="bouton danger" data-o="supprimer">${ICONE.corbeille} Supprimer l'objectif</button>` : ''}
      </div>
      <div class="f-pied"><button type="submit" class="bouton">${ob ? 'Enregistrer' : 'Créer l\'objectif'}</button></div>`;
    majObjectif();
    OD.showModal();
    if (!ob) focusDepart(() => OF.elements.namedItem('titre'));
  }
  const etapesEdition = () => U.objectif.ob ? U.objectif.ob.etapes : U.objectif.etapes;
  function majObjectif(focus) {
    const O = U.objectif, ob = O.ob, c = cat(O.cat);
    $('#o-cat').innerHTML = `<span><span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span><b>${esc(c.nom)}</b></span><span class="val">${ICONE.droite}</span>`;
    $('#o-cat').setAttribute('aria-label', `Catégorie : ${c.nom}. Changer`);
    const et = etapesEdition();
    $('#o-etapes').innerHTML = et.length ? et.map(e => `<div class="etape${e.faitLe ? ' faite' : ''}" role="listitem">
        ${ob ? rondCoche(e.id, !!e.faitLe, `${e.titre} : ${e.faitLe ? 'franchie' : 'à faire'}`, 'data-etape') : ''}<span>${esc(e.titre)}</span>
        <button type="button" class="retirer" data-retirer-etape="${e.id}" aria-label="Retirer l'étape ${esc(e.titre)}" data-focus="re${e.id}">${ICONE.croix}</button></div>`).join('')
      : '<p class="note" style="padding:12px 14px">Découpe ton objectif en étapes concrètes. Chacune rapporte les points de sa catégorie.</p>';
    if (ob) {
      const a = avancement(ob);
      $('#o-resume').innerHTML = `<div class="carte pad obj-resume"><div class="anneau petit" role="img" aria-label="${a.pc} % accompli">${anneau(a.pc / 100, 'o')}<div class="val" aria-hidden="true"><b>${a.pc}<small>%</small></b></div></div>
        <p>${ob.atteintLe ? '<b>✓ Objectif atteint</b><br>' : ''}<b>${a.faits} / ${a.total}</b> ${a.total > 1 ? 'pas franchis' : 'pas franchi'} : étapes et tâches liées.<br>Bonus à 100 % : <b>+${c.points * CONFIG.points.bonusObjectif} pts</b>.</p></div>`;
      const t = a.taches, passees = t.filter(o => o.k <= aujourdhui()), avenir = t.filter(o => o.k > aujourdhui());
      $('#o-taches').innerHTML = `<span class="etiquette">Tâches liées</span>
        <div class="groupe">${t.length ? passees.slice(-6).concat(avenir.slice(0, 4)).map(o => `<div class="rang"><span><span class="tuile petite" style="--c:${cat(o.el.cat).couleur}" aria-hidden="true">${cat(o.el.cat).icone}</span><span>${esc(o.el.titre)}<span class="sous">${cap(quandJour(o.k))} · ${plage(o.el)}</span></span></span><span class="val" style="color:${o.fait ? 'var(--vert)' : 'var(--doux)'}">${o.fait ? '✓ faite' : o.k < aujourdhui() ? 'pas faite' : 'à venir'}</span></div>`).join('')
          : '<p class="note" style="padding:12px 14px">Aucune tâche liée. Dans une tâche, choisis « Objectif lié ».</p>'}</div>
        <button type="button" class="bouton secondaire petit" data-o="tache" style="margin-top:10px">${ICONE.plus} Planifier une tâche liée</button>`;
    } else { $('#o-resume').innerHTML = ''; $('#o-taches').innerHTML = ''; }
    if (focus) { const f = OD.querySelector(focus); if (f) f.focus(); }
  }
  function ajouterEtape() {
    const champ = $('#o-nouvelle'), t = champ.value.trim();
    if (!t) { champ.focus(); return; }
    etapesEdition().push({ id: uid(), titre: t, faitLe: null });
    champ.value = '';
    if (U.objectif.ob) { if (U.objectif.ob.atteintLe) { U.decoche = true; } sauver(); render(); }
    majObjectif('#o-nouvelle');
    dire(`Étape ajoutée : « ${t} ».`);
  }
  OF.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'o-nouvelle') { e.preventDefault(); ajouterEtape(); } });
  OF.addEventListener('submit', e => {
    e.preventDefault();
    const titre = OF.elements.namedItem('titre').value.trim();
    if (!titre) { $('#o-erreur').textContent = 'Donne un nom à l\'objectif.'; OF.elements.namedItem('titre').focus(); return; }
    const echeance = OF.elements.namedItem('echeance').value || null;
    const O = U.objectif;
    if (O.ob) Object.assign(O.ob, { titre, cat: O.cat, echeance });
    else S.objectifs.push({ id: uid(), titre, cat: O.cat, echeance, etapes: O.etapes, creeLe: Date.now(), atteintLe: null });
    sauver();
    OD.close();
    S.vueObj = 'long';
    render();
    dire(O.ob ? 'Objectif enregistré.' : `Objectif créé : « ${titre} ». 🎯`);
    feliciter();
  });
  OD.addEventListener('click', async e => {
    const et = e.target.closest('[data-etape]');
    if (et) {
      const ob = U.objectif.ob, x = ob && ob.etapes.find(y => y.id === et.dataset.etape);
      if (!x) return;
      const msg = basculerEtape(ob, x);
      sauver(); render();
      majObjectif(`[data-etape="${x.id}"]`);
      dire(msg);
      feliciter();
      return;
    }
    const re = e.target.closest('[data-retirer-etape]');
    if (re) {
      const liste = etapesEdition(), i = liste.findIndex(y => y.id === re.dataset.retirerEtape);
      if (i < 0) return;
      const x = liste[i];
      if (U.objectif.ob && x.faitLe) { reprendre(cleEtape(U.objectif.ob, x)); }
      liste.splice(i, 1);
      if (U.objectif.ob) { sauver(); render(); }
      majObjectif('#o-nouvelle');
      dire(`Étape retirée : « ${x.titre} ».`);
      return;
    }
    const b = e.target.closest('[data-o]');
    if (!b) return;
    const a = b.dataset.o;
    if (a === 'annuler') { OD.close(); return; }
    if (a === 'ajouter-etape') { ajouterEtape(); return; }
    if (a === 'cat') { ouvrirChoixCat(U.objectif.cat, id => { U.objectif.cat = id; majObjectif('#o-cat'); }); return; }
    if (a === 'tache') { const ob = U.objectif.ob; OD.close(); ouvrirTache(null, { date: aujourdhui(), cat: ob.cat, objectif: ob.id, titre: '' }); return; }
    if (a === 'supprimer') {
      const ob = U.objectif.ob;
      if (!(await demander('Supprimer cet objectif ?', `« ${ob.titre} » et ses étapes seront supprimés. Les tâches liées restent dans ton calendrier, et les points déjà gagnés restent.`, [{ texte: 'Supprimer', valeur: true, danger: true }, { texte: 'Annuler', valeur: false, clair: true }]))) return;
      S.objectifs = S.objectifs.filter(x => x !== ob);
      S.elements.forEach(el => { if (el.objectif === ob.id) el.objectif = null; });
      sauver(); OD.close(); render();
      dire('Objectif supprimé.');
    }
  });
  const prochaineHeure = () => Math.min(Math.ceil((minNow() + 1) / 60) * 60, 23 * 60);

  // ---------- Catégories (gestion, maquette « Catégories ») ----------
  const CSD = $('#categories');
  function ouvrirCategories() { U.filtreCat = U.filtreCat || 'toutes'; renderCategories(); CSD.querySelector('[data-fermer]').innerHTML = ICONE.gauche; CSD.showModal(); }
  function renderCategories(focus) {
    const f = U.filtreCat, l = S.categories.filter(c => f === 'toutes' || (f === 'actives' ? c.active : !c.active));
    const lundi = lundiDe(aujourdhui());
    $('#cs-corps').innerHTML = `<p class="note">Personnalise ton univers : chaque catégorie a sa valeur en points et son objectif par semaine.</p>
      <div class="segments" role="group" aria-label="Filtre">${[['toutes', 'Toutes'], ['actives', 'Actives'], ['inactives', 'Inactives']].map(([v, n]) => `<button type="button" aria-pressed="${f === v}" data-filtre-cat="${v}" data-focus="fc${v}">${n}</button>`).join('')}</div>
      <div class="groupe cat-liste">${l.length ? l.map(c => {
        const n = faitsCat(c.id, lundi, aujourdhui());
        return `<div class="rang${c.active ? '' : ' inactive'}"><button type="button" class="ouvrir-cat" data-modifier-cat="${esc(c.id)}" data-focus="mc${esc(c.id)}"
            aria-label="${esc(c.nom)}, ${c.points} points, ${c.objectif ? 'objectif ' + c.objectif + ' par semaine, ' + n + ' cette semaine' : 'sans objectif'}, ${c.active ? 'active' : 'inactive'} : modifier">
            <span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span><span class="quoi-cat" aria-hidden="true"><b>${esc(c.nom)}</b><small>${c.objectif ? `${c.objectif} / semaine · ${n} cette semaine` : 'Sans objectif'} · +${c.points} pts</small></span></button>
          <span class="interrupteur"><input type="checkbox" role="switch" data-activer-cat="${esc(c.id)}"${c.active ? ' checked' : ''} aria-label="${esc(c.nom)} active" data-focus="ac${esc(c.id)}"><i></i></span></div>`;
      }).join('') : '<p class="note" style="padding:14px">Aucune catégorie ici.</p>'}</div>
      <button type="button" class="bouton" data-nouvelle-cat="1" data-focus="ncat">${ICONE.plus} Créer une catégorie</button>`;
    if (focus) { const x = CSD.querySelector(`[data-focus="${CSS.escape(focus)}"]`); if (x) x.focus(); }
  }
  CSD.addEventListener('click', e => {
    const f = e.target.closest('[data-filtre-cat]');
    if (f) { U.filtreCat = f.dataset.filtreCat; renderCategories('fc' + U.filtreCat); return; }
    const m = e.target.closest('[data-modifier-cat]');
    if (m) { ouvrirCategorie(cat(m.dataset.modifierCat)); return; }
    if (e.target.closest('[data-nouvelle-cat]')) ouvrirCategorie(null);
  });
  CSD.addEventListener('change', e => {
    const t = e.target.closest('[data-activer-cat]');
    if (!t) return;
    const c = S.categories.find(x => x.id === t.dataset.activerCat);
    if (!c) return;
    if (!t.checked && catsActives().length <= 1) { t.checked = true; dire('Garde au moins une catégorie active.'); return; }
    c.active = t.checked;
    sauver(); render();
    renderCategories('ac' + c.id);
  });
  const CTD = $('#categorie'), CTF = $('#form-cat');
  function ouvrirCategorie(c) {
    U.categorie = c || null;
    const v = c || { nom: '', icone: '🎯', couleur: PALETTE[5], points: 20, objectif: 2, active: true };
    CTF.innerHTML = `
      <div class="f-haut"><button type="button" class="f-icone" data-ct="annuler" aria-label="Fermer">${ICONE.croix}</button><h2 id="ct-titre">${c ? 'Catégorie' : 'Nouvelle catégorie'}</h2>
        <button type="submit" class="f-valider" aria-label="Enregistrer">${ICONE.coche}</button></div>
      <p class="f-msg" role="status" aria-live="polite"></p>
      <div class="f-corps">
        <label class="champ-nom">${ICONE.crayon}<span class="masque">Nom</span><input name="nom" maxlength="24" autocomplete="off" placeholder="Nom de la catégorie" value="${esc(v.nom)}"></label>
        <fieldset><legend>Icône</legend><div class="icones-choix">${ICONES_CAT.map(i => `<label><input type="radio" name="icone" value="${i}"${i === v.icone ? ' checked' : ''} aria-label="${i}">${i}</label>`).join('')}</div></fieldset>
        <fieldset><legend>Couleur</legend><div class="couleurs-choix">${PALETTE.map(p => `<label style="--c:${p}"><input type="radio" name="couleur" value="${p}"${p === v.couleur ? ' checked' : ''} aria-label="${NOMS_COULEURS[p]}"></label>`).join('')}</div></fieldset>
        <div class="groupe">
          <label class="rang"><span><span class="ic" style="color:var(--orange)">${ICONE.etoile}</span><span>Points<span class="sous">par tâche ou habitude faite</span></span></span><input type="number" name="points" min="0" max="1000" step="5" inputmode="numeric" value="${v.points}"></label>
          <label class="rang"><span><span class="ic">${ICONE.cible}</span><span>Objectif par semaine<span class="sous">nombre de fois (0 = aucun)</span></span></span><input type="number" name="objectif" min="0" max="21" step="1" inputmode="numeric" value="${v.objectif}"></label>
          <label class="rang"><span>Active</span><span class="interrupteur"><input type="checkbox" role="switch" name="active"${v.active ? ' checked' : ''}><i></i></span></label>
        </div>
        <p class="erreur" id="ct-erreur" role="alert"></p>
        ${c ? `<button type="button" class="bouton danger" data-ct="supprimer">${ICONE.corbeille} Supprimer la catégorie</button>` : ''}
      </div>
      <div class="f-pied"><button type="submit" class="bouton">${c ? 'Enregistrer' : 'Créer la catégorie'}</button></div>`;
    CTD.showModal();
    if (!c) focusDepart(() => CTF.elements.namedItem('nom'));
  }
  CTF.addEventListener('submit', e => {
    e.preventDefault();
    const g = n => CTF.elements.namedItem(n);
    const nom = g('nom').value.trim();
    if (!nom) { $('#ct-erreur').textContent = 'Donne un nom.'; g('nom').focus(); return; }
    if (S.categories.some(x => x !== U.categorie && x.nom.toLowerCase() === nom.toLowerCase())) { $('#ct-erreur').textContent = 'Cette catégorie existe déjà.'; g('nom').focus(); return; }
    const valeurs = { nom, icone: (CTF.querySelector('input[name="icone"]:checked') || {}).value || '⭐', couleur: (CTF.querySelector('input[name="couleur"]:checked') || {}).value || PALETTE[5],
      points: borne(Math.round(+g('points').value || 0), 0, 1000), objectif: borne(Math.round(+g('objectif').value || 0), 0, 21), active: g('active').checked };
    if (!valeurs.active && catsActives().filter(x => x !== U.categorie).length === 0) { $('#ct-erreur').textContent = 'Garde au moins une catégorie active.'; return; }
    if (U.categorie) Object.assign(U.categorie, valeurs);
    else S.categories.push(Object.assign({ id: uid() }, valeurs));
    sauver();
    CTD.close();
    render();
    if (CSD.open) renderCategories();
    dire(U.categorie ? 'Catégorie enregistrée.' : `Catégorie créée : ${valeurs.icone} ${nom}.`);
  });
  CTD.addEventListener('click', async e => {
    const b = e.target.closest('[data-ct]');
    if (!b) return;
    if (b.dataset.ct === 'annuler') { CTD.close(); return; }
    if (b.dataset.ct === 'supprimer') {
      const c = U.categorie;
      if (S.categories.length <= 1) { dire('Il faut garder au moins une catégorie.'); return; }
      const autre = S.categories.find(x => x !== c && x.active) || S.categories.find(x => x !== c);
      const n = S.elements.filter(el => el.cat === c.id).length + S.habitudes.filter(h => h.cat === c.id).length + S.objectifs.filter(o => o.cat === c.id).length;
      if (!(await demander('Supprimer cette catégorie ?', n ? `${pluriel(n, 'élément')} passeront dans « ${autre.nom} ». Les points déjà gagnés restent.` : `« ${c.nom} » sera supprimée.`, [{ texte: 'Supprimer', valeur: true, danger: true }, { texte: 'Annuler', valeur: false, clair: true }]))) return;
      S.elements.forEach(el => { if (el.cat === c.id) el.cat = autre.id; });
      S.habitudes.forEach(h => { if (h.cat === c.id) h.cat = autre.id; });
      S.objectifs.forEach(o => { if (o.cat === c.id) o.cat = autre.id; });
      S.categories = S.categories.filter(x => x !== c);
      sauver(); CTD.close(); render();
      if (CSD.open) renderCategories();
      dire('Catégorie supprimée.');
    }
  });
