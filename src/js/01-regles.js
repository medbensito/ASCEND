  nettoyer();

  // ---------- Paliers de l'emblème ----------
  const palierDe = pts => CONFIG.paliers.reduce((a, p) => (pts >= p.seuil ? p : a), CONFIG.paliers[0]);
  const palier = () => palierDe(S.points);
  const palierSuivant = () => CONFIG.paliers.find(p => p.seuil > S.points) || null;

  // ---------- Points ----------
  // Tout gain ou retrait passe par ici : le total, le journal par jour et par catégorie restent d'accord.
  function noterGain(pts, jour, type, catId) {
    const g = (S.gains[jour] = S.gains[jour] || { total: 0, cats: {}, src: {} });
    const c = catId || 'jomo';
    g.total += pts;
    g.cats[c] = (g.cats[c] || 0) + pts;
    g.src[type] = (g.src[type] || 0) + pts;
  }
  function gagner(cle, pts, jour, type, catId, raison) {
    const avant = palier();
    S.payes[cle] = { pts, jour, type, cat: catId || null };
    if (raison) S.payes[cle].raison = raison;
    if (!pts) return 0;
    S.points = Math.max(0, S.points + pts);
    noterGain(pts, jour, type, catId);
    U.reaction = true;
    const apres = palier();
    if (apres.id !== avant.id) U.palierAtteint = apres;
    return pts;
  }
  function reprendre(cle) {
    const p = S.payes[cle];
    if (!p) return 0;
    delete S.payes[cle];
    if (p.pts) { S.points = Math.max(0, S.points - p.pts); noterGain(-p.pts, p.jour, p.type, p.cat); }
    return p.pts || 0;
  }
  const valeur = el => el.type === 'tache' ? cat(el.cat).points : CONFIG.points[el.type];

  // Temps pour moi : grignoté si une tâche empiète dessus
  const grignoteurs = o => duJour(o.k).filter(x => x.el.type === 'tache' && x.el.debut < o.el.fin && x.el.fin > o.el.debut);
  const libresPayes = k => Object.values(S.payes).filter(p => p.type === 'libre' && p.jour === k && p.pts > 0).length;
  const ETAT_LIBRE = { paye: 'gardé', grignote: 'grignoté', tard: 'ajouté après son début', court: 'moins de 30 min', plafond: 'déjà 2 ce jour-là', 'en-cours': 'en cours', protege: 'protégé' };
  function etatLibre(o) {
    const p = S.payes[o.cle];
    if (p) return p.pts > 0 ? 'paye' : (p.raison || 'grignote');
    if (grignoteurs(o).length) return 'grignote';
    if (!prevue(o)) return 'tard';
    if (o.el.fin - o.el.debut < CONFIG.points.libreMin) return 'court';
    const now = Date.now();
    return now >= debutOcc(o) && now < finOcc(o) ? 'en-cours' : 'protege';
  }
  // Moment sans écran : à venir, en cours, à valider (fini, pas encore dit), tenu, pas tenu, oublié
  function etatSansEcran(o) {
    const p = S.payes[o.cle], t = S.tenus[o.cle], now = Date.now();
    if (t === true) return p && !p.pts && p.raison === 'tard' ? 'tenu-tard' : 'tenu';
    if (t === false) return 'pas-tenu';
    if (p) return 'oublie';
    if (now < debutOcc(o)) return 'a-venir';
    if (now < finOcc(o)) return 'en-cours';
    return 'a-valider';
  }
  const ETAT_ECRAN = { tenu: 'tenu', 'tenu-tard': 'tenu, ajouté après son début', 'pas-tenu': 'pas tenu', oublie: 'pas validé', 'a-venir': 'à venir', 'en-cours': 'en cours', 'a-valider': 'à valider' };

  // Verse ce qui est dû : tâches cochées en avance dont l'heure est venue, temps pour moi arrivés au bout,
  // moments sans écran restés sans réponse trop longtemps.
  function crediter() {
    const now = Date.now(), auj = aujourdhui();
    let change = false;
    for (let i = -14; i <= 0; i++) {
      const k = decaler(auj, i);
      duJour(k).forEach(o => {
        if (S.payes[o.cle]) return;
        const t = o.el.type;
        if (t === 'tache' && o.fait && prevue(o) && debutOcc(o) <= now) { gagner(o.cle, valeur(o.el), k, 'tache', cat(o.el.cat).id); change = true; }
        else if (t === 'libre' && finOcc(o) <= now) {
          let raison = null;
          if (!prevue(o)) raison = 'tard';
          else if (grignoteurs(o).length) raison = 'grignote';
          else if (o.el.fin - o.el.debut < CONFIG.points.libreMin) raison = 'court';
          else if (libresPayes(k) >= CONFIG.points.libresParJour) raison = 'plafond';
          if (raison) gagner(o.cle, 0, k, 'libre', null, raison); else gagner(o.cle, CONFIG.points.libre, k, 'libre', null);
          change = true;
        } else if (t === 'sansecran' && S.tenus[o.cle] === undefined && now - finOcc(o) > CONFIG.validation * 864e5) {
          gagner(o.cle, 0, k, 'sansecran', null, 'oublie'); change = true;
        }
      });
    }
    if (verifierSemaines()) change = true;
    if (change) sauver();
    return change;
  }
  // Cocher ou décocher une tâche. Renvoie le message à afficher.
  function basculerTache(o) {
    if (o.fait) {
      delete o.el.faits[o.k];
      o.fait = false;
      const pts = reprendre(o.cle);
      U.decoche = true;
      return pts ? `Décochée : −${pts} pts.` : 'Décochée.';
    }
    o.el.faits[o.k] = true;
    o.fait = true;
    const pts = valeur(o.el);
    if (!prevue(o)) return 'Bien joué ! Pas de points : elle a été ajoutée après son début.';
    if (debutOcc(o) > Date.now()) return `Faite en avance : +${pts} pts ${o.k === aujourdhui() ? 'à ' + hhmm(o.el.debut) : quandJour(o.k)}.`;
    return `+${gagner(o.cle, pts, o.k, 'tache', cat(o.el.cat).id)} pts${echoIdentite(o.el.cat)}`;
  }
  // Moment sans écran : tenu ou pas (on peut changer d'avis)
  function validerSansEcran(o, tenu) {
    reprendre(o.cle);
    S.tenus[o.cle] = tenu;
    if (!tenu) { gagner(o.cle, 0, o.k, 'sansecran', null, 'pas-tenu'); return 'Pas tenu. Ce n\'est que partie remise.'; }
    if (!prevue(o)) { gagner(o.cle, 0, o.k, 'sansecran', null, 'tard'); return 'Bravo ! Pas de points : il a été ajouté après son début.'; }
    const pts = gagner(o.cle, CONFIG.points.sansecran, o.k, 'sansecran', null);
    const s = serieSansEcran();
    if (s > S.meilleureSansEcran) S.meilleureSansEcran = s;
    return `+${pts} pts · ${pluriel(s, 'moment')} sans écran d'affilée.`;
  }
  // Moments sans écran tenus d'affilée (du plus récent au plus ancien ; un « pas tenu » ou un oubli coupe la série)
  function serieSansEcran() {
    const fins = [];
    const auj = aujourdhui();
    for (let i = 0; i <= 120; i++) {
      const k = decaler(auj, -i);
      duJour(k).filter(o => o.el.type === 'sansecran').forEach(o => {
        const e = etatSansEcran(o);
        if (['tenu', 'tenu-tard', 'pas-tenu', 'oublie'].includes(e)) fins.push({ f: finOcc(o), ok: e === 'tenu' || e === 'tenu-tard' });
      });
    }
    fins.sort((a, b) => b.f - a.f);
    let n = 0;
    for (const x of fins) { if (!x.ok) break; n++; }
    return n;
  }

  // ---------- Habitudes et série ----------
  const habitudeDue = (h, k) => k >= h.debut && (!h.fin || k < h.fin) && h.jours.includes(indexJour(k));
  const habitudesActives = () => S.habitudes.filter(h => !h.fin);
  const cleHab = (h, k) => 'h:' + h.id + '|' + k;
  function basculerHabitude(h, k) {
    const cle = cleHab(h, k);
    if (h.faits[k]) {
      delete h.faits[k];
      const pts = reprendre(cle);
      return pts ? `Décochée : −${pts} pts.` : 'Décochée.';
    }
    h.faits[k] = true;
    const c = cat(h.cat);
    const pts = gagner(cle, ptsHabitude(h, k), k, 'habitude', c.id);
    const s = serie();
    if (s > S.meilleureSerie) S.meilleureSerie = s;
    const toutes = S.habitudes.filter(x => habitudeDue(x, k));
    const reste = toutes.filter(x => !x.faits[k]).length;
    return `+${pts} pts` + (k === aujourdhui() ? (reste ? ` · encore ${pluriel(reste, 'habitude')} aujourd'hui` : ` · série : ${pluriel(s, 'jour')} 🔥`) : '') + echoIdentite(h.cat);
  }
  // Un jour compte si toutes les habitudes prévues ce jour-là sont faites ; null si aucune n'était prévue.
  function jourComplet(k) {
    const d = S.habitudes.filter(h => habitudeDue(h, k));
    if (!d.length) return null;
    return d.every(h => h.faits[k]);
  }
  // Série actuelle : aujourd'hui compte dès qu'il est complet.
  // Elle pardonne : un jour raté ne la casse pas, s'il n'y en a pas eu d'autre dans les 7 jours (il ne compte pas, c'est tout).
  // Deux ratés en 7 jours, et elle repart de zéro.
  function parcourirSerie(premier, etat) {
    const auj = aujourdhui(), pardons = [];
    let n = etat(auj) === true ? 1 : 0, dernier = null;
    for (let k = decaler(auj, -1), i = 0; k >= premier && i < 3700; k = decaler(k, -1), i++) {
      const c = etat(k);
      if (c === true) { n++; continue; }
      if (c !== false) continue;
      if (dernier && ecart(k, dernier) < CONFIG.pardon) break;
      dernier = k; pardons.push(k);
    }
    // Un pardon tout au bout (rien de fait avant lui) n'en est pas un
    while (pardons.length) { const k = pardons[pardons.length - 1]; let avant = false; for (let q = decaler(k, -1), i = 0; q >= premier && i < 3700; q = decaler(q, -1), i++) { const c = etat(q); if (c === true) { avant = true; break; } if (c === false) break; } if (avant) break; pardons.pop(); }
    return { n, pardons: n ? pardons : [] };
  }
  function serieDetail() {
    if (!S.habitudes.length) return { n: 0, pardons: [] };
    return parcourirSerie(S.habitudes.reduce((m, h) => (h.debut < m ? h.debut : m), '9999-12-31'), jourComplet);
  }
  const serie = () => serieDetail().n;
  const serieHabitude = h => parcourirSerie(h.debut, k => habitudeDue(h, k) ? !!h.faits[k] : null).n;
  // Le joker de la semaine est-il encore là ? (aucun jour pardonné dans les 7 derniers jours)
  const jokerDispo = () => !serieDetail().pardons.some(k => ecart(k, aujourdhui()) < CONFIG.pardon);

  // ---------- Jour difficile ----------
  // Un mauvais jour : les habitudes passent en version minimale (moitié des points, la série continue). 2 par semaine au plus.
  const difficile = k => !!S.difficiles[k];
  const ptsHabitude = (h, k) => { const p = cat(h.cat).points; return difficile(k) ? Math.max(5, Math.round(p / 10) * 5) : p; };
  const titreHabitude = (h, k) => difficile(k) ? (h.mini || h.titre + ' (version mini)') : h.titre;
  function difficilesSemaine(k) { const l = lundiDe(k); return Object.keys(S.difficiles).filter(x => x >= l && x <= decaler(l, 6)).length; }

  // ---------- Objectifs à long terme ----------
  // Avancement : étapes cochées + tâches rattachées faites. Une tâche répétée compte ses fois jusqu'à l'échéance
  // (ou jusqu'à aujourd'hui sans échéance).
  function tachesLiees(ob) {
    const res = [];
    const limite = ob.echeance && ob.echeance > aujourdhui() ? ob.echeance : aujourdhui();
    S.elements.filter(el => el.type === 'tache' && el.objectif === ob.id).forEach(el => {
      if (!el.rep) { res.push(occ(el, el.date)); return; }
      for (let k = el.date, i = 0; k <= limite && i < 800; k = decaler(k, 1), i++) {
        if (el.rep.jusqua && k > el.rep.jusqua) break;
        if (tombe(el, k)) res.push(occ(el, k));
      }
    });
    return res.sort((a, b) => a.k.localeCompare(b.k) || ordre(a, b));
  }
  function avancement(ob) {
    const t = tachesLiees(ob);
    const total = ob.etapes.length + t.length;
    const faits = ob.etapes.filter(e => e.faitLe).length + t.filter(o => o.fait).length;
    return { total, faits, taches: t, pc: total ? Math.round(faits / total * 100) : 0 };
  }
  const cleEtape = (ob, e) => 'e:' + ob.id + ':' + e.id;
  function basculerEtape(ob, e) {
    const cle = cleEtape(ob, e);
    if (e.faitLe) { e.faitLe = null; U.decoche = true; const pts = reprendre(cle); return pts ? `Étape décochée : −${pts} pts.` : 'Étape décochée.'; }
    e.faitLe = Date.now();
    const c = cat(ob.cat);
    return `Étape franchie : +${gagner(cle, c.points, aujourdhui(), 'etape', c.id)} pts.`;
  }
  // Objectif atteint (100 %) : bonus de 5 fois la valeur de sa catégorie. Repris seulement si on décoche quelque chose.
  function verifierObjectifs() {
    const decoche = U.decoche;
    U.decoche = false;
    S.objectifs.forEach(ob => {
      const a = avancement(ob);
      const cle = 'o:' + ob.id;
      if (a.total && a.faits === a.total) {
        if (!ob.atteintLe) {
          ob.atteintLe = Date.now();
          const c = cat(ob.cat);
          gagner(cle, c.points * CONFIG.points.bonusObjectif, aujourdhui(), 'objectif', c.id);
          U.objectifAtteint = ob;
        }
      } else if (ob.atteintLe && decoche) {
        ob.atteintLe = null;
        reprendre(cle);
      }
    });
  }

  // ---------- Statistiques ----------
  // Nombre de choses faites dans une catégorie entre deux jours (inclus) : tâches cochées et habitudes faites
  function faitsCat(catId, de, a) {
    let n = 0;
    S.elements.forEach(el => {
      if (el.type !== 'tache' || el.cat !== catId) return;
      Object.keys(el.faits).forEach(k => { if (k >= de && k <= a && tombe(el, k)) n++; });
    });
    S.habitudes.forEach(h => { if (h.cat !== catId) return; Object.keys(h.faits).forEach(k => { if (k >= de && k <= a) n++; }); });
    return n;
  }
  // Part des objectifs par semaine atteinte sur une fenêtre de « jours » jours finissant le jour « fin »
  function tauxObjectifs(jours, fin) {
    const de = decaler(fin, -(jours - 1));
    let cible = 0, atteint = 0;
    S.categories.filter(c => c.active && c.objectif > 0).forEach(c => {
      const ci = c.objectif * jours / 7;
      cible += ci;
      atteint += Math.min(faitsCat(c.id, de, fin), ci);
    });
    return cible ? atteint / cible : null;
  }
  function gainsEntre(de, a) {
    const r = { total: 0, cats: {}, src: {} };
    Object.keys(S.gains).forEach(k => {
      if (k < de || k > a) return;
      const g = S.gains[k];
      r.total += g.total || 0;
      Object.keys(g.cats || {}).forEach(c => { r.cats[c] = (r.cats[c] || 0) + g.cats[c]; });
      Object.keys(g.src || {}).forEach(c => { r.src[c] = (r.src[c] || 0) + g.src[c]; });
    });
    return r;
  }
  const gainDuJour = k => (S.gains[k] && S.gains[k].total) || 0;
  function focusEntre(de, a) {
    const r = { total: 0, sessions: 0, cats: {} };
    S.focus.forEach(f => { if (f.jour < de || f.jour > a) return; r.total += f.min; r.sessions++; r.cats[f.cat] = (r.cats[f.cat] || 0) + f.min; });
    return r;
  }
  // JOMO sur une fenêtre : temps pour moi gardés, moments sans écran tenus, jours sous le plafond (parmi les jours avec des tâches)
  function jomoEntre(de, a) {
    let libres = 0, libresTotal = 0, tenus = 0, ecransTotal = 0, sous = 0, joursPrevus = 0;
    const auj = aujourdhui();
    for (let k = de; k <= a; k = decaler(k, 1)) {
      duJour(k).forEach(o => {
        if (o.el.type === 'libre' && finOcc(o) <= Date.now()) { libresTotal++; if (S.payes[o.cle] && S.payes[o.cle].pts > 0) libres++; }
        if (o.el.type === 'sansecran' && finOcc(o) <= Date.now()) { ecransTotal++; if (S.tenus[o.cle] === true) tenus++; }
      });
      if (k <= auj) { const m = minutesPrevues(k); if (m) { joursPrevus++; if (m <= S.reglages.plafond) sous++; } }
    }
    return { libres, libresTotal, tenus, ecransTotal, sous, joursPrevus };
  }

  // ---------- Minuteur de concentration (Pomodoro) ----------
  // État enregistré : il survit à la fermeture de l'app. Les phases se suivent sur des horodatages.
  function demarrerMinuteur(o, catId) {
    const el = o ? o.el : null;
    S.minuteur = { phase: 'travail', debut: Date.now(), fin: Date.now() + S.reglages.travail * 6e4, reste: null, cle: o ? o.cle : null,
      cat: el ? cat(el.cat).id : (catId || catsActives()[0].id), titre: el ? el.titre : null, cycle: 1 };
  }
  function noterFocus(min) {
    const M = S.minuteur;
    if (!M || min < 1) return;
    S.focus.push({ jour: aujourdhui(), cat: M.cat, min: Math.round(min), cle: M.cle, le: Date.now() });
  }
  // Fait avancer le minuteur : fin de travail (le temps est compté, la pause démarre), fin de pause (on attend le feu vert)
  function avancerMinuteur() {
    const M = S.minuteur;
    if (!M || M.reste != null || !M.fin || Date.now() < M.fin) return null;
    if (M.phase === 'travail') {
      noterFocus((M.fin - M.debut) / 6e4);
      M.phase = 'pause'; M.debut = M.fin; M.fin = M.fin + S.reglages.pause * 6e4;
      if (Date.now() >= M.fin) { M.phase = 'pret'; M.fin = null; }
      return 'pause';
    }
    if (M.phase === 'pause') { M.phase = 'pret'; M.fin = null; return 'pret'; }
    return null;
  }
  function arreterMinuteur() {
    const M = S.minuteur;
    if (M && M.phase === 'travail') noterFocus(((M.reste != null ? (M.fin - M.debut) - M.reste : Date.now() - M.debut)) / 6e4);
    S.minuteur = null;
  }
