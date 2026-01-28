import { FileText, Calendar, Target, Users, BarChart3, Lightbulb, CheckCircle, Settings, Rocket } from 'lucide-react'

export interface StepData {
  number: number
  title: string
  subtitle: string
  description: string
  durationWeeks: number
  objectives: {
    icon: string
    text: string
  }[]
  deliverables: {
    title: string
    description: string
    type: 'link' | 'file' | 'text'
    required: boolean
  }[]
  resources: {
    title: string
    url: string
    type: 'template' | 'video' | 'guide' | 'tool'
  }[]
}

export const PROGRAM_STEPS: StepData[] = [
  {
    number: 1,
    title: 'Diagnostic Opérationnel',
    subtitle: 'Module Fondamental',
    description: 'Analyser précisément votre allocation de temps et identifier les leviers d\'optimisation stratégique.',
    durationWeeks: 2,
    objectives: [
      {
        icon: 'FileText',
        text: 'Installer Google Sheets et créer une fiche simple de suivi de votre semaine sur 5 jours'
      },
      {
        icon: 'Calendar',
        text: 'Tracker 7 jours complets par tranche de temps de 1h'
      },
      {
        icon: 'Target',
        text: 'Envoyer le fichier complété pour validation et analyse'
      }
    ],
    deliverables: [
      {
        title: 'Tracker temps complété',
        description: 'Lien vers votre Google Sheet avec 7 jours de tracking',
        type: 'link',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Tracker Temps',
        url: 'https://docs.google.com/spreadsheets/d/TEMPLATE_ID',
        type: 'template'
      },
      {
        title: 'Guide de remplissage',
        url: '/guides/tracker-guide.pdf',
        type: 'guide'
      }
    ]
  },
  {
    number: 2,
    title: 'Planification Stratégique',
    subtitle: 'Organisation & Priorités',
    description: 'Définir vos priorités business et créer un système de planification efficace aligné avec vos objectifs.',
    durationWeeks: 2,
    objectives: [
      {
        icon: 'Target',
        text: 'Identifier vos 3 priorités business pour le trimestre'
      },
      {
        icon: 'Calendar',
        text: 'Mettre en place votre système de planification hebdomadaire'
      },
      {
        icon: 'CheckCircle',
        text: 'Créer votre matrice de priorisation des tâches'
      }
    ],
    deliverables: [
      {
        title: 'Plan stratégique trimestriel',
        description: 'Document avec vos 3 priorités et leur déclinaison en actions',
        type: 'file',
        required: true
      },
      {
        title: 'Planning hebdomadaire type',
        description: 'Votre semaine type optimisée',
        type: 'link',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Plan Stratégique',
        url: '/templates/plan-strategique.docx',
        type: 'template'
      },
      {
        title: 'Vidéo : La méthode Eisenhower',
        url: 'https://www.youtube.com/watch?v=XXX',
        type: 'video'
      }
    ]
  },
  {
    number: 3,
    title: 'Délégation Efficace',
    subtitle: 'Libérer votre temps',
    description: 'Identifier les tâches à déléguer et mettre en place des process de délégation efficaces.',
    durationWeeks: 3,
    objectives: [
      {
        icon: 'Users',
        text: 'Cartographier toutes vos tâches récurrentes'
      },
      {
        icon: 'Settings',
        text: 'Créer des procédures de délégation documentées'
      },
      {
        icon: 'CheckCircle',
        text: 'Former et accompagner sur les premières délégations'
      }
    ],
    deliverables: [
      {
        title: 'Matrice de délégation',
        description: 'Liste des tâches avec responsables assignés',
        type: 'file',
        required: true
      },
      {
        title: 'Procédures documentées',
        description: 'Au moins 3 procédures de tâches déléguées',
        type: 'file',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Matrice Délégation',
        url: '/templates/matrice-delegation.xlsx',
        type: 'template'
      },
      {
        title: 'Guide : Créer une procédure',
        url: '/guides/creer-procedure.pdf',
        type: 'guide'
      }
    ]
  },
  {
    number: 4,
    title: 'Optimisation des Process',
    subtitle: 'Systématisation',
    description: 'Automatiser et optimiser vos processus clés pour gagner en efficacité.',
    durationWeeks: 3,
    objectives: [
      {
        icon: 'Settings',
        text: 'Identifier vos 5 processus les plus chronophages'
      },
      {
        icon: 'Lightbulb',
        text: 'Proposer des optimisations et automatisations'
      },
      {
        icon: 'Rocket',
        text: 'Implémenter au moins 2 automatisations'
      }
    ],
    deliverables: [
      {
        title: 'Audit des processus',
        description: 'Analyse des 5 processus avec temps et points de friction',
        type: 'file',
        required: true
      },
      {
        title: 'Plan d\'automatisation',
        description: 'Solutions identifiées et planning de mise en œuvre',
        type: 'file',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Audit Process',
        url: '/templates/audit-process.xlsx',
        type: 'template'
      },
      {
        title: 'Guide Zapier pour débutants',
        url: '/guides/zapier-guide.pdf',
        type: 'guide'
      },
      {
        title: 'Liste des outils recommandés',
        url: '/guides/outils-automatisation.pdf',
        type: 'tool'
      }
    ]
  },
  {
    number: 5,
    title: 'Autonomie Opérationnelle',
    subtitle: 'Pérennisation',
    description: 'Consolider vos acquis et mettre en place les rituels qui garantissent votre autonomie durable.',
    durationWeeks: 2,
    objectives: [
      {
        icon: 'BarChart3',
        text: 'Mesurer les gains de temps réalisés depuis le début'
      },
      {
        icon: 'Calendar',
        text: 'Installer vos rituels de management hebdomadaires'
      },
      {
        icon: 'CheckCircle',
        text: 'Finaliser votre système d\'amélioration continue'
      }
    ],
    deliverables: [
      {
        title: 'Bilan des gains',
        description: 'Comparaison avant/après avec métriques',
        type: 'file',
        required: true
      },
      {
        title: 'Charte des rituels',
        description: 'Document récapitulatif de tous vos rituels',
        type: 'file',
        required: true
      },
      {
        title: 'Plan d\'amélioration continue',
        description: 'Votre feuille de route pour les 6 prochains mois',
        type: 'file',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Bilan',
        url: '/templates/bilan-accompagnement.docx',
        type: 'template'
      },
      {
        title: 'Checklist rituels manager',
        url: '/guides/checklist-rituels.pdf',
        type: 'guide'
      }
    ]
  }
]

export const getStepIcon = (iconName: string) => {
  const icons: Record<string, typeof FileText> = {
    FileText,
    Calendar,
    Target,
    Users,
    BarChart3,
    Lightbulb,
    CheckCircle,
    Settings,
    Rocket
  }
  return icons[iconName] || FileText
}
