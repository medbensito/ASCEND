(() => {
  'use strict';
  // ASCEND : développement personnel et JOMO. Une seule page, données sur l'appareil (localStorage).
  const VERSION = 1;                       // format des données (export, sauvegarde)
  const EDITION = 13;                      // édition de l'app, comme le cache du service worker (ascend-13)
  const CLE = 'ascend-v1';

  // ---------- Réglages fixes ----------
  const CONFIG = {
    pardon: 7,             // la série pardonne un jour raté tous les 7 jours
    difficilesParSemaine: 2,
    absence: 3,            // jours sans ouvrir l'app avant l'accueil « content de te revoir »
    heure: 60,             // px par heure dans la grille (= --H)
    pas: 15,               // minutes : les plages se calent au quart d'heure
    duree: 60,             // durée proposée pour une nouvelle plage
    ouverture: 7,          // heure en haut de la grille à l'ouverture
    appuiLong: 450,        // ms : appui long sur l'écran tactile
    points: { libre: 30, sansecran: 40, libresParJour: 2, libreMin: 30, bonusObjectif: 5, bonusSemaine: .5 },
    validation: 3,         // jours pour dire si un moment sans écran a été tenu
    rappels: { horizon: 14, heureSauvegarde: 19 * 60 },
    paliers: [
      { id: 'eclat', nom: 'Éclat', seuil: 0 },
      { id: 'cristal', nom: 'Cristal', seuil: 500 },
      { id: 'etoile', nom: 'Étoile', seuil: 1500 },
      { id: 'constellation', nom: 'Constellation', seuil: 4000 },
      { id: 'nova', nom: 'Nova', seuil: 10000 }
    ]
  };
  let H = CONFIG.heure;                    // px par heure ; téléphone couché, la vue Jour l'ajuste pour montrer toute la journée
  let HMIN = 22;                           // hauteur minimale d'un bloc
  const PLAGE = { a: 0, b: 24, dispo: 0, ajuste: false };
  const PALETTE = ['#ff4d6d', '#ffb547', '#7b6cff', '#d78bff', '#ff5e7a', '#4f8bff', '#3ee08f', '#2fd3c5', '#57c3ff', '#ff8a3d', '#f5d547', '#9aa3d9'];
  const NOMS_COULEURS = { '#ff4d6d': 'Rouge', '#ffb547': 'Orange', '#7b6cff': 'Violet', '#d78bff': 'Mauve', '#ff5e7a': 'Rose', '#4f8bff': 'Bleu', '#3ee08f': 'Vert', '#2fd3c5': 'Turquoise', '#57c3ff': 'Ciel', '#ff8a3d': 'Mandarine', '#f5d547': 'Jaune', '#9aa3d9': 'Gris' };
  const ICONES_CAT = ['🏋️', '💼', '📘', '👥', '❤️', '⭐', '🧘', '🏃', '🚴', '⚽', '🎯', '🧠', '💡', '📝', '🎨', '🎵', '🍎', '💰', '🏠', '✈️', '🌱', '🛠️', '📷', '🎮'];
  const CATS = () => [
    { id: 'sport', nom: 'Sport', icone: '🏋️', couleur: '#ff4d6d', points: 50, objectif: 2, active: true },
    { id: 'travail', nom: 'Travail', icone: '💼', couleur: '#ffb547', points: 30, objectif: 5, active: true },
    { id: 'lecture', nom: 'Lecture', icone: '📘', couleur: '#7b6cff', points: 20, objectif: 3, active: true },
    { id: 'social', nom: 'Social', icone: '👥', couleur: '#d78bff', points: 20, objectif: 1, active: true },
    { id: 'sante', nom: 'Santé', icone: '❤️', couleur: '#ff5e7a', points: 40, objectif: 4, active: true },
    { id: 'autre', nom: 'Autre', icone: '⭐', couleur: '#9aa3d9', points: 10, objectif: 0, active: true }
  ];
  // Les deux types JOMO : pas de catégorie, des points fixes
  const JOMO = {
    libre: { nom: 'Temps pour moi', court: 'Pour moi', icone: '🌿', couleur: '#2fd3c5' },
    sansecran: { nom: 'Sans écran', court: 'Sans écran', icone: '📵', couleur: '#57c3ff' }
  };
  const REPET = { jour: 'Chaque jour', ouvres: 'En semaine', semaine: 'Chaque semaine', mois: 'Chaque mois' };
  const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  // ---------- Données ----------
  // elements : { id, type: 'tache' | 'libre' | 'sansecran', titre, cat, date, debut, fin (minutes), rep: null | { freq, jusqua },
  //              exceptions: { date: true }, faits: { date: true }, objectif: id | null, creeLe }
  // habitudes : { id, titre, cat, jours: [0..6] (0 = lundi), debut (date), fin (date de retrait ou null), faits: { date: true } }
  // objectifs : { id, titre, cat, echeance, etapes: [{ id, titre, faitLe }], creeLe, atteintLe }
  // payes : { clé : { pts, jour, type, cat, raison? } } ; gains : { jour : { total, cats: { id: pts }, src: { type: pts } } }
  // priorites : { lundi : [{ id, titre, fait }] } (1 à 3 par semaine) ; bilanVu : lundi de la semaine où le bilan s'est ouvert de lui-même
  // partis : { clé d'une tâche pas faite : jour où on l'a laissée partir }
  // difficiles : { jour : true } (jours difficiles : habitudes en version minimale) ; vu : dernier jour où l'app a été ouverte
  function rappelsVides() {
    return { actif: false, jeton: null, service: null, avant: true, delai: 30, matin: true, heureMatin: 8 * 60, sauvegarde: true, signature: null, majLe: null, erreur: null };
  }
  function coffreVide() { return { actif: false, derniere: null, envoiLe: null, jours: [], erreur: null, signature: null }; }
  const vide = () => ({
    app: 'ascend', version: VERSION,
    profil: { prenom: 'Mehdi', initiales: 'MB' },
    categories: CATS(),
    elements: [], habitudes: [], objectifs: [],
    tenus: {}, payes: {}, gains: {}, points: 0,
    focus: [],                 // sessions de concentration : { jour, cat, min, cle, le }
    minuteur: null,            // { phase: 'travail' | 'pause' | 'pret', fin, reste, cle, cat, titre, cycle, debut }
    reglages: { plafond: 9 * 60, travail: 25, pause: 5 },
    meilleureSerie: 0, meilleureSansEcran: 0,
    priorites: {}, bilanVu: null, partis: {}, difficiles: {}, vu: null,
    onglet: 'accueil', vueCal: 'mois', vueObj: 'habitudes', periode: 30,
    derniereExport: null, depuis: null,
    rappels: null, coffre: null
  });
  let S;
  try { S = Object.assign(vide(), JSON.parse(localStorage.getItem(CLE)) || {}); }
  catch (e) { S = vide(); }
  const estObjet = v => v && typeof v === 'object' && !Array.isArray(v);
  function nettoyer() {
    ['elements', 'habitudes', 'objectifs', 'focus'].forEach(c => { if (!Array.isArray(S[c])) S[c] = []; });
    ['tenus', 'payes', 'gains', 'priorites', 'partis', 'difficiles'].forEach(c => { if (!estObjet(S[c])) S[c] = {}; });
    Object.keys(S.priorites).forEach(k => {
      const l = Array.isArray(S.priorites[k]) ? S.priorites[k].filter(p => p && p.id && typeof p.titre === 'string' && p.titre.trim()).slice(0, 3) : [];
      l.forEach(p => { p.titre = p.titre.slice(0, 60); p.fait = !!p.fait; });
      if (l.length && /^\d{4}-\d{2}-\d{2}$/.test(k)) S.priorites[k] = l; else delete S.priorites[k];
    });
    if (typeof S.bilanVu !== 'string') S.bilanVu = null;
    if (typeof S.vu !== 'string') S.vu = null;
    if (!Array.isArray(S.categories) || !S.categories.length) S.categories = CATS();
    S.categories.forEach(c => {
      c.points = Math.max(0, Math.min(1000, Math.round(Number(c.points) || 0)));
      c.objectif = Math.max(0, Math.min(21, Math.round(Number(c.objectif) || 0)));
      if (typeof c.active !== 'boolean') c.active = true;
      if (!c.icone) c.icone = '⭐';
      if (!/^#[0-9a-f]{6}$/i.test(c.couleur || '')) c.couleur = '#9aa3d9';
    });
    S.profil = Object.assign({ prenom: 'Mehdi', initiales: 'MB' }, estObjet(S.profil) ? S.profil : {});
    S.reglages = Object.assign({ plafond: 9 * 60, travail: 25, pause: 5 }, estObjet(S.reglages) ? S.reglages : {});
    S.rappels = Object.assign(rappelsVides(), estObjet(S.rappels) ? S.rappels : {});
    S.coffre = Object.assign(coffreVide(), estObjet(S.coffre) ? S.coffre : {});
    S.elements = S.elements.filter(el => el && el.id && typeof el.date === 'string' && el.debut != null && el.fin != null);
    S.elements.forEach(el => {
      el.exceptions = estObjet(el.exceptions) ? el.exceptions : {};
      el.faits = estObjet(el.faits) ? el.faits : {};
      if (!['tache', 'libre', 'sansecran'].includes(el.type)) el.type = 'tache';
      if (el.objectif === undefined) el.objectif = null;
    });
    S.elements = S.elements.filter(el => !el.rep || !el.rep.jusqua || el.rep.jusqua >= el.date);
    S.habitudes = S.habitudes.filter(h => h && h.id && h.titre);
    S.habitudes.forEach(h => {
      h.faits = estObjet(h.faits) ? h.faits : {};
      if (!Array.isArray(h.jours) || !h.jours.length) h.jours = [0, 1, 2, 3, 4, 5, 6];
      if (!h.debut) h.debut = aujourdhui();
    });
    S.objectifs = S.objectifs.filter(o => o && o.id && o.titre);
    S.objectifs.forEach(o => { if (!Array.isArray(o.etapes)) o.etapes = []; });
    if (S.focus.length > 3000) S.focus = S.focus.slice(-3000);
    if (!S.depuis) S.depuis = aujourdhui();
  }
  let erreurStockage = false;
  // Enregistre, puis prévient le service de rappels et la sauvegarde automatique
  const sauver = () => { verifierObjectifs(); verifierSemaines(); ecrire(); planifierSynchro(); planifierCoffre(); };
  const ecrire = () => {
    nettoyer();
    // Journal des gains et paiements : 400 jours (les étapes et les objectifs restent)
    const limite = decaler(aujourdhui(), -400);
    Object.keys(S.gains).forEach(k => { if (k < limite) delete S.gains[k]; });
    Object.keys(S.priorites).forEach(k => { if (k < limite) delete S.priorites[k]; });
    Object.keys(S.partis).forEach(c => { if (c.slice(c.lastIndexOf('|') + 1) < limite) delete S.partis[c]; });
    Object.keys(S.payes).forEach(c => { if (!/^[eo]:/.test(c) && (!S.payes[c] || (S.payes[c].jour || '') < limite)) delete S.payes[c]; });
    try { localStorage.setItem(CLE, JSON.stringify(S)); erreurStockage = false; }
    catch (e) { erreurStockage = true; }
  };
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* facultatif */ }

  // ---------- Dates et heures ----------
  const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = k => { const [y, m, j] = k.split('-').map(Number); return new Date(y, m - 1, j); };
  const aujourdhui = () => dk(new Date());
  const decaler = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return dk(d); };
  const ecart = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const indexJour = k => (parse(k).getDay() + 6) % 7;            // 0 = lundi
  const lundiDe = k => decaler(k, -indexJour(k));
  const moisPlus = (k, n) => { const d = parse(k); const j = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(j, fin)); return dk(d); };
  const fmt = (k, o) => parse(k).toLocaleDateString('fr-FR', o);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const finTexte = m => (m === 1440 ? '24:00' : hhmm(m));
  const versMin = s => { if (!s) return null; const [h, m] = s.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
  const minNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const caler = m => Math.round(m / CONFIG.pas) * CONFIG.pas;
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  // Sur téléphone, une feuille qui s'ouvre ne fait pas surgir le clavier : on touche le champ quand on veut écrire
  const TACTILE = window.matchMedia('(hover: none) and (pointer: coarse)');
  const focusDepart = champ => { if (!TACTILE.matches) setTimeout(() => { const c = champ(); if (c) c.focus(); }, 60); };
  const nombre =n => Math.round(n).toLocaleString('fr-FR');
  const duree = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;
  const jourLong = k => cap(fmt(k, { weekday: 'long', day: 'numeric', month: 'long' }));
  const quandJour = k => { const a = aujourdhui(); return k === a ? "aujourd'hui" : k === decaler(a, 1) ? 'demain' : k === decaler(a, -1) ? 'hier' : 'le ' + fmt(k, { weekday: 'long', day: 'numeric', month: 'long' }); };
  const pluriel = (n, mot, motPl) => `${n} ${n > 1 ? (motPl || mot + 's') : mot}`;

  // ---------- Catégories ----------
  const cat = id => S.categories.find(c => c.id === id) || S.categories[0] || { id: '', nom: 'Sans catégorie', icone: '⭐', couleur: '#9aa3d9', points: 0, objectif: 0, active: true };
  const catsActives = () => S.categories.filter(c => c.active);
  // Apparence d'un élément : catégorie (tâche) ou type JOMO
  const look = el => el.type === 'tache' ? { icone: cat(el.cat).icone, couleur: cat(el.cat).couleur, nom: cat(el.cat).nom } : { icone: JOMO[el.type].icone, couleur: JOMO[el.type].couleur, nom: JOMO[el.type].nom };

  // ---------- Occurrences ----------
  function tombe(el, k) {
    if (k < el.date) return false;
    if (!el.rep) return k === el.date;
    if (el.rep.jusqua && k > el.rep.jusqua) return false;
    if (el.exceptions[k]) return false;
    const d = parse(k), d0 = parse(el.date);
    switch (el.rep.freq) {
      case 'jour': return true;
      case 'ouvres': return d.getDay() >= 1 && d.getDay() <= 5;
      case 'semaine': return d.getDay() === d0.getDay();
      case 'mois': return d.getDate() === d0.getDate();
    }
    return false;
  }
  const occ = (el, k) => ({ el, k, cle: el.id + '|' + k, fait: !!el.faits[k] });
  const ordre = (a, b) => a.el.debut - b.el.debut || a.el.fin - b.el.fin || a.el.titre.localeCompare(b.el.titre, 'fr');
  const duJour = k => S.elements.filter(el => tombe(el, k)).map(el => occ(el, k)).sort(ordre);
  function trouver(cle) {
    const i = cle.lastIndexOf('|');
    const el = S.elements.find(e => e.id === cle.slice(0, i));
    const k = cle.slice(i + 1);
    return el && tombe(el, k) ? occ(el, k) : null;
  }
  const copie = el => JSON.parse(JSON.stringify(el));
  const debutOcc = o => parse(o.k).getTime() + o.el.debut * 6e4;
  const finOcc = o => parse(o.k).getTime() + o.el.fin * 6e4;
  const prevue = o => (o.el.creeLe || 0) < debutOcc(o);            // planifiée avant son début

  function transferer(ancienne, nouvelle) {
    if (ancienne === nouvelle) return;
    if (S.payes[ancienne]) { S.payes[nouvelle] = S.payes[ancienne]; delete S.payes[ancienne]; }
    if (S.tenus[ancienne] !== undefined) { S.tenus[nouvelle] = S.tenus[ancienne]; delete S.tenus[ancienne]; }
    delete S.partis[ancienne];
  }
  function prendreDepuis(obj, depuis, delta) {
    const res = {};
    Object.keys(obj).forEach(k => { if (k >= depuis) { res[delta ? decaler(k, delta) : k] = obj[k]; delete obj[k]; } });
    return res;
  }
  // Modifie une occurrence. portee : 'une' (cette fois seulement) ou 'suivantes'. Renvoie la nouvelle clé.
  function appliquer(o, champs, portee) {
    const el = o.el;
    const final = Object.assign({}, { date: o.k }, champs);
    if (!el.rep) {
      const fait = !!el.faits[o.k];
      Object.assign(el, final);
      el.faits = fait ? { [el.date]: true } : {};
      if (!el.rep) el.exceptions = {};
      transferer(o.cle, el.id + '|' + el.date);
      return el.id + '|' + el.date;
    }
    if (portee === 'une') {
      const fait = !!el.faits[o.k];
      el.exceptions[o.k] = true;
      delete el.faits[o.k];
      const n = Object.assign(copie(el), final, { id: uid(), rep: null, exceptions: {}, faits: {}, serie: el.id });
      if (fait) n.faits[n.date] = true;
      S.elements.push(n);
      transferer(o.cle, n.id + '|' + n.date);
      return n.id + '|' + n.date;
    }
    const delta = ecart(o.k, final.date);
    if (o.k === el.date) {
      const faits = prendreDepuis(el.faits, o.k, delta), exc = prendreDepuis(el.exceptions, o.k, delta);
      Object.assign(el, final);
      el.faits = faits; el.exceptions = exc;
      return el.id + '|' + el.date;
    }
    const n = Object.assign(copie(el), final, { id: uid(), faits: prendreDepuis(el.faits, o.k, delta), exceptions: prendreDepuis(el.exceptions, o.k, delta) });
    el.rep = Object.assign({}, el.rep, { jusqua: decaler(o.k, -1) });
    Object.keys(S.payes).concat(Object.keys(S.tenus)).forEach(c => {
      if (c.startsWith(el.id + '|') && c.slice(el.id.length + 1) >= o.k) transferer(c, n.id + '|' + decaler(c.slice(el.id.length + 1), delta));
    });
    S.elements.push(n);
    return n.id + '|' + n.date;
  }
  function supprimerOcc(o, portee) {
    const el = o.el;
    if (!el.rep || (portee === 'suivantes' && o.k === el.date)) {
      S.elements = S.elements.filter(e => e !== el);
    } else if (portee === 'une') {
      el.exceptions[o.k] = true;
      delete el.faits[o.k];
    } else {
      el.rep = Object.assign({}, el.rep, { jusqua: decaler(o.k, -1) });
      prendreDepuis(el.faits, o.k, 0);
      prendreDepuis(el.exceptions, o.k, 0);
    }
  }
  // Minutes de tâches prévues un jour (les chevauchements comptent une fois) : c'est ce qui est comparé au plafond
  function minutesPrevues(k, sans) {
    const iv = duJour(k).filter(o => o.el.type === 'tache' && o.cle !== sans).map(o => [o.el.debut, o.el.fin]).sort((a, b) => a[0] - b[0]);
    let total = 0, d = -1, f = -1;
    iv.forEach(([a, b]) => { if (a > f) { total += Math.max(0, f - d); d = a; f = b; } else f = Math.max(f, b); });
    return total + Math.max(0, f - d);
  }

  // Service de rappels, sauvegarde automatique : états en mémoire
  const RAP = { service: undefined, cle: null, minuteur: null, enCours: false, reabonner: null };
  const COF = { minuteur: null, enCours: false, iter: 200000 };

  // ---------- État de l'écran (non enregistré) ----------
  const U = {
    onglet: ['accueil', 'calendrier', 'objectifs', 'progression'].includes(S.onglet) ? S.onglet : 'accueil',
    date: aujourdhui(),
    selection: null, brouillon: null, defile: {}, edition: null, avaler: 0,
    reaction: false, palierAtteint: null, repere: null
  };
