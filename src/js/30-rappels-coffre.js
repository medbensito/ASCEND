  // ---------- Rappels (notifications) ----------
  // ASCEND calcule ses rappels des 14 prochains jours et les confie au service (Worker Cloudflare de Guts, partagé),
  // qui les envoie à l'heure par Web Push. L'adresse du service est dans rappels.json.
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installee = () => navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const pushPossible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const versOctets = c => { const b = atob(c.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((c.length + 3) % 4)); return Uint8Array.from(b, x => x.charCodeAt(0)); };
  async function serviceRappels() {
    if (RAP.service !== undefined) return RAP.service;
    try {
      const r = await fetch('rappels.json', { cache: 'no-store' });
      const d = r.ok ? await r.json() : null;
      RAP.service = d && /^https?:\/\//.test(d.url || '') ? d.url.replace(/\/+$/, '') : null;
    } catch (e) { RAP.service = S.rappels.service || null; }
    if (RAP.service && RAP.service !== S.rappels.service) { S.rappels.service = RAP.service; ecrire(); }
    return RAP.service;
  }
  async function cleVapid() {
    if (RAP.cle) return RAP.cle;
    const url = await serviceRappels();
    if (!url) return null;
    try { RAP.cle = (await (await fetch(url + '/cle')).json()).cle; } catch (e) { return null; }
    return RAP.cle;
  }
  async function preparerRappels() {
    await serviceRappels();
    majCoffreUI();
    if (!pushPossible()) return;
    await cleVapid();
    majRappelsUI();
  }
  const enTete = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.rappels.jeton });
  async function activerRappels() {
    let perm;
    try { perm = await Notification.requestPermission(); } catch (e) { perm = 'denied'; }
    if (perm !== 'granted') { S.rappels.erreur = 'refuse'; ecrire(); majRappelsUI(); return; }
    try {
      const cle = RAP.cle || await cleVapid();
      if (!cle) throw new Error('service');
      const reg = await navigator.serviceWorker.ready;
      const abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) });
      const r = await fetch(RAP.service + '/abonner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ abonnement: abo.toJSON() }) });
      if (!r.ok) throw new Error('abonner');
      Object.assign(S.rappels, { jeton: (await r.json()).jeton, actif: true, erreur: null, signature: null });
      ecrire();
      await synchroniser(true);
      majRappelsUI('Rappels activés. Essaie « Envoyer un essai ».', '[data-rap="essai"]');
    } catch (e) { S.rappels.erreur = 'reseau'; ecrire(); majRappelsUI(); }
  }
  async function abonnementActuel(neuf) {
    try {
      const reg = await navigator.serviceWorker.ready;
      let abo = await reg.pushManager.getSubscription();
      if (abo && neuf) { try { await abo.unsubscribe(); } catch (e) { /* déjà mort */ } abo = null; }
      if (!abo && Notification.permission === 'granted') {
        const cle = await cleVapid();
        if (cle) abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) });
      }
      return abo ? abo.toJSON() : null;
    } catch (e) { return null; }
  }
  async function reinscrire() {
    const abo = await abonnementActuel();
    if (!abo) { S.rappels.erreur = 'perdu'; ecrire(); return false; }
    const r = await fetch(RAP.service + '/abonner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ abonnement: abo }) });
    if (!r.ok) return false;
    S.rappels.jeton = (await r.json()).jeton;
    ecrire();
    return true;
  }
  function texteMatin(k) {
    const occs = duJour(k);
    const t = occs.filter(o => o.el.type === 'tache' && !o.fait).length;
    const h = S.habitudes.filter(x => habitudeDue(x, k)).length;
    const parts = [];
    if (t) parts.push(pluriel(t, 'tâche') + " aujourd'hui");
    if (h) parts.push(pluriel(h, 'habitude'));
    if (occs.some(o => o.el.type !== 'tache')) parts.push('un moment pour toi');
    const m = minutesPrevues(k);
    if (m > S.reglages.plafond) parts.push(`journée chargée (${duree(m)})`);
    return parts.length ? cap(parts.join(' · ')) + '.' : '';
  }
  function calculerRappels() {
    const R = S.rappels, auj = aujourdhui(), debutJour = parse(auj).getTime(), res = [];
    for (let i = 0; i < CONFIG.rappels.horizon; i++) {
      const k = decaler(auj, i), occs = duJour(k);
      if (R.avant) occs.forEach(o => {
        if (o.el.type === 'libre' || (o.el.type === 'tache' && o.fait)) return;
        const at = debutOcc(o) - R.delai * 6e4;
        const quoi = o.el.type === 'sansecran' ? '📵 Moment sans écran' : `${cat(o.el.cat).icone} ${cat(o.el.cat).nom} · +${valeur(o.el)} pts`;
        if (at >= debutJour) res.push({ at, titre: o.el.titre, corps: `${R.delai >= 60 ? 'Dans 1 h' : 'Dans ' + R.delai + ' min'} · ${plage(o.el)} · ${quoi}`, tag: o.cle });
      });
      if (R.matin) {
        const at = parse(k).getTime() + R.heureMatin * 6e4, c = at >= debutJour && texteMatin(k);
        if (c) res.push({ at, titre: `Bonjour ${S.profil.prenom || ''} 👋`.trim(), corps: c, tag: 'matin-' + k });
      }
    }
    // Fin de la session de concentration en cours
    const M = S.minuteur;
    if (M && M.fin && M.reste == null && M.fin > Date.now()) res.push({ at: M.fin, titre: M.phase === 'travail' ? 'Session terminée ⏱️' : 'Pause terminée', corps: M.phase === 'travail' ? `${S.reglages.travail} min de concentration. Prends ta pause.` : 'On reprend ?', tag: 'minuteur' });
    if (R.sauvegarde && (S.elements.length || S.habitudes.length)) {
      const der = derniereCopie() ? dk(new Date(derniereCopie())) : (S.depuis || auj);
      let k = decaler(der, 7);
      if (k <= auj) k = minNow() < CONFIG.rappels.heureSauvegarde ? auj : decaler(auj, 1);
      for (; k < decaler(auj, CONFIG.rappels.horizon); k = decaler(k, 7)) {
        res.push({ at: parse(k).getTime() + CONFIG.rappels.heureSauvegarde * 6e4, titre: 'Pense à sauvegarder ASCEND',
          corps: `${derniereCopie() ? `Ta dernière sauvegarde date de ${ecart(der, k)} jours.` : 'Tes données ne sont que sur ce téléphone.'} Profil › Sauvegarde.`, tag: 'sauvegarde-' + k });
      }
    }
    return res.sort((a, b) => a.at - b.at || a.tag.localeCompare(b.tag));
  }
  const empreinte = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length; };
  function planifierSynchro() {
    if (!S.rappels || !S.rappels.actif) return;
    clearTimeout(RAP.minuteur);
    RAP.minuteur = setTimeout(() => synchroniser(), 2500);
  }
  async function synchroniser(forcer) {
    const R = S.rappels;
    if (!R.actif || !R.jeton || RAP.enCours) return;
    const url = await serviceRappels();
    if (!url) return;
    const liste = calculerRappels();
    const sig = empreinte(JSON.stringify(liste));
    if (!forcer && sig === R.signature && R.majLe && Date.now() - R.majLe < 12 * 3600e3) return;
    RAP.enCours = true;
    try {
      const corps = { rappels: liste };
      if (RAP.reabonner) corps.abonnement = RAP.reabonner;
      const r = await fetch(url + '/rappels', { method: 'PUT', headers: enTete(), body: JSON.stringify(corps) });
      if (r.status === 401) { RAP.enCours = false; if (await reinscrire()) return synchroniser(true); return; }
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      if (d.expire && !RAP.reabonner) {
        RAP.reabonner = await abonnementActuel(true);
        RAP.enCours = false;
        if (RAP.reabonner) return synchroniser(true);
        R.erreur = 'perdu'; ecrire(); return;
      }
      RAP.reabonner = null;
      Object.assign(R, { signature: sig, majLe: Date.now(), erreur: null, nombre: liste.filter(x => x.at > Date.now()).length });
      ecrire();
    } catch (e) { R.erreur = 'reseau'; ecrire(); }
    finally { RAP.enCours = false; majRappelsUI(); }
  }
  async function essaiRappels() {
    majRappelsUI('Envoi de l\'essai…', '[data-rap="essai"]');
    try {
      await synchroniser(true);
      const d = await (await fetch(RAP.service + '/essai', { method: 'POST', headers: enTete(), body: JSON.stringify({ titre: 'ASCEND', corps: 'Les rappels marchent. Make everyday matter. ✨' }) })).json();
      majRappelsUI(d.ok ? 'Essai envoyé : regarde ton téléphone.' : 'L\'essai n\'est pas passé. Coupe puis réactive les rappels.', '[data-rap="essai"]');
    } catch (e) { majRappelsUI('Le service de rappels ne répond pas.', '[data-rap="essai"]'); }
  }
  async function couperRappels() {
    const R = S.rappels;
    try { if (R.jeton && RAP.service) await fetch(RAP.service + '/abonner', { method: 'DELETE', headers: enTete() }); } catch (e) { /* oublié de lui-même */ }
    try { const abo = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); if (abo) await abo.unsubscribe(); } catch (e) { /* rien à défaire */ }
    Object.assign(R, { actif: false, jeton: null, signature: null, majLe: null, erreur: null });
    ecrire();
    majRappelsUI('Rappels coupés.', '[data-rap="activer"]');
  }
  function statutRappels() {
    const R = S.rappels;
    if (R.erreur === 'reseau') return 'Dernière mise à jour impossible : le service ne répond pas. ASCEND réessaiera.';
    if (R.erreur === 'perdu') return 'Le téléphone a perdu l\'autorisation. Coupe puis réactive les rappels.';
    if (!R.majLe) return 'Rappels actifs.';
    return `Rappels actifs · ${R.nombre || 0} à venir · mis à jour à ${new Date(R.majLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`;
  }
  function htmlRappels(msg) {
    const R = S.rappels;
    let h = '<legend>Rappels</legend>';
    if (!pushPossible() || (IOS && !installee())) return h + `<p class="note">${IOS && !installee() ? "Pour recevoir des rappels, ouvre ASCEND depuis son icône sur l'écran d'accueil (dans Safari : Partager › Sur l'écran d'accueil)." : 'Ce navigateur ne peut pas recevoir de rappels.'}</p>`;
    if (RAP.service === null) return h + '<p class="note">Le service de rappels n\'est pas encore en place.</p>';
    if (!R.actif) {
      const texte = R.erreur === 'refuse' ? 'Les notifications sont bloquées pour ASCEND. Autorise-les dans Réglages de l\'iPhone › Notifications › ASCEND, puis réessaie.'
        : R.erreur === 'reseau' ? 'Le service de rappels ne répond pas. Vérifie ta connexion et réessaie.'
        : 'ASCEND te prévient avant tes tâches, le matin, à la fin d\'une session de concentration et quand il est temps de sauvegarder.';
      return h + `<p class="note">${esc(msg || texte)}</p><button type="button" class="bouton" data-rap="activer"${RAP.service === undefined ? ' disabled' : ''}>Activer les rappels</button>`;
    }
    const heures = []; for (let m = 6 * 60; m <= 10 * 60; m += 30) heures.push(m);
    return h + `<div class="groupe">
        <label class="rang"><span>Avant les tâches</span><span class="interrupteur"><input type="checkbox" role="switch" data-rap-opt="avant"${R.avant ? ' checked' : ''}><i></i></span></label>
        ${R.avant ? `<label class="rang"><span>Combien avant</span><select data-rap-opt="delai">${[5, 10, 15, 30, 60].map(m => `<option value="${m}"${m === R.delai ? ' selected' : ''}>${m === 60 ? '1 h' : m + ' min'}</option>`).join('')}</select></label>` : ''}
        <label class="rang"><span>Le matin</span><span class="interrupteur"><input type="checkbox" role="switch" data-rap-opt="matin"${R.matin ? ' checked' : ''}><i></i></span></label>
        ${R.matin ? `<label class="rang"><span>À quelle heure</span><select data-rap-opt="heureMatin">${heures.map(m => `<option value="${m}"${m === R.heureMatin ? ' selected' : ''}>${hhmm(m)}</option>`).join('')}</select></label>` : ''}
        <label class="rang"><span>Sauvegarde (chaque semaine)</span><span class="interrupteur"><input type="checkbox" role="switch" data-rap-opt="sauvegarde"${R.sauvegarde ? ' checked' : ''}><i></i></span></label>
      </div>
      <p class="note" role="status">${esc(msg || statutRappels())}</p>
      <div class="boutons deux"><button type="button" class="bouton secondaire petit" data-rap="essai">Envoyer un essai</button>
        <button type="button" class="bouton danger petit" data-rap="couper">Couper</button></div>`;
  }
  function majRappelsUI(msg, focus) {
    const f = document.getElementById('r-rappels');
    if (!f || !PD.open) return;
    const a = document.activeElement && f.contains(document.activeElement) ? (document.activeElement.dataset.rap ? `[data-rap="${document.activeElement.dataset.rap}"]` : document.activeElement.dataset.rapOpt ? `[data-rap-opt="${document.activeElement.dataset.rapOpt}"]` : null) : null;
    f.innerHTML = htmlRappels(msg);
    const c = (focus && f.querySelector(focus)) || (a && f.querySelector(a));
    if (c) c.focus();
  }
  PD.addEventListener('click', e => {
    const b = e.target.closest('[data-rap]');
    if (!b || b.disabled) return;
    if (b.dataset.rap === 'activer') activerRappels();
    if (b.dataset.rap === 'essai') essaiRappels();
    if (b.dataset.rap === 'couper') couperRappels();
  });
  PD.addEventListener('change', e => {
    const o = e.target.dataset && e.target.dataset.rapOpt;
    if (!o) return;
    S.rappels[o] = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
    ecrire(); majRappelsUI(); synchroniser(true);
  });

  // ---------- Sauvegarde automatique chiffrée (coffre) ----------
  // Chiffrée sur l'appareil (AES-GCM, clé tirée du code de récupération par PBKDF2), déposée sur le service, 7 jours gardés.
  const CLE_CODE = 'ascend-coffre-code';
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const lireCode = () => { try { return localStorage.getItem(CLE_CODE) || ''; } catch (e) { return ''; } };
  const garderCode = c => { try { if (c) localStorage.setItem(CLE_CODE, c); else localStorage.removeItem(CLE_CODE); } catch (e) { /* indisponible */ } };
  const nouveauCode = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), b => ALPHABET[b & 31]).join('');
  const normaliser = t => String(t || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V').replace(/[^0-9A-Z]/g, '');
  const formater = c => c.replace(/(.{4})(?=.)/g, '$1-');
  const codeValide = c => c.length === 20 && [...c].every(x => ALPHABET.includes(x));
  async function sha256hex(t) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))); return Array.from(h, b => b.toString(16).padStart(2, '0')).join(''); }
  const idCoffre = c => sha256hex('ascend-coffre-id:' + c);
  const jetonCoffre = c => sha256hex('ascend-coffre-ecriture:' + c);
  const enB64 = u8 => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); };
  const deB64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  async function cleCoffre(code, sel, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const fluxVers = async (u8, t) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(t)).arrayBuffer());
  async function chiffrerCoffre(code, texte) {
    let brut = new TextEncoder().encode(texte), gz = false;
    if (window.CompressionStream) { brut = await fluxVers(brut, new CompressionStream('gzip')); gz = true; }
    const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cleCoffre(code, sel, COF.iter), brut));
    return { v: 1, gz, iter: COF.iter, sel: enB64(sel), iv: enB64(iv), donnees: enB64(ct), le: Date.now() };
  }
  async function dechiffrerCoffre(code, b) {
    let brut = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(b.iv) }, await cleCoffre(code, deB64(b.sel), b.iter || COF.iter), deB64(b.donnees)));
    if (b.gz) brut = await fluxVers(brut, new DecompressionStream('gzip'));
    return JSON.parse(new TextDecoder().decode(brut));
  }
  const texteCopie = () => JSON.stringify(Object.assign({}, S, { rappels: undefined, coffre: undefined, minuteur: undefined }));
  const derniereCopie = () => Math.max(S.derniereExport ? Date.parse(S.derniereExport) || 0 : 0, (S.coffre && S.coffre.derniere) || 0);
  function appliquerRestauration(d) {
    const rap = S.rappels, cof = S.coffre, min = S.minuteur;
    S = Object.assign(vide(), d);
    S.rappels = rap; S.coffre = cof; S.minuteur = min;
    nettoyer();
    U.onglet = 'accueil';
  }
  function planifierCoffre() {
    const C = S.coffre;
    if (!C || !C.actif) return;
    clearTimeout(COF.minuteur);
    COF.minuteur = setTimeout(() => envoyerCoffre(), Math.max(20000, (C.envoiLe || 0) + 10 * 60000 - Date.now()));
  }
  async function envoyerCoffre(forcer) {
    const C = S.coffre, code = lireCode();
    if (!C.actif || !code || COF.enCours) return false;
    const url = await serviceRappels();
    if (!url) return false;
    const texte = texteCopie(), sig = empreinte(texte);
    if (!forcer && sig === C.signature) return true;
    COF.enCours = true;
    try {
      const corps = await chiffrerCoffre(code, texte);
      const r = await fetch(`${url}/coffre/${await idCoffre(code)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await jetonCoffre(code) }, body: JSON.stringify(corps) });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      Object.assign(C, { signature: sig, derniere: Date.now(), envoiLe: Date.now(), jours: d.jours || [], erreur: null });
      ecrire();
      return true;
    } catch (e) { Object.assign(C, { erreur: 'reseau', envoiLe: Date.now() }); ecrire(); return false; }
    finally { COF.enCours = false; majCoffreUI(); }
  }
  const dateLongue = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  function statutCoffre() {
    const C = S.coffre;
    if (C.erreur === 'reseau') return 'Dernière copie impossible : le service ne répond pas. ASCEND réessaiera.';
    if (!C.derniere) return 'Sauvegarde automatique active.';
    const d = new Date(C.derniere), q = dk(d) === aujourdhui() ? "aujourd'hui" : dk(d) === decaler(aujourdhui(), -1) ? 'hier' : 'le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const n = (C.jours || []).length;
    return `Sauvegarde automatique active · dernière copie ${q} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${n ? ` · ${pluriel(n, 'jour')} gardé${n > 1 ? 's' : ''}` : ''}.`;
  }
  function htmlCoffre(msg) {
    const C = S.coffre, der = derniereCopie(), attente = RAP.service === undefined ? ' disabled' : '';
    let h = '<legend>Sauvegarde</legend>';
    if (RAP.service === null) h += '<p class="note">La sauvegarde automatique a besoin du service de rappels, pas encore en place.</p>';
    else if (!C.actif) h += `<p class="note">${esc(msg || 'ASCEND peut garder tout seul une copie chiffrée de tes données, chaque jour. Toi seul pourras la relire, avec ton code de récupération.')}</p>
      <div class="boutons"><button type="button" class="bouton" data-cf-ouvrir="nouveau"${attente}>Activer la sauvegarde automatique</button>
        <button type="button" class="bouton secondaire petit" data-cf-ouvrir="restaurer"${attente}>Restaurer avec un code</button></div>`;
    else h += `<p class="note" role="status"><b>${esc(msg || statutCoffre())}</b></p>
      <div class="boutons deux"><button type="button" class="bouton petit" data-cf-action="maintenant">Sauvegarder</button>
        <button type="button" class="bouton secondaire petit" data-cf-ouvrir="voir">Mon code</button></div>
      <div style="display:flex;justify-content:space-between"><button type="button" class="lien" data-cf-ouvrir="restaurer">Restaurer une sauvegarde</button>
        <button type="button" class="lien danger" data-cf-action="arreter">Arrêter</button></div>`;
    return h + `<p class="note" style="margin-top:6px">Dans un fichier (Fichiers, iCloud Drive) : ${der ? 'dernière sauvegarde le ' + dateLongue(der) + '.' : 'aucune sauvegarde pour l\'instant.'}</p>
      <div class="boutons deux"><button type="button" class="bouton secondaire petit" data-r="exporter">Exporter</button>
        <button type="button" class="bouton secondaire petit" data-r="importer">Importer</button></div>`;
  }
  function majCoffreUI(msg, focus) {
    const f = document.getElementById('r-coffre');
    if (!f || !PD.open) return;
    const a = document.activeElement && f.contains(document.activeElement) ? document.activeElement : null;
    const sel = a && (a.dataset.cfOuvrir ? `[data-cf-ouvrir="${a.dataset.cfOuvrir}"]` : a.dataset.cfAction ? `[data-cf-action="${a.dataset.cfAction}"]` : a.dataset.r ? `[data-r="${a.dataset.r}"]` : null);
    f.innerHTML = htmlCoffre(msg);
    const c = (focus && f.querySelector(focus)) || (sel && f.querySelector(sel));
    if (c) c.focus();
  }
  const CF = $('#coffre');
  const libJour = j => jourLong(j) + (j === aujourdhui() ? " (aujourd'hui)" : '');
  function ouvrirCoffre(mode) {
    U.coffre = { mode, code: mode === 'nouveau' ? nouveauCode() : lireCode(), jours: null, saisi: '' };
    CF.querySelector('[data-cf="fermer"]').innerHTML = ICONE.croix;
    renderCoffre();
    CF.showModal();
    const f = CF.querySelector(mode === 'restaurer' ? '#cf-code' : '[data-cf="copier"]');
    if (f) f.focus();
  }
  function renderCoffre(msg) {
    const c = U.coffre;
    $('#cf-titre').textContent = c.mode === 'restaurer' ? 'Restaurer' : 'Ton code';
    $('#cf-msg').textContent = msg || '';
    let h;
    if (c.mode === 'restaurer') {
      h = `<p class="note">Entre ton code de récupération pour retrouver tes sauvegardes. Ce que tu restaures remplacera ce qu'il y a sur ce téléphone.</p>
        <div class="champ-nom"><label class="masque" for="cf-code">Code de récupération</label>
        <input class="champ-code" id="cf-code" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" value="${esc(c.saisi)}"></div>
        <button type="button" class="bouton${c.jours ? ' secondaire' : ''}" data-cf="chercher">Chercher mes sauvegardes</button>
        ${c.jours ? `<fieldset><legend>Sauvegardes disponibles</legend><div class="groupe liste-radios">${c.jours.map((j, i) => `<label><input type="radio" name="cf-jour" value="${j}"${i === 0 ? ' checked' : ''}>${esc(libJour(j))}</label>`).join('')}</div></fieldset>
        <button type="button" class="bouton" data-cf="restaurer">Restaurer</button>` : ''}`;
    } else {
      const nouveau = c.mode === 'nouveau';
      h = `<p class="note">${nouveau ? 'Voici ton code de récupération. Garde-le en lieu sûr : dans tes Notes, ton gestionnaire de mots de passe ou sur papier. Il sert à relire tes sauvegardes, par exemple sur un nouveau téléphone. Sans lui, personne ne peut les relire, pas même toi.' : 'Ton code de récupération. Il sert à relire tes sauvegardes sur un autre appareil.'}</p>
        <p class="code-coffre" id="code-coffre">${formater(c.code)}</p>
        <button type="button" class="bouton secondaire" data-cf="copier">Copier le code</button>
        ${nouveau ? `<div class="groupe"><label class="rang"><span>J'ai gardé mon code en lieu sûr</span><span class="interrupteur"><input type="checkbox" id="cf-note" role="switch"><i></i></span></label></div>
        <button type="button" class="bouton" data-cf="activer" disabled>Activer la sauvegarde</button>` : ''}`;
    }
    $('#cf-corps').innerHTML = h;
  }
  CF.addEventListener('change', e => { if (e.target.id === 'cf-note') CF.querySelector('[data-cf="activer"]').disabled = !e.target.checked; });
  CF.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cf-code') { e.preventDefault(); CF.querySelector('[data-cf="chercher"]').click(); } });
  CF.addEventListener('click', async e => {
    const b = e.target.closest('[data-cf]');
    if (!b || b.disabled) return;
    const c = U.coffre, a = b.dataset.cf;
    if (a === 'fermer') { CF.close(); return; }
    if (a === 'copier') {
      try { await navigator.clipboard.writeText(formater(c.code)); $('#cf-msg').textContent = 'Code copié.'; }
      catch (err) { $('#cf-msg').textContent = 'Copie impossible : sélectionne le code et copie-le.'; }
      return;
    }
    if (a === 'activer') {
      garderCode(c.code);
      S.coffre = Object.assign(coffreVide(), { actif: true });
      ecrire();
      CF.close();
      majCoffreUI('Première copie en cours…');
      const fait = await envoyerCoffre(true);
      majCoffreUI(fait ? 'Sauvegarde automatique active. Première copie faite.' : null, '[data-cf-action="maintenant"]');
      return;
    }
    if (a === 'chercher') {
      c.saisi = $('#cf-code').value;
      const code = normaliser(c.saisi);
      if (!codeValide(code)) { renderCoffre('Ce code n\'a pas le bon format : 20 lettres et chiffres, comme XXXX-XXXX-XXXX-XXXX-XXXX.'); $('#cf-code').focus(); return; }
      renderCoffre('Recherche…');
      try {
        const r = await fetch(`${await serviceRappels()}/coffre/${await idCoffre(code)}`);
        if (r.status === 404) { c.jours = null; renderCoffre('Aucune sauvegarde trouvée pour ce code.'); $('#cf-code').focus(); return; }
        if (!r.ok) throw new Error(r.status);
        c.jours = (await r.json()).jours || [];
        c.trouve = code;
        renderCoffre(`${pluriel(c.jours.length, 'sauvegarde')} trouvée${c.jours.length > 1 ? 's' : ''}.`);
        CF.querySelector('[data-cf="restaurer"]').focus();
      } catch (err) { renderCoffre('Le service ne répond pas. Réessaie dans un moment.'); }
      return;
    }
    if (a === 'restaurer') {
      const choix = CF.querySelector('input[name="cf-jour"]:checked');
      if (!choix || !c.trouve) return;
      let d;
      try {
        const r = await fetch(`${await serviceRappels()}/coffre/${await idCoffre(c.trouve)}/${choix.value}`);
        if (!r.ok) throw new Error(r.status);
        d = await dechiffrerCoffre(c.trouve, await r.json());
        if (!d || !Array.isArray(d.elements)) throw new Error('format');
      } catch (err) { renderCoffre('Impossible de relire cette sauvegarde avec ce code.'); return; }
      const ok = await demander('Restaurer cette sauvegarde ?', `${libJour(choix.value)} : ${pluriel(d.elements.length, 'élément')}, ${pluriel((d.habitudes || []).length, 'habitude')}, ${nombre(d.points || 0)} points. Elle remplacera ce qu'il y a sur ce téléphone.`,
        [{ texte: 'Restaurer', valeur: true }, { texte: 'Annuler', valeur: false, clair: true }]);
      if (!ok) return;
      appliquerRestauration(d);
      garderCode(c.trouve);
      S.coffre = Object.assign(coffreVide(), { actif: true, derniere: Date.now(), jours: c.jours, signature: empreinte(texteCopie()) });
      sauver();
      CF.close();
      renderProfil();
      render();
      dire('Sauvegarde restaurée.');
    }
  });
  PD.addEventListener('click', async e => {
    const o = e.target.closest('[data-cf-ouvrir]');
    if (o && !o.disabled) { ouvrirCoffre(o.dataset.cfOuvrir); return; }
    const b = e.target.closest('[data-cf-action]');
    if (!b) return;
    if (b.dataset.cfAction === 'maintenant') {
      majCoffreUI('Copie en cours…', '[data-cf-action="maintenant"]');
      const fait = await envoyerCoffre(true);
      majCoffreUI(fait ? null : 'La copie n\'est pas passée : le service ne répond pas.', '[data-cf-action="maintenant"]');
    }
    if (b.dataset.cfAction === 'arreter') {
      const choix = await demander('Arrêter la sauvegarde automatique ?', 'Les copies déjà faites restent sur le service, lisibles avec ton code. Tu peux aussi les effacer.',
        [{ texte: 'Arrêter', valeur: 'arreter' }, { texte: 'Arrêter et effacer les copies', valeur: 'effacer', danger: true }, { texte: 'Annuler', valeur: null, clair: true }]);
      if (!choix) return;
      const code = lireCode();
      if (choix === 'effacer' && code) {
        try { await fetch(`${await serviceRappels()}/coffre/${await idCoffre(code)}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + await jetonCoffre(code) } }); } catch (err) { /* gardées 7 jours au plus */ }
      }
      clearTimeout(COF.minuteur);
      garderCode('');
      S.coffre = coffreVide();
      ecrire();
      majCoffreUI(choix === 'effacer' ? 'Sauvegarde automatique arrêtée, copies effacées.' : 'Sauvegarde automatique arrêtée.', '[data-cf-ouvrir="nouveau"]');
    }
  });
