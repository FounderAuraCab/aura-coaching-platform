import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  Users, ArrowLeft, CheckCircle, Clock, 
  RefreshCw, Eye, Send, Building2, UserCheck,
  BarChart3
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
    if (!token) return

    setIsProcessing(true)
    try {
      await patchWithAuth(`profiles?id=eq.${clientId}`, token, { plan: 'premium' })

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

      await postWithAuth('notifications', token, {
        user_id: clientId,
        type: 'message',
        title: 'Bienvenue dans l accompagnement !',
        message: 'Votre acces complet est maintenant active.',
        data: {}
      })

      toast.success('Client passe en Premium !')
      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur')
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
      'PRESTATION': 'Prestation client',
      'DEVELOPPEMENT': 'Developpement',
      'RELATION': 'Relation & coordination',
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
      'PAUSE': 'bg-gray-100 text-gray-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  const getRevenueLabel = (value: string | undefined) => {
    if (!value) return '-'
    const labels: Record<string, string> = {
      'less_5k': '< 5 000 EUR',
      '5k_10k': '5-10k EUR',
      '10k_20k': '10-20k EUR',
      '20k_50k': '20-50k EUR',
      'more_50k': '> 50 000 EUR'
    }
    return labels[value] || value
  }

  const getTeamLabel = (value: string | undefined) => {
    if (!value) return '-'
    const labels: Record<string, string> = {
      'solo': 'Seule',
      '2_3': '2-3 pers.',
      '4_6': '4-6 pers.',
      '7_plus': '7+ pers.'
    }
    return labels[value] || value
  }

  const getHoursLabel = (value: string | undefined) => {
    if (!value) return '-'
    const labels: Record<string, string> = {
      'less_35': '< 35h',
      '35_45': '35-45h',
      '45_55': '45-55h',
      '55_65': '55-65h',
      'more_65': '> 65h'
    }
    return labels[value] || value
  }

  const getProblemLabel = (value: string | undefined) => {
    if (!value) return '-'
    const labels: Record<string, string> = {
      'time': 'Manque de temps',
      'team': 'Equipe',
      'revenue': 'CA',
      'clients': 'Fidelisation',
      'exhaustion': 'Epuisement'
    }
    return labels[value] || value
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="w-12 h-12 border-2 border-[#2C5F6F] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
      <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedClient(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {selectedClient.profile.first_name} {selectedClient.profile.last_name}
                  </h1>
                  <Badge variant={selectedClient.profile.plan === 'premium' ? 'success' : 'secondary'}>
                    {selectedClient.profile.plan === 'premium' ? 'Premium' : 'Free'}
                  </Badge>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
                  {selectedClient.profile.institute_name || selectedClient.profile.email}
                </p>
              </div>
            </div>

            {selectedClient.profile.plan === 'free' && (
              <Button onClick={() => handleConvertToPremium(selectedClient.profile.id)} disabled={isProcessing}>
                <UserCheck className="w-4 h-4 mr-2" />
                Passer en Premium
              </Button>
            )}
          </div>

          {selectedClient.profile.onboarding_completed && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informations du diagnostic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#F5F3EF] p-4" style={{ borderRadius: '1px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Institut</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                      {selectedClient.profile.institute_name || '-'}
                    </p>
                  </div>
                  <div className="bg-[#F5F3EF] p-4" style={{ borderRadius: '1px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CA Mensuel</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                      {getRevenueLabel(selectedClient.profile.monthly_revenue)}
                    </p>
                  </div>
                  <div className="bg-[#F5F3EF] p-4" style={{ borderRadius: '1px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipe</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                      {getTeamLabel(selectedClient.profile.team_size)}
                    </p>
                  </div>
                  <div className="bg-[#F5F3EF] p-4" style={{ borderRadius: '1px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heures/sem</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                      {getHoursLabel(selectedClient.profile.hours_worked_per_week)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-amber-50 p-4" style={{ borderRadius: '1px' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Probleme principal</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                    {getProblemLabel(selectedClient.profile.main_problem)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {hasTimeEntries && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Donnees Time Study ({selectedClient.timeEntries?.total} entrees sur {selectedClient.timeEntries?.dates.length} jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {Object.entries(selectedClient.timeEntries?.byCategory || {}).map(([cat, count]) => (
                    <div key={cat} className={`p-3 text-center ${getCategoryColor(cat)}`} style={{ borderRadius: '1px' }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 600 }}>{count}</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', textTransform: 'uppercase' }}>
                        {getCategoryLabel(cat).split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {Object.entries(entriesByDate).slice(0, 5).map(([date, dateEntries]) => (
                    <div key={date}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
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
                  <Button 
                    onClick={handleMarkTimeStudyComplete}
                    disabled={isProcessing}
                    className="w-full mt-6"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marquer le Time Study comme termine et analyser
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {awaitingAnalysis.length > 0 && (
            <Card className="mb-8 border-amber-300">
              <CardHeader className="bg-amber-50">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Eye className="w-5 h-5" />
                  Analyse a effectuer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {awaitingAnalysis.map((sp: StepProgressWithDetails) => (
                  <div key={sp.id} className="space-y-4">
                    <div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500 }}>
                        Time Study termine - {selectedClient.timeEntries?.total} entrees collectees
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, color: '#5A5A5A' }}>
                        Resume de l analyse (visible par le client)
                      </label>
                      <input
                        type="text"
                        value={analysisSummary}
                        onChange={(e) => setAnalysisSummary(e.target.value)}
                        placeholder="Ex: 12h perdues/semaine en taches delegables"
                        className="w-full px-4 py-3 border border-gray-300 focus:border-[#2C5F6F] outline-none"
                        style={{ borderRadius: '1px', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                      />
                    </div>

                    <Button 
                      onClick={() => handleSendAnalysis(sp)}
                      disabled={isProcessing || !analysisSummary.trim()}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer l analyse et notifier le client
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Progression du programme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PROGRAM_STEPS.map((step) => {
                  const progress = selectedClient.stepProgress.find((sp: StepProgressWithDetails) => sp.steps?.number === step.number)
                  const status = progress?.status || 'locked'

                  return (
                    <div key={step.number} className="flex items-center gap-4 p-4 bg-[#F5F3EF]" style={{ borderRadius: '1px' }}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-emerald-500 text-white' :
                        status === 'in_progress' ? 'bg-[#2C5F6F] text-white' :
                        status === 'pending_validation' ? 'bg-amber-500 text-white' :
                        status === 'analysis_ready' ? 'bg-emerald-400 text-white' :
                        'bg-gray-300 text-gray-500'
                      }`}>
                        {step.number}
                      </div>
                      <div className="flex-1">
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#2C2C2C' }}>
                          {step.title}
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                          {step.subtitle}
                        </p>
                      </div>
                      <Badge variant={
                        status === 'completed' ? 'success' :
                        status === 'in_progress' ? 'pending' :
                        status === 'pending_validation' ? 'warning' :
                        status === 'analysis_ready' ? 'success' :
                        'locked'
                      }>
                        {status === 'completed' ? 'Termine' :
                         status === 'in_progress' ? 'En cours' :
                         status === 'pending_validation' ? 'En analyse' :
                         status === 'analysis_ready' ? 'Analyse prete' :
                         'Verrouille'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const freeClients = clients.filter(c => c.profile.plan === 'free')
  const premiumClients = clients.filter(c => c.profile.plan === 'premium')
  const awaitingAnalysisCount = clients.filter(c => 
    c.stepProgress.some((sp: StepProgressWithDetails) => sp.status === 'pending_validation' && sp.steps?.number === 1)
  ).length
  const clientsWithTimeData = clients.filter(c => c.timeEntries && c.timeEntries.total > 0).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', color: '#2C2C2C' }}>
              Administration
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
              Gestion des clients et validations
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchClients}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Mon espace
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#2C5F6F]/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#2C5F6F]" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {clients.length}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Total clients
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {clientsWithTimeData}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Time Study actif
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {awaitingAnalysisCount}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Analyses a faire
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {premiumClients.length}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Premium
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#888' }}>
                  Aucun client pour le moment
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => {
                  const needsAnalysis = client.stepProgress.some(
                    (sp: StepProgressWithDetails) => sp.status === 'pending_validation' && sp.steps?.number === 1
                  )
                  const completedSteps = client.stepProgress.filter((sp: StepProgressWithDetails) => sp.status === 'completed').length
                  const hasTimeData = client.timeEntries && client.timeEntries.total > 0

                  return (
                    <motion.div
                      key={client.profile.id}
                      className="flex items-center justify-between p-4 bg-[#FEFDFB] border border-gray-200 cursor-pointer hover:border-[#2C5F6F] transition-colors"
                      style={{ borderRadius: '1px' }}
                      onClick={() => setSelectedClient(client)}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                            client.profile.plan === 'premium' ? 'bg-emerald-500' : 'bg-[#2C5F6F]'
                          }`}
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500 }}
                        >
                          {client.profile.first_name[0]}{client.profile.last_name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#2C2C2C' }}>
                              {client.profile.first_name} {client.profile.last_name}
                            </p>
                            <Badge variant={client.profile.plan === 'premium' ? 'success' : 'secondary'} className="text-xs">
                              {client.profile.plan === 'premium' ? 'Premium' : 'Free'}
                            </Badge>
                          </div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
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
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#5A5A5A' }}>
                            Bloc {client.program.current_step}/5
                          </p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888' }}>
                            {completedSteps} termine{completedSteps > 1 ? 's' : ''}
                          </p>
                        </div>
                        {needsAnalysis && (
                          <Badge variant="warning">
                            Analyse requise
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
