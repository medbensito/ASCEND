# ASCEND

Make everyday matter.

ASCEND est l'app de développement personnel et de JOMO (Joy of Missing Out) de Mehdi : un calendrier à plages horaires,
des habitudes avec leur série, des objectifs à long terme, un minuteur de concentration, des points par catégorie et
un emblème qui évolue. Pensée pour l'iPhone : c'est une app web à installer sur l'écran d'accueil depuis Safari
(Partager › Sur l'écran d'accueil). Les données restent sur l'appareil.

- Adresse : https://medbensito.github.io/ascend/
- Construction : `sh build.sh` assemble `src/page.html`, `src/css/*.css` et `src/js/*.js` en un seul `index.html`.
- Hors ligne : `sw.js` (changer le nom du cache `ascend-N` à chaque version).
- Rappels et sauvegarde automatique chiffrée : le service Cloudflare de Guts (dépôt `medbensito/guts`, dossier `rappels/`),
  dont l'adresse est dans `rappels.json`.
- Verrou Face ID : une clé d'accès (WebAuthn) propre à ASCEND ; ses réglages restent sur l'appareil (`ascend-verrou`).

## Règles
- Une tâche faite rapporte les points de sa catégorie, si elle a été prévue avant son début.
- Habitude faite : les points de sa catégorie. Série : jours d'affilée où toutes les habitudes prévues sont faites.
- Objectif à long terme : étapes et tâches liées ; étape franchie = points de la catégorie ; objectif atteint = bonus de 5 fois.
- JOMO : temps pour moi resté libre +30, moment sans écran tenu +40, plafond d'heures de tâches par jour (9 h par défaut).
- Paliers de l'emblème : Éclat 0, Cristal 500, Étoile 1 500, Constellation 4 000, Nova 10 000.
