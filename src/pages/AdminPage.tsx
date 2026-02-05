import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { toast } from 'sonner'
import { 
  Users, ArrowLeft, CheckCircle, Clock, 
  RefreshCw, Eye, Send, Building2, UserCheck,
  BarChart3, Lock, Hourglass
} from 'lucide-react'
import type { Profile, Program, StepProgress, Submission } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface StepInfo {
  number: number
  title: string
}

interface StepProgressWithDetails extends StepProgress {
  submissions: Submission[]
  steps: StepInfo
}

interface ClientData {
  profile: Profile
  program: Program
  stepProgress: StepProgressWithDetails[]
  timeEntries?: TimeEntryStats
}

interface TimeEntryStats {
  total: number
  byCategory: Record<string, number>
  dates: string[]
}

interface TimeEntry {
  id: string
  user_id: string
  entry_date: string
  hour_slot: string
  category: string
  created_at: string
}

const getToken = (session: any): string | null => {
  if (session?.access_token) return session.access_token
  try {
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.access_token
    }
  } catch (e) {
    console.error('Error getting token:', e)
  }
  return null
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

export default function AdminPage() {
  const { isAdmin, session } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientData[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
      return
    }
    fetchClients()
  }, [isAdmin, navigate])

  const fetchClients = async () => {
    const token = getToken(session)
    if (!token) return

    setIsLoading(true)
    try {
      const profiles = await fetchWithAuth('profiles?role=eq.client&order=created_at.desc', token)
      if (!profiles || profiles.error) throw new Error('Failed to fetch profiles')

      const clientsData: ClientData[] = []

      for (const prof of profiles) {
        const programs = await fetchWithAuth(`programs?user_id=eq.${prof.id}`, token)
        
        if (programs && programs.length > 0) {
          const program = programs[0]
          const progress = await fetchWithAuth(
            `step_progress?select=*,submissions(*),steps(*)&program_id=eq.${program.id}`,
            token
          )

          const sortedProgress = (progress || []).sort((a: StepProgressWithDetails, b: StepProgressWithDetails) => 
            (a.steps?.number || 0) - (b.steps?.number || 0)
          )

          const entries = await fetchWithAuth(
            `time_entries?user_id=eq.${prof.id}&order=entry_date.desc`,
            token
          )

          let timeEntryStats: TimeEntryStats | undefined
          if (entries && !entries.error && entries.length > 0) {
            const byCategory: Record<string, number> = {}
            const dates = new Set<string>()
            
            entries.forEach((e: TimeEntry) => {
              byCategory[e.category] = (byCategory[e.category] || 0) + 1
              dates.add(e.entry_date)
            })

            timeEntryStats = {
              total: entries.length,
              byCategory,
              dates: Array.from(dates)
            }
          }

          clientsData.push({
            profile: prof,
            program,
            stepProgress: sortedProgress,
            timeEntries: timeEntryStats
          })
        }
      }

      setClients(clientsData)
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClientTimeEntries = async (userId: string) => {
    const token = getToken(session)
    if (!token) return

    const entries = await fetchWithAuth(
      `time_entries?user_id=eq.${userId}&order=entry_date.desc,hour_slot.asc`,
      token
    )
    if (entries && !entries.error) {
      setTimeEntries(entries)
    }
  }

  useEffect(() => {
    if (selectedClient) {
      fetchClientTimeEntries(selectedClient.profile.id)
    } else {
      setTimeEntries([])
    }
  }, [selectedClient])

  const handleSendAnalysis = async (stepProgress: StepProgress) => {
    if (!selectedClient) return
    if (!analysisSummary.trim()) {
      toast.error('Veuillez entrer un resume de l analyse')
      return
    }

    const token = getToken(session)
    if (!token) return

    setIsProcessing(true)
    try {
      await patchWithAuth(
        `step_progress?id=eq.${stepProgress.id}`,
        token,
        { 
          analysis_summary: analysisSummary,
          analysis_ready: true,
          status: 'analysis_ready'
        }
      )

      await postWithAuth('notifications', token, {
        user_id: selectedClient.profile.id,
        type: 'analysis_ready',
        title: 'Votre diagnostic est pret !',
        message: 'Le diagnostic revele des opportunites importantes. Connectez-vous pour decouvrir les resultats.',
        data: { step_progress_id: stepProgress.id }
      })

      toast.success('Analyse envoyee ! Le client a ete notifie.')
      setAnalysisSummary('')
      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de l envoi')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConvertToPremium = async (clientId: string) => {
    if (!selectedClient) return
    const token = getToken(session)
    if (!token) {
      toast.error('Session expirée, veuillez vous reconnecter')
      return
    }

    setIsProcessing(true)
    try {
      // 1. Mettre à jour le plan en premium
      const updateResult = await patchWithAuth(`profiles?id=eq.${clientId}`, token, { plan: 'premium' })
      console.log('Update profile result:', updateResult)
      
      if (updateResult.error) {
        throw new Error(updateResult.error.message || 'Erreur lors de la mise à jour du profil')
      }

      // 2. Si Bloc 1 est "analysis_ready", le passer en "completed" et activer Bloc 2
      const bloc1 = selectedClient.stepProgress.find((sp: StepProgressWithDetails) => sp.steps?.number === 1)
      if (bloc1 && bloc1.status === 'analysis_ready') {
        await patchWithAuth(
          `step_progress?id=eq.${bloc1.id}`,
          token,
          { status: 'completed', completed_at: new Date().toISOString() }
        )

        const bloc2 = selectedClient.stepProgress.find((sp: StepProgressWithDetails) => sp.steps?.number === 2)
        if (bloc2) {
          await patchWithAuth(
            `step_progress?id=eq.${bloc2.id}`,
            token,
            { status: 'in_progress', started_at: new Date().toISOString() }
          )
          await patchWithAuth(
            `programs?id=eq.${selectedClient.program.id}`,
            token,
            { current_step: 2 }
          )
        }
      }

      // 3. Envoyer notification
      await postWithAuth('notifications', token, {
        user_id: clientId,
        type: 'message',
        title: 'Bienvenue dans l accompagnement !',
        message: 'Votre acces complet est maintenant active.',
        data: {}
      })

      toast.success('Client passé en Premium !')
      
      // 4. Mettre à jour l'état local immédiatement
      setSelectedClient(prev => prev ? {
        ...prev,
        profile: { ...prev.profile, plan: 'premium' }
      } : null)
      
      // 5. Recharger la liste complète
      fetchClients()

    } catch (error) {
      console.error('Error converting to premium:', error)
      toast.error('Erreur lors du passage en Premium')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkTimeStudyComplete = async () => {
    if (!selectedClient) return
    const token = getToken(session)
    if (!token) return

    const bloc1 = selectedClient.stepProgress.find((sp: StepProgressWithDetails) => sp.steps?.number === 1)
    if (!bloc1) return

    setIsProcessing(true)
    try {
      await patchWithAuth(
        `step_progress?id=eq.${bloc1.id}`,
        token,
        { status: 'pending_validation' }
      )

      toast.success('Time Study marque comme complete - En attente de votre analyse')
      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur')
    } finally {
      setIsProcessing(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'PRESTATION': 'Prestation',
      'DEVELOPPEMENT': 'Developpement',
      'RELATION': 'Relation',
      'ADMINISTRATIF': 'Administratif',
      'PAUSE': 'Pause'
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'PRESTATION': 'bg-emerald-100 text-emerald-700',
      'DEVELOPPEMENT': 'bg-blue-100 text-blue-700',
      'RELATION': 'bg-purple-100 text-purple-700',
      'ADMINISTRATIF': 'bg-amber-100 text-amber-700',
      'PAUSE': 'bg-stone-100 text-stone-600'
    }
    return colors[category] || 'bg-stone-100 text-stone-600'
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
      'completed': { label: 'Termine', color: 'bg-emerald-500', icon: CheckCircle },
      'in_progress': { label: 'En cours', color: 'bg-stone-700', icon: Clock },
      'pending_validation': { label: 'En analyse', color: 'bg-amber-500', icon: Hourglass },
      'analysis_ready': { label: 'Analyse prete', color: 'bg-emerald-400', icon: Eye },
      'locked': { label: 'Verrouille', color: 'bg-stone-300', icon: Lock }
    }
    return configs[status] || configs['locked']
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Client detail view
  if (selectedClient) {
    const awaitingAnalysis = selectedClient.stepProgress.filter(
      (sp: StepProgressWithDetails) => sp.status === 'pending_validation' && sp.steps?.number === 1
    )

    const bloc1 = selectedClient.stepProgress.find((sp: StepProgressWithDetails) => sp.steps?.number === 1)
    const hasTimeEntries = selectedClient.timeEntries && selectedClient.timeEntries.total > 0
    const canMarkComplete = bloc1?.status === 'in_progress' && hasTimeEntries

    const entriesByDate = timeEntries.reduce((acc: Record<string, TimeEntry[]>, entry) => {
      if (!acc[entry.entry_date]) acc[entry.entry_date] = []
      acc[entry.entry_date].push(entry)
      return acc
    }, {})

    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header */}
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
                <div className="h-6 w-px bg-stone-200" />
                <div>
                  <h1 className="font-serif text-xl text-stone-800">
                    {selectedClient.profile.first_name} {selectedClient.profile.last_name}
                  </h1>
                  <p className="text-xs text-stone-500">
                    {selectedClient.profile.institute_name || selectedClient.profile.email}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium ${
                  selectedClient.profile.plan === 'premium' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-stone-100 text-stone-600'
                }`} style={{ borderRadius: '1px' }}>
                  {selectedClient.profile.plan === 'premium' ? 'Premium' : 'Diagnostic'}
                </span>
              </div>

              {selectedClient.profile.plan === 'free' && (
                <button
                  onClick={() => handleConvertToPremium(selectedClient.profile.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                  style={{ borderRadius: '1px' }}
                >
                  <UserCheck className="w-4 h-4" />
                  Passer en Premium
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Onboarding Info */}
          {selectedClient.profile.onboarding_completed && (
            <div className="bg-white p-6 border border-stone-200" style={{ borderRadius: '1px' }}>
              <h2 className="flex items-center gap-2 text-sm font-medium text-stone-700 uppercase tracking-wider mb-4">
                <Building2 className="w-4 h-4" />
                Informations du diagnostic
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Institut', value: selectedClient.profile.institute_name || '-' },
                  { label: 'CA Mensuel', value: selectedClient.profile.monthly_revenue || '-' },
                  { label: 'Equipe', value: selectedClient.profile.team_size || '-' },
                  { label: 'Heures/sem', value: selectedClient.profile.hours_worked_per_week || '-' },
                ].map((item, i) => (
                  <div key={i} className="bg-stone-50 p-4" style={{ borderRadius: '1px' }}>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-sm text-stone-700 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {selectedClient.profile.main_problem && (
                <div className="mt-4 bg-amber-50 p-4" style={{ borderRadius: '1px' }}>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Probleme principal</p>
                  <p className="text-sm text-stone-700 font-medium">{selectedClient.profile.main_problem}</p>
                </div>
              )}
            </div>
          )}

          {/* Time Study Data */}
          {hasTimeEntries && (
            <div className="bg-white p-6 border border-stone-200" style={{ borderRadius: '1px' }}>
              <h2 className="flex items-center gap-2 text-sm font-medium text-stone-700 uppercase tracking-wider mb-4">
                <BarChart3 className="w-4 h-4" />
                Time Study ({selectedClient.timeEntries?.total} entrees sur {selectedClient.timeEntries?.dates.length} jours)
              </h2>
              
              <div className="grid grid-cols-5 gap-2 mb-6">
                {Object.entries(selectedClient.timeEntries?.byCategory || {}).map(([cat, count]) => (
                  <div key={cat} className={`p-3 text-center ${getCategoryColor(cat)}`} style={{ borderRadius: '1px' }}>
                    <p className="text-xl font-semibold">{count}</p>
                    <p className="text-[10px] uppercase tracking-wider">{getCategoryLabel(cat)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {Object.entries(entriesByDate).slice(0, 5).map(([date, dateEntries]) => (
                  <div key={date}>
                    <p className="text-xs text-stone-400 mb-2">
                      {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {dateEntries.map((entry: TimeEntry) => (
                        <span 
                          key={entry.id} 
                          className={`px-2 py-1 text-xs ${getCategoryColor(entry.category)}`}
                          style={{ borderRadius: '1px' }}
                        >
                          {entry.hour_slot.split(' - ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {canMarkComplete && (
                <button
                  onClick={handleMarkTimeStudyComplete}
                  disabled={isProcessing}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                  style={{ borderRadius: '1px' }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Marquer comme termine et analyser
                </button>
              )}
            </div>
          )}

          {/* Analysis Section */}
          {awaitingAnalysis.length > 0 && (
            <div className="bg-amber-50 p-6 border border-amber-200" style={{ borderRadius: '1px' }}>
              <h2 className="flex items-center gap-2 text-sm font-medium text-amber-700 uppercase tracking-wider mb-4">
                <Eye className="w-4 h-4" />
                Analyse a effectuer
              </h2>
              
              {awaitingAnalysis.map((sp: StepProgressWithDetails) => (
                <div key={sp.id} className="space-y-4">
                  <p className="text-sm text-stone-600">
                    Time Study termine - {selectedClient.timeEntries?.total} entrees collectees
                  </p>
                  
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                      Resume de l'analyse (visible par le client)
                    </label>
                    <input
                      type="text"
                      value={analysisSummary}
                      onChange={(e) => setAnalysisSummary(e.target.value)}
                      placeholder="Ex: 12h perdues/semaine en taches delegables"
                      className="w-full px-4 py-3 bg-white border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                      style={{ borderRadius: '1px' }}
                    />
                  </div>

                  <button
                    onClick={() => handleSendAnalysis(sp)}
                    disabled={isProcessing || !analysisSummary.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                    style={{ borderRadius: '1px' }}
                  >
                    <Send className="w-4 h-4" />
                    Envoyer l'analyse
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Progress Overview */}
          <div className="bg-white p-6 border border-stone-200" style={{ borderRadius: '1px' }}>
            <h2 className="text-sm font-medium text-stone-700 uppercase tracking-wider mb-4">
              Progression du programme
            </h2>
            <div className="space-y-3">
              {PROGRAM_STEPS.map((step) => {
                const progress = selectedClient.stepProgress.find((sp: StepProgressWithDetails) => sp.steps?.number === step.number)
                const status = progress?.status || 'locked'
                const config = getStatusConfig(status)
                const StatusIcon = config.icon

                return (
                  <div key={step.number} className="flex items-center gap-4 p-4 bg-stone-50" style={{ borderRadius: '1px' }}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${config.color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-700">{step.title}</p>
                      <p className="text-xs text-stone-400">{step.subtitle}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs ${
                      status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'in_progress' ? 'bg-stone-200 text-stone-700' :
                      status === 'pending_validation' ? 'bg-amber-100 text-amber-700' :
                      status === 'analysis_ready' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-stone-100 text-stone-400'
                    }`} style={{ borderRadius: '1px' }}>
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Clients list view
  const premiumClients = clients.filter(c => c.profile.plan === 'premium')
  const awaitingAnalysisCount = clients.filter(c => 
    c.stepProgress.some((sp: StepProgressWithDetails) => sp.status === 'pending_validation' && sp.steps?.number === 1)
  ).length
  const clientsWithTimeData = clients.filter(c => c.timeEntries && c.timeEntries.total > 0).length

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl text-stone-800">Administration</h1>
              <p className="text-xs text-stone-400 mt-1">Gestion des clients Altarys Conseil</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchClients}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
                style={{ borderRadius: '1px' }}
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 text-stone-500 text-sm hover:text-stone-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Mon espace
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total clients', value: clients.length, icon: Users, color: 'text-stone-600' },
            { label: 'Time Study actif', value: clientsWithTimeData, icon: BarChart3, color: 'text-blue-600' },
            { label: 'Analyses a faire', value: awaitingAnalysisCount, icon: Eye, color: 'text-amber-600' },
            { label: 'Premium', value: premiumClients.length, icon: CheckCircle, color: 'text-emerald-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 border border-stone-200" style={{ borderRadius: '1px' }}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-serif text-3xl text-stone-800">{stat.value}</p>
                  <p className="text-xs text-stone-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Clients List */}
        <div className="bg-white border border-stone-200" style={{ borderRadius: '1px' }}>
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="flex items-center gap-2 text-sm font-medium text-stone-700 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              Clients
            </h2>
          </div>
          
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-stone-200 mx-auto mb-4" />
              <p className="text-sm text-stone-400">Aucun client pour le moment</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {clients.map((client) => {
                const needsAnalysis = client.stepProgress.some(
                  (sp: StepProgressWithDetails) => sp.status === 'pending_validation' && sp.steps?.number === 1
                )
                const completedSteps = client.stepProgress.filter((sp: StepProgressWithDetails) => sp.status === 'completed').length
                const hasTimeData = client.timeEntries && client.timeEntries.total > 0

                return (
                  <motion.div
                    key={client.profile.id}
                    className="flex items-center justify-between p-4 hover:bg-stone-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedClient(client)}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        client.profile.plan === 'premium' ? 'bg-emerald-500' : 'bg-stone-600'
                      }`}>
                        {client.profile.first_name[0]}{client.profile.last_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-700">
                            {client.profile.first_name} {client.profile.last_name}
                          </p>
                          <span className={`px-2 py-0.5 text-[10px] font-medium ${
                            client.profile.plan === 'premium' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-stone-100 text-stone-500'
                          }`} style={{ borderRadius: '1px' }}>
                            {client.profile.plan === 'premium' ? 'Premium' : 'Free'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">
                          {client.profile.institute_name || client.profile.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {hasTimeData && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1" style={{ borderRadius: '1px' }}>
                          {client.timeEntries?.total} entrees
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-stone-500">Bloc {client.program.current_step}/5</p>
                        <p className="text-[10px] text-stone-400">{completedSteps} termine{completedSteps > 1 ? 's' : ''}</p>
                      </div>
                      {needsAnalysis && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1" style={{ borderRadius: '1px' }}>
                          Analyse requise
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
