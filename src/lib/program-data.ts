import { FileText, Calendar, Target, Users, BarChart3, Lightbulb, CheckCircle, Settings, Rocket, Smartphone, PieChart, Factory, Bot } from 'lucide-react'

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
    type: 'link' | 'file' | 'text' | 'app' | 'analysis'
    required: boolean
    appUrl?: string
  }[]
  resources: {
    title: string
    url: string
    type: 'template' | 'video' | 'guide' | 'tool' | 'app'
  }[]
  isTimeStudy?: boolean
  isAnalysis?: boolean
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
        text: 'Acceder a l\'application Altarys Conseil avec vos identifiants'
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
        description: 'Connectez-vous avec vos identifiants pour commencer le suivi',
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
      }
    ]
  },
  {
    number: 2,
    title: 'Analyse Strategique',
    subtitle: 'Revelation & Tri',
    description: 'Decouvrez ou part votre temps, combien il vous coute, et organisez vos taches pour maximiser votre valeur.',
    durationWeeks: 1,
    isAnalysis: true,
    objectives: [
      {
        icon: 'PieChart',
        text: 'Visualiser la repartition de votre temps par valeur horaire (15€, 50€, 500€)'
      },
      {
        icon: 'BarChart3',
        text: 'Comprendre votre "fuite de cash" mensuelle et annuelle'
      },
      {
        icon: 'Settings',
        text: 'Organiser vos taches dans les 4 bacs : Poubelle, Robot, Usine, Trone'
      }
    ],
    deliverables: [
      {
        title: 'Dashboard d\'analyse',
        description: 'Vos metriques sont calculees automatiquement depuis votre Time Study',
        type: 'analysis',
        required: true
      }
    ],
    resources: []
  },
  {
    number: 3,
    title: 'Delegation Efficace',
    subtitle: 'L\'Usine en Action',
    description: 'Transformer les taches du bac "Usine" en procedures documentees et les deleguer efficacement.',
    durationWeeks: 3,
    objectives: [
      {
        icon: 'Factory',
        text: 'Reprendre les taches identifiees dans le bac Usine'
      },
      {
        icon: 'FileText',
        text: 'Creer des procedures (SOP) pour chaque tache delegable'
      },
      {
        icon: 'Users',
        text: 'Former et accompagner sur les premieres delegations'
      }
    ],
    deliverables: [
      {
        title: 'Procedures documentees',
        description: 'Au moins 3 procedures de taches deleguees',
        type: 'file',
        required: true
      },
      {
        title: 'Plan de delegation',
        description: 'Liste des taches avec responsables assignes et echeances',
        type: 'file',
        required: true
      }
    ],
    resources: [
      {
        title: 'Template Procedure SOP',
        url: '/templates/procedure-sop.docx',
        type: 'template'
      },
      {
        title: 'Guide : Deleguer sans stress',
        url: '/guides/deleguer-sans-stress.pdf',
        type: 'guide'
      }
    ]
  },
  {
    number: 4,
    title: 'Automatisation',
    subtitle: 'Le Robot en Marche',
    description: 'Mettre en place les automatisations pour les taches du bac "Robot" et liberer votre temps.',
    durationWeeks: 2,
    objectives: [
      {
        icon: 'Bot',
        text: 'Reprendre les taches identifiees dans le bac Robot'
      },
      {
        icon: 'Settings',
        text: 'Configurer les outils d\'automatisation (confirmations RDV, relances, etc.)'
      },
      {
        icon: 'Rocket',
        text: 'Tester et valider chaque automatisation'
      }
    ],
    deliverables: [
      {
        title: 'Liste des automatisations actives',
        description: 'Capture d\'ecran ou documentation de chaque automatisation mise en place',
        type: 'file',
        required: true
      }
    ],
    resources: [
      {
        title: 'Guide Automatisation RDV',
        url: '/guides/automatisation-rdv.pdf',
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
    subtitle: 'Le Trone Installe',
    description: 'Consolider vos acquis, mesurer les gains et installer les rituels qui garantissent votre liberte durable.',
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
        description: 'Comparaison avant/apres avec metriques (heures liberees, CA potentiel)',
        type: 'file',
        required: true
      },
      {
        title: 'Charte des rituels',
        description: 'Document recapitulatif de tous vos rituels de dirigeante',
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
        title: 'Checklist rituels dirigeante',
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
    Smartphone,
    PieChart,
    Factory,
    Bot
  }
  return icons[iconName] || FileText
}
