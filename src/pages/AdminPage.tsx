import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  Users, ArrowLeft, CheckCircle, XCircle, Clock, 
  ExternalLink, FileText, Link as LinkIcon,
  RefreshCw, Eye, Send, Building2, TrendingUp, UserCheck
} from 'lucide-react'
import type { Profile, Program, StepProgress, Submission } from '@/types/database'

interface ClientData {
  profile: Profile
  program: Program
  stepProgress: (StepProgress & { submissions: Submission[], steps: { number: number, title: string } })[]
}

export default function AdminPage() {
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientData[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisSummary, setAnalysisSummary] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
      return
    }
    fetchClients()
  }, [isAdmin, navigate])

  const fetchClients = async () => {
    setIsLoading(true)
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      const clientsData: ClientData[] = []

      for (const prof of profiles || []) {
        const { data: program } = await supabase
          .from('programs')
          .select('*')
          .eq('user_id', prof.id)
          .single()

        if (program) {
          const { data: progress } = await supabase
            .from('step_progress')
            .select('*, submissions (*), steps (*)')
            .eq('program_id', program.id)

          const sortedProgress = (progress || []).sort((a, b) => {
            return (a.steps?.number || 0) - (b.steps?.number || 0)
          })

          clientsData.push({
            profile: prof,
            program,
            stepProgress: sortedProgress,
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

  const handleApproveSubmission = async (submission: Submission, stepProgress: StepProgress & { steps: { number: number } }) => {
    setIsProcessing(true)
    try {
      await supabase
        .from('submissions')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', submission.id)

      // Pour le bloc 1 des users free, on passe en pending_validation (attente d'analyse)
      // Pour les autres, on passe directement en completed
      const clientProfile = selectedClient?.profile
      const isFirstStep = stepProgress.steps?.number === 1
      const isFreePlan = clientProfile?.plan === 'free'

      if (isFirstStep && isFreePlan) {
        // Bloc 1 free : passer en pending_validation
        await supabase
          .from('step_progress')
          .update({ status: 'pending_validation' })
          .eq('id', stepProgress.id)

        toast.success('Soumission reçue - En attente de votre analyse')
      } else {
        // Autres cas : compléter l'étape et débloquer la suivante
        await completeStepAndUnlockNext(stepProgress)
        toast.success('Étape validée et suivante débloquée')
      }

      // Notifier le client
      await supabase.from('notifications').insert({
        user_id: selectedClient?.profile.id,
        type: 'submission_approved',
        title: 'Soumission reçue',
        message: isFirstStep && isFreePlan 
          ? 'Vos données ont été reçues. L\'analyse est en cours.'
          : 'Votre livrable a été validé.',
        data: { submission_id: submission.id }
      })

      fetchClients()
      if (selectedClient) {
        const updated = clients.find(c => c.profile.id === selectedClient.profile.id)
        if (updated) setSelectedClient(updated)
      }

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la validation')
    } finally {
      setIsProcessing(false)
    }
  }

  const completeStepAndUnlockNext = async (stepProgress: StepProgress & { steps: { number: number } }) => {
    // Marquer l'étape comme complétée
    await supabase
      .from('step_progress')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        validated_by: profile?.id
      })
      .eq('id', stepProgress.id)

    // Débloquer l'étape suivante
    const currentStepNumber = stepProgress.steps?.number || 1
    if (currentStepNumber < PROGRAM_STEPS.length) {
      const nextStepProgress = selectedClient?.stepProgress.find(
        sp => sp.steps?.number === currentStepNumber + 1
      )
      if (nextStepProgress) {
        await supabase
          .from('step_progress')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', nextStepProgress.id)

        await supabase
          .from('programs')
          .update({ current_step: currentStepNumber + 1 })
          .eq('id', selectedClient?.program.id)

        await supabase.from('notifications').insert({
          user_id: selectedClient?.profile.id,
          type: 'step_unlocked',
          title: 'Nouvelle étape débloquée',
          message: `Félicitations ! L'étape ${currentStepNumber + 1} est maintenant accessible.`,
          data: { step_number: currentStepNumber + 1 }
        })
      }
    }
  }

  const handleSendAnalysis = async (stepProgress: StepProgress) => {
    if (!analysisSummary.trim()) {
      toast.error('Veuillez entrer un résumé de l\'analyse')
      return
    }

    setIsProcessing(true)
    try {
      // Mettre à jour le step_progress avec le résumé et marquer l'analyse comme prête
      await supabase
        .from('step_progress')
        .update({ 
          analysis_summary: analysisSummary,
          analysis_ready: true,
          status: 'analysis_ready'
        })
        .eq('id', stepProgress.id)

      // Notifier le client
      await supabase.from('notifications').insert({
        user_id: selectedClient?.profile.id,
        type: 'analysis_ready',
        title: 'Votre diagnostic est prêt !',
        message: `Le diagnostic révèle des opportunités importantes. Connectez-vous pour découvrir les résultats.`,
        data: { step_progress_id: stepProgress.id }
      })

      toast.success('Analyse envoyée ! Le client a été notifié.')
      setAnalysisSummary('')
      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConvertToPremium = async (clientId: string) => {
    setIsProcessing(true)
    try {
      await supabase
        .from('profiles')
        .update({ plan: 'premium' })
        .eq('id', clientId)

      // Si le bloc 1 est en analysis_ready, le passer en completed et débloquer le bloc 2
      const bloc1 = selectedClient?.stepProgress.find(sp => sp.steps?.number === 1)
      if (bloc1 && bloc1.status === 'analysis_ready') {
        await supabase
          .from('step_progress')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', bloc1.id)

        // Débloquer bloc 2
        const bloc2 = selectedClient?.stepProgress.find(sp => sp.steps?.number === 2)
        if (bloc2) {
          await supabase
            .from('step_progress')
            .update({ status: 'in_progress', started_at: new Date().toISOString() })
            .eq('id', bloc2.id)

          await supabase
            .from('programs')
            .update({ current_step: 2 })
            .eq('id', selectedClient?.program.id)
        }
      }

      await supabase.from('notifications').insert({
        user_id: clientId,
        type: 'message',
        title: 'Bienvenue dans l\'accompagnement !',
        message: 'Votre accès complet est maintenant activé. Toutes les étapes sont disponibles.',
        data: {}
      })

      toast.success('Client passé en Premium !')
      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectSubmission = async (submission: Submission, feedback: string) => {
    setIsProcessing(true)
    try {
      await supabase
        .from('submissions')
        .update({ 
          status: 'rejected',
          feedback,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', submission.id)

      await supabase.from('notifications').insert({
        user_id: selectedClient?.profile.id,
        type: 'submission_rejected',
        title: 'Modification requise',
        message: feedback || 'Votre soumission nécessite des modifications.',
        data: { submission_id: submission.id }
      })

      toast.success('Retour envoyé au client')
      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur')
    } finally {
      setIsProcessing(false)
    }
  }

  const getRevenueLabel = (value: string) => {
    const labels: Record<string, string> = {
      'less_5k': '< 5 000 €',
      '5k_10k': '5-10k €',
      '10k_20k': '10-20k €',
      '20k_50k': '20-50k €',
      'more_50k': '> 50 000 €'
    }
    return labels[value] || value
  }

  const getTeamLabel = (value: string) => {
    const labels: Record<string, string> = {
      'solo': 'Seule',
      '2_3': '2-3 pers.',
      '4_6': '4-6 pers.',
      '7_plus': '7+ pers.'
    }
    return labels[value] || value
  }

  const getHoursLabel = (value: string) => {
    const labels: Record<string, string> = {
      'less_35': '< 35h',
      '35_45': '35-45h',
      '45_55': '45-55h',
      '55_65': '55-65h',
      'more_65': '> 65h'
    }
    return labels[value] || value
  }

  const getProblemLabel = (value: string) => {
    const labels: Record<string, string> = {
      'time': 'Manque de temps',
      'team': 'Équipe',
      'revenue': 'CA',
      'clients': 'Fidélisation',
      'exhaustion': 'Épuisement'
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

  // Client detail view
  if (selectedClient) {
    const pendingSubmissions = selectedClient.stepProgress.flatMap(sp => 
      sp.submissions.filter(s => s.status === 'pending').map(s => ({ ...s, stepProgress: sp }))
    )

    const awaitingAnalysis = selectedClient.stepProgress.filter(
      sp => sp.status === 'pending_validation' && sp.steps?.number === 1
    )

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
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

          {/* Infos Onboarding */}
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
                      {getRevenueLabel(selectedClient.profile.monthly_revenue || '')}
                    </p>
                  </div>
                  <div className="bg-[#F5F3EF] p-4" style={{ borderRadius: '1px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Équipe</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                      {getTeamLabel(selectedClient.profile.team_size || '')}
                    </p>
                  </div>
                  <div className="bg-[#F5F3EF] p-4" style={{ borderRadius: '1px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heures/sem</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                      {getHoursLabel(selectedClient.profile.hours_worked_per_week || '')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-amber-50 p-4" style={{ borderRadius: '1px' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Problème principal</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                    {getProblemLabel(selectedClient.profile.main_problem || '')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Analyse à faire (Bloc 1 en attente) */}
          {awaitingAnalysis.length > 0 && (
            <Card className="mb-8 border-amber-300">
              <CardHeader className="bg-amber-50">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Eye className="w-5 h-5" />
                  Analyse à effectuer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {awaitingAnalysis.map((sp) => {
                  const submission = sp.submissions.find(s => s.status === 'approved' || s.status === 'pending')
                  return (
                    <div key={sp.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500 }}>
                            Time-Study soumis
                          </p>
                          {submission && (
                            <a 
                              href={submission.type === 'link' ? submission.content : submission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2C5F6F] hover:underline flex items-center gap-1 mt-1"
                              style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                            >
                              {submission.type === 'link' ? submission.content : submission.file_name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, color: '#5A5A5A' }}>
                          Résumé de l'analyse (visible par le client)
                        </label>
                        <input
                          type="text"
                          value={analysisSummary}
                          onChange={(e) => setAnalysisSummary(e.target.value)}
                          placeholder="Ex: 12h perdues/semaine en tâches délégables"
                          className="w-full px-4 py-3 border border-gray-300 focus:border-[#2C5F6F] outline-none"
                          style={{ borderRadius: '1px', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
                        />
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888' }}>
                          Ce résumé sera affiché en gros au client. Le reste du plan d'action sera flouté avec un CTA Calendly.
                        </p>
                      </div>

                      <Button 
                        onClick={() => handleSendAnalysis(sp)}
                        disabled={isProcessing || !analysisSummary.trim()}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer l'analyse et notifier le client
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Pending Submissions */}
          {pendingSubmissions.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Soumissions en attente ({pendingSubmissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingSubmissions.map(({ stepProgress, ...submission }) => {
                  const step = PROGRAM_STEPS.find(s => s.number === stepProgress.steps?.number)

                  return (
                    <div key={submission.id} className="p-4 bg-[#FEFDFB] border border-gray-200" style={{ borderRadius: '1px' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="warning">Bloc {step?.number}</Badge>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#2C2C2C' }}>
                              {step?.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {submission.type === 'link' ? (
                              <LinkIcon className="w-4 h-4 text-[#2C5F6F]" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#2C5F6F]" />
                            )}
                            
                              href={submission.type === 'link' ? submission.content : submission.file_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2C5F6F] hover:underline flex items-center gap-1"
                              style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                            >
                              {submission.type === 'link' ? submission.content : submission.file_name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                            Soumis le {new Date(submission.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveSubmission(submission, stepProgress)}
                            disabled={isProcessing}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const feedback = prompt('Raison du refus / feedback :')
                              if (feedback) handleRejectSubmission(submission, feedback)
                            }}
                            disabled={isProcessing}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Progression du programme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PROGRAM_STEPS.map((step) => {
                  const progress = selectedClient.stepProgress.find(sp => sp.steps?.number === step.number)
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
                        {status === 'completed' ? 'Terminé' :
                         status === 'in_progress' ? 'En cours' :
                         status === 'pending_validation' ? 'En analyse' :
                         status === 'analysis_ready' ? 'Analyse prête' :
                         'Verrouillé'}
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

  // Clients list view
  const freeClients = clients.filter(c => c.profile.plan === 'free')
  const premiumClients = clients.filter(c => c.profile.plan === 'premium')
  const awaitingAnalysisCount = clients.filter(c => 
    c.stepProgress.some(sp => sp.status === 'pending_validation' && sp.steps?.number === 1)
  ).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
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

        {/* Stats */}
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
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {awaitingAnalysisCount}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Analyses à faire
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {freeClients.length}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Leads (Free)
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

        {/* Clients List */}
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
                  const pendingCount = client.stepProgress.flatMap(sp => 
                    sp.submissions.filter(s => s.status === 'pending')
                  ).length
                  const needsAnalysis = client.stepProgress.some(
                    sp => sp.status === 'pending_validation' && sp.steps?.number === 1
                  )
                  const completedSteps = client.stepProgress.filter(sp => sp.status === 'completed').length

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
                        <div className="text-right">
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#5A5A5A' }}>
                            Bloc {client.program.current_step}/5
                          </p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888' }}>
                            {completedSteps} terminé{completedSteps > 1 ? 's' : ''}
                          </p>
                        </div>
                        {needsAnalysis && (
                          <Badge variant="warning">
                            Analyse requise
                          </Badge>
                        )}
                        {pendingCount > 0 && !needsAnalysis && (
                          <Badge variant="pending">
                            {pendingCount} en attente
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

