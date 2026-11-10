  // ---------- Progression ----------
  function anneau(fraction, taille) {
    const r = 64, c = 2 * Math.PI * r, f = fraction == null ? 0 : Math.max(0, Math.min(1, fraction));
    return `<svg viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="ga${taille || ''}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e0d5"/><stop offset="1" stop-color="#e8e2d8"/></linearGradient></defs>
      <circle cx="80" cy="80" r="${r}" fill="none" stroke="rgba(255, 255, 255, .08)" stroke-width="13"/>
      <circle cx="80" cy="80" r="${r}" fill="none" stroke="url(#ga${taille || ''})" stroke-width="13" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"${f > 0 ? '' : ' opacity="0"'} style="filter:drop-shadow(0 0 6px rgba(255, 255, 255, .35))"/></svg>`;
  }
  // Points gagnés jour par jour (ou semaine par semaine sur 90 jours) : barres, valeur la plus haute écrite
  function graphePoints(jours) {
    const auj = aujourdhui(), parSemaine = jours > 30;
    const groupes = [];
    if (parSemaine) {
      for (let i = Math.ceil(jours / 7) - 1; i >= 0; i--) {
        const fin = decaler(auj, -i * 7), de = decaler(fin, -6);
        groupes.push({ de, fin, v: gainsEntre(de, fin).total, nom: `semaine du ${fmt(de, { day: 'numeric', month: 'short' })}` });
      }
    } else for (let i = jours - 1; i >= 0; i--) { const k = decaler(auj, -i); groupes.push({ de: k, fin: k, v: gainDuJour(k), nom: jourLong(k) }); }
    const max = Math.max(1, ...groupes.map(g => g.v)), n = groupes.length, l = 300 / n;
    const iMax = groupes.findIndex(g => g.v === max);
    const barres = groupes.map((g, i) => {
      const h = Math.max(g.v > 0 ? 3 : 0, g.v / max * 92);
      return `<rect x="${(i * l + l * .18).toFixed(1)}" y="${(104 - h).toFixed(1)}" width="${(l * .64).toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, l * .3).toFixed(1)}" fill="url(#gb)"/>`;
    }).join('');
    const etiquette = max > 1 && iMax >= 0 ? `<text x="${Math.min(280, Math.max(20, iMax * l + l / 2)).toFixed(1)}" y="${(104 - groupes[iMax].v / max * 92 - 5).toFixed(1)}" text-anchor="middle" fill="#efe9e0" font-size="11" font-weight="600">${nombre(max)}</text>` : '';
    return `<svg class="courbe-pts" viewBox="0 0 300 108" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e3d9"/><stop offset="1" stop-color="#e6e0d5"/></linearGradient></defs>
        <line x1="0" y1="104.5" x2="300" y2="104.5" stroke="rgba(255, 255, 255, .125)"/>${barres}${etiquette}</svg>
      <div class="legende-courbe" aria-hidden="true"><span>${fmt(groupes[0].de, { day: 'numeric', month: 'short' })}</span><span>${parSemaine ? 'par semaine' : 'par jour'}</span><span>aujourd'hui</span></div>
      <table class="masque"><caption>Points gagnés ${parSemaine ? 'par semaine' : 'par jour'}</caption><tbody>${groupes.map(g => `<tr><th scope="row">${esc(g.nom)}</th><td>${g.v} points</td></tr>`).join('')}</tbody></table>`;
  }
  function phraseEncouragement(taux, diff, s) {
    if (taux == null) return 'Donne un objectif par semaine à tes catégories (Profil › Catégories) pour suivre ta progression.';
    if (taux >= .9) return 'Objectifs presque tous atteints. Tu es au sommet, garde le rythme ! ⚡';
    if (diff != null && diff >= .05) return 'Tu es sur la bonne voie. Continue comme ça ! ⚡';
    if (s >= 3) return `${s} jours de série : tes habitudes tiennent. Un pas de plus aujourd'hui.`;
    if (diff != null && diff <= -.05) return 'Un peu moins que la période d\'avant. Choisis une seule chose à faire aujourd\'hui, et fais-la.';
    return 'Chaque tâche compte. Choisis tes priorités, laisse le reste filer. 🌿';
  }
  function vueProgression() {
    const j = [7, 30, 90].includes(S.periode) ? S.periode : 30;
    const auj = aujourdhui(), de = decaler(auj, -(j - 1));
    const taux = tauxObjectifs(j, auj), avant = tauxObjectifs(j, decaler(de, -1));
    const diff = taux != null && avant != null ? taux - avant : null;
    const s = serie(), best = Math.max(S.meilleureSerie, s);
    const G = gainsEntre(de, auj), Gav = gainsEntre(decaler(de, -j), decaler(de, -1));
    const parts = Object.keys(G.cats).map(id => ({ id, pts: G.cats[id] })).filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts);
    const somme = parts.reduce((t, x) => t + x.pts, 0);
    const F = focusEntre(de, auj), J = jomoEntre(de, auj), se = serieSansEcran();
    const evol = diff == null ? '<b class="egal">—</b>' : `<b class="${diff > .005 ? 'hausse' : diff < -.005 ? 'baisse' : 'egal'}">${diff > .005 ? ICONE.hausse : diff < -.005 ? ICONE.baisse : ''}${diff > 0 ? '+' : ''}${Math.round(diff * 100)} %</b>`;
    const libelleCat = id => id === 'jomo' ? { icone: '🌿', nom: 'JOMO', couleur: JOMO.libre.couleur } : { icone: cat(id).icone, nom: cat(id).nom, couleur: cat(id).couleur };
    return `
      <header class="tete"><div><h1>Progression</h1><p>Deviens la meilleure version.</p></div>
        <span class="icone-bouton" aria-hidden="true" style="border:0;background:none;color:#efe9df">${ICONE.progression}</span></header>
      <button type="button" class="carte b-entree" data-action="bilan" data-focus="bilan">
        <span class="tuile" style="--c:#e8e2d8" aria-hidden="true">🗓️</span><span class="quoi"><b>Bilan de la semaine</b><small>${lundiParDefaut() === lundiDe(auj) ? 'Semaine en cours' : 'Semaine'} ${texteSemaine(lundiParDefaut())}</small></span>${ICONE.droite}</button>
      <div class="segments" role="group" aria-label="Période">
        ${[7, 30, 90].map(n => `<button type="button" aria-pressed="${n === j}" data-periode="${n}" data-focus="per${n}">${n} j</button>`).join('')}
      </div>
      <section class="carte anneau-carte" aria-label="Objectifs atteints">
        <div class="anneau" role="img" aria-label="${taux == null ? 'Pas d\'objectif par semaine défini' : Math.round(taux * 100) + ' % des objectifs atteints sur ' + j + ' jours'}">${anneau(taux)}
          <div class="val" aria-hidden="true"><b>${taux == null ? '—' : Math.round(taux * 100)}<small>${taux == null ? '' : '%'}</small></b><span>Objectifs atteints</span></div></div>
        <div class="chiffres">
          <div class="evol">${evol}<small>vs les ${j} jours d'avant</small></div>
          <div class="evol"><b>🔥 ${s} j</b><small>Série actuelle · meilleure ${best} j</small></div>
        </div>
      </section>
      <section class="carte pad" aria-labelledby="pp-titre">
        <div class="section-tete"><h2 id="pp-titre">Points gagnés</h2><span class="note"><b style="color:var(--texte);font-size:16px">${nombre(G.total)}</b>${Gav.total ? ` · ${G.total >= Gav.total ? '+' : ''}${Math.round((G.total - Gav.total) / Math.max(1, Gav.total) * 100)} %` : ''}</span></div>
        ${graphePoints(j)}
      </section>
      <section class="carte pad" aria-labelledby="rp-titre">
        <div class="section-tete"><h2 id="rp-titre">Répartition par catégorie</h2></div>
        ${parts.length ? `<div class="repart">${parts.slice(0, 7).map(x => { const l = libelleCat(x.id), pc = Math.round(x.pts / somme * 100); return `<div class="r-ligne" role="group" aria-label="${esc(l.nom)} : ${pc} %, ${x.pts} points"><span class="ic" aria-hidden="true">${l.icone}</span><span aria-hidden="true">${esc(l.nom)}</span><span class="barre" aria-hidden="true"><i style="width:${pc}%;--c:${l.couleur}"></i></span><b aria-hidden="true">${pc} %</b></div>`; }).join('')}</div>`
          : '<p class="vide" style="padding:6px 0">Pas encore de points sur cette période.</p>'}
      </section>
      <section class="carte pad" aria-labelledby="jo-titre">
        <div class="section-tete"><h2 id="jo-titre">JOMO</h2><span class="note">choisir, et rater sans regret</span></div>
        <div class="trois">
          <div class="mini carte" role="group" aria-label="Temps pour moi gardés : ${J.libres} sur ${J.libresTotal}"><span class="titre-mini" aria-hidden="true">🌿 Pour moi</span><b aria-hidden="true">${J.libres}<small style="font-size:13px"> / ${J.libresTotal}</small></b><small aria-hidden="true">gardés</small></div>
          <div class="mini carte" role="group" aria-label="Moments sans écran tenus : ${J.tenus} sur ${J.ecransTotal}, série de ${se}"><span class="titre-mini" aria-hidden="true">📵 Sans écran</span><b aria-hidden="true">${J.tenus}<small style="font-size:13px"> / ${J.ecransTotal}</small></b><small aria-hidden="true">tenus · série ${se}</small></div>
          <div class="mini carte" role="group" aria-label="Jours sous le plafond : ${J.sous} sur ${J.joursPrevus}"><span class="titre-mini" aria-hidden="true">⚖️ Plafond</span><b aria-hidden="true">${J.sous}<small style="font-size:13px"> / ${J.joursPrevus}</small></b><small aria-hidden="true">jours dessous</small></div>
        </div>
      </section>
      <section class="carte pad" aria-labelledby="fo-titre">
        <div class="section-tete"><h2 id="fo-titre">Concentration</h2><span class="note"><b style="color:var(--texte);font-size:16px">${duree(F.total)}</b> · ${pluriel(F.sessions, 'session')}</span></div>
        ${F.total ? `<div class="repart">${Object.keys(F.cats).sort((a, b) => F.cats[b] - F.cats[a]).map(id => { const c = cat(id), pc = Math.round(F.cats[id] / F.total * 100); return `<div class="r-ligne" role="group" aria-label="${esc(c.nom)} : ${duree(F.cats[id])}"><span class="ic" aria-hidden="true">${c.icone}</span><span aria-hidden="true">${esc(c.nom)}</span><span class="barre" aria-hidden="true"><i style="width:${pc}%;--c:${c.couleur}"></i></span><b aria-hidden="true">${F.cats[id] >= 60 ? Math.round(F.cats[id] / 6) / 10 + ' h' : F.cats[id] + ' min'}</b></div>`; }).join('')}</div>`
          : '<p class="vide" style="padding:6px 0">Lance une session de 25 minutes depuis une tâche ou l\'accueil.</p>'}
      </section>
      <div class="carte encourage">${ICONE.tendance}<p>${esc(phraseEncouragement(taux, diff, s))}</p></div>`;
  }
