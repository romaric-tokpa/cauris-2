// Cauris — données seed (Juin 2026) CORRIGÉES, importées depuis
// "Cauris_Suivi_juin_2026_corrige (4).xlsx" (feuille Comptes = soldes fin juin,
// Journal juin archive = 225 opérations). Remplace l'ancien seed non corrigé.
// Régénéré via scripts/build_import.py -> build/seed.json.

export type Operation = {
  date: string;
  lib: string;
  type: "dépense" | "revenu" | "virement";
  compte: string;
  cat: string;
  montant: number;
  note?: string;
};

export type SeedData = {
  asOf: string;
  kpis: Record<string, number>;
  patrimoineSplit: { label: string; value: number }[];
  comptes: { nom: string; solde: number; type: string; note: string }[];
  categories: { label: string; value: number }[];
  revCategories: { label: string; value: number }[];
  coffres: { nom: string; objectif: number; epargne: number; bloque: boolean; note: string }[];
  dettes: unknown[];
  dettesNote: string;
  ventilation: unknown;
  operations: Operation[];
};

export const SEED: SeedData = {
  "asOf": "30 juin 2026",
  "kpis": {
    "patrimoine": 1388922.7,
    "disponible": 3720.7,
    "epargne": 1385202,
    "depenseJuin": 802275,
    "revenus": 1770678,
    "epargneNette": 968403,
    "tauxEpargne": 0.5469108443206501
  },
  "patrimoineSplit": [
    {
      "label": "Disponible",
      "value": 3720.7
    },
    {
      "label": "Coffres (urgence + scolarité)",
      "value": 700013
    },
    {
      "label": "Épargne bloquée",
      "value": 685189
    }
  ],
  "comptes": [
    {
      "nom": "Banque (SGBCI)",
      "solde": 782,
      "type": "disponible",
      "note": ""
    },
    {
      "nom": "Djamo (courant)",
      "solde": 257,
      "type": "disponible",
      "note": ""
    },
    {
      "nom": "Wave",
      "solde": 2619,
      "type": "disponible",
      "note": ""
    },
    {
      "nom": "Cash (espèces)",
      "solde": 25,
      "type": "disponible",
      "note": ""
    },
    {
      "nom": "Orange Money",
      "solde": 37.7,
      "type": "disponible",
      "note": ""
    },
    {
      "nom": "Coffre Fonds d'urgence",
      "solde": 700013,
      "type": "épargne",
      "note": ""
    },
    {
      "nom": "Coffre Scolarité",
      "solde": 0,
      "type": "épargne",
      "note": ""
    },
    {
      "nom": "Épargne classique SGCI",
      "solde": 25000,
      "type": "bloqué",
      "note": ""
    },
    {
      "nom": "Épargne forcée (prêt)",
      "solde": 660189,
      "type": "bloqué",
      "note": ""
    }
  ],
  "categories": [
    {
      "label": "Prêt",
      "value": 188358
    },
    {
      "label": "Aide famille",
      "value": 123195
    },
    {
      "label": "Outils/Web",
      "value": 87525
    },
    {
      "label": "Loyer",
      "value": 70000
    },
    {
      "label": "Transport",
      "value": 65819
    },
    {
      "label": "Santé",
      "value": 51365
    },
    {
      "label": "Factures",
      "value": 43114
    },
    {
      "label": "Provisions",
      "value": 33824
    },
    {
      "label": "Déco",
      "value": 33000
    },
    {
      "label": "Nourriture",
      "value": 31005
    },
    {
      "label": "Copine",
      "value": 30096
    },
    {
      "label": "Frais",
      "value": 15439
    },
    {
      "label": "Loisirs",
      "value": 11000
    },
    {
      "label": "Frais de transfert",
      "value": 7496
    },
    {
      "label": "Prêt étudiant",
      "value": 5239
    },
    {
      "label": "Soins perso",
      "value": 3800
    },
    {
      "label": "Vêtements",
      "value": 1000
    },
    {
      "label": "Maison",
      "value": 700
    },
    {
      "label": "Autre",
      "value": 300
    }
  ],
  "revCategories": [
    {
      "label": "Salaire",
      "value": 1642307
    },
    {
      "label": "Autre",
      "value": 126350
    },
    {
      "label": "Remboursement frais nourritures",
      "value": 1000
    },
    {
      "label": "Reception monnaie transport",
      "value": 595
    },
    {
      "label": "Remboursement",
      "value": 260
    },
    {
      "label": "Intérêts épargne",
      "value": 116
    },
    {
      "label": "Retrouve de l'argent dans mon pantalon",
      "value": 50
    }
  ],
  "coffres": [
    {
      "nom": "Fonds d'urgence",
      "objectif": 940000,
      "epargne": 700013,
      "bloque": false,
      "note": "Objectif = 6 mois de salaire. Priorité absolue avant tout autre projet. Bloque-le dans un coffre à terme pour le rendre intouchable."
    },
    {
      "nom": "Scolarité",
      "objectif": 50000,
      "epargne": 0,
      "bloque": false,
      "note": "À provisionner — priorité après le fonds d'urgence."
    },
    {
      "nom": "Épargne classique SGCI",
      "objectif": 25000,
      "epargne": 25000,
      "bloque": true,
      "note": "Bloqué"
    },
    {
      "nom": "Épargne forcée (prêt)",
      "objectif": 660189,
      "epargne": 660189,
      "bloque": true,
      "note": "Bloqué, récupérable en fin de prêt"
    }
  ],
  "dettes": [],
  "dettesNote": "Tous les engagements ont été soldés au 26/06 : Prêt Djamo (crédit score) (5 239 F)  Fond urgence — don anniv (5 000 F)  Fond urgence — peinture (22 385 F)  Fond urgence — nourriture (3 100 F)  Fond urgence — copine (2 000 F) — soit 37 724 F remis. Aucune dette en cours.",
  "ventilation": {
    "dispoAVentiler": 1770678,
    "charges": [
      {
        "poste": "Prêt",
        "montant": 188358,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Aide famille",
        "montant": 123195,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Outils/Web",
        "montant": 87525,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Loyer",
        "montant": 70000,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Transport",
        "montant": 65819,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Santé",
        "montant": 51365,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Factures",
        "montant": 43114,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Provisions",
        "montant": 33824,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Déco",
        "montant": 33000,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Nourriture",
        "montant": 31005,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Copine",
        "montant": 30096,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Frais",
        "montant": 15439,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Loisirs",
        "montant": 11000,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Frais de transfert",
        "montant": 7496,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Prêt étudiant",
        "montant": 5239,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Soins perso",
        "montant": 3800,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Vêtements",
        "montant": 1000,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Maison",
        "montant": 700,
        "statut": "Fait",
        "note": ""
      },
      {
        "poste": "Autre",
        "montant": 300,
        "statut": "Fait",
        "note": ""
      }
    ],
    "resteACouvrir": [],
    "coursAttendu": 0
  },
  "operations": [
    {
      "date": "01/06",
      "lib": "Salaire",
      "type": "revenu",
      "compte": "Banque",
      "cat": "Salaire",
      "montant": 934127
    },
    {
      "date": "01/06",
      "lib": "Transport arrêt car",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100
    },
    {
      "date": "01/06",
      "lib": "Nourriture (toi+enfants)",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Nourriture",
      "montant": -2400
    },
    {
      "date": "01/06",
      "lib": "Frais transaction nourriture",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -20
    },
    {
      "date": "01/06",
      "lib": "Attiéké (sœurs)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -300,
      "note": "payé du cash"
    },
    {
      "date": "01/06",
      "lib": "Premium Djamo",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -2000,
      "note": "abonnement"
    },
    {
      "date": "01/06",
      "lib": "Frais OM→Djamo",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais",
      "montant": -51
    },
    {
      "date": "01/06",
      "lib": "Frais envoi Wave",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -10
    },
    {
      "date": "01/06",
      "lib": "Agios bancaires",
      "type": "dépense",
      "compte": "Banque",
      "cat": "Frais",
      "montant": -6424,
      "note": "coût découvert"
    },
    {
      "date": "01/06",
      "lib": "Remboursement prêt",
      "type": "dépense",
      "compte": "Banque",
      "cat": "Prêt",
      "montant": -94179
    },
    {
      "date": "01/06",
      "lib": "Épargne forcée bloquée",
      "type": "virement",
      "compte": "Banque→Coffre prêt",
      "cat": "",
      "montant": 30000,
      "note": "obligatoire"
    },
    {
      "date": "01/06",
      "lib": "Retrait vers courant SGBCI",
      "type": "virement",
      "compte": "Banque→Courant",
      "cat": "",
      "montant": 5100
    },
    {
      "date": "01/06",
      "lib": "Transfert OM→Djamo",
      "type": "virement",
      "compte": "OM→Djamo",
      "cat": "",
      "montant": 5100,
      "note": "−51 frais"
    },
    {
      "date": "01/06",
      "lib": "Retrait Wave→Cash",
      "type": "virement",
      "compte": "Wave→Cash",
      "cat": "",
      "montant": 1000,
      "note": "pour attiéké"
    },
    {
      "date": "02/06",
      "lib": "Transport arrêt car",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100
    },
    {
      "date": "02/06",
      "lib": "Savon (sœurs, matin)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Aide famille",
      "montant": -500,
      "note": "espèces"
    },
    {
      "date": "02/06",
      "lib": "Nourriture midi",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -1400
    },
    {
      "date": "02/06",
      "lib": "Frais transfert OM→Djamo",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais",
      "montant": -50,
      "note": "inclus dans l'envoi"
    },
    {
      "date": "02/06",
      "lib": "Frais transfert Djamo→Wave",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -49,
      "note": "inclus dans l'envoi"
    },
    {
      "date": "02/06",
      "lib": "Banque → Orange Money",
      "type": "virement",
      "compte": "Banque→OM",
      "cat": "",
      "montant": 5000
    },
    {
      "date": "02/06",
      "lib": "OM → Djamo",
      "type": "virement",
      "compte": "OM→Djamo",
      "cat": "",
      "montant": 5000,
      "note": "4 950 reçus"
    },
    {
      "date": "02/06",
      "lib": "Djamo → Wave",
      "type": "virement",
      "compte": "Djamo→Wave",
      "cat": "",
      "montant": 4949,
      "note": "4 900 reçus"
    },
    {
      "date": "02/06",
      "lib": "Transport travail→maison (soir)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "02/06",
      "lib": "Sardines",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -900
    },
    {
      "date": "02/06",
      "lib": "Ingrédients cuisine",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -350
    },
    {
      "date": "03/06",
      "lib": "Abonnement Google AI",
      "type": "dépense",
      "compte": "Banque",
      "cat": "Outils/Web",
      "montant": -6135,
      "note": "paiement TPE en ligne (annulé, dernier mois)"
    },
    {
      "date": "03/06",
      "lib": "Soins petite sœur",
      "type": "dépense",
      "compte": "Coffre Fonds d'urgence",
      "cat": "Santé",
      "montant": -17000,
      "note": "retrait du fonds d'urgence"
    },
    {
      "date": "03/06",
      "lib": "Bonus / intérêt Djamo",
      "type": "revenu",
      "compte": "Coffre Fonds d'urgence",
      "cat": "Intérêts épargne",
      "montant": 116
    },
    {
      "date": "03/06",
      "lib": "Banque → Orange Money",
      "type": "virement",
      "compte": "Banque→OM",
      "cat": "",
      "montant": 153214,
      "note": "sans frais (premium)"
    },
    {
      "date": "03/06",
      "lib": "Loyer",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Loyer",
      "montant": -70000
    },
    {
      "date": "03/06",
      "lib": "Frais transfert loyer",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais",
      "montant": -700,
      "note": "évitable via Djamo"
    },
    {
      "date": "03/06",
      "lib": "Abonnement car (transport)",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Transport",
      "montant": -40000
    },
    {
      "date": "03/06",
      "lib": "Frais abonnement car",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais",
      "montant": -400,
      "note": "réclamé par le prestataire"
    },
    {
      "date": "03/06",
      "lib": "Eau (SODECI)",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Factures",
      "montant": -14514
    },
    {
      "date": "03/06",
      "lib": "Électricité (CIE)",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Factures",
      "montant": -7600,
      "note": "prévu 8000, 400 redéployés"
    },
    {
      "date": "03/06",
      "lib": "Banque → Orange Money (pour maman)",
      "type": "virement",
      "compte": "Banque→OM",
      "cat": "",
      "montant": 100000,
      "note": "sans frais"
    },
    {
      "date": "03/06",
      "lib": "Aide à maman (dette commerce)",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Aide famille",
      "montant": -100000,
      "note": "sans frais — sa part 1/3"
    },
    {
      "date": "03/06",
      "lib": "OM → Djamo (courant)",
      "type": "virement",
      "compte": "OM→Djamo",
      "cat": "",
      "montant": 391000,
      "note": "387 090 reçus"
    },
    {
      "date": "03/06",
      "lib": "Frais dépôt Djamo",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -3910,
      "note": "assumé (évite guichet+transport)"
    },
    {
      "date": "03/06",
      "lib": "Djamo → Coffre Fonds d'urgence",
      "type": "virement",
      "compte": "Djamo→Coffre",
      "cat": "",
      "montant": 387100,
      "note": "gratuit"
    },
    {
      "date": "03/06",
      "lib": "Retrait guichet (banque→cash)",
      "type": "virement",
      "compte": "Banque→Cash",
      "cat": "",
      "montant": 140000
    },
    {
      "date": "03/06",
      "lib": "Frais retrait guichet",
      "type": "dépense",
      "compte": "Banque",
      "cat": "Frais",
      "montant": -500,
      "note": "assumé"
    },
    {
      "date": "03/06",
      "lib": "Dépôt espèces sur Wave",
      "type": "virement",
      "compte": "Cash→Wave",
      "cat": "",
      "montant": 20000
    },
    {
      "date": "03/06",
      "lib": "Don copine",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Copine",
      "montant": -20000,
      "note": "20 000 au lieu de 25 000"
    },
    {
      "date": "03/06",
      "lib": "Frais envoi copine",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Frais",
      "montant": -200
    },
    {
      "date": "03/06",
      "lib": "Repas midi (ta part)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -1300,
      "note": "Saphy +200 remis cash, équilibré"
    },
    {
      "date": "03/06",
      "lib": "Attiéké (nuit)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "04/06",
      "lib": "Yango maison→gare",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -4200,
      "note": "départ des sœurs"
    },
    {
      "date": "04/06",
      "lib": "Monnaie Yango reçue sur Wave",
      "type": "virement",
      "compte": "Cash→Wave",
      "cat": "",
      "montant": 800,
      "note": "800 envoyés, 10 frais"
    },
    {
      "date": "04/06",
      "lib": "Frais Wave (monnaie)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Frais",
      "montant": -10
    },
    {
      "date": "04/06",
      "lib": "Tickets transport sœurs (2)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Aide famille",
      "montant": -14200,
      "note": "7 100 x 2"
    },
    {
      "date": "04/06",
      "lib": "Frais bagages",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Aide famille",
      "montant": -1000
    },
    {
      "date": "04/06",
      "lib": "Petit déjeuner enfants",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Aide famille",
      "montant": -1000
    },
    {
      "date": "04/06",
      "lib": "Transport gare→Adjamé",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -300
    },
    {
      "date": "04/06",
      "lib": "Transport retour (pluie)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -800
    },
    {
      "date": "04/06",
      "lib": "Courses Centre de Songon",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Provisions",
      "montant": -8375,
      "note": "épicerie/maison"
    },
    {
      "date": "04/06",
      "lib": "Courses Sangel (viandes/poisson)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Provisions",
      "montant": -25449,
      "note": "protéines du mois"
    },
    {
      "date": "04/06",
      "lib": "Marché : légumes",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -2800,
      "note": "aubergine,tomate,oignon,ail,persil"
    },
    {
      "date": "04/06",
      "lib": "Transport maison→supermarché",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -500
    },
    {
      "date": "04/06",
      "lib": "Transport Sangel→Siporex",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -200
    },
    {
      "date": "04/06",
      "lib": "Transport Siporex→Bimbresso",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -500
    },
    {
      "date": "04/06",
      "lib": "Transport retour (affaires)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Transport",
      "montant": -900
    },
    {
      "date": "05/06",
      "lib": "Transport maison→car",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "05/06",
      "lib": "Abonnement Perplexity",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Outils/Web",
      "montant": -11883,
      "note": "USD 20, remplace Google AI"
    },
    {
      "date": "05/06",
      "lib": "Dépôt cash → Wave",
      "type": "virement",
      "compte": "Cash→Wave",
      "cat": "",
      "montant": 33500
    },
    {
      "date": "05/06",
      "lib": "Wave → Djamo (rechargement)",
      "type": "virement",
      "compte": "Wave→Djamo",
      "cat": "",
      "montant": 34000,
      "note": "33 660 reçus"
    },
    {
      "date": "05/06",
      "lib": "Frais rechargement Djamo",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Frais",
      "montant": -340
    },
    {
      "date": "05/06",
      "lib": "Djamo → Coffre Fonds urgence",
      "type": "virement",
      "compte": "Djamo→Coffre",
      "cat": "",
      "montant": 20000,
      "note": "gratuit"
    },
    {
      "date": "05/06",
      "lib": "Djamo → Coffre Scolarité",
      "type": "virement",
      "compte": "Djamo→Coffre",
      "cat": "",
      "montant": 13500,
      "note": "gratuit"
    },
    {
      "date": "05/06",
      "lib": "Dépôt cash → Orange Money",
      "type": "virement",
      "compte": "Cash→OM",
      "cat": "",
      "montant": 13000,
      "note": "12 900 reçus (100 frais)"
    },
    {
      "date": "05/06",
      "lib": "Frais dépôt OM",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais",
      "montant": -100,
      "note": "prélevé sur le dépôt"
    },
    {
      "date": "05/06",
      "lib": "Attiéké (nuit)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -300,
      "note": "espèces"
    },
    {
      "date": "05/06",
      "lib": "Recharge fibre Orange",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Factures",
      "montant": -20000,
      "note": "sans frais"
    },
    {
      "date": "06/06",
      "lib": "Coiffure (salon)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Soins perso",
      "montant": -500,
      "note": "espèces"
    },
    {
      "date": "06/06",
      "lib": "Attiéké",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -300,
      "note": "espèces"
    },
    {
      "date": "07/06",
      "lib": "Savon et détergent",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Maison",
      "montant": -300,
      "note": "espèces"
    },
    {
      "date": "07/06",
      "lib": "Cube Maggi",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -200,
      "note": "espèces"
    },
    {
      "date": "07/06",
      "lib": "Pain",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "07/06",
      "lib": "Taxi copine (retour)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Copine",
      "montant": -200,
      "note": "elle a cuisiné pour la semaine"
    },
    {
      "date": "08/06",
      "lib": "Transport maison→Bimbresso",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "raté le car"
    },
    {
      "date": "08/06",
      "lib": "Transport Bimbresso→Adjamé",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -500
    },
    {
      "date": "08/06",
      "lib": "Transport Adjamé→bureau",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -500
    },
    {
      "date": "08/06",
      "lib": "3 paires de chaussettes",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Vêtements",
      "montant": -1000,
      "note": "3 pour 1000 au lieu de 1 a 500"
    },
    {
      "date": "08/06",
      "lib": "Transport Bimbresso→maison (soir)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "retour du travail"
    },
    {
      "date": "09/06",
      "lib": "Transport maison→arrêt car",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "09/06",
      "lib": "Cash → Wave (via collègue)",
      "type": "virement",
      "compte": "Cash→Wave",
      "cat": "",
      "montant": 1000,
      "note": "1000 cash donné, 1000 reçu sur Wave"
    },
    {
      "date": "09/06",
      "lib": "Transport Bimbresso→maison (soir)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100
    },
    {
      "date": "09/06",
      "lib": "Soda Schweppes (copine)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Copine",
      "montant": -900,
      "note": "elle a cuisiné"
    },
    {
      "date": "09/06",
      "lib": "Transport copine",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Copine",
      "montant": -200
    },
    {
      "date": "10/06",
      "lib": "Transport maison→Bimbresso",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "10/06",
      "lib": "Transport retour (soir)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100
    },
    {
      "date": "10/06",
      "lib": "Pressing",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Soins perso",
      "montant": -2000,
      "note": "espèces"
    },
    {
      "date": "11/06",
      "lib": "Transport",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "11/06",
      "lib": "Nourriture",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -1300
    },
    {
      "date": "11/06",
      "lib": "Coffre Scolarité → Djamo courant",
      "type": "virement",
      "compte": "Coffre→Djamo",
      "cat": "",
      "montant": 10000,
      "note": "RETRAIT du coffre — à rembourser"
    },
    {
      "date": "11/06",
      "lib": "Djamo → Wave copine (déco)",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Déco",
      "montant": -10000,
      "note": "achat déco maison"
    },
    {
      "date": "11/06",
      "lib": "Frais transfert Wave copine",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -100
    },
    {
      "date": "11/06",
      "lib": "Coffre Fonds urgence → Djamo",
      "type": "virement",
      "compte": "Coffre→Djamo",
      "cat": "",
      "montant": 5000,
      "note": "RETRAIT fonds urgence — à rembourser"
    },
    {
      "date": "11/06",
      "lib": "Don anniversaire (petit)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Aide famille",
      "montant": -4995,
      "note": "BEAH"
    },
    {
      "date": "11/06",
      "lib": "Frais transferts (don anniv)",
      "type": "dépense",
      "compte": "Djamo/Wave",
      "cat": "Frais",
      "montant": -100,
      "note": "2x50"
    },
    {
      "date": "11/06",
      "lib": "Orange (boisson)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -200,
      "note": "espèces"
    },
    {
      "date": "11/06",
      "lib": "Placali",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Nourriture",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "12/06",
      "lib": "Transport",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -1100,
      "note": "espèces"
    },
    {
      "date": "12/06",
      "lib": "Transport",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -300,
      "note": "espèces"
    },
    {
      "date": "13/06",
      "lib": "Coffre Fonds urgence → Djamo",
      "type": "virement",
      "compte": "Coffre→Djamo",
      "cat": "",
      "montant": 23000,
      "note": "pour frais santé"
    },
    {
      "date": "13/06",
      "lib": "Frais de santé",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Santé",
      "montant": -22500,
      "note": "urgence légitime"
    },
    {
      "date": "13/06",
      "lib": "Frais transfert santé",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -225
    },
    {
      "date": "13/06",
      "lib": "Remboursement prêt (ami)",
      "type": "revenu",
      "compte": "Djamo",
      "cat": "Remboursement",
      "montant": 260,
      "note": "ancien prêt remboursé"
    },
    {
      "date": "13/06",
      "lib": "Pile télécommande",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Maison",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "13/06",
      "lib": "Cash → Wave (rechargement)",
      "type": "virement",
      "compte": "Cash→Wave",
      "cat": "",
      "montant": 500,
      "note": "pour payer livraison"
    },
    {
      "date": "13/06",
      "lib": "Livraison colis (assurance papa)",
      "type": "dépense",
      "compte": "Cash+Wave",
      "cat": "Aide famille",
      "montant": -1500,
      "note": "1000 cash + 500 wave"
    },
    {
      "date": "15/06",
      "lib": "Frais de poubelle",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Factures",
      "montant": -1000,
      "note": "espèces"
    },
    {
      "date": "15/06",
      "lib": "Transport retour",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "16/06",
      "lib": "Peinture (déco studio)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Déco",
      "montant": -23000,
      "note": "livrée"
    },
    {
      "date": "16/06",
      "lib": "Frais transfert (1%)",
      "type": "dépense",
      "compte": "Djamo",
      "cat": "Frais",
      "montant": -230
    },
    {
      "date": "15/06",
      "lib": "Don taxi Sysy (reste cash)",
      "type": "dépense",
      "compte": "Cash",
      "cat": "Copine",
      "montant": -176,
      "note": "solde cash à 0"
    },
    {
      "date": "03/06",
      "lib": "Frais abonnement Google",
      "type": "dépense",
      "compte": "Banque",
      "cat": "Outils/Web",
      "montant": -134,
      "note": "débit SGBCI"
    },
    {
      "date": "16/06",
      "lib": "Patate douce",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -700,
      "note": "envie 15h"
    },
    {
      "date": "16/06",
      "lib": "Yango (course urgente)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Transport",
      "montant": -2100,
      "note": "urgent"
    },
    {
      "date": "16/06",
      "lib": "Orange (boisson)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -205,
      "note": "soir"
    },
    {
      "date": "16/06",
      "lib": "Transport",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Transport",
      "montant": -100,
      "note": "soir"
    },
    {
      "date": "16/06",
      "lib": "Attiéké",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -200,
      "note": "soir"
    },
    {
      "date": "16/06",
      "lib": "Placali",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -100,
      "note": "soir"
    },
    {
      "date": "17/06",
      "lib": "Retrait Wave → espèces",
      "type": "virement",
      "compte": "Wave",
      "cat": "",
      "montant": -1000,
      "note": "pour espèces"
    },
    {
      "date": "17/06",
      "lib": "Retrait Wave → espèces",
      "type": "virement",
      "compte": "Cash (espèces)",
      "cat": "",
      "montant": 1000
    },
    {
      "date": "17/06",
      "lib": "Banque → OM",
      "type": "virement",
      "compte": "Banque (SGBCI)",
      "cat": "",
      "montant": -1000,
      "note": "sans frais"
    },
    {
      "date": "17/06",
      "lib": "Banque → OM",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "",
      "montant": 1000
    },
    {
      "date": "17/06",
      "lib": "OM → Djamo",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "",
      "montant": -990
    },
    {
      "date": "17/06",
      "lib": "OM → Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": 990,
      "note": "reçu 990"
    },
    {
      "date": "17/06",
      "lib": "Frais OM → Djamo",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais",
      "montant": -10
    },
    {
      "date": "17/06",
      "lib": "Djamo → Wave",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": -1000
    },
    {
      "date": "17/06",
      "lib": "Djamo → Wave",
      "type": "virement",
      "compte": "Wave",
      "cat": "",
      "montant": 1000,
      "note": "reçu 1000"
    },
    {
      "date": "17/06",
      "lib": "Frais Djamo → Wave",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Frais",
      "montant": -10
    },
    {
      "date": "17/06",
      "lib": "Impression documents (admin)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Autre",
      "montant": -300,
      "note": "courses admin"
    },
    {
      "date": "17/06",
      "lib": "Transport allé (admin)",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -300,
      "note": "espèces"
    },
    {
      "date": "17/06",
      "lib": "Transport retour (admin)",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -400,
      "note": "espèces"
    },
    {
      "date": "17/06",
      "lib": "Transport aller chez Synthia",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "17/06",
      "lib": "Transport retour chez Synthia",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "17/06",
      "lib": "Transport clé chez Synthia",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -100,
      "note": "espèces"
    },
    {
      "date": "18/06",
      "lib": "Remboursement frais nourritures",
      "type": "revenu",
      "compte": "Wave",
      "cat": "",
      "montant": 1000,
      "note": "reçu 1000"
    },
    {
      "date": "18/06",
      "lib": "Transfert à Fabrice",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Frais de transfert",
      "montant": -105
    },
    {
      "date": "18/06",
      "lib": "Achat de Pain",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -150
    },
    {
      "date": "19/06",
      "lib": "achat d'œuf",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -500
    },
    {
      "date": "20/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "",
      "montant": -2000
    },
    {
      "date": "20/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": 2000
    },
    {
      "date": "20/06",
      "lib": "Transfert à synhia",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Copine",
      "montant": -2020
    },
    {
      "date": "20/06",
      "lib": "achat d'œuf et de pain",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -350
    },
    {
      "date": "21/06",
      "lib": "achat de nourriture",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -550
    },
    {
      "date": "24/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "",
      "montant": -3100
    },
    {
      "date": "24/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": 3100
    },
    {
      "date": "24/06",
      "lib": "Djamo → Wave",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": -3000
    },
    {
      "date": "24/06",
      "lib": "Frais de transfert",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Frais de transfert",
      "montant": -30
    },
    {
      "date": "24/06",
      "lib": "Djamo → Wave",
      "type": "virement",
      "compte": "Wave",
      "cat": "",
      "montant": 3000,
      "note": "reçu 3000"
    },
    {
      "date": "24/06",
      "lib": "Achat ingredients pour cuisine",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -700
    },
    {
      "date": "24/06",
      "lib": "Retrouve de l'argent dans mon pantalon",
      "type": "revenu",
      "compte": "Cash (espèces)",
      "cat": "",
      "montant": 50
    },
    {
      "date": "25/06",
      "lib": "Achat nourriture",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -850
    },
    {
      "date": "25/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "",
      "montant": -30000
    },
    {
      "date": "25/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": 30000
    },
    {
      "date": "25/06",
      "lib": "Djamo → OM",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": -30000
    },
    {
      "date": "25/06",
      "lib": "Djamo → OM",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "",
      "montant": 30000
    },
    {
      "date": "25/06",
      "lib": "OM → Djamo",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "",
      "montant": -29700
    },
    {
      "date": "25/06",
      "lib": "OM → Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": 29700
    },
    {
      "date": "25/06",
      "lib": "OM → Djamo",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais de transfert",
      "montant": -300
    },
    {
      "date": "25/06",
      "lib": "Djamo → Coffre Fonds urgence",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": -29773
    },
    {
      "date": "25/06",
      "lib": "Djamo → Coffre Fonds urgence",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "",
      "montant": 29773
    },
    {
      "date": "26/06",
      "lib": "Compte courant→ Compte bloqué",
      "type": "virement",
      "compte": "Banque (SGBCI)",
      "cat": "",
      "montant": -30000
    },
    {
      "date": "26/06",
      "lib": "Compte courant→ Compte bloqué",
      "type": "virement",
      "compte": "Épargne forcée (prêt)",
      "cat": "",
      "montant": 30000
    },
    {
      "date": "26/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "",
      "montant": -12200
    },
    {
      "date": "26/06",
      "lib": "Retrait fond d'urgenve → compte courant Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": 12200
    },
    {
      "date": "26/06",
      "lib": "Djamo → OM",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "",
      "montant": -12200
    },
    {
      "date": "26/06",
      "lib": "Djamo → OM",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "",
      "montant": 12200
    },
    {
      "date": "26/06",
      "lib": "Paiement Abonnement Claude",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Outils/Web",
      "montant": -12155
    },
    {
      "date": "26/06",
      "lib": "Cours particulier (Ariel)",
      "type": "revenu",
      "compte": "Orange Money",
      "cat": "Autre",
      "montant": 126250,
      "note": "reçu OM 26/06"
    },
    {
      "date": "26/06",
      "lib": "Virement vers Fonds urgence",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "Épargne",
      "montant": -100295,
      "note": "via Djamo, coffre 18h28"
    },
    {
      "date": "26/06",
      "lib": "Virement vers Fonds urgence",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "Épargne",
      "montant": 100295,
      "note": "coffre = 552 984"
    },
    {
      "date": "26/06",
      "lib": "Remboursement pret Djamo (dette ext.)",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Prêt étudiant",
      "montant": -5239,
      "note": "dette soldee 18h27"
    },
    {
      "date": "26/06",
      "lib": "Frais transfert OM vers Djamo",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais de transfert",
      "montant": -1066,
      "note": "1011 + 55"
    },
    {
      "date": "26/06",
      "lib": "Virement OM vers Wave",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "Transfert",
      "montant": -6004,
      "note": "sortie copine 19h39"
    },
    {
      "date": "26/06",
      "lib": "Virement OM vers Wave",
      "type": "virement",
      "compte": "Wave",
      "cat": "Transfert",
      "montant": 6004,
      "note": "reçu sur Wave"
    },
    {
      "date": "26/06",
      "lib": "Frais transfert OM vers Wave",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais de transfert",
      "montant": -186,
      "note": "EasyTransfert"
    },
    {
      "date": "26/06",
      "lib": "Restaurant Centre de Songon (tacos)",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Copine",
      "montant": -6000,
      "note": "sortie copine 20h09"
    },
    {
      "date": "26/06",
      "lib": "Paiement Chez Larissa",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Copine",
      "montant": -600,
      "note": "sortie 20h16"
    },
    {
      "date": "26/06",
      "lib": "Cadeau Wave",
      "type": "revenu",
      "compte": "Wave",
      "cat": "Autre",
      "montant": 100,
      "note": "gift 23h15"
    },
    {
      "date": "26/06",
      "lib": "Transport église",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Transport",
      "montant": -1919,
      "note": "transport église 23h13"
    },
    {
      "date": "27/06",
      "lib": "Baguette de pain",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -150,
      "note": "27/06"
    },
    {
      "date": "27/06",
      "lib": "Virement OM vers Djamo",
      "type": "virement",
      "compte": "Orange Money",
      "cat": "Transfert",
      "montant": -11385,
      "note": "achat PS 13h03"
    },
    {
      "date": "27/06",
      "lib": "Virement OM vers Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "Transfert",
      "montant": 11385,
      "note": "reçu Djamo"
    },
    {
      "date": "27/06",
      "lib": "Frais transfert OM vers Djamo",
      "type": "dépense",
      "compte": "Orange Money",
      "cat": "Frais de transfert",
      "montant": -115,
      "note": "dépôt Djamo"
    },
    {
      "date": "27/06",
      "lib": "Lecteur pour PlayStation",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Loisirs",
      "montant": -11000,
      "note": "achat marchand 13h04"
    },
    {
      "date": "27/06",
      "lib": "Frais transfert Djamo vers marchand",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Frais de transfert",
      "montant": -110
    },
    {
      "date": "27/06",
      "lib": "Nourriture",
      "type": "dépense",
      "compte": "Wave",
      "cat": "Nourriture",
      "montant": -800,
      "note": "27/06"
    },
    {
      "date": "27/06",
      "lib": "Retrait Fonds urgence vers Djamo",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "Transfert",
      "montant": -10000,
      "note": "pour provisions + savon/lessive/ménage"
    },
    {
      "date": "27/06",
      "lib": "Retrait Fonds urgence vers Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "Transfert",
      "montant": 10000,
      "note": "pour provisions + savon/lessive/ménage"
    },
    {
      "date": "27/06",
      "lib": "Virement Djamo vers Wave (à moi-même)",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "Transfert",
      "montant": -10100,
      "note": "18h47"
    },
    {
      "date": "27/06",
      "lib": "Virement Djamo vers Wave (à moi-même)",
      "type": "virement",
      "compte": "Wave",
      "cat": "Transfert",
      "montant": 10100,
      "note": "→ achats maison (essentiels)"
    },
    {
      "date": "27/06",
      "lib": "Frais transfert Djamo vers Wave",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Frais de transfert",
      "montant": -101
    },
    {
      "date": "27/06",
      "lib": "Retrait Wave vers espèces",
      "type": "virement",
      "compte": "Wave",
      "cat": "Transfert",
      "montant": -10000,
      "note": "pour achats maison"
    },
    {
      "date": "27/06",
      "lib": "Retrait Wave vers espèces",
      "type": "virement",
      "compte": "Cash (espèces)",
      "cat": "Transfert",
      "montant": 10000
    },
    {
      "date": "27/06",
      "lib": "Nourriture",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Nourriture",
      "montant": -2000,
      "note": "espèce"
    },
    {
      "date": "27/06",
      "lib": "Fruits",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Nourriture",
      "montant": -700,
      "note": "espèce"
    },
    {
      "date": "27/06",
      "lib": "Détergent",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Maison",
      "montant": -300,
      "note": "espèce"
    },
    {
      "date": "27/06",
      "lib": "Savon (bain)",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Soins perso",
      "montant": -300,
      "note": "espèce"
    },
    {
      "date": "27/06",
      "lib": "Dentifrice",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Soins perso",
      "montant": -500,
      "note": "espèce"
    },
    {
      "date": "28/06",
      "lib": "Virement Fonds urgence vers Djamo",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "Transfert",
      "montant": -51000,
      "note": "reçu Djamo"
    },
    {
      "date": "28/06",
      "lib": "Virement Fonds urgence vers Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "Transfert",
      "montant": 51000,
      "note": "reçu Djamo"
    },
    {
      "date": "28/06",
      "lib": "Abonnement Claude Max",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Outils/Web",
      "montant": -50718,
      "note": "81,54 USD @623 — coder Pli 15h15"
    },
    {
      "date": "28/06",
      "lib": "Frais carte Anthropic",
      "type": "dépense",
      "compte": "Djamo (courant)",
      "cat": "Frais de transfert",
      "montant": -200,
      "note": "frais carte Djamo"
    },
    {
      "date": "28/06",
      "lib": "Nourriture",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Nourriture",
      "montant": -1700,
      "note": "espèce 28/06"
    },
    {
      "date": "28/06",
      "lib": "Coiffure",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Soins perso",
      "montant": -500,
      "note": "espèce 28/06"
    },
    {
      "date": "28/06",
      "lib": "Achat d'huile",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Nourriture",
      "montant": -700
    },
    {
      "date": "29/06",
      "lib": "Salaire juin reçu",
      "type": "revenu",
      "compte": "Banque (SGBCI)",
      "cat": "Salaire",
      "montant": 708180,
      "note": "net commissions incluses — capture banque"
    },
    {
      "date": "29/06",
      "lib": "Taxi belle-mère & copine",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -3200,
      "note": "merci pour le repas de la semaine"
    },
    {
      "date": "30/06",
      "lib": "Retrait SGCI - Espece",
      "type": "virement",
      "compte": "Banque (SGBCI)",
      "cat": "Transfert",
      "montant": -250000
    },
    {
      "date": "30/06",
      "lib": "Retrait SGCI - Espece",
      "type": "virement",
      "compte": "Cash (espèces)",
      "cat": "Transfert",
      "montant": 250000
    },
    {
      "date": "30/06",
      "lib": "Remboursement prêt",
      "type": "dépense",
      "compte": "Banque (SGBCI)",
      "cat": "Prêt",
      "montant": -94179
    },
    {
      "date": "30/06",
      "lib": "Paiement IA Remote",
      "type": "dépense",
      "compte": "Banque (SGBCI)",
      "cat": "Outils/Web",
      "montant": -6500
    },
    {
      "date": "30/06",
      "lib": "Virement Espècen urgence vers Djamo",
      "type": "virement",
      "compte": "Cash (espèces)",
      "cat": "Transfert",
      "montant": -200000,
      "note": "reçu Djamo"
    },
    {
      "date": "30/06",
      "lib": "Virement Espècen urgence vers Djamo",
      "type": "virement",
      "compte": "Djamo (courant)",
      "cat": "Transfert",
      "montant": -74
    },
    {
      "date": "30/06",
      "lib": "Virement Espèce urgence vers Coffre",
      "type": "virement",
      "compte": "Coffre Fonds d'urgence",
      "cat": "Transfert",
      "montant": 200074
    },
    {
      "date": "30/06",
      "lib": "Agios",
      "type": "dépense",
      "compte": "Banque (SGBCI)",
      "cat": "Frais de transfert",
      "montant": -5140
    },
    {
      "date": "30/06",
      "lib": "Frais PMT Google",
      "type": "dépense",
      "compte": "Banque (SGBCI)",
      "cat": "Frais de transfert",
      "montant": -143
    },
    {
      "date": "30/06",
      "lib": "Transport",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Transport",
      "montant": -6500
    },
    {
      "date": "30/06",
      "lib": "Achat Vernoiserie et nourriture",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Nourriture",
      "montant": -8600
    },
    {
      "date": "30/06",
      "lib": "Acaht medicament",
      "type": "dépense",
      "compte": "Cash (espèces)",
      "cat": "Santé",
      "montant": -11865
    },
    {
      "date": "30/06",
      "lib": "Reception monnaie transport",
      "type": "revenu",
      "compte": "Wave",
      "cat": "",
      "montant": 595
    }
  ]
};
