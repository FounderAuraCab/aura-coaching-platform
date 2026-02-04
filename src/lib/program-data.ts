import { FileText, Calendar, Target, Users, BarChart3, Lightbulb, CheckCircle, Settings, Rocket, Smartphone } from 'lucide-react'

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
    type: 'link' | 'file' | 'text' | 'app'
    required: boolean
    appUrl?: string
  }[]
  resources: {
    title: string
    url: string
    type: 'template' | 'video' | 'guide' | 'tool' | 'app'
  }[]
  isTimeStudy?: boolean
}

export const PROGRAM_STEPS: StepData[] = [
  {
    number: 1,
    title: 'Diagnostic Operationnel',
    subtitle: 'Module Fondamental',
    description: 'Analyser precisement votre allocation de temps et identifier les leviers d\'optimisation strategique grace a notre outil de suivi.',
    durationWeeks: 2,
    isTimeStudy: true,
    objectives: [
      {
        icon: 'Smartphone',
        text: 'Acceder a l\'application Altarys Conseil avec vos identifiants AURA'
      },
      {
        icon: 'Calendar',
        text: 'Tracker chaque heure de votre journee pendant 7 jours complets'
      },
      {
        icon: 'Target',
        text: 'Vos donnees sont automatiquement analysees par votre coach'
      }
    ],
    deliverables: [
      {
        title: 'Application Time Study',
        description: 'Connectez-vous avec vos identifiants AURA pour commencer le suivi',
        type: 'app',
        required: true,
        appUrl: 'https://altarys-conseil-app.vercel.app'
      }
    ],
    resources: [
      {
        title: 'Acceder a l\'application',
        url: 'https://altarys-conseil-app.vercel.app',
        type: 'app'
      },
      {
        title: 'Guide d\'utilisation',
        url: '/guides/time-study-guide.pdf',
        type: 'guide'
      }
    ]
  },
  {
    number: 2,
    title: 'Planification Strategique',
    subtitle: 'Organisation & Priorites',
    description: 'Definir vos priorites business et creer un systeme de planification efficace aligne avec vos objectifs.',
    durationWeeks: 2,
    objectives: [
      {
        icon: 'Target',
        text: 'Identifier vos 3 priorites business pour le trimestre'
      },
      {
        icon: 'Calendar',
        text: 'Mettre en place votre systeme de planification hebdomadaire'
      },
      {
        icon: 'CheckCircle',
        text: 'Creer votre matrice de priorisation des taches'
      }
    ],
    deliverables: [
      {
        title: 'Plan strategique trimestriel',
        description: 'Document avec vos 3 priorites et leur declinaison en actions',
        type: 'file',
        required: true
      },
      {
        title: 'Planning hebdomadaire type',
        description: 'Votre semaine type optimisee',
        type: 'link',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Plan Strategique',
        url: '/templates/plan-strategique.docx',
        type: 'template'
      },
      {
        title: 'Video : La methode Eisenhower',
        url: 'https://www.youtube.com/watch?v=XXX',
        type: 'video'
      }
    ]
  },
  {
    number: 3,
    title: 'Delegation Efficace',
    subtitle: 'Liberer votre temps',
    description: 'Identifier les taches a deleguer et mettre en place des process de delegation efficaces.',
    durationWeeks: 3,
    objectives: [
      {
        icon: 'Users',
        text: 'Cartographier toutes vos taches recurrentes'
      },
      {
        icon: 'Settings',
        text: 'Creer des procedures de delegation documentees'
      },
      {
        icon: 'CheckCircle',
        text: 'Former et accompagner sur les premieres delegations'
      }
    ],
    deliverables: [
      {
        title: 'Matrice de delegation',
        description: 'Liste des taches avec responsables assignes',
        type: 'file',
        required: true
      },
      {
        title: 'Procedures documentees',
        description: 'Au moins 3 procedures de taches deleguees',
        type: 'file',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Matrice Delegation',
        url: '/templates/matrice-delegation.xlsx',
        type: 'template'
      },
      {
        title: 'Guide : Creer une procedure',
        url: '/guides/creer-procedure.pdf',
        type: 'guide'
      }
    ]
  },
  {
    number: 4,
    title: 'Optimisation des Process',
    subtitle: 'Systematisation',
    description: 'Automatiser et optimiser vos processus cles pour gagner en efficacite.',
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
        text: 'Implementer au moins 2 automatisations'
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
        description: 'Solutions identifiees et planning de mise en oeuvre',
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
        title: 'Guide Zapier pour debutants',
        url: '/guides/zapier-guide.pdf',
        type: 'guide'
      },
      {
        title: 'Liste des outils recommandes',
        url: '/guides/outils-automatisation.pdf',
        type: 'tool'
      }
    ]
  },
  {
    number: 5,
    title: 'Autonomie Operationnelle',
    subtitle: 'Perennisation',
    description: 'Consolider vos acquis et mettre en place les rituels qui garantissent votre autonomie durable.',
    durationWeeks: 2,
    objectives: [
      {
        icon: 'BarChart3',
        text: 'Mesurer les gains de temps realises depuis le debut'
      },
      {
        icon: 'Calendar',
        text: 'Installer vos rituels de management hebdomadaires'
      },
      {
        icon: 'CheckCircle',
        text: 'Finaliser votre systeme d\'amelioration continue'
      }
    ],
    deliverables: [
      {
        title: 'Bilan des gains',
        description: 'Comparaison avant/apres avec metriques',
        type: 'file',
        required: true
      },
      {
        title: 'Charte des rituels',
        description: 'Document recapitulatif de tous vos rituels',
        type: 'file',
        required: true
      },
      {
        title: 'Plan d\'amelioration continue',
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
    Rocket,
    Smartphone
  }
  return icons[iconName] || FileText
}
