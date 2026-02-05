// Liste des activités typiques d'un institut de beauté
// Chaque activité est pré-catégorisée pour le tri automatique dans les bacs

export type BucketType = 'poubelle' | 'robot' | 'usine' | 'trone'
export type ValueCategory = 'admin' | 'prestation' | 'relation' | 'developpement' | 'pause'

export interface Activity {
  id: string
  label: string
  category: ValueCategory
  hourlyValue: number
  defaultBucket: BucketType
  description?: string
}

export const INSTITUTE_ACTIVITIES: Activity[] = [
  // === ADMINISTRATIF (15€/h) ===
  // -> Majoritairement "usine" (délégable) ou "robot" (automatisable)
  
  // Comptabilité & Finances
  { id: 'compta_factures', label: 'Édition des factures', category: 'admin', hourlyValue: 15, defaultBucket: 'robot' },
  { id: 'compta_relance', label: 'Relance des impayés', category: 'admin', hourlyValue: 15, defaultBucket: 'robot' },
  { id: 'compta_rapprochement', label: 'Rapprochement bancaire', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'compta_caisse', label: 'Comptage de caisse', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'compta_declaration', label: 'Préparation déclarations (TVA, URSSAF)', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  
  // Gestion des stocks
  { id: 'stock_inventaire', label: 'Inventaire des produits', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'stock_commandes', label: 'Passage des commandes fournisseurs', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'stock_reception', label: 'Réception et rangement des livraisons', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'stock_etiquetage', label: 'Étiquetage des produits', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  
  // Ménage & Entretien
  { id: 'menage_cabine', label: 'Nettoyage des cabines', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'menage_salon', label: 'Ménage du salon (sol, vitres)', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'menage_linge', label: 'Lavage et pliage du linge', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'menage_sanitaires', label: 'Nettoyage des sanitaires', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'menage_poubelles', label: 'Sortie des poubelles', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  
  // Administratif divers
  { id: 'admin_courrier', label: 'Traitement du courrier', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'admin_classement', label: 'Classement et archivage', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  { id: 'admin_planning_papier', label: 'Gestion planning papier', category: 'admin', hourlyValue: 15, defaultBucket: 'robot' },
  { id: 'admin_email_tri', label: 'Tri des emails', category: 'admin', hourlyValue: 15, defaultBucket: 'usine' },
  
  // === PRESTATION (50€/h) ===
  // -> Majoritairement "trône" (elle seule) sauf préparation
  
  // Soins visage
  { id: 'soin_visage_classique', label: 'Soin visage classique', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'soin_visage_anti_age', label: 'Soin anti-âge', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'soin_visage_acne', label: 'Soin peau à problèmes', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'soin_visage_hydratant', label: 'Soin hydratant', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  
  // Soins corps
  { id: 'soin_corps_massage', label: 'Massage relaxant', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'soin_corps_minceur', label: 'Soin minceur/palper-rouler', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'soin_corps_gommage', label: 'Gommage corps', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'soin_corps_enveloppement', label: 'Enveloppement', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  
  // Épilation
  { id: 'epilation_jambes', label: 'Épilation jambes', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'epilation_maillot', label: 'Épilation maillot', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'epilation_aisselles', label: 'Épilation aisselles', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'epilation_visage', label: 'Épilation visage (sourcils, lèvre)', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  
  // Ongles
  { id: 'ongle_manucure', label: 'Manucure', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'ongle_pedicure', label: 'Pédicure', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'ongle_vernis_semi', label: 'Pose vernis semi-permanent', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'ongle_gel', label: 'Pose gel / résine', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  
  // Maquillage
  { id: 'maquillage_jour', label: 'Maquillage jour', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'maquillage_soiree', label: 'Maquillage soirée/mariée', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'maquillage_cours', label: 'Cours d\'auto-maquillage', category: 'prestation', hourlyValue: 50, defaultBucket: 'trone' },
  
  // Préparation cabine (délégable)
  { id: 'prepa_cabine', label: 'Préparation cabine avant soin', category: 'prestation', hourlyValue: 50, defaultBucket: 'usine' },
  { id: 'prepa_produits', label: 'Préparation des produits', category: 'prestation', hourlyValue: 50, defaultBucket: 'usine' },
  
  // === RELATION (50€/h) ===
  // -> Mix "robot" (automatisable) et "trône" (humain requis)
  
  // Accueil & Service client
  { id: 'relation_accueil', label: 'Accueil physique des clientes', category: 'relation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'relation_telephone', label: 'Réponse téléphone', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  { id: 'relation_conseil_vente', label: 'Conseil et vente de produits', category: 'relation', hourlyValue: 50, defaultBucket: 'trone' },
  { id: 'relation_reclamation', label: 'Gestion des réclamations', category: 'relation', hourlyValue: 50, defaultBucket: 'trone' },
  
  // Communication digitale
  { id: 'relation_rdv_confirmation', label: 'Confirmation des RDV', category: 'relation', hourlyValue: 50, defaultBucket: 'robot' },
  { id: 'relation_rdv_rappel', label: 'Rappels de RDV', category: 'relation', hourlyValue: 50, defaultBucket: 'robot' },
  { id: 'relation_email_client', label: 'Réponse aux emails clients', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  { id: 'relation_avis_reponse', label: 'Réponse aux avis Google', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  
  // Réseaux sociaux
  { id: 'relation_instagram_post', label: 'Création de posts Instagram', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  { id: 'relation_instagram_stories', label: 'Stories Instagram', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  { id: 'relation_instagram_scroll', label: 'Scroller sur Instagram "pour s\'inspirer"', category: 'relation', hourlyValue: 50, defaultBucket: 'poubelle' },
  { id: 'relation_facebook', label: 'Gestion page Facebook', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  { id: 'relation_reponse_dm', label: 'Réponse aux messages privés', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  
  // Fidélisation
  { id: 'relation_anniversaire', label: 'Envoi messages anniversaire', category: 'relation', hourlyValue: 50, defaultBucket: 'robot' },
  { id: 'relation_promo', label: 'Envoi des promotions', category: 'relation', hourlyValue: 50, defaultBucket: 'robot' },
  { id: 'relation_newsletter', label: 'Rédaction newsletter', category: 'relation', hourlyValue: 50, defaultBucket: 'usine' },
  
  // === DÉVELOPPEMENT (500€/h) ===
  // -> 100% "trône" (stratégique)
  
  // Stratégie
  { id: 'dev_strategie_ca', label: 'Analyse et stratégie CA', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_strategie_offre', label: 'Création de nouvelles offres', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_strategie_prix', label: 'Révision de la politique tarifaire', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_strategie_positionnement', label: 'Travail sur le positionnement', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  
  // Management
  { id: 'dev_management_reunion', label: 'Réunion d\'équipe', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_management_entretien', label: 'Entretiens individuels', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_management_recrutement', label: 'Recrutement', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_management_formation', label: 'Formation de l\'équipe', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  
  // Commercial
  { id: 'dev_commercial_partenariat', label: 'Négociation partenariats', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_commercial_btob', label: 'Prospection B2B (hôtels, entreprises)', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_commercial_evenement', label: 'Organisation d\'événements', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  
  // Formation personnelle
  { id: 'dev_formation_technique', label: 'Formation technique (nouveaux soins)', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  { id: 'dev_formation_business', label: 'Formation business/gestion', category: 'developpement', hourlyValue: 500, defaultBucket: 'trone' },
  
  // === PAUSE (0€/h) ===
  // -> À évaluer selon le contexte
  
  { id: 'pause_dejeuner', label: 'Pause déjeuner', category: 'pause', hourlyValue: 0, defaultBucket: 'trone' },
  { id: 'pause_cafe', label: 'Pause café', category: 'pause', hourlyValue: 0, defaultBucket: 'trone' },
  { id: 'pause_telephone_perso', label: 'Téléphone personnel', category: 'pause', hourlyValue: 0, defaultBucket: 'poubelle' },
  { id: 'pause_scroll_perso', label: 'Réseaux sociaux personnels', category: 'pause', hourlyValue: 0, defaultBucket: 'poubelle' },
]

// Mapping catégorie Time Study -> Valeur horaire
export const CATEGORY_HOURLY_VALUE: Record<string, number> = {
  'ADMINISTRATIF': 15,
  'PRESTATION': 50,
  'RELATION': 50,
  'DEVELOPPEMENT': 500,
  'PAUSE': 0,
}

// Labels pour les bacs
export const BUCKET_CONFIG = {
  poubelle: {
    id: 'poubelle',
    label: 'La Poubelle',
    subtitle: 'Suppression',
    description: 'Tâches qui n\'apportent aucune valeur',
    color: 'bg-red-50 border-red-200',
    iconColor: 'text-red-500',
  },
  robot: {
    id: 'robot',
    label: 'Le Robot',
    subtitle: 'Automatisation',
    description: 'Tâches répétitives automatisables',
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
  },
  usine: {
    id: 'usine',
    label: 'L\'Usine',
    subtitle: 'Délégation',
    description: 'Tâches à documenter et déléguer',
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
  },
  trone: {
    id: 'trone',
    label: 'Le Trône',
    subtitle: 'Dirigeante',
    description: 'Tâches stratégiques que vous seule devez faire',
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-500',
  },
}

// Fonction pour calculer les métriques financières
export function calculateFinancialMetrics(
  monthlyRevenue: number,
  weeklyPrestationHours: number,
  weeklyAdminHours: number
) {
  // Taux horaire réel en prestation
  const hourlyPrestationRate = monthlyRevenue / (weeklyPrestationHours * 4)
  
  // Fuite de cash hebdomadaire
  const weeklyLeakage = weeklyAdminHours * (hourlyPrestationRate - 15)
  
  // Fuite mensuelle et annuelle
  const monthlyLeakage = weeklyLeakage * 4
  const yearlyLeakage = monthlyLeakage * 12
  
  return {
    hourlyPrestationRate: Math.round(hourlyPrestationRate),
    weeklyLeakage: Math.round(weeklyLeakage),
    monthlyLeakage: Math.round(monthlyLeakage),
    yearlyLeakage: Math.round(yearlyLeakage),
  }
}

// Fonction pour obtenir la répartition par valeur horaire
export function getValueDistribution(timeEntries: Array<{ category: string; hour_slot: string }>) {
  const distribution = {
    low: 0,      // 15€/h
    medium: 0,   // 50€/h
    high: 0,     // 500€/h
    zero: 0,     // 0€/h (pause)
  }
  
  timeEntries.forEach(entry => {
    const value = CATEGORY_HOURLY_VALUE[entry.category] || 0
    if (value === 15) distribution.low++
    else if (value === 50) distribution.medium++
    else if (value === 500) distribution.high++
    else distribution.zero++
  })
  
  return distribution
}
