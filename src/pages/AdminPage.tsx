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
  ExternalLink, FileText, Link as LinkIcon, Mail,
  RefreshCw
} from 'lucide-react'
import type { Profile, Program, StepProgress, Submission } from '@/types/database'

interface ClientData {
  profile: Profile
  program: Program
  stepProgress: (StepProgress & { submissions: Submission[] })[]
}

export default function AdminPage() {
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientData[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

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
      // Fetch all client profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Fetch programs and progress for each client
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
            .select('*, submissions (*)')
            .eq('program_id', program.id)
            .order('created_at', { ascending: true })

          clientsData.push({
            profile: prof,
            program,
            stepProgress: progress || [],
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

  const handleApproveSubmission = async (submission: Submission, stepProgress: StepProgress) => {
    setIsProcessing(true)
    try {
      // Update submission status
      await supabase
        .from('submissions')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', submission.id)

      // Check if all required deliverables are approved
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('step_progress_id', stepProgress.id)

      const allApproved = allSubmissions?.every(s => 
        s.id === submission.id ? true : s.status === 'approved'
      )

      if (allApproved) {
        // Mark step as completed
        await supabase
          .from('step_progress')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            validated_at: new Date().toISOString(),
            validated_by: profile?.id
          })
          .eq('id', stepProgress.id)

        // Unlock next step if exists
        const currentStepNumber = PROGRAM_STEPS.findIndex(s => 
          selectedClient?.stepProgress.find(sp => sp.id === stepProgress.id)
        ) + 1

        if (currentStepNumber < PROGRAM_STEPS.length) {
          const nextStepProgress = selectedClient?.stepProgress[currentStepNumber]
          if (nextStepProgress) {
            await supabase
              .from('step_progress')
              .update({ status: 'in_progress', started_at: new Date().toISOString() })
              .eq('id', nextStepProgress.id)

            // Update program current step
            await supabase
              .from('programs')
              .update({ current_step: currentStepNumber + 1 })
              .eq('id', selectedClient?.program.id)
          }

          // Notify client
          await supabase.from('notifications').insert({
            user_id: selectedClient?.profile.id,
            type: 'step_unlocked',
            title: 'Nouvelle étape débloquée',
            message: `Félicitations ! L'étape ${currentStepNumber + 1} est maintenant accessible.`,
            data: { step_number: currentStepNumber + 1 }
          })
        }

        toast.success('Étape validée et suivante débloquée')
      } else {
        toast.success('Soumission approuvée')
      }

      // Notify client of approval
      await supabase.from('notifications').insert({
        user_id: selectedClient?.profile.id,
        type: 'submission_approved',
        title: 'Soumission approuvée',
        message: 'Votre livrable a été validé par votre conseiller.',
        data: { submission_id: submission.id }
      })

      fetchClients()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la validation')
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

      // Notify client
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

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setSelectedClient(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                {selectedClient.profile.first_name} {selectedClient.profile.last_name}
              </h1>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
                {selectedClient.profile.company_name || selectedClient.profile.email}
              </p>
            </div>
          </div>

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
                  const stepIndex = selectedClient.stepProgress.indexOf(stepProgress)
                  const step = PROGRAM_STEPS[stepIndex]

                  return (
                    <div key={submission.id} className="p-4 bg-[#FEFDFB] border border-gray-200" style={{ borderRadius: '1px' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="warning">Étape {step?.number}</Badge>
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
                            {submission.type === 'link' ? (
                              <a
                                href={submission.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2C5F6F] hover:underline flex items-center gap-1"
                                style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                              >
                                {submission.content}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <a
                                href={submission.file_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2C5F6F] hover:underline flex items-center gap-1"
                                style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
                              >
                                {submission.file_name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
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
                            Approuver
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
                {PROGRAM_STEPS.map((step, index) => {
                  const progress = selectedClient.stepProgress[index]
                  const status = progress?.status || 'locked'

                  return (
                    <div key={step.number} className="flex items-center gap-4 p-4 bg-[#F5F3EF]" style={{ borderRadius: '1px' }}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-emerald-500 text-white' :
                        status === 'in_progress' ? 'bg-[#2C5F6F] text-white' :
                        status === 'pending_validation' ? 'bg-amber-500 text-white' :
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
                        'locked'
                      }>
                        {status === 'completed' ? 'Terminé' :
                         status === 'in_progress' ? 'En cours' :
                         status === 'pending_validation' ? 'En attente' :
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
        <div className="grid grid-cols-3 gap-4 mb-8">
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
                    Clients actifs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#2C2C2C' }}>
                    {clients.reduce((acc, c) => 
                      acc + c.stepProgress.flatMap(sp => sp.submissions.filter(s => s.status === 'pending')).length
                    , 0)}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    En attente
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
                    {clients.filter(c => c.program.status === 'completed').length}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Terminés
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
                          className="w-12 h-12 rounded-full bg-[#2C5F6F] flex items-center justify-center text-white"
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500 }}
                        >
                          {client.profile.first_name[0]}{client.profile.last_name[0]}
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#2C2C2C' }}>
                            {client.profile.first_name} {client.profile.last_name}
                          </p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                            {client.profile.company_name || client.profile.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#5A5A5A' }}>
                            Étape {client.program.current_step}/5
                          </p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888' }}>
                            {completedSteps} terminée{completedSteps > 1 ? 's' : ''}
                          </p>
                        </div>
                        {pendingCount > 0 && (
                          <Badge variant="warning">
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
