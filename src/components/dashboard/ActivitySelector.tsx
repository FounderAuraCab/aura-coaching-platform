import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, ChevronLeft, Check, Briefcase, Sparkles, Users, TrendingUp, Coffee } from 'lucide-react'
import { INSTITUTE_ACTIVITIES, type Activity } from '@/lib/institute-activities'

interface ActivitySelectorProps {
  selectedActivities: string[]
  onSelect: (ids: string[]) => void
  onComplete: () => void
}

const CATEGORIES = [
  { 
    key: 'admin', 
    label: 'Administratif & Ménage',
    description: 'Les tâches de gestion quotidienne et d\'entretien',
    icon: Briefcase,
    color: 'bg-amber-500'
  },
  { 
    key: 'prestation', 
    label: 'Prestations',
    description: 'Les soins et services que vous réalisez en cabine',
    icon: Sparkles,
    color: 'bg-emerald-500'
  },
  { 
    key: 'relation', 
    label: 'Relation Client',
    description: 'La communication et le suivi de votre clientèle',
    icon: Users,
    color: 'bg-blue-500'
  },
  { 
    key: 'developpement', 
    label: 'Développement',
    description: 'Les activités stratégiques et de croissance',
    icon: TrendingUp,
    color: 'bg-purple-500'
  },
  { 
    key: 'pause', 
    label: 'Pauses',
    description: 'Vos moments de repos',
    icon: Coffee,
    color: 'bg-stone-500'
  },
]

export function ActivitySelector({ selectedActivities, onSelect, onComplete }: ActivitySelectorProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const currentCategory = CATEGORIES[currentStep]
  const activities = INSTITUTE_ACTIVITIES.filter(a => a.category === currentCategory.key)
  const selectedInCategory = activities.filter(a => selectedActivities.includes(a.id))
  
  const isLastStep = currentStep === CATEGORIES.length - 1
  const progress = ((currentStep + 1) / CATEGORIES.length) * 100

  const toggleActivity = (id: string) => {
    if (selectedActivities.includes(id)) {
      onSelect(selectedActivities.filter(a => a !== id))
    } else {
      onSelect([...selectedActivities, id])
    }
  }

  const selectAll = () => {
    const allIds = activities.map(a => a.id)
    const allSelected = allIds.every(id => selectedActivities.includes(id))
    
    if (allSelected) {
      onSelect(selectedActivities.filter(id => !allIds.includes(id)))
    } else {
      onSelect([...new Set([...selectedActivities, ...allIds])])
    }
  }

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const Icon = currentCategory.icon

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-400">
            Catégorie {currentStep + 1} sur {CATEGORIES.length}
          </span>
          <span className="text-xs text-stone-500">
            {selectedActivities.length} activités sélectionnées
          </span>
        </div>
        <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-stone-800"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {/* Category header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 ${currentCategory.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-serif text-2xl text-stone-800 mb-2">
              {currentCategory.label}
            </h2>
            <p className="text-sm text-stone-500">
              {currentCategory.description}
            </p>
          </div>

          {/* Question */}
          <div className="bg-white border border-stone-200 p-6 mb-6" style={{ borderRadius: '1px' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-stone-700">
                Quelles activités faites-vous dans cette catégorie ?
              </p>
              <button
                onClick={selectAll}
                className="text-xs text-stone-500 hover:text-stone-700 underline"
              >
                {activities.every(a => selectedActivities.includes(a.id)) 
                  ? 'Tout désélectionner' 
                  : 'Tout sélectionner'}
              </button>
            </div>

            {/* Activities grid */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {activities.map((activity) => {
                const isSelected = selectedActivities.includes(activity.id)
                return (
                  <button
                    key={activity.id}
                    onClick={() => toggleActivity(activity.id)}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-all ${
                      isSelected
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                    style={{ borderRadius: '1px' }}
                  >
                    <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-white bg-white'
                        : 'border-stone-300'
                    }`} style={{ borderRadius: '1px' }}>
                      {isSelected && (
                        <Check className="w-3 h-3 text-stone-800" />
                      )}
                    </div>
                    <span className="text-sm leading-relaxed">
                      {activity.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Selected count */}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-xs text-stone-400 text-center">
                {selectedInCategory.length} / {activities.length} sélectionnées dans cette catégorie
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            currentStep === 0
              ? 'text-stone-300 cursor-not-allowed'
              : 'text-stone-600 hover:text-stone-800'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        {/* Step indicators */}
        <div className="flex gap-2">
          {CATEGORIES.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-stone-800'
                  : index < currentStep
                  ? 'bg-stone-400'
                  : 'bg-stone-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-2 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
          style={{ borderRadius: '1px' }}
        >
          {isLastStep ? 'Voir mon analyse' : 'Suivant'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
