DIRECTIVES ARCHITECTURE PDF - MATRICE 6x6
Tu vas réécrire le composant de génération PDF. Le code actuel est cassé, mal aligné et moche. Tu vas reconstruire une architecture parfaite, séparation stricte entre les données textuelles et le design visuel.

RÈGLES ABSOLUES (ZERO EXCEPTION)
INTERDIT TAILWIND : Ne mets AUCUNE classe Tailwind (className=) pour le rendu du PDF. Utilise UNIQUEMENT du style inline (style={{...}}). Tailwind casse le rendu React-PDF.
COMPOSANTS NATIFS : Utilise exclusivement @react-pdf/renderer et ses composants natifs (Document, Page, Text, View, Image).
COUPE DE TEXTE : Si une description est trop longue, le texte DOIT être tronqué proprement avec whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px'. On ne coupe JAMAIS un mot en plein milieu.
ÉTAPE 1 : LA MATRICE DE CONTENU (Les textes qui changent selon le type de document)
Crée un objet TypeScript typé DOCUMENT_TEXTS qui retourne les bons mots-clés selon le type de document injecté en props. Tu vas coder EXACTEMENT ceci :

type DocType = 'facture' | 'devis' | 'avoir' | 'bon_commande' | 'bon_livraison' | 'compte';interface DocTexts {  title: string;  subtitle: string;  tableTitle: string;  totalLabel: string;  legalText: string;  hasTVA: boolean;}const DOCUMENT_TEXTS: Record<DocType, DocTexts> = {  facture: {    title: 'FACTURE',    subtitle: 'Document de facturation standard',    tableTitle: 'PRESTATION / DESCRIPTION',    totalLabel: 'TOTAL TTC',    legalText: 'Paiement sous 30 jours. Indemnité forfaitaire pour frais de recouvrement : 40€ (Art. L.441-6 du Code de commerce). Pénalités de retard calculées sur la base de trois fois le taux d'intérêt légal.',    hasTVA: true  },  devis: {    title: 'DEVIS',    subtitle: 'Proposition commerciale',    tableTitle: 'PRESTATION / DESCRIPTION',    totalLabel: 'TOTAL HT',    legalText: 'Ce devis est valable 1 mois à compter de la date d'émission. En cas d'acceptation de ce devis par le client, il vaut contrat. TVA non applicable sur les devis.',    hasTVA: false  },  avoir: {    title: 'AVOIR',    subtitle: 'Note de crédit / Remboursement',    tableTitle: 'DÉTAIL DES AVOIRS',    totalLabel: 'TOTAL TTC AVOIR',    legalText: 'Cet avoir annule et remplace la facture de référence. Il entraîne soit un remboursement, soit une compensation sur une prochaine facture.',    hasTVA: true  },  bon_commande: {    title: 'BON DE COMMANDE',    subtitle: 'Confirmation de votre commande',    tableTitle: 'ARTICLES COMMANDÉS',    totalLabel: 'TOTAL HT',    legalText: 'Nous vous remercions de votre commande. Le contrat s'appliquera dès réception de ce bon de commande. Aucune TVA applicable sur les bons de commande.',    hasTVA: false  },  bon_livraison: {    title: 'BON DE LIVRAISON',    subtitle: 'Accusé de réception des marchandises',    tableTitle: 'MARCHANDISES LIVRÉES',    totalLabel: 'QUANTITÉ LIVRÉE',    legalText: 'Le destinataire dispose d'un délai de 3 jours ouvrables à compter de la réception pour signaler tout dommage ou manquant. En cas de litige, tribunal compétent du siège du vendeur.',    hasTVA: false  },  compte: {    title: 'ACOMPTE',    subtitle: 'Reçu de paiement / Acompte',    tableTitle: 'DÉTAIL DE L'ACOMPTE',    totalLabel: 'MONTANT TOTAL',    legalText: 'Le solde restant dû sera exigible à la réception de la facture finale. Le paiement de cet acompte confirme l'acceptation des conditions générales de vente.',    hasTVA: false  }};
ÉTAPE 2 : LA MATRICE DE STYLE (L'apparence visuelle selon le template)
Crée un objet TypeScript typé TEMPLATE_STYLES qui change fondamentalement l'apparence selon le template injecté en props. Tu vas coder EXACTEMENT ceci :

typescript

type TemplateId = 'minimaliste' | 'classique' | 'moderne' | 'élégant' | 'corporate' | 'nature';
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#000000',
    titleSize: '24px',
    titleWeight: '800',
    headerAlign: 'left',
    tableBorder: 'none',
    textPadding: '15px 0',
    totalTextSize: '22px'
  },
  classique: {
    fontFamily: 'Georgia, serif',
    primaryColor: '#1f2937',
    titleSize: '28px',
    titleWeight: '700',
    headerAlign: 'center',
    tableBorder: '1px solid #e5e7eb',
    textPadding: '20px 0',
    totalTextSize: '26px'
  },
  moderne: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#2563EB',
    titleSize: '24px',
    titleWeight: '800',
    headerAlign: 'left',
    tableBorder: '1px solid #E5E7EB',
    textPadding: '20px 0',
    totalTextSize: '24px'
  },
  élégant: {
    fontFamily: 'Playfair Display, serif',
    primaryColor: '#1F2937',
    titleSize: '26px',
    titleWeight: '700',
    headerAlign: 'center',
    tableBorder: 'none',
    textPadding: '20px 0',
    totalTextSize: '24px'
  },
  corporate: {
    fontFamily: 'Arial, sans-serif',
    primaryColor: '#1E3A5F',
    titleSize: '22px',
    titleWeight: '900',
    headerAlign: 'left',
    tableBorder: '2px solid #1E3A5F',
    textPadding: '20px 0',
    totalTextSize: '22px'
  },
  nature: {
    fontFamily: 'Verdana, sans-serif',
    primaryColor: '#166534',
    titleSize: '24px',
    titleWeight: '700',
    headerAlign: 'center',
    tableBorder: '1px dashed #166534',
    textPadding: '20px 0',
    totalTextSize: '24px'
  }
};
ÉTAPE 3 : CONSTRUCTION DU COMPOSANT
Reconstruis le composant de rendu en utilisant IMPÉRATIVEMENT les objets DOCUMENT_TEXTS et TEMPLATE_STYLES passés en props.

