  // ---------- Tâches pas faites ----------
  // Les tâches non cochées des 7 derniers jours (avant aujourd'hui). Pour chacune : je l'ai faite, la reporter
  // (aujourd'hui, demain, ou un autre moment), ou la laisser partir — JOMO : rater sans regret, sans points ni pénalité.
  // Laissées partir : S.partis = { clé de l'occurrence : jour de la décision }.
  function pasFaites() {
    const auj = aujourdhui(), res = [];
    for (let i = 7; i >= 1; i--) {
      const k = decaler(auj, -i);
      if (k < (S.depuis || auj)) continue;
      duJour(k).forEach(o => { if (o.el.type === 'tache' && !o.fait && !S.partis[o.cle]) res.push(o); });
    }
    return res;
  }
  // Prochain créneau libre de cette durée, entre 8 h et 22 h, à partir d'un jour (et d'une heure ce jour-là)
  function creneauLibre(k, duree, sans, apres) {
    const occupe = duJour(k).filter(o => o.cle !== sans && !o.el.flou).map(o => [o.el.debut, o.el.fin]);
    for (let m = Math.max(8 * 60, apres || 0); m + duree <= 22 * 60; m += CONFIG.pas) {
      if (!occupe.some(([a, b]) => m < b && m + duree > a)) return { k, debut: m, fin: m + duree };
    }
    return null;
  }
  const libreA = (k, debut, fin, sans) => !duJour(k).some(o => o.cle !== sans && !o.el.flou && debut < o.el.fin && fin > o.el.debut);
  // Propositions pour reporter : aujourd'hui (même heure si elle est encore à venir et libre, sinon le prochain créneau libre),
  // demain (même heure si libre, sinon le créneau libre qui suit)
  function propositions(o) {
    const auj = aujourdhui(), dem = decaler(auj, 1), d = o.el.debut, f = o.el.fin, du = f - d;
    const tot = Math.ceil((minNow() + 5) / CONFIG.pas) * CONFIG.pas;
    const res = [];
    if (o.el.flou) return [{ k: auj, debut: d, fin: f }, { k: dem, debut: d, fin: f }];       // sans heure : le jour seul compte
    const a = d >= tot && libreA(auj, d, f, o.cle) ? { k: auj, debut: d, fin: f } : creneauLibre(auj, du, o.cle, tot);
    if (a) res.push(a);
    const b = libreA(dem, d, f, o.cle) ? { k: dem, debut: d, fin: f } : creneauLibre(dem, du, o.cle);
    if (b) res.push(b);
    return res;
  }
  const quandCourt = k => { const a = aujourdhui(); return k === a ? "Aujourd'hui" : k === decaler(a, 1) ? 'Demain' : cap(fmt(k, { weekday: 'long', day: 'numeric' })); };

  // ---------- Sur l'accueil ----------
  function cartePasFaites() {
    const n = pasFaites().length;
    if (!n) return '';
    return `<button type="button" class="carte b-entree pf-entree" data-action="pas-faites" data-focus="pas-faites">
        <span class="tuile" style="--c:#ffb547" aria-hidden="true">📋</span><span class="quoi"><b>${pluriel(n, 'tâche pas faite', 'tâches pas faites')}</b><small>Coche, reporte ou laisse partir.</small></span>${ICONE.droite}</button>`;
  }

  // ---------- La page « Pas faites » ----------
  const PF = $('#pas-faites');
  const P = { ouverte: null };          // clé de la tâche dont les choix de report sont dépliés
  function ouvrirPasFaites() {
    P.ouverte = null;
    renderPasFaites();
    PF.querySelector('[data-fermer]').innerHTML = ICONE.croix;
    PF.querySelector('.f-msg').textContent = '';
    if (!PF.open) PF.showModal();
  }
  function renderPasFaites(focus) {
    const l = pasFaites();
    const corps = $('#pf-corps');
    if (!l.length) {
      corps.innerHTML = `<div class="pf-fini"><span aria-hidden="true">✨</span><p><b>Tout est décidé.</b>Place à aujourd'hui.</p></div>`;
      $('#pf-pied').innerHTML = `<button type="button" class="bouton" data-fermer-pf>Fermer</button>`;
    } else {
      const jours = [...new Set(l.map(o => o.k))].sort().reverse();
      corps.innerHTML = `<p class="note">Les 7 derniers jours. Rien de grave : décide, puis passe à autre chose. 🌿</p>` + jours.map(k => `
        <section class="pf-jour" aria-labelledby="pf-${k}"><h3 id="pf-${k}">${k === decaler(aujourdhui(), -1) ? 'Hier' : jourLong(k)}</h3>
          ${l.filter(o => o.k === k).map(o => {
            const lk = look(o.el), pts = prevue(o) ? `+${valeur(o.el)} pts si faite` : '0 pt (ajoutée le jour même)';
            const ouv = P.ouverte === o.cle, props = ouv ? propositions(o) : [];
            return `<div class="carte pf-item" style="--c:${lk.couleur}" role="group" aria-label="${esc(o.el.titre)}, ${esc(quandJour(o.k))}, ${plage(o.el)}, ${esc(lk.nom)}">
              <div class="pf-haut"><span class="tuile petite" aria-hidden="true">${lk.icone}</span><span class="quoi" aria-hidden="true"><b>${esc(o.el.titre)}</b><small>${plage(o.el)} · ${esc(lk.nom)} · ${pts}</small></span></div>
              <div class="pf-actions">
                <button type="button" class="pf-b" data-pf="fait" data-cle="${o.cle}" data-focus="pff${o.cle}">${ICONE.coche}<span>Faite</span></button>
                <button type="button" class="pf-b" data-pf="reporter" data-cle="${o.cle}" aria-expanded="${ouv}" data-focus="pfr${o.cle}">${ICONE.repeter}<span>Reporter</span></button>
                <button type="button" class="pf-b" data-pf="partir" data-cle="${o.cle}" data-focus="pfp${o.cle}"><span aria-hidden="true">🍃</span><span>Laisser partir</span></button>
              </div>
              ${ouv ? `<div class="pf-reports" role="group" aria-label="Reporter « ${esc(o.el.titre)} »">
                ${props.map((p, i) => `<button type="button" class="bouton petit secondaire" data-pf="mettre" data-cle="${o.cle}" data-k="${p.k}" data-debut="${p.debut}" data-fin="${p.fin}" data-focus="pfm${i}${o.cle}">${quandCourt(p.k)}${o.el.flou ? '' : ' · ' + hhmm(p.debut)}</button>`).join('')}
                <button type="button" class="bouton petit secondaire" data-pf="choisir" data-cle="${o.cle}" data-focus="pfc${o.cle}">Choisir…</button></div>` : ''}
            </div>`;
          }).join('')}
        </section>`).join('');
      $('#pf-pied').innerHTML = `<button type="button" class="bouton secondaire" data-pf="tout-partir">🍃 Tout laisser partir (${l.length})</button>`;
    }
    if (focus) {
      const c = PF.querySelector(`[data-focus="${CSS.escape(focus)}"]`) || PF.querySelector('[data-pf="fait"]') || PF.querySelector('[data-fermer-pf]');
      if (c) c.focus({ preventScroll: false });
    }
  }
  // Après une décision, le focus passe à la tâche suivante
  function suivante(cle) {
    const l = pasFaites(), i = l.findIndex(o => o.cle === cle);
    return i >= 0 ? 'pff' + cle : l.length ? 'pff' + l[0].cle : null;
  }
  async function reporter(o, p) {
    if (!(await accepterPlafond(p.k, o.cle, p.debut, p.fin))) return null;
    const cle = appliquer(o, { date: p.k, debut: p.debut, fin: p.fin }, 'une');
    sauver();
    avertirLibre(cle);
    return cle;
  }
  PF.addEventListener('click', async e => {
    if (e.target.closest('[data-fermer-pf]')) { PF.close(); return; }
    const b = e.target.closest('[data-pf]');
    if (!b) return;
    const a = b.dataset.pf;
    if (a === 'tout-partir') {
      const l = pasFaites(), auj = aujourdhui();
      l.forEach(o => { S.partis[o.cle] = auj; });
      sauver();
      P.ouverte = null;
      renderPasFaites();
      dire(`${pluriel(l.length, 'tâche laissée', 'tâches laissées')} partir. Sans regret. 🍃`);
      const f = PF.querySelector('[data-fermer-pf]'); if (f) f.focus();
      return;
    }
    const o = trouver(b.dataset.cle);
    if (!o) return;
    if (a === 'fait') {
      const msg = basculerTache(o);
      sauver();
      P.ouverte = null;
      renderPasFaites(suivante(o.cle));
      dire(msg);
      feliciter();
      return;
    }
    if (a === 'partir') {
      S.partis[o.cle] = aujourdhui();
      sauver();
      P.ouverte = null;
      renderPasFaites(suivante(o.cle));
      dire(`« ${o.el.titre} » : laissée partir. 🍃`);
      return;
    }
    if (a === 'reporter') { P.ouverte = P.ouverte === o.cle ? null : o.cle; renderPasFaites('pfr' + o.cle); return; }
    if (a === 'mettre') {
      const p = { k: b.dataset.k, debut: +b.dataset.debut, fin: +b.dataset.fin };
      const cle = await reporter(o, p);
      if (!cle) return;
      P.ouverte = null;
      renderPasFaites(suivante(o.cle));
      dire(`« ${o.el.titre} » : ${quandJour(p.k)}${o.el.flou ? ', dans la journée' : ', ' + hhmm(p.debut)}.`);
      return;
    }
    if (a === 'choisir') { P.ouverte = null; ouvrirTache(o); }
  });
  // La feuille d'une tâche ouverte par « Choisir… » se ferme : la liste se met à jour
  $('#tache').addEventListener('close', () => { if (PF.open) setTimeout(() => renderPasFaites(), 0); });
  PF.addEventListener('close', () => { P.ouverte = null; render(); });

  // ---------- Jour difficile ----------
  async function jourDifficile() {
    const auj = aujourdhui();
    if (difficilesSemaine(auj) >= CONFIG.difficilesParSemaine) return dire(`Déjà ${CONFIG.difficilesParSemaine} jours difficiles cette semaine. Fais ce que tu peux : ta série pardonne un jour raté.`);
    const oui = await demander('Journée difficile ?', `Ça arrive. Aujourd'hui, tes habitudes passent en version minimale : moitié des points, et ta série continue. ${CONFIG.difficilesParSemaine} jours par semaine au plus.`,
      [{ texte: 'Passer en version mini', valeur: true }, { texte: 'Non, ça va', valeur: false, clair: true }]);
    if (!oui) return;
    S.difficiles[auj] = true;
    sauver();
    $('#ecran').scrollTop = 0;
    render('dur');
    dire('Jour difficile : le minimum suffit. 🌧️');
  }
  // Reporter à demain les tâches d'aujourd'hui pas encore commencées (même heure si libre, sinon le créneau libre qui suit)
  function allegerJournee() {
    const auj = aujourdhui(), dem = decaler(auj, 1);
    let n = 0;
    duJour(auj).filter(o => o.el.type === 'tache' && !o.fait && o.el.debut > minNow()).forEach(o => {
      const d = o.el.debut, f = o.el.fin;
      const p = libreA(dem, d, f, o.cle) ? { debut: d, fin: f } : (creneauLibre(dem, f - d, o.cle, d) || creneauLibre(dem, f - d, o.cle));
      if (!p) return;
      appliquer(o, { date: dem, debut: p.debut, fin: p.fin }, 'une');
      n++;
    });
    sauver();
    U.garderDefilement = true;
    render('dur');
    dire(n ? `${pluriel(n, 'tâche reportée', 'tâches reportées')} à demain. Souffle. 🌿` : 'Demain est déjà plein : rien n\'a bougé.');
  }

  // ---------- Retour après une absence : sans reproche ----------
  let accueilEnCours = false;
  async function accueillir() {
    if (accueilEnCours || V.etat !== 'ouvert' || document.querySelector('dialog[open]')) return;
    const auj = aujourdhui(), absence = S.vu ? ecart(S.vu, auj) : 0;
    if (S.vu !== auj) { S.vu = auj; ecrire(); }
    if (absence >= CONFIG.absence) {
      accueilEnCours = true;
      const n = pasFaites().length, best = S.meilleureSerie;
      const texte = `${absence} jours loin d'ASCEND : ça arrive à tout le monde, et rien n'est perdu. Tes ${nombre(S.points)} points sont là${best ? `, ta meilleure série (${pluriel(best, 'jour')}) aussi` : ''}. Ce qui compte, c'est aujourd'hui : une seule chose suffit pour repartir.`
        + (n ? ` ${pluriel(n, 'tâche t\'attendait', 'tâches t\'attendaient')} : tu peux les laisser partir d'un geste.` : '');
      const r = await demander(`Content de te revoir${S.profil.prenom ? ', ' + S.profil.prenom : ''}`, texte,
        n ? [{ texte: 'Repartir à neuf', valeur: 'neuf' }, { texte: 'Voir ce que j\'ai manqué', valeur: 'voir', clair: true }] : [{ texte: 'C\'est reparti', valeur: 'ok' }]);
      accueilEnCours = false;
      if (r === 'neuf') { pasFaites().forEach(o => { S.partis[o.cle] = auj; }); sauver(); render(); dire('Page tournée. On repart d\'ici. 🍃'); }
      if (r === 'voir') return ouvrirPasFaites();
    }
    proposerBilan();
  }
