  // ---------- Objectifs : habitudes et long terme ----------
  function joursTexte(h) {
    const j = h.jours.slice().sort();
    if (j.length === 7) return 'Tous les jours';
    if (j.join() === '0,1,2,3,4') return 'En semaine';
    if (j.join() === '5,6') return 'Le week-end';
    return j.map(i => cap(JOURS_LONGS[i].slice(0, 3))).join(' · ');
  }
  // Les 7 derniers jours d'une habitude : fait, pas fait, pas prévu
  function histo(h) {
    const auj = aujourdhui();
    return `<span class="histo" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => {
      const k = decaler(auj, i - 6);
      return `<i class="${!habitudeDue(h, k) ? 'non' : h.faits[k] ? 'ok' : ''}" style="--c:${cat(h.cat).couleur}"></i>`;
    }).join('')}</span>`;
  }
  function ligneHabitudeGestion(h) {
    const auj = aujourdhui(), c = cat(h.cat), due = habitudeDue(h, auj), fait = !!h.faits[auj], s = serieHabitude(h);
    const sept = Array.from({ length: 7 }, (_, i) => decaler(auj, i - 6)).filter(k => habitudeDue(h, k));
    const faits7 = sept.filter(k => h.faits[k]).length;
    return `<div class="carte ligne${fait ? ' faite' : ''}" style="--c:${c.couleur}">
      <button type="button" class="ouvrir" data-ouvrir-hab="${h.id}" data-focus="oh${h.id}"
        aria-label="${esc(h.titre)}, ${esc(c.nom)}, ${joursTexte(h).toLowerCase()}, série de ${pluriel(s, 'jour')}, ${faits7} sur ${sept.length} ces 7 derniers jours : ouvrir">
        <span class="tuile" style="--c:${c.couleur}" aria-hidden="true">${c.icone}</span>
        <span class="quoi" aria-hidden="true"><b>${esc(h.titre)}</b><small>${joursTexte(h)}${s ? ` · 🔥 ${s} j` : ''}</small>${histo(h)}</span></button>
      ${due ? rondCoche(h.id + '|' + auj, fait, `${h.titre}, aujourd'hui : ${fait ? 'faite' : 'à faire'}`, 'data-habitude') : '<span class="pts nul">repos</span>'}
    </div>`;
  }
  function carteObjectif(ob) {
    const a = avancement(ob), c = cat(ob.cat), atteint = !!ob.atteintLe;
    const ech = ob.echeance ? (ob.echeance < aujourdhui() ? `échéance passée (${fmt(ob.echeance, { day: 'numeric', month: 'short' })})` : ob.echeance === aujourdhui() ? "échéance aujourd'hui" : `dans ${pluriel(ecart(aujourdhui(), ob.echeance), 'jour')}`) : 'sans échéance';
    const nE = ob.etapes.length, fE = ob.etapes.filter(e => e.faitLe).length, nT = a.taches.length, fT = a.taches.filter(o => o.fait).length;
    const detail = [nE ? `${fE}/${nE} étapes` : '', nT ? `${fT}/${nT} tâches` : ''].filter(Boolean).join(' · ') || 'Ajoute des étapes';
    return `<button type="button" class="carte obj-carte${atteint ? ' atteint' : ''}" data-ouvrir-obj="${ob.id}" data-focus="ob${ob.id}"
        aria-label="${esc(ob.titre)}, ${esc(c.nom)}, ${a.pc} %${atteint ? ', atteint' : ''}, ${detail}, ${ech} : ouvrir">
      <span class="haut" aria-hidden="true"><span class="tuile" style="--c:${c.couleur}">${c.icone}</span>
        <span style="flex:1;min-width:0;display:grid;gap:2px"><b>${esc(ob.titre)}</b><small>${atteint ? '✓ Atteint · ' : ''}${detail} · ${ech}</small></span>
        <span class="pc">${a.pc} %</span></span>
      <span class="barre-obj" aria-hidden="true"><i style="width:${a.pc}%"></i></span>
    </button>`;
  }
  function vueObjectifs() {
    const hab = S.vueObj !== 'long';
    const sd = serieDetail(), s = sd.n, best = Math.max(S.meilleureSerie, s), auj = aujourdhui();
    const recent = sd.pardons.find(k => ecart(k, auj) < CONFIG.pardon);
    const habs = habitudesActives();
    const dues = habs.filter(h => habitudeDue(h, auj)), faites = dues.filter(h => h.faits[auj]).length;
    return `
      <header class="tete"><div><h1>Objectifs</h1><p>Construis tes habitudes, vise loin.</p></div></header>
      <div class="segments" role="group" aria-label="Affichage">
        <button type="button" aria-pressed="${hab}" data-vue-obj="habitudes" data-focus="vo-h">Habitudes</button>
        <button type="button" aria-pressed="${!hab}" data-vue-obj="long" data-focus="vo-l">Long terme</button>
      </div>
      ${hab ? `
        <div class="carte serie-carte"><span class="flamme" aria-hidden="true">🔥</span>
          <div><b>${pluriel(s, 'jour')}</b><small>Série actuelle : toutes tes habitudes faites, jour après jour. Meilleure : ${pluriel(best, 'jour')}.</small>
          <small style="margin-top:4px">${recent ? `🛟 ${cap(quandJour(recent))} est pardonné : ta série continue. Prochain joker ${quandJour(decaler(recent, CONFIG.pardon))}.` : habs.length ? '🛟 Joker prêt : un jour raté par semaine ne casse pas ta série.' : ''}</small>
          ${dues.length ? `<small style="margin-top:4px">Aujourd'hui : ${faites} / ${dues.length}${faites === dues.length ? ' · journée gagnée ✓' : ''}</small>` : ''}</div></div>
        <div class="lignes">${habs.length ? habs.map(ligneHabitudeGestion).join('') : '<p class="carte vide">Pas encore d\'habitude. Méditer, lire 10 pages, marcher… Commence petit, tiens longtemps.</p>'}</div>
        <button type="button" class="bouton" data-action="nouvelle-habitude" data-focus="nh">${ICONE.plus} Nouvelle habitude</button>`
      : `
        <div class="lignes">${S.objectifs.length ? S.objectifs.slice().sort((a, b) => (!!a.atteintLe - !!b.atteintLe) || (a.echeance || '9999').localeCompare(b.echeance || '9999')).map(carteObjectif).join('')
          : '<p class="carte vide">Pas encore d\'objectif. Un semi-marathon, 12 livres dans l\'année, un projet à finir… Découpe-le en étapes et rattache-y des tâches.</p>'}</div>
        <button type="button" class="bouton" data-action="nouvel-objectif" data-focus="no">${ICONE.plus} Nouvel objectif</button>`}`;
  }
