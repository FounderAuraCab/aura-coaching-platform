import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts'
import { 
  Trash2, Bot, Factory, Crown, Check, AlertTriangle,
  TrendingDown, GripVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  INSTITUTE_ACTIVITIES, 
  BUCKET_CONFIG, 
  calculateFinancialMetrics,
  getValueDistribution,
  type Activity,
  type BucketType 
} from '@/lib/institute-activities'
import { ActivitySelector } from '@/components/dashboard/ActivitySelector'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface Step2AnalysisProps {
  userId: string
  token: string
  monthlyRevenue: number
  timeEntries: Array<{ category: string; hour_slot: string; entry_date: string }>
  onValidationRequest: () => void
  isValidated?: boolean
}

const fetchWithAuth = async (endpoint: string, token: string) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  return response.json()
}

const postWithAuth = async (endpoint: string, token: string, body: any) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  })
  return response.json()
}

const patchWithAuth = async (endpoint: string, token: string, body: any) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  })
  return response.json()
}

// Composant Bac avec drag & drop
function Bucket({ 
  type, 
  activities, 
  onDrop 
}: { 
  type: BucketType
  activities: Activity[]
  onDrop: (activityId: string, bucket: BucketType) => void
}) {
  const config = BUCKET_CONFIG[type]
  const icons = {
    poubelle: Trash2,
    robot: Bot,
    usine: Factory,
    trone: Crown,
  }
  const Icon = icons[type]

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-stone-400')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-stone-400')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-stone-400')
    const activityId = e.dataTransfer.getData('activityId')
    if (activityId) {
      onDrop(activityId, type)
    }
  }

  return (
    <div 
      className={`flex flex-col border ${config.color} p-4 transition-all`}
      style={{ borderRadius: '1px', minHeight: '280px' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-200">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-stone-800 text-sm">{config.label}</h4>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider">{config.subtitle}</p>
        </div>
        <span className="text-xs text-stone-400 flex-shrink-0">{activities.length}</span>
      </div>

      {/* Activities */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-4">
            Glissez des tâches ici
          </p>
        ) : (
          activities.map(activity => (
            <div
              key={activity.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('activityId', activity.id)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-100 text-xs text-stone-600 cursor-grab hover:border-stone-300 transition-colors group"
              style={{ borderRadius: '1px' }}
              title={activity.label}
            >
              <GripVertical className="w-3 h-3 text-stone-300 group-hover:text-stone-400 flex-shrink-0" />
              <span className="flex-1 leading-relaxed">{activity.label}</span>
              <span className="text-[10px] text-stone-400 flex-shrink-0">{activity.hourlyValue}€</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Step2Analysis({
  userId,
  token,
  monthlyRevenue,
  timeEntries,
  onValidationRequest,
  isValidated = false
}: Step2AnalysisProps) {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [activityBuckets, setActivityBuckets] = useState<Record<string, BucketType>>({})
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Charger les activités sauvegardées
  useEffect(() => {
    const loadUserActivities = async () => {
      try {
        const data = await fetchWithAuth(
          `user_activities?user_id=eq.${userId}`,
          token
        )
        
        if (data && !data.error && data.length > 0) {
          const activities = data.map((d: any) => d.activity_id)
          const buckets: Record<string, BucketType> = {}
          data.forEach((d: any) => {
            buckets[d.activity_id] = d.bucket
          })
          
          setSelectedActivities(activities)
          setActivityBuckets(buckets)
          setShowAnalysis(true)
        }
      } catch (e) {
        console.error('Error loading activities:', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserActivities()
  }, [userId, token])

  // Calculer les métriques
  const metrics = useMemo(() => {
    const prestationHours = timeEntries.filter(e => e.category === 'PRESTATION').length
    const adminHours = timeEntries.filter(e => e.category === 'ADMINISTRATIF').length
    
    // Éviter division par zéro
    if (prestationHours === 0) {
      return {
        hourlyPrestationRate: 50, // Valeur par défaut
        weeklyLeakage: adminHours * 35,
        monthlyLeakage: adminHours * 35 * 4,
        yearlyLeakage: adminHours * 35 * 4 * 12,
      }
    }
    
    return calculateFinancialMetrics(monthlyRevenue, prestationHours, adminHours)
  }, [monthlyRevenue, timeEntries])

  // Données pour le camembert
  const pieData = useMemo(() => {
    const distribution = getValueDistribution(timeEntries)
    return [
      { name: 'Tâches à 15€/h', value: distribution.low, color: '#ef4444', label: 'Admin/Ménage' },
      { name: 'Tâches à 50€/h', value: distribution.medium, color: '#3b82f6', label: 'Prestation/Relation' },
      { name: 'Tâches à 500€/h', value: distribution.high, color: '#10b981', label: 'Stratégie' },
      { name: 'Pauses', value: distribution.zero, color: '#d1d5db', label: 'Pause' },
    ].filter(d => d.value > 0)
  }, [timeEntries])

  // Initialiser les bacs avec les valeurs par défaut
  useEffect(() => {
    if (showAnalysis && Object.keys(activityBuckets).length === 0 && selectedActivities.length > 0) {
      const defaultBuckets: Record<string, BucketType> = {}
      selectedActivities.forEach(actId => {
        const activity = INSTITUTE_ACTIVITIES.find(a => a.id === actId)
        if (activity) {
          defaultBuckets[actId] = activity.defaultBucket
        }
      })
      setActivityBuckets(defaultBuckets)
    }
  }, [showAnalysis, selectedActivities, activityBuckets])

  // Sauvegarder les activités après sélection
  const handleSelectionComplete = async () => {
    if (selectedActivities.length === 0) {
      toast.error('Veuillez sélectionner au moins une activité')
      return
    }

    setIsSaving(true)
    try {
      // Créer les buckets par défaut
      const defaultBuckets: Record<string, BucketType> = {}
      selectedActivities.forEach(actId => {
        const activity = INSTITUTE_ACTIVITIES.find(a => a.id === actId)
        if (activity) {
          defaultBuckets[actId] = activity.defaultBucket
        }
      })

      // Sauvegarder en base
      const records = selectedActivities.map(actId => ({
        user_id: userId,
        activity_id: actId,
        bucket: defaultBuckets[actId]
      }))

      const result = await postWithAuth('user_activities', token, records)
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      setActivityBuckets(defaultBuckets)
      setShowAnalysis(true)
      toast.success('Activités enregistrées')
    } catch (e) {
      console.error('Error saving:', e)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  // Déplacer une activité vers un bac
  const handleMoveToBucket = async (activityId: string, bucket: BucketType) => {
    setActivityBuckets(prev => ({ ...prev, [activityId]: bucket }))
    
    // Sauvegarder en base
    await patchWithAuth(
      `user_activities?user_id=eq.${userId}&activity_id=eq.${activityId}`,
      token,
      { bucket }
    )
  }

  // Obtenir les activités par bac
  const getActivitiesForBucket = (bucket: BucketType) => {
    return selectedActivities
      .filter(id => activityBuckets[id] === bucket)
      .map(id => INSTITUTE_ACTIVITIES.find(a => a.id === id)!)
      .filter(Boolean)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Écran de sélection des activités (style onboarding)
  if (!showAnalysis) {
    return (
      <ActivitySelector
        selectedActivities={selectedActivities}
        onSelect={setSelectedActivities}
        onComplete={handleSelectionComplete}
      />
    )
  }

  // Dashboard d'analyse
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-serif text-2xl text-stone-800 mb-2">
          Votre Analyse Stratégique
        </h2>
        <p className="text-sm text-stone-500">
          Basée sur {timeEntries.length} heures de suivi
        </p>
      </div>

      {/* Métriques financières */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Camembert Valeur Horaire */}
        <div className="lg:col-span-2 bg-white border border-stone-200 p-6" style={{ borderRadius: '1px' }}>
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
            Répartition de votre temps par valeur
          </h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}h`, '']}
                    contentStyle={{ borderRadius: '1px', border: '1px solid #e7e5e4' }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs text-stone-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-stone-400">Aucune donnée de temps disponible</p>
            </div>
          )}
        </div>

        {/* Card Fuite de Cash */}
        <div className="bg-red-50 border border-red-200 p-6" style={{ borderRadius: '1px' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-xs font-medium text-red-700 uppercase tracking-wider">
              Fuite de Cash
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">
                Votre valeur en cabine
              </p>
              <p className="font-serif text-3xl text-red-700">
                {metrics.hourlyPrestationRate} €<span className="text-lg">/h</span>
              </p>
            </div>

            <div className="h-px bg-red-200" />

            <div>
              <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">
                Perte mensuelle estimée
              </p>
              <p className="font-serif text-4xl text-red-600 font-medium">
                {metrics.monthlyLeakage.toLocaleString('fr-FR')} €
              </p>
            </div>

            <div className="h-px bg-red-200" />

            <div className="bg-red-100 p-3" style={{ borderRadius: '1px' }}>
              <p className="text-xs text-red-700 leading-relaxed">
                En faisant votre propre admin/ménage, vous perdez{' '}
                <strong>{metrics.yearlyLeakage.toLocaleString('fr-FR')} €</strong> par an.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Explication */}
      <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3" style={{ borderRadius: '1px' }}>
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-stone-700 font-medium mb-1">
            Vous êtes l'employée à 15€/h la plus chère de votre entreprise.
          </p>
          <p className="text-xs text-stone-500">
            Chaque heure passée sur des tâches à faible valeur vous coûte {Math.max(0, metrics.hourlyPrestationRate - 15)}€ en opportunité perdue.
          </p>
        </div>
      </div>

      {/* Les 4 Bacs */}
      <div>
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
          Organisation de vos tâches
        </h3>
        <p className="text-xs text-stone-400 mb-4">
          Glissez-déposez les tâches entre les bacs pour ajuster l'organisation
        </p>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Bucket
            type="poubelle"
            activities={getActivitiesForBucket('poubelle')}
            onDrop={handleMoveToBucket}
          />
          <Bucket
            type="robot"
            activities={getActivitiesForBucket('robot')}
            onDrop={handleMoveToBucket}
          />
          <Bucket
            type="usine"
            activities={getActivitiesForBucket('usine')}
            onDrop={handleMoveToBucket}
          />
          <Bucket
            type="trone"
            activities={getActivitiesForBucket('trone')}
            onDrop={handleMoveToBucket}
          />
        </div>
      </div>

      {/* Bouton de validation */}
      {!isValidated && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onValidationRequest}
            className="flex items-center gap-2 px-8 py-3 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
            style={{ borderRadius: '1px' }}
          >
            <Check className="w-4 h-4" />
            Demander la validation
          </button>
        </div>
      )}

      {isValidated && (
        <div className="text-center py-4">
          <p className="text-sm text-emerald-600 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            Organisation validée - Vous pouvez passer au Bloc 3
          </p>
        </div>
      )}
    </div>
  )
}
