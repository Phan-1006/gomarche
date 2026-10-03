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

## Déploiement : points à respecter

1. **Disque persistant** pour `DATA_DIR` (base `db.json` + images). Sur un disque éphémère, les
   données et le logo disparaissent à chaque redémarrage. Sauvegardez ce dossier régulièrement.
2. **Une seule instance** du serveur (la base est un fichier, les verrous sont en mémoire).
3. **HTTPS** obligatoire (cookie de session sécurisé, géolocalisation du livreur).
4. Dans la console Firebase : activer le fournisseur **Google** et ajouter votre domaine aux
   « Authorized domains ».
5. Renseigner les numéros marchands dans Administration → Paiements.

## Sécurité en place

Sessions par cookie `HttpOnly` / `SameSite`, mots de passe hachés (scrypt), jeton Google vérifié
côté serveur, contrôle du rôle à chaque requête, protection CSRF, limitation de débit et
verrouillage après échecs, champ-piège + Cloudflare Turnstile (si configuré), en-têtes de
sécurité et CSP, validation de toutes les entrées, images vérifiées par signature binaire,
journal des actions sensibles.
