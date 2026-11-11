  // ---------- Récompenses ----------
  // Une boutique personnelle : tu fixes tes récompenses et leur prix, tu te les offres avec tes points.
  // S.recompenses = [{ id, titre, icone, prix }] ; S.achats = [{ id, titre, icone, prix, jour }].
  // Le solde (« à dépenser ») = points gagnés − points dépensés. Dépenser ne fait pas baisser le total ni le niveau.
  const IDEES_REC = [['☕', 'Un café en terrasse', 100], ['🎬', 'Un film ou un épisode, sans culpabilité', 150], ['🛋️', 'Une soirée à ne rien faire', 300], ['🍽️', 'Un bon restaurant', 600], ['🎁', 'Un achat plaisir', 1500]];
  const EMOJIS_REC = ['🎁', '☕', '🎬', '🍽️', '🛋️', '🎮', '📚', '👟', '✈️', '💆', '🍫', '🎧'];
  const depense = () => S.achats.reduce((t, a) => t + a.prix, 0);
  const solde = () => S.points - depense();
  const RD = $('#recompenses');
  const RC = { edit: null, brouillon: null };
  function ouvrirRecompenses() { RC.edit = null; renderRecompenses(); if (!RD.open) RD.showModal(); }
  function renderRecompenses(focus) {
    const corps = $('#r-corps'), pied = $('#r-pied'), haut = RD.querySelector('[data-r-retour]'), s = solde();
    RD.querySelector('.f-msg').textContent = '';
    if (!RC.edit) {
      haut.innerHTML = ICONE.croix; haut.setAttribute('aria-label', 'Fermer');
      $('#r-titre').textContent = 'Récompenses';
      const prises = S.recompenses.map(r => r.titre), idees = IDEES_REC.filter(x => !prises.includes(x[1]));
      corps.innerHTML = `
        <section class="carte r-solde" aria-label="Solde : ${nombre(s)} points à dépenser"><p aria-hidden="true"><b>${nombre(s)}</b><small>pts à dépenser</small></p>
          <p class="note" aria-hidden="true">${nombre(S.points)} gagnés${depense() ? ` · ${nombre(depense())} dépensés` : ''} · ton niveau ne baisse jamais</p></section>
        ${S.recompenses.length ? `<div class="lignes">${S.recompenses.slice().sort((a, b) => a.prix - b.prix).map(r => { const ok = s >= r.prix;
          return `<div class="carte r-ligne${ok ? ' ok' : ''}" role="group" aria-label="${esc(r.titre)}, ${nombre(r.prix)} points${ok ? '' : `, encore ${nombre(r.prix - s)} points`}">
            <button type="button" class="ouvrir" data-r-edit="${esc(r.id)}" data-focus="re${esc(r.id)}" aria-label="Modifier ${esc(r.titre)}"><span class="tuile" aria-hidden="true">${r.icone}</span>
              <span class="quoi" aria-hidden="true"><b>${esc(r.titre)}</b><small>${nombre(r.prix)} pts${ok ? '' : ` · encore ${nombre(r.prix - s)}`}</small>${ok ? '' : `<span class="barre-obj"><i style="width:${Math.max(2, Math.round(Math.max(0, s) / r.prix * 100))}%"></i></span>`}</span></button>
            <button type="button" class="bouton petit${ok ? '' : ' secondaire'}" data-r-offrir="${esc(r.id)}" data-focus="ro${esc(r.id)}"${ok ? '' : ' disabled'}>M'offrir</button></div>`; }).join('')}</div>`
          : `<p class="carte vide">Tes points valent ce que tu décides. Choisis ce qui te fait vraiment plaisir, et fixe son prix.</p>`}
        ${idees.length ? `<div><span class="etiquette" id="r-idees">Des idées</span><div class="pastilles" role="group" aria-labelledby="r-idees">${idees.map((x, n) => `<button type="button" class="pastille" data-r-idee="${IDEES_REC.indexOf(x)}" data-focus="ri${n}">${x[0]} ${x[1]} · ${x[2]}</button>`).join('')}</div></div>` : ''}
        ${S.achats.length ? `<section aria-labelledby="r-hist"><div class="section-tete"><h3 id="r-hist">Déjà offert</h3></div>
          <ul class="groupe prio-revue">${S.achats.slice(-8).reverse().map(a => `<li class="faite"><span class="tuile petite" aria-hidden="true">${a.icone}</span><span>${esc(a.titre)}<small style="display:block;color:var(--doux);font-size:12.5px">${cap(quandJour(a.jour))} · ${nombre(a.prix)} pts</small></span></li>`).join('')}</ul></section>` : ''}`;
      pied.innerHTML = `<button type="button" class="bouton" data-r="nouvelle" data-focus="r-nouvelle">${ICONE.plus} Ajouter une récompense</button>`;
    } else {
      const b = RC.brouillon, nouveau = RC.edit === 'nouveau';
      haut.innerHTML = ICONE.gauche; haut.setAttribute('aria-label', 'Retour');
      $('#r-titre').textContent = nouveau ? 'Nouvelle récompense' : 'Récompense';
      corps.innerHTML = `
        <label class="champ-nom"><span aria-hidden="true">${b.icone}</span><span class="masque">Nom de la récompense</span><input name="r-nom" maxlength="60" autocomplete="off" placeholder="Ce qui te fait plaisir…" value="${esc(b.titre)}"></label>
        <div><span class="etiquette" id="r-ic">Symbole</span><div class="pastilles" role="radiogroup" aria-labelledby="r-ic">${EMOJIS_REC.map((e, n) => `<button type="button" class="pastille ronde" role="radio" aria-checked="${e === b.icone}" aria-label="Symbole ${e}" data-r-icone="${e}" data-focus="rc${n}">${e}</button>`).join('')}</div></div>
        <div><label class="etiquette" for="r-prix">Prix en points</label>
          <div class="puces" role="group" aria-label="Prix courants">${[50, 100, 200, 300, 500, 1000, 2000].map(p => `<button type="button" class="puce" data-r-prix="${p}" aria-pressed="${b.prix === p}">${nombre(p)}</button>`).join('')}</div>
          <label class="champ-nom" style="margin-top:8px"><span aria-hidden="true">⭐</span><input id="r-prix" name="r-prix" type="number" inputmode="numeric" min="10" max="100000" step="10" value="${b.prix}"></label>
          <p class="note" style="margin-top:8px">Repère : une semaine où tu atteins tous tes objectifs rapporte environ ${nombre(pointsSemaineType())} pts.</p></div>
        <p class="erreur" id="r-erreur" role="alert"></p>
        ${nouveau ? '' : `<button type="button" class="bouton danger" data-r="supprimer">${ICONE.corbeille} Retirer cette récompense</button>`}`;
      pied.innerHTML = `<button type="button" class="bouton" data-r="enregistrer">${nouveau ? 'Ajouter' : 'Enregistrer'}</button>`;
    }
    if (focus) { const c = RD.querySelector(`[data-focus="${CSS.escape(focus)}"]`); if (c) c.focus(); }
  }
  // Ce que rapporte une semaine où tous les objectifs sont atteints (points des objectifs + bonus de la semaine)
  const pointsSemaineType = () => Math.max(100, Math.round(S.categories.filter(c => c.active && c.objectif).reduce((t, c) => t + c.points * c.objectif + bonusSemaine(c), 0) / 10) * 10);
  const lireRec = () => { const n = RD.querySelector('[name="r-nom"]'), p = RD.querySelector('[name="r-prix"]'); if (n) RC.brouillon.titre = n.value.trim().replace(/\s+/g, ' '); if (p) RC.brouillon.prix = Math.round(+p.value) || 0; };
  function editerRec(id) { const r = S.recompenses.find(x => x.id === id); RC.edit = r ? r.id : 'nouveau'; RC.brouillon = r ? { titre: r.titre, icone: r.icone, prix: r.prix } : { titre: '', icone: '🎁', prix: 200 }; renderRecompenses(); }
  RD.addEventListener('click', async e => {
    if (e.target.closest('[data-r-retour]')) { if (RC.edit) { RC.edit = null; renderRecompenses(); } else RD.close(); return; }
    const d = (e.target.closest('[data-r-edit], [data-r-offrir], [data-r-idee], [data-r-icone], [data-r-prix], [data-r]') || {}).dataset;
    if (!d) return;
    if (d.rEdit) return editerRec(d.rEdit);
    if (d.rIdee) { const x = IDEES_REC[+d.rIdee]; S.recompenses.push({ id: uid(), titre: x[1], icone: x[0], prix: x[2] }); sauver(); renderRecompenses(); return dire(`${x[0]} ${x[1]} : ${x[2]} pts. Touche-la pour changer son prix.`); }
    if (d.rIcone) { lireRec(); RC.brouillon.icone = d.rIcone; return renderRecompenses(e.target.closest('[data-focus]').dataset.focus); }
    if (d.rPrix) { lireRec(); RC.brouillon.prix = +d.rPrix; return renderRecompenses(); }
    if (d.rOffrir) {
      const r = S.recompenses.find(x => x.id === d.rOffrir);
      if (!r || solde() < r.prix) return;
      if (!(await demander(`${r.icone} ${r.titre}`, `T'offrir cette récompense pour ${nombre(r.prix)} pts ? Il te restera ${nombre(solde() - r.prix)} pts à dépenser. Tu l'as méritée.`, [{ texte: 'Je me l\'offre', valeur: true }, { texte: 'Pas maintenant', valeur: false, clair: true }]))) return;
      const a = { id: uid(), titre: r.titre, icone: r.icone, prix: r.prix, jour: aujourdhui() };
      S.achats.push(a); sauver(); renderRecompenses();
      return dire(`${r.icone} Profites-en : tu l'as gagnée. Reste ${nombre(solde())} pts.`);
    }
    if (d.r === 'nouvelle') return editerRec('nouveau');
    if (d.r === 'enregistrer') {
      lireRec();
      const b = RC.brouillon;
      if (!b.titre) { $('#r-erreur').textContent = 'Donne un nom à cette récompense.'; RD.querySelector('[name="r-nom"]').focus(); return; }
      if (!(b.prix >= 10 && b.prix <= 100000)) { $('#r-erreur').textContent = 'Le prix va de 10 à 100 000 points.'; RD.querySelector('[name="r-prix"]').focus(); return; }
      let r = S.recompenses.find(x => x.id === RC.edit);
      if (!r) { r = { id: uid() }; S.recompenses.push(r); }
      Object.assign(r, { titre: b.titre.slice(0, 60), icone: b.icone, prix: b.prix });
      sauver(); RC.edit = null; renderRecompenses();
      return dire('Récompense enregistrée.');
    }
    if (d.r === 'supprimer') { S.recompenses = S.recompenses.filter(x => x.id !== RC.edit); sauver(); RC.edit = null; renderRecompenses(); return dire('Récompense retirée.'); }
  });
  RD.addEventListener('close', () => { RC.edit = null; U.garderDefilement = true; render(); });
  // Sur l'accueil : le solde, et la prochaine récompense à portée
  function pastilleRecompenses() {
    const s = solde(), pret = S.recompenses.filter(r => r.prix <= s).sort((a, b) => b.prix - a.prix)[0];
    const prochaine = S.recompenses.filter(r => r.prix > s).sort((a, b) => a.prix - b.prix)[0];
    const texte = pret ? `${pret.icone} ${esc(pret.titre)} : tu peux te l'offrir` : prochaine ? `${prochaine.icone} encore ${nombre(prochaine.prix - s)} pts` : S.recompenses.length ? `${nombre(s)} pts à dépenser` : 'Choisis tes récompenses';
    return `<button type="button" class="rec-pastille${pret ? ' pret' : ''}" data-action="recompenses" data-focus="rec" aria-label="Récompenses : ${nombre(s)} points à dépenser. ${pret ? `Tu peux t'offrir ${esc(pret.titre)}` : prochaine ? `Encore ${nombre(prochaine.prix - s)} points pour ${esc(prochaine.titre)}` : ''}"><span aria-hidden="true">🎁</span><span aria-hidden="true">${texte}</span></button>`;
  }
