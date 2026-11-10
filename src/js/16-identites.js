  // ---------- Qui je deviens ----------
  // 1 à 4 identités (« Athlète », « Bâtisseur »…). Chaque catégorie peut en nourrir une : chaque tâche ou habitude faite
  // dans cette catégorie est un acte qui te fait devenir cette personne. S.identites = [{ id, nom, icone, phrase }] ; categorie.identite = id.
  const IDEES = [['Athlète', '🏃', 'Je prends soin de mon corps, chaque semaine.'], ['Bâtisseur', '🏗️', 'J\'avance sur ce qui compte, pas seulement sur l\'urgent.'],
    ['Esprit curieux', '📚', 'J\'apprends quelque chose chaque jour.'], ['Présent pour les miens', '🤝', 'Je donne du temps à ceux que j\'aime.'],
    ['Serein', '🧘', 'Je protège mon calme et mon repos.'], ['Créateur', '🎨', 'Je fabrique, j\'écris, je crée.']];
  const EMOJIS_ID = ['🏃', '🏗️', '📚', '🤝', '🧘', '🎨', '💪', '🧠', '❤️', '🌱', '🎯', '✨'];
  const identite = id => S.identites.find(x => x.id === id) || null;
  const catsIdentite = id => S.categories.filter(c => c.identite === id);
  const identiteDeCat = catId => { const c = S.categories.find(x => x.id === catId); return c && c.identite ? identite(c.identite) : null; };
  // Actes d'une identité sur une période, et part de ses objectifs de la semaine déjà tenue
  function statsIdentite(idt, a, b) {
    const cats = catsIdentite(idt.id), G = gainsEntre(a, b);
    let actes = 0, vise = 0, tenu = 0, pts = 0;
    cats.forEach(c => { const n = faitsCat(c.id, a, b); actes += n; pts += G.cats[c.id] || 0; if (c.active && c.objectif) { vise += c.objectif; tenu += Math.min(n, c.objectif); } });
    return { cats, actes, pts, taux: vise ? tenu / vise : null };
  }
  const enSommeil = idt => { const auj = aujourdhui(); return catsIdentite(idt.id).length > 0 && statsIdentite(idt, decaler(auj, -6), auj).actes === 0; };
  // Après une tâche ou une habitude faite : « tu deviens… »
  const echoIdentite = catId => { const i = identiteDeCat(catId); return i ? ` · ${i.icone} ${i.nom}` : ''; };

  function ligneIdentite(idt, a, b, focus) {
    const st = statsIdentite(idt, a, b), dort = enSommeil(idt), pc = st.taux == null ? null : Math.round(st.taux * 100);
    const lab = `${idt.nom} : ${pluriel(st.actes, 'acte')} cette semaine${pc == null ? '' : `, ${pc} % de ses objectifs`}${dort ? ', en sommeil depuis 7 jours' : ''}${st.cats.length ? '' : ', aucune catégorie rattachée'}. Modifier`;
    return `<button type="button" class="idt-ligne${dort ? ' dort' : ''}" data-identite="${esc(idt.id)}" data-focus="${focus}${esc(idt.id)}" aria-label="${esc(lab)}">
        <span class="tuile" aria-hidden="true">${idt.icone}</span>
        <span class="quoi" aria-hidden="true"><b>${esc(idt.nom)}</b><small>${st.cats.length ? (dort ? 'En sommeil : un petit acte la réveille' : esc(st.cats.map(c => c.nom).join(' · '))) : 'Rattache-lui une catégorie'}</small>
          ${pc == null ? '' : `<span class="barre-obj"><i style="width:${Math.max(pc, 2)}%"></i></span>`}</span>
        <span class="idt-val" aria-hidden="true"><b>${st.actes}</b><small>${st.actes > 1 ? 'actes' : 'acte'}</small></span></button>`;
  }
  // Sur l'accueil
  function carteIdentites() {
    const l = lundiDe(aujourdhui()), d = decaler(l, 6);
    if (!S.identites.length) return `<button type="button" class="carte b-entree" data-action="identites" data-focus="idt">
        <span class="tuile" style="--c:#e4d3b3" aria-hidden="true">🧭</span><span class="quoi"><b>Qui veux-tu devenir ?</b><small>Donne un sens à tes points : choisis 1 à 4 identités.</small></span>${ICONE.droite}</button>`;
    return `<section class="carte pad idt" aria-labelledby="idt-titre">
        <div class="section-tete"><h2 id="idt-titre">Qui je deviens</h2><button type="button" class="lien" data-action="identites" data-focus="idt" aria-label="Modifier mes identités">Modifier</button></div>
        <div class="idt-liste">${S.identites.map(i => ligneIdentite(i, l, d, 'idt')).join('')}</div></section>`;
  }
  // Dans le bilan de la semaine
  function bilanIdentites(lundi) {
    if (!S.identites.length) return '';
    const dim = decaler(lundi, 6);
    const l = S.identites.map(i => ({ i, st: statsIdentite(i, lundi, dim) })).sort((x, y) => y.st.actes - x.st.actes);
    return `<section aria-labelledby="b-idt"><div class="section-tete"><h3 id="b-idt">Qui tu as nourri</h3></div>
        <ul class="groupe prio-revue idt-revue">${l.map(({ i, st }) => `<li class="${st.actes ? 'faite' : ''}"><span class="tuile petite" aria-hidden="true">${i.icone}</span>
          <span>${esc(i.nom)}<small>${st.actes ? `${pluriel(st.actes, 'acte')} · +${nombre(st.pts)} pts` : (st.cats.length ? 'rien cette semaine-là' : 'aucune catégorie rattachée')}</small></span></li>`).join('')}</ul></section>`;
  }

  // ---------- La page ----------
  const ID = $('#identites');
  const I = { edit: null, brouillon: null };       // edit : id, 'nouveau' ou null (liste)
  function ouvrirIdentites(id) {
    I.edit = null;
    if (id) editerIdentite(id); else renderIdentites();
    if (!ID.open) ID.showModal();
  }
  function editerIdentite(id) {
    const x = id === 'nouveau' ? null : identite(id);
    I.edit = x ? x.id : 'nouveau';
    I.brouillon = x ? { nom: x.nom, icone: x.icone, phrase: x.phrase || '', cats: catsIdentite(x.id).map(c => c.id) } : { nom: '', icone: '🎯', phrase: '', cats: [] };
    renderIdentites();
  }
  function renderIdentites(focus) {
    const corps = $('#i-corps'), pied = $('#i-pied'), haut = ID.querySelector('[data-i-retour]');
    ID.querySelector('.f-msg').textContent = '';
    if (!I.edit) {
      const l = lundiDe(aujourdhui()), d = decaler(l, 6);
      haut.innerHTML = ICONE.croix; haut.setAttribute('aria-label', 'Fermer');
      $('#i-titre').textContent = 'Qui je deviens';
      corps.innerHTML = `<p class="note">Tu ne coches pas des cases : tu deviens quelqu'un. Choisis 1 à 4 identités et rattache-leur tes catégories. Chaque tâche ou habitude faite est un acte de plus.</p>
        ${S.identites.length ? `<div class="groupe idt-liste">${S.identites.map(i => ligneIdentite(i, l, d, 'idl')).join('')}</div>` : '<p class="carte vide">Aucune identité pour l\'instant. Qui veux-tu être dans un an ?</p>'}`;
      pied.innerHTML = S.identites.length < 4 ? `<button type="button" class="bouton" data-i="nouvelle" data-focus="i-nouvelle">${ICONE.plus} Ajouter une identité</button>` : `<p class="note" style="text-align:center">4 identités au plus : choisir, c'est renoncer.</p>`;
    } else {
      const b = I.brouillon, nouveau = I.edit === 'nouveau';
      haut.innerHTML = ICONE.gauche; haut.setAttribute('aria-label', 'Retour');
      $('#i-titre').textContent = nouveau ? 'Nouvelle identité' : 'Identité';
      const prises = S.identites.map(x => x.nom);
      corps.innerHTML = `
        ${nouveau ? `<div><span class="etiquette" id="i-idees">Des idées</span><div class="pastilles" role="group" aria-labelledby="i-idees">${IDEES.filter(x => !prises.includes(x[0])).map((x, n) => `<button type="button" class="pastille" data-i-idee="${IDEES.indexOf(x)}" data-focus="idee${n}">${x[1]} ${x[0]}</button>`).join('')}</div></div>` : ''}
        <label class="champ-nom"><span aria-hidden="true">${b.icone}</span><span class="masque">Nom de l'identité</span><input name="i-nom" maxlength="40" autocomplete="off" placeholder="Athlète, Bâtisseur…" value="${esc(b.nom)}"></label>
        <div><span class="etiquette" id="i-ic">Symbole</span><div class="pastilles" role="radiogroup" aria-labelledby="i-ic">${EMOJIS_ID.map((e, n) => `<button type="button" class="pastille ronde" role="radio" aria-checked="${e === b.icone}" aria-label="Symbole ${e}" data-i-icone="${e}" data-focus="ic${n}">${e}</button>`).join('')}</div></div>
        <div><label class="etiquette" for="i-phrase">Ce que ça veut dire <span class="sous">facultatif</span></label>
          <label class="champ-nom"><span aria-hidden="true">💬</span><input id="i-phrase" name="i-phrase" maxlength="80" autocomplete="off" placeholder="Je suis quelqu'un qui…" value="${esc(b.phrase)}"></label></div>
        <div><span class="etiquette" id="i-cats">Les catégories qui la nourrissent</span>
          <div class="groupe" role="group" aria-labelledby="i-cats">${S.categories.filter(c => c.active || b.cats.includes(c.id)).map(c => { const autre = c.identite && c.identite !== I.edit ? identite(c.identite) : null;
            return `<label class="rang"><span><span class="tuile petite" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span><span>${esc(c.nom)}${autre && !b.cats.includes(c.id) ? `<span class="sous">nourrit déjà « ${esc(autre.nom)} »</span>` : ''}</span></span>
              <span class="interrupteur"><input type="checkbox" role="switch" data-i-cat="${esc(c.id)}"${b.cats.includes(c.id) ? ' checked' : ''}><i></i></span></label>`; }).join('')}</div>
          <p class="note" style="margin-top:8px">Une catégorie nourrit une seule identité.</p></div>
        <p class="erreur" id="i-erreur" role="alert"></p>
        ${nouveau ? '' : `<button type="button" class="bouton danger" data-i="supprimer">${ICONE.corbeille} Retirer cette identité</button>`}`;
      pied.innerHTML = `<button type="button" class="bouton" data-i="enregistrer">${nouveau ? 'Devenir cette personne' : 'Enregistrer'}</button>`;
    }
    if (focus) { const c = ID.querySelector(`[data-focus="${CSS.escape(focus)}"]`); if (c) c.focus(); }
  }
  const lireIdentite = () => { const n = ID.querySelector('[name="i-nom"]'), p = ID.querySelector('[name="i-phrase"]'); if (n) I.brouillon.nom = n.value.trim().replace(/\s+/g, ' '); if (p) I.brouillon.phrase = p.value.trim(); };
  ID.addEventListener('change', e => {
    const c = e.target.dataset && e.target.dataset.iCat;
    if (!c) return;
    const l = I.brouillon.cats;
    if (e.target.checked) { if (!l.includes(c)) l.push(c); } else l.splice(l.indexOf(c), 1);
  });
  ID.addEventListener('click', async e => {
    if (e.target.closest('[data-i-retour]')) { if (I.edit && S.identites.length) { I.edit = null; renderIdentites(); } else ID.close(); return; }
    const li = e.target.closest('[data-identite]');
    if (li) return editerIdentite(li.dataset.identite);
    const idee = e.target.closest('[data-i-idee]');
    if (idee) { const x = IDEES[+idee.dataset.iIdee]; lireIdentite(); Object.assign(I.brouillon, { nom: x[0], icone: x[1], phrase: x[2] }); return renderIdentites(); }
    const ic = e.target.closest('[data-i-icone]');
    if (ic) { lireIdentite(); I.brouillon.icone = ic.dataset.iIcone; return renderIdentites(ic.dataset.focus); }
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const a = b.dataset.i;
    if (a === 'nouvelle') return editerIdentite('nouveau');
    if (a === 'enregistrer') {
      lireIdentite();
      const br = I.brouillon;
      if (!br.nom) { $('#i-erreur').textContent = 'Donne un nom à cette identité.'; ID.querySelector('[name="i-nom"]').focus(); return; }
      let x = identite(I.edit);
      if (!x) { x = { id: uid() }; S.identites.push(x); }
      Object.assign(x, { nom: br.nom.slice(0, 40), icone: br.icone, phrase: br.phrase.slice(0, 80) });
      S.categories.forEach(c => { if (br.cats.includes(c.id)) c.identite = x.id; else if (c.identite === x.id) c.identite = null; });
      sauver();
      const nouveau = I.edit === 'nouveau';
      I.edit = null;
      renderIdentites();
      ID.querySelector('.f-msg').textContent = '';
      dire(nouveau ? `${x.icone} ${x.nom} : chaque acte compte, à partir de maintenant.` : 'Identité enregistrée.');
      return;
    }
    if (a === 'supprimer') {
      const x = identite(I.edit);
      if (!(await demander('Retirer cette identité ?', `« ${x.nom} » ne sera plus suivie. Tes catégories, tes tâches et tes points ne changent pas.`, [{ texte: 'Retirer', valeur: true, danger: true }, { texte: 'Annuler', valeur: false, clair: true }]))) return;
      S.identites = S.identites.filter(y => y.id !== x.id);
      S.categories.forEach(c => { if (c.identite === x.id) c.identite = null; });
      sauver();
      I.edit = null;
      renderIdentites();
      dire('Identité retirée.');
    }
  });
  ID.addEventListener('close', () => { I.edit = null; render(); });
