  // ---------- Verrou Face ID ----------
  // Une clé d'accès (passkey) propre à ASCEND, dans le trousseau de l'iPhone. Demandée à l'ouverture et au retour après
  // le délai choisi : Face ID, ou le code de l'iPhone si Face ID échoue. Réglages gardés sur l'appareil, hors des données.
  const CLE_VERROU = 'ascend-verrou';
  const VR = $('#verrou');
  const DELAIS_VERROU = [[0, 'Dès que je quitte ASCEND'], [1, 'Après 1 min'], [5, 'Après 5 min'], [15, 'Après 15 min'], [60, 'Après 1 h']];
  const BIO = IOS ? 'Face ID' : 'le déverrouillage de l\'appareil';
  const V = { conf: { actif: false, id: null, uid: null, delai: 5 }, etat: 'ouvert', quitteLe: null, abort: null, pause: false, dispo: undefined };
  try { Object.assign(V.conf, JSON.parse(localStorage.getItem(CLE_VERROU)) || {}); } catch (e) { /* pas de verrou */ }
  if (!V.conf.id) V.conf.actif = false;
  const garderVerrou = () => { try { localStorage.setItem(CLE_VERROU, JSON.stringify(V.conf)); } catch (e) { /* plein */ } };
  const enB64u = u8 => { let t = ''; u8.forEach(o => { t += String.fromCharCode(o); }); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const deB64u = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)), c => c.charCodeAt(0));
  async function preparerVerrou() {
    if (V.dispo === undefined) {
      let ok = false;
      try { ok = !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { ok = false; }
      V.dispo = ok;
    }
    majVerrouUI();
  }
  // Les requêtes WebAuthn partent sans attente avant l'appel : Safari les veut au plus près du toucher
  async function creerCle() {
    const uidCle = V.conf.uid ? deB64u(V.conf.uid) : crypto.getRandomValues(new Uint8Array(16));
    const defi = crypto.getRandomValues(new Uint8Array(32));
    V.pause = true;
    try {
      const c = await navigator.credentials.create({ publicKey: {
        rp: { name: 'ASCEND' }, user: { id: uidCle, name: 'ASCEND', displayName: 'ASCEND' }, challenge: defi,
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred', requireResidentKey: false },
        timeout: 120000, attestation: 'none' } });
      const cd = JSON.parse(new TextDecoder().decode(c.response.clientDataJSON));
      if (cd.type !== 'webauthn.create' || cd.challenge !== enB64u(defi) || cd.origin !== location.origin) throw new Error('reponse');
      if (c.response.getAuthenticatorData && !(new Uint8Array(c.response.getAuthenticatorData())[32] & 0x04)) throw new Error('reponse');
      const ancien = V.conf.id, nouveau = enB64u(new Uint8Array(c.rawId));
      Object.assign(V.conf, { actif: true, id: nouveau, uid: enB64u(uidCle), creeLe: Date.now() });
      garderVerrou();
      if (ancien && ancien !== nouveau) oublierCle(ancien);
    } finally { V.pause = false; }
  }
  function oublierCle(id) {
    try { if (PublicKeyCredential.signalUnknownCredential) PublicKeyCredential.signalUnknownCredential({ rpId: location.hostname, credentialId: id }).catch(() => {}); } catch (e) { /* facultatif */ }
  }
  async function demanderFaceID() {
    if (V.abort) V.abort.abort();
    const ctrl = V.abort = new AbortController();
    const defi = crypto.getRandomValues(new Uint8Array(32));
    V.pause = true;
    try {
      const a = await navigator.credentials.get({ publicKey: { challenge: defi, allowCredentials: [{ type: 'public-key', id: deB64u(V.conf.id), transports: ['internal'] }], userVerification: 'required', timeout: 120000 }, signal: ctrl.signal });
      if (ctrl !== V.abort) return 'remplace';
      const ad = new Uint8Array(a.response.authenticatorData);
      const cd = JSON.parse(new TextDecoder().decode(a.response.clientDataJSON));
      return (ad[32] & 0x05) === 0x05 && cd.type === 'webauthn.get' && cd.challenge === enB64u(defi) && cd.origin === location.origin && enB64u(new Uint8Array(a.rawId)) === V.conf.id ? 'ok' : 'echec';
    } catch (e) { return ctrl !== V.abort ? 'remplace' : 'echec'; }
    finally { if (ctrl === V.abort) { V.abort = null; V.pause = false; } }
  }
  const texteCreation = e => e && e.name === 'NotAllowedError' ? 'Activation annulée.' : e && e.name === 'SecurityError' ? 'Le verrou ne marche que depuis l\'adresse d\'ASCEND (https).' : 'Impossible de créer la clé sur cet appareil.';
  function majEcranVerrou() {
    $('#vr-logo').innerHTML = logo();
    $('#vr-ouvrir').innerHTML = IOS ? `${ICONE.visage} Déverrouiller avec Face ID` : 'Déverrouiller';
    $('#vr-lien-aide').textContent = IOS ? 'Face ID ne marche plus ?' : 'Le déverrouillage ne marche plus ?';
    $('#vr-aide-texte').textContent = `Si la clé d'ASCEND a été supprimée du trousseau, crée-en une nouvelle. ${IOS ? "L'iPhone te demandera Face ID ou ton code." : "L'appareil te demandera ton empreinte, ton visage ou ton code."}`;
  }
  function montrerVerrou(etat) {
    V.etat = etat;
    majEcranVerrou();
    $('#vr-erreur').textContent = '';
    $('#vr-aide').hidden = true;
    $('#vr-lien-aide').setAttribute('aria-expanded', 'false');
    if (!VR.open) VR.showModal();
  }
  function verrouiller(auto) { montrerVerrou('verrouille'); if (auto) essayerDeverrouiller(true); }
  function essayerDeverrouiller(auto) {
    demanderFaceID().then(r => {
      if (r === 'ok') return deverrouiller();
      if (r === 'echec' && !auto && VR.open) $('#vr-erreur').textContent = `${IOS ? 'Face ID n\'a' : 'Le déverrouillage n\'a'} pas abouti. Réessaie.`;
    });
  }
  function deverrouiller(msg) {
    V.etat = 'ouvert';
    if (VR.open) VR.close();
    if (!document.querySelector('dialog[open]')) { render(); if (msg) dire(msg); else setTimeout(accueillir, 300); }
    else if (msg) dire(msg);
  }
  VR.addEventListener('cancel', e => e.preventDefault());
  VR.addEventListener('close', () => { if (V.etat !== 'ouvert') VR.showModal(); });
  VR.addEventListener('click', e => {
    const b = e.target.closest('[data-vr]');
    if (!b) return;
    const a = b.dataset.vr;
    if (a === 'ouvrir') essayerDeverrouiller(false);
    if (a === 'aide') { const o = $('#vr-aide').hidden; $('#vr-aide').hidden = !o; b.setAttribute('aria-expanded', String(o)); }
    if (a === 'nouvelle') creerCle().then(() => deverrouiller('Nouvelle clé créée : le verrou est de nouveau prêt.')).catch(err => { $('#vr-erreur').textContent = texteCreation(err); });
  });
  document.addEventListener('visibilitychange', () => {
    if (!V.conf.actif || V.pause) return;
    if (document.hidden) { if (V.etat === 'ouvert') { V.quitteLe = Date.now(); montrerVerrou('voile'); } return; }
    if (V.etat !== 'voile') return;
    if (Date.now() - (V.quitteLe || 0) >= V.conf.delai * 60000) verrouiller(true);
    else deverrouiller();
  });
  function htmlVerrou(msg) {
    let h = `<legend>${IOS ? 'Verrou Face ID' : 'Verrou'}</legend>`;
    if (V.dispo === false && !V.conf.actif) return h + `<p class="note">${IOS ? "Face ID n'est pas disponible ici : il faut iOS 16 ou plus récent, avec Face ID ou un code configuré." : 'Cet appareil ne propose pas de déverrouillage (empreinte, visage ou code) aux sites web.'}</p>`;
    if (!V.conf.actif) return h + `<p class="note" role="status">${esc(msg || `ASCEND te demande ${IOS ? 'Face ID' : 'ton empreinte, ton visage ou ton code'} à l'ouverture, et au retour après quelques minutes ailleurs. Si ça échoue, ${IOS ? "l'iPhone propose ton code" : "l'appareil propose son code"}.`)}</p>
      <button type="button" class="bouton" data-vr-action="activer"${V.dispo === undefined ? ' disabled' : ''}>Activer le verrou${IOS ? ' Face ID' : ''}</button>`;
    return h + `<div class="groupe"><label class="rang"><span>Verrouiller</span><select data-vr-delai>${DELAIS_VERROU.map(([m, n]) => `<option value="${m}"${m === V.conf.delai ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <p class="note" role="status"><b>${esc(msg || `Verrou actif : ${BIO} à l'ouverture.`)}</b></p>
      <div class="boutons deux"><button type="button" class="bouton secondaire petit" data-vr-action="maintenant">Verrouiller</button>
        <button type="button" class="bouton danger petit" data-vr-action="desactiver">Désactiver</button></div>`;
  }
  function majVerrouUI(msg, focus) {
    const f = document.getElementById('r-verrou');
    if (!f || !PD.open) return;
    const a = document.activeElement && f.contains(document.activeElement) ? document.activeElement : null;
    const sel = a && (a.dataset.vrAction ? `[data-vr-action="${a.dataset.vrAction}"]` : a.hasAttribute('data-vr-delai') ? '[data-vr-delai]' : null);
    f.innerHTML = htmlVerrou(msg);
    const c = (focus && f.querySelector(focus)) || (sel && f.querySelector(sel));
    if (c) c.focus();
  }
  PD.addEventListener('click', e => {
    const b = e.target.closest('[data-vr-action]');
    if (!b || b.disabled) return;
    const a = b.dataset.vrAction;
    if (a === 'activer') creerCle().then(() => majVerrouUI(`Verrou activé. ${BIO === 'Face ID' ? 'Face ID sera demandé' : 'Le déverrouillage sera demandé'} à la prochaine ouverture.`, '[data-vr-delai]')).catch(err => majVerrouUI(texteCreation(err), '[data-vr-action="activer"]'));
    if (a === 'maintenant') { PD.close(); verrouiller(false); }
    if (a === 'desactiver') demanderFaceID().then(r => {
      if (r !== 'ok') return majVerrouUI(`${IOS ? 'Face ID n\'a' : 'Le déverrouillage n\'a'} pas abouti : le verrou reste actif.`, '[data-vr-action="desactiver"]');
      oublierCle(V.conf.id);
      Object.assign(V.conf, { actif: false, id: null });
      garderVerrou();
      majVerrouUI('Verrou désactivé.', '[data-vr-action="activer"]');
    });
  });
  PD.addEventListener('change', e => { if (e.target.hasAttribute('data-vr-delai')) { V.conf.delai = Number(e.target.value); garderVerrou(); } });

  // ---------- Loupe : chercher dans tout ASCEND ----------
  const LP = $('#loupe'), LPQ = $('#lp-q');
  U.loupe = { q: '', types: [], cats: [], max: {}, retour: null };
  const PAR_PAGE = 50, HORIZON_LOUPE = 400;
  const plier = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’ʼ]/g, "'");
  const motsDe = q => plier(q).split(/\s+/).filter(Boolean).slice(0, 8);
  function surligner(texte, mots) {
    const car = Array.from(texte), pos = [];
    let plie = '';
    car.forEach((c, i) => { const f = plier(c); for (let j = 0; j < f.length; j++) pos.push(i); plie += f; });
    const marque = car.map(() => false);
    mots.forEach(m => { for (let i = plie.indexOf(m); i >= 0; i = plie.indexOf(m, i + 1)) for (let j = i; j < i + m.length; j++) marque[pos[j]] = true; });
    let h = '', dans = false;
    car.forEach((c, i) => { if (marque[i] !== dans) { h += dans ? '</mark>' : '<mark>'; dans = marque[i]; } h += esc(c); });
    return h + (dans ? '</mark>' : '');
  }
  const foinDe = (titre, type, catId) => plier(titre + ' ' + (type === 'tache' || type === 'habitude' || type === 'objectif' ? cat(catId).nom : JOMO[type].nom));
  const filtresOk = (type, catId) => (!U.loupe.types.length || U.loupe.types.includes(type))
    && (!U.loupe.cats.length || (!JOMO[type] && U.loupe.cats.includes(cat(catId).id)));
  function prochaine(el, depuis) {
    if (!el.rep) return el.date >= depuis ? occ(el, el.date) : null;
    let k = el.date > depuis ? el.date : depuis;
    for (let i = 0; i < HORIZON_LOUPE; i++, k = decaler(k, 1)) { if (el.rep.jusqua && k > el.rep.jusqua) return null; if (tombe(el, k)) return occ(el, k); }
    return null;
  }
  function precedente(el, avant) {
    if (!el.rep) return el.date < avant ? occ(el, el.date) : null;
    let k = decaler(el.rep.jusqua && el.rep.jusqua < avant ? decaler(el.rep.jusqua, 1) : avant, -1);
    for (let i = 0; i < HORIZON_LOUPE && k >= el.date; i++, k = decaler(k, -1)) if (tombe(el, k)) return occ(el, k);
    return null;
  }
  function sansDoublon(liste) {
    const vu = new Set();
    return liste.filter(o => { if (!o.el.rep) return true; const c = plier(o.el.titre) + '|' + o.el.type + '|' + o.el.cat + '|' + o.el.rep.freq; if (vu.has(c)) return false; vu.add(c); return true; });
  }
  function chercher() {
    const L = U.loupe, mots = motsDe(L.q), auj = aujourdhui();
    if (!mots.length && !L.types.length && !L.cats.length) return null;
    const ok = (titre, type, catId) => filtresOk(type, catId) && mots.every(m => foinDe(titre, type, catId).includes(m));
    const avenir = [], passe = [];
    S.elements.forEach(el => {
      if (!ok(el.titre, el.type, el.cat)) return;
      const a = prochaine(el, auj), p = precedente(el, auj);
      if (a) avenir.push(a);
      if (p) passe.push(p);
    });
    avenir.sort((a, b) => a.k.localeCompare(b.k) || ordre(a, b));
    passe.sort((a, b) => b.k.localeCompare(a.k) || ordre(b, a));
    return { mots, avenir: sansDoublon(avenir), passe: sansDoublon(passe),
      habitudes: habitudesActives().filter(h => ok(h.titre, 'habitude', h.cat)), objectifs: S.objectifs.filter(o => ok(o.titre, 'objectif', o.cat)) };
  }
  const dateCourte = k => {
    const auj = aujourdhui();
    if (k === auj) return "Aujourd'hui"; if (k === decaler(auj, 1)) return 'Demain'; if (k === decaler(auj, -1)) return 'Hier';
    return cap(fmt(k, k.slice(0, 4) === auj.slice(0, 4) ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }));
  };
  function ligneLoupe(o, mots) {
    const el = o.el, l = look(el);
    return `<div class="carte ligne${o.fait ? ' faite' : ''}" role="listitem">
      <span class="tuile petite" style="--c:${l.couleur}" aria-hidden="true">${l.icone}</span>
      <button type="button" class="ouvrir" data-lp-ouvrir="${o.cle}" data-focus="lo${o.cle}" aria-label="${esc(jourLong(o.k))}, ${esc(description(o))}">
        <span class="quoi" aria-hidden="true"><b>${surligner(el.titre, mots)}</b><small>${esc(dateCourte(o.k))} · ${plage(el)} · ${esc(l.nom)}${el.rep ? ' · ' + REPET[el.rep.freq] : ''}${el.type === 'tache' && !o.fait && o.k < aujourdhui() ? ' · pas faite' : ''}</small></span>${ptsElement(o)}</button>
      ${el.type === 'tache' ? rondCoche(o.cle, o.fait, `${el.titre}, ${jourLong(o.k)} : ${o.fait ? 'faite' : 'à faire'}`, 'data-lp-cocher') : ''}</div>`;
  }
  let minuteurCompte;
  function renderLoupe(focus, garder) {
    const L = U.loupe;
    L.cats = L.cats.filter(id => S.categories.some(c => c.id === id));
    $('#lp-filtres').innerHTML = [['tache', 'Tâches'], ['habitude', 'Habitudes'], ['objectif', 'Objectifs'], ['libre', '🌿 Pour moi'], ['sansecran', '📵 Sans écran']]
      .map(([t, n]) => `<button type="button" class="filtre" data-lp-type="${t}" aria-pressed="${L.types.includes(t)}" data-focus="lt${t}">${n}</button>`).join('')
      + S.categories.map(c => `<button type="button" class="filtre" data-lp-cat="${esc(c.id)}" aria-pressed="${L.cats.includes(c.id)}" data-focus="lf${esc(c.id)}">${c.icone} ${esc(c.nom)}</button>`).join('');
    $('.lp-effacer').hidden = !L.q;
    const r = chercher(), filtres = L.types.length + L.cats.length;
    const n = r ? r.avenir.length + r.passe.length + r.habitudes.length + r.objectifs.length : 0;
    const section = (id, nom, liste, ligne) => {
      if (!liste.length) return '';
      const max = L.max[id] || PAR_PAGE;
      return `<section data-section="${id}" aria-label="${nom}"><h3><span>${nom}</span> <span>${liste.length}</span></h3><div class="lignes" role="list">${liste.slice(0, max).map(x => ligne(x, r.mots)).join('')}</div>
        ${liste.length > max ? `<button type="button" class="bouton secondaire petit" style="margin-top:10px" data-lp-plus="${id}" data-focus="lp${id}">Afficher ${Math.min(PAR_PAGE, liste.length - max)} de plus</button>` : ''}</section>`;
    };
    const ligneHab = (h, mots) => `<div class="carte ligne" role="listitem"><span class="tuile petite" style="--c:${cat(h.cat).couleur}" aria-hidden="true">${cat(h.cat).icone}</span>
      <button type="button" class="ouvrir" data-lp-hab="${h.id}" data-focus="lh${h.id}" aria-label="${esc(h.titre)}, habitude, ${joursTexte(h).toLowerCase()} : ouvrir"><span class="quoi" aria-hidden="true"><b>${surligner(h.titre, mots)}</b><small>Habitude · ${joursTexte(h)} · 🔥 ${serieHabitude(h)} j</small></span></button></div>`;
    const ligneObj = (ob, mots) => { const a = avancement(ob); return `<div class="carte ligne" role="listitem"><span class="tuile petite" style="--c:${cat(ob.cat).couleur}" aria-hidden="true">${cat(ob.cat).icone}</span>
      <button type="button" class="ouvrir" data-lp-obj="${ob.id}" data-focus="lob${ob.id}" aria-label="${esc(ob.titre)}, objectif, ${a.pc} % : ouvrir"><span class="quoi" aria-hidden="true"><b>${surligner(ob.titre, mots)}</b><small>Objectif · ${a.pc} %${ob.atteintLe ? ' · atteint' : ''}</small></span></button></div>`; };
    const zone = $('#lp-resultats'), haut = zone.scrollTop;
    zone.innerHTML = !r ? '<p class="vide">Cherche une tâche, une habitude ou un objectif par son nom ou sa catégorie. Les filtres se combinent avec la recherche.</p>'
      : n ? section('avenir', 'À venir', r.avenir, ligneLoupe) + section('habitudes', 'Habitudes', r.habitudes, ligneHab) + section('objectifs', 'Objectifs', r.objectifs, ligneObj) + section('passe', 'Passé', r.passe, ligneLoupe)
      : `<div class="vide"><p>${L.q.trim() ? `Rien ne correspond à « ${esc(L.q.trim())} »` : 'Rien ne correspond'}${filtres ? ' avec ces filtres' : ''}.</p>${filtres ? '<button type="button" class="bouton secondaire petit" style="margin-top:12px" data-lp="tout" data-focus="lp-tout">Retirer les filtres</button>' : ''}</div>`;
    zone.scrollTop = garder ? haut : 0;
    clearTimeout(minuteurCompte);
    minuteurCompte = setTimeout(() => { $('#lp-compte').textContent = !r ? '' : n ? pluriel(n, 'résultat') : 'Aucun résultat'; }, 700);
    if (focus) { const c = LP.querySelector(`[data-focus="${CSS.escape(focus)}"]`) || LP.querySelector('#lp-resultats .ouvrir') || LPQ; c.focus({ preventScroll: garder }); }
  }
  function ouvrirLoupe() {
    if (LP.open) return;
    $('#lp-msg').textContent = ''; $('#lp-compte').textContent = '';
    LPQ.value = U.loupe.q;
    $('.lp-icone').innerHTML = ICONE.loupe; $('.lp-effacer').innerHTML = ICONE.effacer;
    renderLoupe();
    LP.showModal();
    LPQ.focus();
    if (LPQ.value) LPQ.select();
  }
  const basculerDans = (liste, v) => { const i = liste.indexOf(v); if (i < 0) liste.push(v); else liste.splice(i, 1); };
  LPQ.addEventListener('input', () => { U.loupe.q = LPQ.value; U.loupe.max = {}; $('#lp-msg').textContent = ''; renderLoupe(); });
  $('#form-loupe').addEventListener('submit', e => { e.preventDefault(); LPQ.blur(); });
  LPQ.addEventListener('keydown', e => { if (e.key === 'Escape' && LPQ.value) { e.preventDefault(); e.stopPropagation(); LPQ.value = ''; U.loupe.q = ''; renderLoupe(); } });
  $('#lp-resultats').addEventListener('touchmove', () => { if (document.activeElement === LPQ) LPQ.blur(); }, { passive: true });
  LP.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.lp === 'fermer') { LP.close(); return; }
    if (d.lp === 'effacer') { LPQ.value = ''; U.loupe.q = ''; U.loupe.max = {}; renderLoupe(); LPQ.focus(); return; }
    if (d.lp === 'tout') { U.loupe.types = []; U.loupe.cats = []; U.loupe.max = {}; renderLoupe(); LPQ.focus(); return; }
    if (d.lpType) { basculerDans(U.loupe.types, d.lpType); U.loupe.max = {}; renderLoupe('lt' + d.lpType); return; }
    if (d.lpCat) { basculerDans(U.loupe.cats, d.lpCat); U.loupe.max = {}; renderLoupe('lf' + d.lpCat); return; }
    if (d.lpPlus) { const avant = U.loupe.max[d.lpPlus] || PAR_PAGE; U.loupe.max[d.lpPlus] = avant + PAR_PAGE; renderLoupe(null, true); const l = LP.querySelectorAll(`[data-section="${d.lpPlus}"] .ouvrir`)[avant]; if (l) l.focus(); return; }
    if (d.lpCocher) {
      const o = trouver(d.lpCocher);
      if (!o || o.el.type !== 'tache') return;
      const msg = basculerTache(o);
      sauver(); render();
      $('#lp-msg').textContent = msg;
      renderLoupe('lp-cocher' + o.cle, true);
      const c = LP.querySelector(`[data-lp-cocher="${CSS.escape(o.cle)}"]`); if (c) c.focus();
      feliciter();
      return;
    }
    if (d.lpOuvrir) { const o = trouver(d.lpOuvrir); if (!o) return; U.loupe.retour = 'lo' + o.cle; ouvrirTache(o); return; }
    if (d.lpHab) { const h = S.habitudes.find(x => x.id === d.lpHab); if (h) { U.loupe.retour = 'lh' + h.id; ouvrirHabitude(h); } return; }
    if (d.lpObj) { const ob = S.objectifs.find(x => x.id === d.lpObj); if (ob) { U.loupe.retour = 'lob' + ob.id; ouvrirObjectif(ob); } }
  });
  [TD, HD, OD].forEach(f => f.addEventListener('close', () => { if (LP.open) setTimeout(() => renderLoupe(U.loupe.retour, true), 0); }));
