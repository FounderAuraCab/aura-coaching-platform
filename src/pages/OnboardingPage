import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Building2, Users, Clock, Target, TrendingUp } from 'lucide-react'

interface OnboardingData {
  institute_name: string
  monthly_revenue: string
  team_size: string
  main_problem: string
  hours_worked_per_week: string
}

const STEPS = [
  {
    key: 'institute_name',
    title: "Comment s'appelle votre institut ?",
    subtitle: "Cette information nous permet de personnaliser votre expérience.",
    icon: Building2,
    type: 'text',
    placeholder: "Ex: Institut Beauté Divine"
  },
  {
    key: 'monthly_revenue',
    title: "Quel est votre chiffre d'affaires mensuel ?",
    subtitle: "Cette donnée reste strictement confidentielle et sert uniquement à calibrer nos recommandations.",
    icon: TrendingUp,
    type: 'select',
    options: [
      { value: 'less_5k', label: "Moins de 5 000 €" },
      { value: '5k_10k', label: "5 000 € - 10 000 €" },
      { value: '10k_20k', label: "10 000 € - 20 000 €" },
      { value: '20k_50k', label: "20 000 € - 50 000 €" },
      { value: 'more_50k', label: "Plus de 50 000 €" }
    ]
  },
  {
    key: 'team_size',
    title: "Combien de personnes travaillent avec vous ?",
    subtitle: "Incluez-vous dans le compte.",
    icon: Users,
    type: 'select',
    options: [
      { value: 'solo', label: "Je suis seule" },
      { value: '2_3', label: "2-3 personnes" },
      { value: '4_6', label: "4-6 personnes" },
      { value: '7_plus', label: "7 personnes ou plus" }
    ]
  },
  {
    key: 'hours_worked_per_week',
    title: "Combien d'heures travaillez-vous par semaine ?",
    subtitle: "Soyez honnête, c'est important pour le diagnostic.",
    icon: Clock,
    type: 'select',
    options: [
      { value: 'less_35', label: "Moins de 35h" },
      { value: '35_45', label: "35h - 45h" },
      { value: '45_55', label: "45h - 55h" },
      { value: '55_65', label: "55h - 65h" },
      { value: 'more_65', label: "Plus de 65h" }
    ]
  },
  {
    key: 'main_problem',
    title: "Quel est votre plus gros problème aujourd'hui ?",
    subtitle: "Choisissez celui qui vous pèse le plus au quotidien.",
    icon: Target,
    type: 'select',
    options: [
      { value: 'time', label: "Je manque de temps pour tout faire" },
      { value: 'team', label: "Mon équipe ne fait pas les choses comme je veux" },
      { value: 'revenue', label: "Je n'arrive pas à augmenter mon CA" },
      { value: 'clients', label: "J'ai du mal à fidéliser mes clientes" },
      { value: 'exhaustion', label: "Je suis épuisée et je ne vois pas de sortie" }
    ]
  }
]

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    institute_name: '',
    monthly_revenue: '',
    team_size: '',
    main_problem: '',
    hours_worked_per_week: ''
  })

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  const currentValue = data[step.key as keyof OnboardingData]
  const canProceed = currentValue.trim() !== ''

  const handleNext = async () => {
    if (!canProceed) return

    if (isLastStep) {
      await handleSubmit()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          institute_name: data.institute_name,
          monthly_revenue: data.monthly_revenue,
          team_size: data.team_size,
          main_problem: data.main_problem,
          hours_worked_per_week: data.hours_worked_per_week,
          onboarding_completed: true
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      toast.success('Bienvenue dans votre espace !')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error saving onboarding:', error)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectOption = (value: string) => {
    setData(prev => ({ ...prev, [step.key]: value }))
  }

  const StepIcon = step.icon

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundColor: '#F5F3EF',
        backgroundImage: `radial-gradient(circle at 50% 0%, rgba(245, 243, 239, 1) 0%, rgba(238, 235, 229, 1) 100%)`,
      }}
    >
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader className="text-center pb-2">
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-[#2C5F6F]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="w-12 h-12 rounded-full bg-[#2C5F6F]/10 flex items-center justify-center mx-auto mb-4">
              <StepIcon className="w-6 h-6 text-[#2C5F6F]" />
            </div>

            <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
            <CardDescription>{step.subtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step.type === 'text' ? (
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setData(prev => ({ ...prev, [step.key]: e.target.value }))}
                placeholder={step.placeholder}
                className="w-full px-4 py-3 border-b-2 border-gray-200 focus:border-[#2C5F6F] outline-none bg-transparent transition-colors"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px' }}
                autoFocus
              />
            ) : (
              <div className="space-y-2">
                {step.options?.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelectOption(option.value)}
                    className={`w-full p-4 text-left transition-all ${
                      currentValue === option.value
                        ? 'bg-[#2C5F6F] text-white'
                        : 'bg-[#F5F3EF] hover:bg-[#E8E5DF] text-[#2C2C2C]'
                    }`}
                    style={{
                      borderRadius: '1px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={isFirstStep ? 'w-full' : 'flex-1'}
              >
                {isSubmitting ? (
                  'Enregistrement...'
                ) : isLastStep ? (
                  'Commencer mon diagnostic'
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reassurance */}
        <p
          className="text-center mt-6"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}
        >
          🔒 Vos données sont confidentielles et ne seront jamais partagées.
        </p>
      </motion.div>
    </div>
  )
}
