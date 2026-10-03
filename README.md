# Gomarché — supermarché en ligne à Goma

Boutique (React + Vite) et serveur (Express) dans un seul projet. Le serveur est la seule
source de vérité : comptes, rôles, prix, stocks, commandes, paiements et configuration y sont
stockés et contrôlés. Le navigateur ne décide de rien.

## Démarrer

```bash
npm install
cp .env.example .env      # puis renseignez les valeurs
npm run dev               # développement : http://localhost:3000
npm run build && npm start  # production
```

## Rôles

| Rôle | Espace | Ce qu'il fait |
| --- | --- | --- |
| Administrateur | Administration | Configuration, horaires, paiements, personnel, supervision des commandes |
| Agent préparateur | Préparation | Prend une commande payée, la prépare, la déclare prête ; remet les retraits en magasin |
| Agent caissier | Caisse | Vérifie les paiements Mobile Money, reçoit les espèces des livreurs, rembourse |
| Livreur | Espace livreur | Prend une course (premier arrivé), partage son GPS, remet avec le code du client |
| Agent de rayon | Catalogue | Produits, prix et stocks des rayons confiés |
| Client | Boutique | Commande, paie, suit son livreur, échange par message ou appel |

L'admin nomme un employé par son **adresse e-mail** (onglet « Personnel & accès »). Dès que
cette personne se connecte avec Google sur cette adresse — ou avec le mot de passe provisoire
posé par l'admin — son espace s'ouvre. Un rôle n'est jamais accordé à une adresse non prouvée.

Les administrateurs sont définis par `ADMIN_EMAILS` (connexion Google) ; `ADMIN_PASSWORD`
est un accès de secours facultatif.

## Cycle d'une commande

`en attente de paiement → confirmée → en préparation → prête → en route → livrée`

- Les prix, frais et stocks sont recalculés par le serveur ; le stock est réservé à la commande
  et rendu en cas d'annulation ou de non-paiement dans le délai.
- **Paiement** : le client envoie le montant au numéro marchand, saisit l'identifiant de
  transaction ; la caisse le vérifie puis valide. Paiement à la livraison : garantie (frais de
  livraison) par Mobile Money, solde en espèces au livreur, remis ensuite à la caisse.
- **Remise** : le livreur saisit le code à 6 chiffres que seul le client voit.
- **Créneaux** : calculés par le serveur à l'heure de Goma (UTC+2), jamais dans le passé, jamais
  hors des heures de service fixées par l'admin.

### Validation automatique des paiements

Un agrégateur Mobile Money peut confirmer un paiement sans intervention de la caisse :

```
POST /api/payments/webhook
X-Gomarche-Signature: <HMAC-SHA256 hexadécimal du corps brut, clé PAYMENT_WEBHOOK_SECRET>
{"orderNumber":"GM-1001","transactionRef":"…","amount":38.33,"currency":"USD","status":"success"}
```

Le montant doit correspondre exactement au paiement attendu (USD ou CDF). Le format de
notification propre à chaque agrégateur doit être adapté dans `server.ts`.

## Où sont les données

| Mode | Activé par | Usage |
| --- | --- | --- |
| Firestore | `FIREBASE_SERVICE_ACCOUNT` | Hébergement sans disque persistant (Render gratuit...) |
| Fichier `DATA_DIR/db.json` | par défaut | Développement, ou serveur avec disque persistant |

Dans les deux cas le serveur travaille en mémoire et recopie ses changements. Avec Firestore,
seuls les documents modifiés sont réécrits, et au démarrage seules les commandes des 45 derniers
jours sont rechargées (les plus anciennes restent archivées dans Firestore).

## Déploiement sur Render (gratuit) + Firestore

1. Console Firebase → Firestore Database : créer la base (mode production).
2. Console Firebase → Paramètres du projet → Comptes de service → **Générer une nouvelle clé
   privée**. Ce fichier donne un accès total à la base : ne le commitez jamais, ne le partagez pas.
3. render.com → New → Blueprint → ce dépôt. Coller le contenu du fichier JSON dans
   `FIREBASE_SERVICE_ACCOUNT`, choisir un `ADMIN_PASSWORD` (12 caractères minimum).
4. Console Firebase → Authentication → Settings → Authorized domains : ajouter le domaine Render.
5. Se connecter en admin, renseigner les numéros marchands (Paiements) et le personnel.

À respecter : **une seule instance** du serveur, et **HTTPS** (fourni par Render) pour le cookie
de session et la géolocalisation du livreur. Sur l'offre gratuite, le serveur s'endort après
15 minutes sans visite : le visiteur suivant attend 30 à 60 secondes.

## Sécurité en place

Sessions par cookie `HttpOnly` / `SameSite`, mots de passe hachés (scrypt), jeton Google vérifié
côté serveur, contrôle du rôle à chaque requête, protection CSRF, limitation de débit et
verrouillage après échecs, champ-piège + Cloudflare Turnstile (si configuré), en-têtes de
sécurité et CSP, validation de toutes les entrées, images vérifiées par signature binaire,
journal des actions sensibles.
