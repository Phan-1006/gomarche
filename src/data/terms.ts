import type { SiteConfig } from '../types';

// À incrémenter à chaque modification du texte : la version acceptée est enregistrée sur le compte.
export const TERMS_VERSION = '2026-10-07';

export interface TermsSection {
  title: string;
  paragraphs: string[];
}

/** Règles et conditions d'utilisation, avec les coordonnées du magasin à jour. */
export function termsSections(config: Pick<SiteConfig, 'siteName' | 'storeAddress' | 'storePhone' | 'storeEmail' | 'deliveryHours' | 'paymentTimeoutMinutes'>): TermsSection[] {
  const name = config.siteName;
  const hours = `${config.deliveryHours.start.replace(':', 'h')} à ${config.deliveryHours.end.replace(':', 'h')}`;
  return [
    {
      title: '1. Objet',
      paragraphs: [
        `Les présentes conditions encadrent l’utilisation du site et de l’application ${name}, service de supermarché en ligne avec livraison à domicile et retrait en magasin dans la ville de Goma.`,
        'Créer un compte ou passer une commande vaut acceptation de ces conditions.',
      ],
    },
    {
      title: '2. Votre compte',
      paragraphs: [
        'Vous devez fournir des informations exactes (nom, adresse e-mail, numéro de téléphone joignable) et les tenir à jour.',
        'Vous êtes responsable de la confidentialité de votre mot de passe et de l’usage fait de votre compte. Prévenez-nous sans délai en cas d’utilisation que vous n’avez pas autorisée.',
        'Un compte est personnel. Nous pouvons suspendre un compte utilisé de façon frauduleuse ou abusive.',
      ],
    },
    {
      title: '3. Produits et prix',
      paragraphs: [
        'Les prix sont affichés en dollars américains (USD) et en francs congolais (CDF) au taux indiqué sur le site le jour de la commande. Le prix applicable est celui affiché au moment où vous validez la commande.',
        'Les produits sont proposés dans la limite des stocks disponibles. Les photos sont données à titre d’illustration ; l’emballage réel peut différer.',
      ],
    },
    {
      title: '4. Commande et paiement',
      paragraphs: [
        'Une commande n’est confirmée, et sa préparation lancée, qu’après validation de votre paiement par notre caisse.',
        `Paiement par Mobile Money : vous envoyez le montant au numéro marchand indiqué, puis vous saisissez l’identifiant de la transaction. Sans paiement dans un délai de ${config.paymentTimeoutMinutes} minutes, la commande est annulée automatiquement.`,
        'Paiement à la livraison, lorsqu’il est proposé : vous réglez d’abord une garantie par Mobile Money, puis le solde en espèces à la remise de vos courses.',
        'Nous ne vous demanderons jamais votre code PIN Mobile Money. Ne le communiquez à personne, y compris à une personne se présentant comme un employé.',
      ],
    },
    {
      title: '5. Livraison et retrait',
      paragraphs: [
        `Les livraisons sont assurées à Goma, de ${hours}, dans le créneau que vous avez choisi. Les horaires annoncés sont des estimations : la circulation, la météo ou la sécurité peuvent entraîner un retard.`,
        'Vous devez être joignable au numéro indiqué et présent à l’adresse de livraison. Si la livraison échoue de votre fait (absence, adresse erronée, téléphone injoignable), les frais de livraison et la garantie versée peuvent rester dus.',
        'La remise se fait contre le code à 6 chiffres affiché sur votre commande. Ne le donnez au livreur, ou au comptoir pour un retrait, qu’une fois vos courses en main : ce code vaut confirmation de réception.',
      ],
    },
    {
      title: '6. Annulation, réclamation et remboursement',
      paragraphs: [
        'Vous pouvez annuler gratuitement une commande depuis votre compte tant que sa préparation n’a pas commencé. Ensuite, contactez le magasin.',
        'Vérifiez vos courses à la remise. Signalez tout produit manquant, abîmé ou non conforme au livreur ou au magasin dans les 24 heures, avec une photo si possible.',
        'Un paiement validé pour une commande annulée ou un produit non fourni est remboursé par le moyen de paiement utilisé, après vérification par la caisse.',
      ],
    },
    {
      title: '7. Vos données personnelles',
      paragraphs: [
        'Nous utilisons vos données (nom, e-mail, téléphone, adresse, position de livraison, historique de commandes) uniquement pour traiter vos commandes, vous livrer et vous informer de leur avancement.',
        'Votre nom, votre téléphone et votre adresse sont transmis au livreur chargé de votre commande. Pendant une livraison, la position du livreur vous est affichée.',
        'Nous ne vendons pas vos données. Vous pouvez demander leur consultation, leur correction ou la suppression de votre compte en nous écrivant.',
      ],
    },
    {
      title: '8. Usage du service',
      paragraphs: [
        'Il est interdit de passer de fausses commandes, de transmettre de fausses références de paiement, d’utiliser des robots ou de tenter d’accéder aux comptes ou aux espaces réservés au personnel.',
        'Les échanges avec les livreurs et le magasin doivent rester courtois. Les propos injurieux ou menaçants peuvent entraîner la fermeture du compte.',
      ],
    },
    {
      title: '9. Responsabilité',
      paragraphs: [
        'Nous mettons tout en œuvre pour assurer la disponibilité du service et l’exactitude des informations affichées, sans pouvoir garantir l’absence d’interruption ou d’erreur.',
        'Notre responsabilité ne peut être engagée en cas de force majeure ou d’événement indépendant de notre volonté (coupure de réseau, indisponibilité d’un opérateur Mobile Money, insécurité).',
      ],
    },
    {
      title: '10. Modification des conditions',
      paragraphs: [
        'Ces conditions peuvent évoluer. La version applicable à une commande est celle en vigueur au moment où elle est passée ; une modification importante vous sera signalée.',
      ],
    },
    {
      title: '11. Contact et droit applicable',
      paragraphs: [
        `${name} — ${config.storeAddress}. Téléphone : ${config.storePhone}. E-mail : ${config.storeEmail}.`,
        'Les présentes conditions sont soumises au droit de la République démocratique du Congo. En cas de différend, une solution amiable sera recherchée en priorité avec le magasin.',
      ],
    },
  ];
}
