  // ---------- Gestes sur les lignes de tâches, menu d'actions, bac « À caser » ----------
  // Balayer à droite : faite (ou décochée), avec « Annuler ». Balayer à gauche ou appui long : le menu (reporter, à caser, laisser partir…).
  // À caser : S.aCaser = [{ id, titre, cat, duree }], des tâches sans jour ni heure, à poser plus tard.
  let minuteurAction = null;
  function direAvec(msg, nom, fn) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span><button type="button" class="toast-action">${esc(nom)}</button>`;
    t.querySelector('button').addEventListener('click', () => { t.classList.remove('visible'); fn(); }, { once: true });
    t.classList.add('visible', 'avec-action');
    clearTimeout(minuteurToast); clearTimeout(minuteurAction);
    minuteurAction = setTimeout(() => { t.classList.remove('visible', 'avec-action'); }, 5000);
  }
  function glisserFaite(cle) {
    const o = trouver(cle);
    if (!o || o.el.type !== 'tache') return;
    const msg = basculerTache(o);
    sauver(); U.garderDefilement = true; render();
    direAvec(msg, 'Annuler', () => { const x = trouver(cle); if (!x) return; basculerTache(x); sauver(); U.garderDefilement = true; render(); dire('Annulé.'); });
    feliciter();
  }
  // Jour proposé pour un report : même heure si elle est libre, sinon le créneau libre qui suit, sinon le premier de la journée
  function creneauReport(o, k) {
    if (o.el.flou) return { k, debut: o.el.debut, fin: o.el.fin };
    const d = o.el.debut, f = o.el.fin, auj = aujourdhui(), tot = k === auj ? Math.ceil((minNow() + 5) / CONFIG.pas) * CONFIG.pas : 0;
    if (d >= tot && libreA(k, d, f, o.cle)) return { k, debut: d, fin: f };
    return creneauLibre(k, f - d, o.cle, Math.max(d, tot)) || creneauLibre(k, f - d, o.cle, Math.max(8 * 60, tot));
  }

  // ---------- Le menu d'une tâche ----------
  const AD = $('#actions');
  const A = { cle: null, caser: null };
  function ouvrirActions(cle) {
    const o = trouver(cle);
    if (!o) return;
    A.cle = cle; A.caser = null;
    const auj = aujourdhui(), passee = !o.fait && (o.k < auj || (o.k === auj && o.el.fin <= minNow())), tache = o.el.type === 'tache';
    const jours = [1, 2, 3, 4, 5, 6, 7].map(i => decaler(auj, i)).filter(k => k !== o.k).slice(0, 6);
    AD.querySelector('[data-fermer]').innerHTML = ICONE.croix;
    $('#a-titre').textContent = o.el.titre;
    $('#a-corps').innerHTML = `
      <p class="note">${cap(quandJour(o.k))} · ${plage(o.el)} · ${esc(look(o.el).nom)}</p>
      ${tache && !o.fait && o.k === auj ? (enCours() && enCours().o.cle === o.cle
        ? `<button type="button" class="bouton" data-a="terminer">${ICONE.coche} Terminé</button>`
        : `<button type="button" class="bouton" data-a="commencer">▶ Je commence</button>`) : ''}
      ${o.fait ? '' : `<div><span class="etiquette" id="a-rep">Reporter</span>
        <div class="puces" role="group" aria-labelledby="a-rep">${jours.map((k, i) => { const p = creneauReport(o, k); return p ? `<button type="button" class="puce" data-a-jour="${k}|${p.debut}|${p.fin}" data-focus="aj${i}" aria-label="${jourLong(k)}${o.el.flou ? '' : ' à ' + hhmm(p.debut)}">${quandCourt(k)}${o.el.flou ? '' : ' · ' + hhmm(p.debut)}</button>` : ''; }).join('')}</div></div>`}
      <div class="groupe a-liste">
        ${!o.fait && tache ? `<button type="button" class="rang" data-a="caser"><span><span class="ic">📥</span><span>À caser plus tard<span class="sous">Sans jour ni heure, dans le bac de la semaine</span></span></span></button>` : ''}
        ${passee && tache && !S.partis[o.cle] ? `<button type="button" class="rang" data-a="partir"><span><span class="ic">🍃</span><span>Laisser partir<span class="sous">Sans points ni pénalité</span></span></span></button>` : ''}
        <button type="button" class="rang" data-a="modifier"><span><span class="ic">✏️</span>Modifier</span></button>
        <button type="button" class="rang" data-a="dupliquer"><span><span class="ic">⧉</span><span>Dupliquer<span class="sous">Une copie, demain à la même heure</span></span></span></button>
        <button type="button" class="rang danger" data-a="supprimer"><span><span class="ic">🗑️</span>Supprimer</span></button>
      </div>`;
    if (!AD.open) AD.showModal();
  }
  // Le menu d'une tâche du bac : la poser un jour
  function ouvrirCaser(id) {
    const x = S.aCaser.find(y => y.id === id);
    if (!x) return;
    A.cle = null; A.caser = id;
    const auj = aujourdhui(), c = cat(x.cat);
    AD.querySelector('[data-fermer]').innerHTML = ICONE.croix;
    $('#a-titre').textContent = x.titre;
    const props = [0, 1, 2, 3, 4, 5, 6].map(i => { const k = decaler(auj, i); return creneauLibre(k, x.duree, null, k === auj ? Math.ceil((minNow() + 5) / CONFIG.pas) * CONFIG.pas : 9 * 60); }).filter(Boolean);
    $('#a-corps').innerHTML = `
      <p class="note">${esc(c.nom)} · ${duree(x.duree)} · +${c.points} pts une fois faite</p>
      <div><span class="etiquette" id="a-rep">La caser</span>
        <div class="puces" role="group" aria-labelledby="a-rep">${props.map((p, i) => `<button type="button" class="puce" data-a-poser="${p.k}|${p.debut}|${p.fin}" data-focus="ap${i}" aria-label="${jourLong(p.k)} à ${hhmm(p.debut)}">${quandCourt(p.k)} · ${hhmm(p.debut)}</button>`).join('')}</div>
        <p class="note" style="margin-top:8px">Le premier créneau libre de chaque jour.</p></div>
      <div><span class="etiquette" id="a-du">Durée</span><div class="puces" role="group" aria-labelledby="a-du">${[15, 30, 60, 90, 120].map(d => `<button type="button" class="puce" data-a-duree="${d}" aria-pressed="${x.duree === d}">${duree(d)}</button>`).join('')}</div></div>
      <div><span class="etiquette" id="a-ca">Catégorie</span><div class="puces" role="group" aria-labelledby="a-ca">${catsActives().map(k => `<button type="button" class="puce" data-a-cat="${esc(k.id)}" aria-pressed="${x.cat === k.id}"><span aria-hidden="true">${k.icone}</span> ${esc(k.nom)}</button>`).join('')}</div></div>
      <div class="groupe a-liste"><button type="button" class="rang danger" data-a="retirer"><span><span class="ic">🗑️</span>Retirer du bac</span></button></div>`;
    if (!AD.open) AD.showModal();
  }
  AD.addEventListener('click', async e => {
    const j = e.target.closest('[data-a-jour]'), po = e.target.closest('[data-a-poser]'), du = e.target.closest('[data-a-duree]'), ca = e.target.closest('[data-a-cat]'), b = e.target.closest('[data-a]');
    if (du || ca) { const x = S.aCaser.find(y => y.id === A.caser); if (!x) return; if (du) x.duree = +du.dataset.aDuree; else x.cat = ca.dataset.aCat; sauver(); return ouvrirCaser(x.id); }
    if (po) {
      const x = S.aCaser.find(y => y.id === A.caser); if (!x) return;
      const [k, debut, fin] = po.dataset.aPoser.split('|');
      if (!(await accepterPlafond(k, null, +debut, +fin))) return;
      S.elements.push({ id: uid(), type: 'tache', titre: x.titre, cat: x.cat, date: k, debut: +debut, fin: +fin, rep: null, exceptions: {}, faits: {}, objectif: null, creeLe: Date.now() });
      S.aCaser = S.aCaser.filter(y => y !== x);
      sauver(); AD.close();
      return dire(`« ${x.titre} » : ${quandJour(k)} à ${hhmm(+debut)}.`);
    }
    const o = A.cle ? trouver(A.cle) : null;
    if (j && o) {
      const [k, debut, fin] = j.dataset.aJour.split('|');
      if (o.el.type === 'tache' && !(await accepterPlafond(k, o.cle, +debut, +fin))) return;
      const cle = appliquer(o, { date: k, debut: +debut, fin: +fin }, 'une');
      sauver(); AD.close();
      if (!avertirLibre(cle)) dire(`« ${o.el.titre} » : ${quandJour(k)}${o.el.flou ? (o.el.moment ? ', ' + CONFIG.moments[o.el.moment].nom.toLowerCase() : ', dans la journée') : ' à ' + hhmm(+debut)}.`);
      return;
    }
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'retirer') { S.aCaser = S.aCaser.filter(y => y.id !== A.caser); sauver(); AD.close(); return dire('Retirée du bac.'); }
    if (!o) return;
    if (a === 'caser') { S.aCaser.push({ id: uid(), titre: o.el.titre, cat: o.el.cat, duree: Math.min(Math.max(o.el.fin - o.el.debut, 15), 240) }); supprimerOcc(o, 'une'); sauver(); AD.close(); return dire(`« ${o.el.titre} » est à caser : retrouve-la en bas de la semaine.`); }
    if (a === 'partir') { S.partis[o.cle] = aujourdhui(); sauver(); AD.close(); return dire(`« ${o.el.titre} » : laissée partir. 🍃`); }
    if (a === 'commencer') { if (!commencer(o.cle)) return; sauver(); AD.close(); return dire(`C'est parti. Touche « Terminé » quand tu as fini.`); }
    if (a === 'terminer') { const msg = terminer(); if (!msg) return; sauver(); AD.close(); dire(msg); return feliciter(); }
    if (a === 'modifier') { AD.close(); return ouvrirTache(o); }
    if (a === 'dupliquer') { AD.close(); return ouvrirTache(null, { type: o.el.type, titre: o.el.titre, cat: o.el.cat, date: decaler(aujourdhui(), 1), debut: o.el.debut, fin: o.el.fin, flou: !!o.el.flou, moment: o.el.moment || null, objectif: o.el.objectif || '' }); }
    if (a === 'supprimer') {
      let portee = 'une';
      if (o.el.rep) { portee = await demanderPortee('Supprimer'); if (!portee) return; }
      else if (!(await demander('Supprimer ?', `« ${o.el.titre} » sera supprimée${S.payes[o.cle] && S.payes[o.cle].pts ? ', et ses points repris' : ''}.`, [{ texte: 'Supprimer', valeur: true, danger: true }, { texte: 'Annuler', valeur: false, clair: true }]))) return;
      supprimerOcc(o, portee); sauver(); AD.close(); return dire('Supprimée.');
    }
  });
  AD.addEventListener('close', () => { U.garderDefilement = true; render(); });

  // ---------- Le bac « À caser » (en bas de la vue Semaine) ----------
  function bacACaser() {
    return `<section class="bac" aria-labelledby="bac-titre">
        <div class="section-tete"><h2 id="bac-titre">📥 À caser${S.aCaser.length ? ` <small>${S.aCaser.length}</small>` : ''}</h2></div>
        ${S.aCaser.length ? `<div class="lignes">${S.aCaser.map(x => { const c = cat(x.cat); return `<button type="button" class="carte ligne bac-ligne" style="--c:${c.couleur}" data-caser="${esc(x.id)}" data-focus="bac${esc(x.id)}" aria-label="${esc(x.titre)}, ${esc(c.nom)}, ${duree(x.duree)}. La caser">
          <span class="tuile petite" aria-hidden="true">${c.icone}</span><span class="quoi" aria-hidden="true"><b>${esc(x.titre)}</b><small>${esc(c.nom)} · ${duree(x.duree)}</small></span><span class="pts" aria-hidden="true">Caser ›</span></button>`; }).join('')}</div>` : '<p class="note">Ce que tu veux faire cette semaine, sans savoir encore quand.</p>'}
        <form class="bac-ajout" id="bac-form"><label class="champ-nom"><span aria-hidden="true">＋</span><span class="masque">Nouvelle tâche à caser</span><input name="bac" maxlength="80" autocomplete="off" enterkeyhint="done" placeholder="Ajouter une tâche à caser…"></label></form>
      </section>`;
  }
  $('#ecran').addEventListener('submit', e => {
    if (e.target.id !== 'bac-form') return;
    e.preventDefault();
    const t = e.target.elements.namedItem('bac').value.trim().replace(/\s+/g, ' ');
    if (!t) return;
    S.aCaser.push({ id: uid(), titre: t.slice(0, 80), cat: (catsActives()[0] || S.categories[0]).id, duree: 60 });
    sauver(); U.garderDefilement = true; render();
    dire(`« ${t} » est à caser. Touche-la pour lui donner un créneau.`);
  });

  // ---------- Balayer une ligne, appui long ----------
  let R = null;
  const finR = () => { if (!R) return; clearTimeout(R.minuteur); if (R.fond) R.fond.remove(); R.ligne.style.transition = ''; R.ligne.style.transform = ''; R.ligne.classList.remove('glisse'); R = null; };
  $('#ecran').addEventListener('pointerdown', e => {
    if (R || e.pointerType === 'mouse') return;
    const ligne = e.target.closest('.ligne[data-glisse]');
    if (!ligne || e.target.closest('.rond-coche')) return;
    R = { id: e.pointerId, ligne, cle: ligne.dataset.glisse, x0: e.clientX, y0: e.clientY, mode: 'attente', dx: 0 };
    R.minuteur = setTimeout(() => { if (R && R.mode === 'attente') { const cle = R.cle; finR(); U.avaler = Date.now(); ouvrirActions(cle); } }, CONFIG.appuiLong + 150);
  });
  window.addEventListener('pointermove', e => {
    if (!R || e.pointerId !== R.id) return;
    const dx = e.clientX - R.x0, dy = e.clientY - R.y0;
    if (R.mode === 'attente') {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) return finR();
      if (Math.abs(dx) < 12 || Math.abs(dx) < 1.2 * Math.abs(dy)) return;
      clearTimeout(R.minuteur);
      R.mode = 'glisse';
      R.ligne.classList.add('glisse'); R.ligne.style.transition = 'none';
      const p = R.ligne.parentElement; p.style.position = 'relative';
      R.fond = document.createElement('div'); R.fond.className = 'g-fond'; R.fond.setAttribute('aria-hidden', 'true');
      R.fond.style.top = R.ligne.offsetTop + 'px'; R.fond.style.height = R.ligne.offsetHeight + 'px';
      p.insertBefore(R.fond, R.ligne);
    }
    R.dx = Math.max(-150, Math.min(150, dx));
    R.ligne.style.transform = `translateX(${R.dx}px)`;
    const fait = R.ligne.classList.contains('faite'), ok = Math.abs(R.dx) > 80;
    R.fond.className = 'g-fond ' + (R.dx > 0 ? 'droite' : 'gauche') + (ok ? ' ok' : '');
    R.fond.textContent = R.dx > 0 ? (fait ? '↺ Décocher' : '✓ Faite') : 'Reporter ↷';
  });
  window.addEventListener('pointerup', e => {
    if (!R || e.pointerId !== R.id) return;
    const { mode, dx, cle } = R;
    finR();
    if (mode !== 'glisse') return;
    U.avaler = Date.now();
    if (dx > 80) glisserFaite(cle); else if (dx < -80) ouvrirActions(cle);
  });
  window.addEventListener('pointercancel', e => { if (R && e.pointerId === R.id) finR(); });
