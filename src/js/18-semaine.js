  // ---------- Vue Semaine ----------
  // Le cœur du calendrier : les objectifs de la semaine (fait / prévu), puis les 7 jours, chacun avec sa charge et ses éléments.
  // Les jours passés sont repliés. U.semOuverts : jours passés dépliés ; U.semCat : catégorie dont le détail est ouvert.
  // Objectif d'une catégorie cette semaine : faits, à venir (tâches et habitudes prévues d'ici dimanche, pas encore faites), manque.
  function avancementCat(c, lundi) {
    const auj = aujourdhui(), dim = decaler(lundi, 6);
    const faits = faitsCat(c.id, lundi, dim);
    let venir = 0;
    for (let k = lundi < auj ? auj : lundi; k <= dim; k = decaler(k, 1)) {
      duJour(k).forEach(o => { if (o.el.type === 'tache' && o.el.cat === c.id && !o.fait && !S.partis[o.cle] && (k > auj || o.el.flou || o.el.fin > minNow())) venir++; });
      S.habitudes.forEach(h => { if (h.cat === c.id && habitudeDue(h, k) && !h.faits[k]) venir++; });
    }
    return { c, faits, venir, objectif: c.objectif, atteint: faits >= c.objectif, manque: Math.max(0, c.objectif - faits - venir) };
  }
  // Un créneau à proposer pour une catégorie : un jour restant sans elle, à son heure et sa durée habituelles (sinon 18 h, 1 h)
  function creneauPourCat(c, lundi) {
    const auj = aujourdhui(), dim = decaler(lundi, 6), heures = {}, durees = {};
    for (let k = decaler(auj, -60), i = 0; i < 60; k = decaler(k, 1), i++) duJour(k).forEach(o => { if (o.el.type === 'tache' && o.el.cat === c.id) { heures[o.el.debut] = (heures[o.el.debut] || 0) + 1; const d = o.el.fin - o.el.debut; durees[d] = (durees[d] || 0) + 1; } });
    const plus = t => { const l = Object.keys(t).sort((a, b) => t[b] - t[a]); return l.length ? +l[0] : null; };
    const debut = plus(heures) != null ? plus(heures) : 18 * 60, du = plus(durees) || 60;
    const jours = [];
    for (let k = lundi < auj ? auj : lundi; k <= dim; k = decaler(k, 1)) jours.push(k);
    const sans = jours.filter(k => !duJour(k).some(o => o.el.cat === c.id && o.el.type === 'tache'));
    const tot = Math.ceil((minNow() + 5) / CONFIG.pas) * CONFIG.pas;
    for (const k of sans.concat(jours.filter(k => !sans.includes(k)))) {
      const min = k === auj ? tot : 0;
      if (debut >= min && debut + du <= 1440 && libreA(k, debut, debut + du)) return { k, debut, fin: debut + du };
      const p = creneauLibre(k, du, null, Math.max(min, 8 * 60));
      if (p) return p;
    }
    return null;
  }
  function bandeauSemaine(lundi) {
    const enCours = lundi === lundiDe(aujourdhui());
    const l = S.categories.filter(c => c.active && c.objectif > 0).map(c => avancementCat(c, lundi));
    const prio = prioritesDe(lundi);
    if (!l.length && !prio.length) return '';
    const puces = l.map(x => { const pf = Math.min(100, x.faits / x.objectif * 100), pv = Math.min(100 - pf, x.venir / x.objectif * 100), alerte = enCours && x.manque > 0;
      return `<button type="button" class="sem-puce${x.atteint ? ' ok' : ''}${alerte ? ' manque' : ''}" style="--c:${x.c.couleur}" data-sem-cat="${esc(x.c.id)}" aria-expanded="${U.semCat === x.c.id}" data-focus="sp${esc(x.c.id)}"
        aria-label="${esc(x.c.nom)} : ${pluriel(x.faits, 'faite')} sur ${x.objectif}${enCours && x.venir ? `, ${x.venir} de plus de prévu` : ''}${x.atteint ? ', objectif atteint' : alerte ? `, il en manque ${x.manque}` : ''}">
        <span aria-hidden="true">${x.c.icone}</span><b aria-hidden="true">${x.faits}/${x.objectif}${x.atteint ? ' ✓' : ''}</b><i aria-hidden="true"><u style="width:${pf}%"></u><s style="width:${enCours ? pv : 0}%"></s></i></button>`; }).join('');
    const pr = prio.length ? `<button type="button" class="sem-puce prio" data-action="bilan-semaine" data-focus="sp-prio" aria-label="Priorités : ${prio.filter(p => p.fait).length} sur ${prio.length} tenues. Ouvrir le bilan"><span aria-hidden="true">🎯</span><b aria-hidden="true">${prio.filter(p => p.fait).length}/${prio.length}</b></button>` : '';
    const x = l.find(y => y.c.id === U.semCat);
    let detail = '';
    if (x) {
      const p = enCours && x.manque > 0 ? creneauPourCat(x.c, lundi) : null;
      detail = `<div class="carte sem-detail" role="group" aria-label="${esc(x.c.nom)} cette semaine">
        <p><b>${esc(x.c.nom)}</b> · ${pluriel(x.faits, 'faite')}${enCours && x.venir ? `, ${x.venir} de plus de prévu${x.venir > 1 ? 'es' : 'e'}` : ''} · objectif ${x.objectif}</p>
        ${x.atteint ? `<p class="note">Objectif atteint. 🏆 Bonus de +${bonusSemaine(x.c)} pts à la fin de la semaine.</p>`
          : !enCours ? '' : x.manque ? `<p class="note">Il en manque ${x.manque} pour atteindre l'objectif${p ? ` : ${quandJour(p.k)} à ${hhmm(p.debut)}, c'est libre.` : '.'}</p>
            <div class="boutons${p ? ' deux' : ''}">${p ? `<button type="button" class="bouton petit" data-sem-ajout="${esc(x.c.id)}|${p.k}|${p.debut}|${p.fin}" data-focus="sem-ajout">Ajouter ${quandCourt(p.k).toLowerCase()} ${hhmm(p.debut)}</button>` : ''}
              <button type="button" class="bouton petit secondaire" data-sem-autre="${esc(x.c.id)}" data-focus="sem-autre">Autre moment…</button></div>`
            : `<p class="note">Tout est prévu : il reste à le faire. 💪</p>`}</div>`;
    }
    return `<div class="sem-bandeau" role="group" aria-label="Objectifs de la semaine">${puces}${pr}</div>${detail}`;
  }
  function vueSemaine() {
    const auj = aujourdhui(), lundi = lundiDe(U.date), plafond = S.reglages.plafond;
    let jours = '';
    for (let i = 0; i < 7; i++) {
      const k = decaler(lundi, i), occs = duJour(k), m = minutesPrevues(k), passe = k < auj, ouvert = !passe || U.semOuverts.has(k);
      const taches = occs.filter(o => o.el.type === 'tache'), faites = taches.filter(o => o.fait).length;
      const nom = `${JOURS_COURTS_3[i]} ${parse(k).getDate()}`;
      const resume = passe ? (taches.length ? `${faites} / ${taches.length} faites` : occs.length ? pluriel(occs.length, 'élément') : 'rien de prévu') : (m ? `${duree(m)}${m > plafond ? ' · chargée' : ''}` : 'libre');
      jours += `<section class="sem-jour${k === auj ? ' auj' : ''}${passe ? ' passe' : ''}${m > plafond && !passe ? ' charge' : ''}" aria-labelledby="sj-${k}">
        <div class="sem-jour-tete">
          <button type="button" class="sem-nom" id="sj-${k}" ${passe ? `data-sem-plier="${k}" aria-expanded="${ouvert}"` : `data-ouvrir-jour="${k}"`} data-focus="sj${k}" aria-label="${jourLong(k)}${k === auj ? ", aujourd'hui" : ''} : ${resume}${passe ? '' : '. Voir la journée'}">
            <b aria-hidden="true">${nom}</b>${k === auj ? '<span class="sem-auj" aria-hidden="true">Aujourd\'hui</span>' : ''}<small aria-hidden="true">${resume}</small>${passe ? `<span class="chevron" aria-hidden="true">${ouvert ? '▴' : '▾'}</span>` : ''}</button>
          ${passe ? '' : `<button type="button" class="icone-bouton sem-plus" data-sem-plus="${k}" aria-label="Ajouter ${quandJour(k)}" data-focus="s+${k}">${ICONE.plus}</button>`}
        </div>
        ${ouvert && occs.length ? `<div class="lignes">${occs.map(o => ligneOcc(o, true)).join('')}</div>` : ''}
      </section>`;
    }
    return `
      <div class="cal-tete sem-nav">
        <button type="button" class="icone-bouton" data-nav="-1" aria-label="Semaine précédente" data-focus="nav-1">${ICONE.gauche}</button>
        <h2 id="sem-nom" aria-live="polite">${lundi === lundiDe(auj) ? 'Cette semaine' : cap(texteSemaine(lundi))}<small>${lundi === lundiDe(auj) ? texteSemaine(lundi) : lundi === decaler(lundiDe(auj), 7) ? 'La semaine prochaine' : lundi === decaler(lundiDe(auj), -7) ? 'La semaine passée' : ''}</small></h2>
        <button type="button" class="icone-bouton" data-nav="1" aria-label="Semaine suivante" data-focus="nav1">${ICONE.droite}</button>
      </div>
      ${bandeauSemaine(lundi)}
      <div class="sem-jours">${jours}</div>
      ${bacACaser()}`;
  }
  const JOURS_COURTS_3 = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  // Clics propres à la semaine ; renvoie vrai si le clic est traité
  function clicSemaine(d) {
    if (d.semCat) { U.semCat = U.semCat === d.semCat ? null : d.semCat; U.garderDefilement = true; render('sp' + d.semCat); return true; }
    if (d.semPlier) { if (U.semOuverts.has(d.semPlier)) U.semOuverts.delete(d.semPlier); else U.semOuverts.add(d.semPlier); U.garderDefilement = true; render('sj' + d.semPlier); return true; }
    if (d.semPlus) { ouvrirTache(null, { date: d.semPlus }); return true; }
    if (d.semAutre) { ouvrirTache(null, { cat: d.semAutre }); return true; }
    if (d.semAjout) {
      const [id, k, debut, fin] = d.semAjout.split('|'), c = cat(id);
      S.elements.push({ id: uid(), type: 'tache', titre: c.nom, cat: c.id, date: k, debut: +debut, fin: +fin, rep: null, exceptions: {}, faits: {}, objectif: null, creeLe: Date.now() });
      sauver(); U.garderDefilement = true; render('sp' + id);
      dire(`${c.icone} ${c.nom} : ${quandJour(k)} à ${hhmm(+debut)}. +${c.points} pts une fois faite.`);
      return true;
    }
    return false;
  }

  // ---------- Accueil : « Maintenant » ----------
  // Ce qui est en cours, sinon ce qui vient ensuite aujourd'hui
  function carteMaintenant() {
    const auj = aujourdhui(), now = minNow(), e = enCours();
    if (e) {                                   // une tâche commencée : elle passe devant tout
      const o = e.o, lk = look(o.el), depuis = Math.max(0, Math.round((Date.now() - e.debut) / 6e4));
      return `<section class="carte mnt encours" style="--c:${lk.couleur}" aria-labelledby="mnt-titre">
        <h2 id="mnt-titre"><i class="mnt-pouls" aria-hidden="true"></i>En cours</h2>
        <div class="mnt-ligne"><span class="tuile petite" aria-hidden="true">${lk.icone}</span>
          <button type="button" class="ouvrir" data-ouvrir="${o.cle}" data-focus="mnt" aria-label="En cours : ${esc(o.el.titre)}, commencée à ${hhmm(o.el.debut)}, depuis ${duree(depuis)}. Ouvrir"><span class="quoi" aria-hidden="true"><b>${esc(o.el.titre)}</b><small>depuis ${hhmm(o.el.debut)} · ${duree(depuis)} · ${esc(lk.nom)}</small></span></button>
          <button type="button" class="bouton petit mnt-go" data-action="terminer" data-focus="mnt-go">${ICONE.coche} Terminé</button></div></section>`;
    }
    const jour = duJour(auj).filter(o => !(o.el.type === 'tache' && o.fait));
    const fixes = jour.filter(o => !o.el.flou && o.el.fin > now), souples = jour.filter(o => o.el.flou && o.el.type === 'tache' && !S.partis[o.cle]);
    const mom = momentDe(now);
    // Dans l'ordre : ce qui se passe maintenant à heure fixe, la tâche du moment (ce matin…), la prochaine à heure fixe, une tâche sans heure
    const o = fixes.find(x => x.el.debut <= now) || souples.find(x => x.el.moment === mom) || fixes[0] || souples.find(x => !x.el.moment || CONFIG.moments[x.el.moment].a > now) || souples[0];
    if (!o) return '';
    const enCoursFixe = !o.el.flou && o.el.debut <= now, lk = look(o.el), dans = o.el.debut - now;
    const titre = o.el.flou ? (o.el.moment ? (o.el.moment === mom ? CONFIG.moments[mom].ce : CONFIG.moments[o.el.moment].b <= now ? 'À rattraper' : 'Ensuite') : "Aujourd'hui") : enCoursFixe ? 'Maintenant' : 'Ensuite';
    const quand = o.el.flou ? `${o.el.moment ? CONFIG.moments[o.el.moment].nom : 'Dans la journée'} · ${duree(o.el.fin - o.el.debut)}` : enCoursFixe ? `jusqu'à ${finTexte(o.el.fin)}` : `${hhmm(o.el.debut)} · dans ${duree(dans)}`;
    const tache = o.el.type === 'tache';
    return `<section class="carte mnt" style="--c:${lk.couleur}" aria-labelledby="mnt-titre">
        <h2 id="mnt-titre">${titre}</h2>
        <div class="mnt-ligne">${tache ? rondCoche(o.cle, o.fait, `${o.el.titre} : à faire`, 'data-cocher') : `<span class="tuile petite" aria-hidden="true">${lk.icone}</span>`}
          <button type="button" class="ouvrir" data-ouvrir="${o.cle}" data-focus="mnt" aria-label="${titre} : ${esc(o.el.titre)}, ${quand}. Ouvrir"><span class="quoi" aria-hidden="true"><b>${esc(o.el.titre)}</b><small>${quand} · ${esc(lk.nom)}</small></span>${tache ? '' : ptsElement(o)}</button>
          ${tache ? `<button type="button" class="bouton petit secondaire mnt-go" data-action="commencer" data-cle="${o.cle}" data-focus="mnt-go" aria-label="Je commence : ${esc(o.el.titre)}">▶ Je commence</button>` : ''}</div></section>`;
  }