Document racine : Applique le fontFamily du template sur la balise <Document>.
En-tête : Flexbox (Logo à gauche, Infos Émetteur au milieu/à droite selon headerAlign, Infos Client alignées à l'opposé). Le titre principal prend titleSize, titleWeight et primaryColor. Le sous-titre est en fontSize: '11px', color: '#6b7280'. L'adresse du client DOIT figurer sous son nom (même si elle est vide, le placeholder doit être visible).
Tableau des lignes : Utilise un vrai <table> HTML natif avec <thead> et <tbody>. La bordure du <th> est définie par tableBorder. Les cellules de texte ont un padding: '8px 10px'.
Gestion TVA : Utilise la variable hasTVA de la matrice de contenu pour DECIDER si tu affiches la colonne TVA dans le tableau. Si hasTaper est false (pour Devis, Bons, Comptes), tu CACHES la colonne TVA.
Bloc Total : Le label du total doit utiliser totalLabel. Le montant lui-même utilise fontSize: totalTextSize (du style), fontWeight: '800', marginTop: '30px', paddingTop: '20px', borderTop: '3px solid #000000'.
Conditions Spécifiques :
Pour le type 'devis' UNIQUEMENT : Ajoute un bloc de conditions d'acceptation juste au-dessus du total ou en bas de page, avec un borderBottom: '1px dashed #000000', et le legalText du devis en fontSize: '9px', fontStyle: 'italic', color: '#374151', marginTop: '15px'.
Pour tous les autres types : Le legalText va dans un footer séparé en bas de page avec marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #d1d5db'. Le texte lui-même doit être en fontSize: '8px', color: '#6b7280'.
Indemnité forfaitaire : Assure-toi que "40€" est bien écrit "40,00 €" dans le texte légal de la facture.
CONTRAINTES FINALES
Ne génère AUCUNE donnée factice (mock data) dans le composant. Tout doit venir des props (invoiceData).
Fais un composant unique, propre et ultra-lisible, prêt à être appelé avec n'importe quelle combinaison de DocType et TemplateId.
Le code doit être 100% syntaxiquement correct pour TypeScript.
Ne me sors aucun texte d'explication dans ta réponse, je veux UNIQUEMENT le code complet du composant React/TypeScript.