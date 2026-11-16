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
    // Un anneau par catégorie : la part faite, et (cette semaine) la part déjà prévue en plus, plus claire
    const R = 21, C = 2 * Math.PI * R;
    const puces = l.map(x => { const pf = Math.min(1, x.faits / x.objectif), pv = Math.min(1 - pf, x.venir / x.objectif), alerte = enCours && x.manque > 0;
      return `<button type="button" class="sem-puce anneau-cat${x.atteint ? ' ok' : ''}${alerte ? ' manque' : ''}${U.semCat === x.c.id ? ' choisie' : ''}" style="--c:${x.c.couleur}" data-sem-cat="${esc(x.c.id)}" aria-expanded="${U.semCat === x.c.id}" data-focus="sp${esc(x.c.id)}"
        aria-label="${esc(x.c.nom)} : ${pluriel(x.faits, 'faite')} sur ${x.objectif}${enCours && x.venir ? `, ${x.venir} de plus de prévu` : ''}${x.atteint ? ', objectif atteint' : alerte ? `, il en manque ${x.manque}` : ''}">
        <svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="${R}" class="fond-a"/>${enCours && pv ? `<circle cx="27" cy="27" r="${R}" class="prevu-a" stroke-dasharray="${(pf + pv) * C} ${C}" transform="rotate(-90 27 27)"/>` : ''}${pf ? `<circle cx="27" cy="27" r="${R}" class="fait-a" stroke-dasharray="${pf * C} ${C}" transform="rotate(-90 27 27)"/>` : ''}</svg>
        <b aria-hidden="true">${x.faits}/${x.objectif}</b><span class="nom-a" aria-hidden="true">${esc(x.c.nom)}</span></button>`; }).join('');
    const pr = prio.length ? `<button type="button" class="sem-puce anneau-cat prio" data-action="bilan-semaine" data-focus="sp-prio" aria-label="Priorités : ${prio.filter(p => p.fait).length} sur ${prio.length} tenues. Ouvrir le bilan"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="${R}" class="fond-a"/>${prio.some(p => p.fait) ? `<circle cx="27" cy="27" r="${R}" class="fait-a" stroke-dasharray="${prio.filter(p => p.fait).length / prio.length * C} ${C}" transform="rotate(-90 27 27)"/>` : ''}</svg><b aria-hidden="true">${prio.filter(p => p.fait).length}/${prio.length}</b><span class="nom-a" aria-hidden="true">Priorités</span></button>` : '';
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
  // Le ruban d'un jour, de 6 h à minuit : une capsule par élément à heure fixe, et le trait de maintenant
  function ruban(k) {
    const A = 6 * 60, L = 18 * 60, auj = aujourdhui();
    const occs = duJour(k).filter(o => !o.el.flou);
    const pos = m => Math.max(0, Math.min(100, (m - A) / L * 100));
    const caps = occs.map(o => { const g = pos(o.el.debut), w = Math.max(pos(o.el.fin) - g, 0);
      return `<i class="r-cap ${o.el.type}${o.fait ? ' fait' : ''}" style="left:${g}%;width:max(10px, ${w}%);--c:${look(o.el).couleur}"></i>`; }).join('');
    const now = k === auj && minNow() >= A ? `<i class="r-now" style="left:${pos(minNow())}%"></i>` : '';
    return `<span class="ruban" aria-hidden="true">${caps}${now}</span>`;
  }
  function vueSemaine() {
    const auj = aujourdhui(), lundi = lundiDe(U.date), plafond = S.reglages.plafond;
    let jours = '';
    for (let i = 0; i < 7; i++) {
      const k = decaler(lundi, i), occs = duJour(k), m = minutesPrevues(k), passe = k < auj, ouvert = U.semOuverts.has(k);
      const taches = occs.filter(o => o.el.type === 'tache'), faites = taches.filter(o => o.fait).length, flous = occs.filter(o => o.el.flou).length;
      const resume = passe ? (taches.length ? `${faites} / ${taches.length} faites` : occs.length ? pluriel(occs.length, 'élément') : 'rien de prévu') : (m ? `${duree(m)}${m > plafond ? ' · chargée' : ''}` : 'libre');
      jours += `<section class="sem-jour${k === auj ? ' auj' : ''}${passe ? ' passe' : ''}${m > plafond && !passe ? ' charge' : ''}${ouvert ? ' ouvert' : ''}" aria-labelledby="sj-${k}">
        <div class="sem-jour-tete">
          <button type="button" class="sem-nom" id="sj-${k}" data-sem-plier="${k}" aria-expanded="${ouvert}" data-focus="sj${k}" aria-label="${jourLong(k)}${k === auj ? ", aujourd'hui" : ''} : ${resume}${flous ? `, ${pluriel(flous, 'élément')} sans heure` : ''}">
            <span class="sj-date" aria-hidden="true"><span>${JOURS_COURTS_3[i]}</span><b>${parse(k).getDate()}</b></span>
            ${occs.some(o => !o.el.flou) ? ruban(k) : `<span class="ruban vide" aria-hidden="true">${occs.length ? esc(occs.map(o => o.el.titre).join(' · ')) : passe ? 'Rien de prévu' : 'Journée libre'}</span>`}
            <small aria-hidden="true">${passe ? (taches.length ? `${faites}/${taches.length}` : '') : m ? duree(m) : '0 h'}</small></button>
          ${passe ? '' : `<button type="button" class="icone-bouton sem-plus" data-sem-plus="${k}" aria-label="Ajouter ${quandJour(k)}" data-focus="s+${k}">${ICONE.plus}</button>`}
        </div>
        ${ouvert ? `<div class="sem-detail-jour">${occs.length ? `<div class="lignes">${occs.map(o => ligneOcc(o)).join('')}</div>` : ''}
          <button type="button" class="lien fort" data-ouvrir-jour="${k}" data-focus="vj${k}">Voir la journée ${ICONE.fleche}</button></div>` : ''}
      </section>`;
    }
    return `
      <div class="cal-tete sem-nav">
        <button type="button" class="icone-bouton" data-nav="-1" aria-label="Semaine précédente" data-focus="nav-1">${ICONE.gauche}</button>
        <h2 id="sem-nom" aria-live="polite">${lundi === lundiDe(auj) ? 'Cette semaine' : cap(texteSemaine(lundi))}<small>${lundi === lundiDe(auj) ? texteSemaine(lundi) : lundi === decaler(lundiDe(auj), 7) ? 'La semaine prochaine' : lundi === decaler(lundiDe(auj), -7) ? 'La semaine passée' : ''}</small></h2>
        <button type="button" class="icone-bouton" data-nav="1" aria-label="Semaine suivante" data-focus="nav1">${ICONE.droite}</button>
      </div>
      ${bandeauSemaine(lundi)}
      <div class="sem-heures" aria-hidden="true"><span>6 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
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
      const prevu = Math.max(1, o.el.fin - o.el.debut), reste = prevu - depuis, avance = Math.max(4, Math.min(100, Math.round(depuis / prevu * 100)));
      return `<section class="carte mnt encours" style="--c:${lk.couleur};--avance:${avance}%" aria-labelledby="mnt-titre">
        <div class="mnt-ligne"><span class="mnt-capsule" aria-hidden="true"><i>${lk.icone}</i></span>
          <button type="button" class="ouvrir" data-ouvrir="${o.cle}" data-focus="mnt" aria-label="En cours : ${esc(o.el.titre)}, commencée à ${hhmm(o.el.debut)}, depuis ${duree(depuis)}. Ouvrir"><span class="quoi" aria-hidden="true"><span class="mnt-titre" id="mnt-titre"><i class="mnt-pouls"></i>En cours · ${reste > 0 ? "encore " + duree(reste) : "depuis " + duree(depuis)}</span><b>${esc(o.el.titre)}</b><small>${esc(lk.nom)}${prevue(o) ? ` · +${valeur(o.el)} points` : ''}</small></span></button>
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
    return `<section class="carte mnt ${o.el.type}" style="--c:${lk.couleur}" aria-labelledby="mnt-titre">
        <div class="mnt-ligne"><span class="mnt-capsule" aria-hidden="true"><i>${lk.icone}</i></span>
          <button type="button" class="ouvrir" data-ouvrir="${o.cle}" data-focus="mnt" aria-label="${titre} : ${esc(o.el.titre)}, ${quand}. Ouvrir"><span class="quoi" aria-hidden="true"><span class="mnt-titre" id="mnt-titre">${titre}</span><b>${esc(o.el.titre)}</b><small>${quand} · ${esc(lk.nom)}</small></span></button>
          ${tache ? `<button type="button" class="bouton petit mnt-go" data-action="commencer" data-cle="${o.cle}" data-focus="mnt-go" aria-label="Je commence : ${esc(o.el.titre)}">Je commence</button>` : ptsElement(o)}</div></section>`;
  }
