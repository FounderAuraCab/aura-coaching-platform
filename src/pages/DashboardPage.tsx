import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { StepContent } from '@/components/dashboard/StepContent'
import { toast } from 'sonner'
import { LogOut, CheckCircle2, Clock, Lock, Hourglass, Eye } from 'lucide-react'
import type { Program, StepProgress, Submission } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface StepProgressWithSubmissions extends StepProgress {
  submissions?: Submission[]
  steps?: {
    id: string
    number: number
    title: string
  }
}

interface TimeEntry {
  category: string
  hour_slot: string
  entry_date: string
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

export default function DashboardPage() {
  const { user, profile, session, signOut } = useAuth()
  const [program, setProgram] = useState<Program | null>(null)
  const [stepProgress, setStepProgress] = useState<StepProgressWithSubmissions[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeStep, setActiveStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const isFreePlan = profile?.plan === 'free'

  const fetchData = async () => {
    const token = getToken(session)
    if (!token || !user) {
      setIsLoading(false)
      return
    }

    try {
      // Fetch program
      const programs = await fetchWithAuth(`programs?select=*&user_id=eq.${user.id}`, token)

      if (!programs || programs.length === 0 || programs.error) {
        console.error('Error fetching program:', programs)
        setIsLoading(false)
        return
      }

      const programData = programs[0]
      setProgram(programData)
      setActiveStep(programData.current_step || 1)

      // Fetch step progress
      const progressData = await fetchWithAuth(
        `step_progress?select=*,submissions(*),steps(*)&program_id=eq.${programData.id}`,
        token
      )

      if (progressData && !progressData.error) {
        const sorted = progressData.sort((a: StepProgressWithSubmissions, b: StepProgressWithSubmissions) => 
          (a.steps?.number || 0) - (b.steps?.number || 0)
        )
        setStepProgress(sorted)
      }

      // Fetch time entries for Step 2 analysis
      const entries = await fetchWithAuth(
        `time_entries?user_id=eq.${user.id}&order=entry_date.desc`,
        token
      )

      if (entries && !entries.error) {
        setTimeEntries(entries)
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const progressPercentage = useMemo(() => {
    if (!stepProgress.length) return 0
    const completed = stepProgress.filter(p => p.status === 'completed').length
    return Math.round((completed / PROGRAM_STEPS.length) * 100)
  }, [stepProgress])

  const currentStepData = PROGRAM_STEPS.find(s => s.number === activeStep)
  const currentProgress = stepProgress.find(p => p.steps?.number === activeStep)

  const handleSubmit = async (data: { 
    type: 'link' | 'file'
    content: string
    fileUrl?: string
    fileName?: string 
  }) => {
    const token = getToken(session)
    if (!token || !program || !currentProgress) {
      toast.error('Erreur: programme non trouve')
      return
    }

    try {
      const submitResult = await postWithAuth('submissions', token, {
        step_progress_id: currentProgress.id,
        user_id: user?.id,
        type: data.type,
        content: data.content,
        file_url: data.fileUrl || null,
        file_name: data.fileName || null,
        status: 'pending',
      })

      if (submitResult.error) throw new Error(submitResult.error.message)

      await patchWithAuth(
        `step_progress?id=eq.${currentProgress.id}`,
        token,
        { status: 'pending_validation' }
      )

      const admins = await fetchWithAuth(`profiles?select=id&role=eq.admin`, token)

      if (admins && !admins.error) {
        for (const admin of admins) {
          await postWithAuth('notifications', token, {
            user_id: admin.id,
            type: 'submission_received',
            title: 'Nouvelle soumission',
            message: `${profile?.first_name} ${profile?.last_name} a soumis un livrable pour le bloc ${activeStep}`,
            data: { 
              client_id: user?.id,
              step_number: activeStep,
              submission_type: data.type 
            },
          })
        }
      }

      toast.success('Soumission envoyee avec succes !')
      fetchData()

    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Erreur lors de la soumission')
      throw error
    }
  }

  // Demande de validation pour le Bloc 2
  const handleValidationRequest = async () => {
    const token = getToken(session)
    if (!token || !currentProgress) return

    try {
      await patchWithAuth(
        `step_progress?id=eq.${currentProgress.id}`,
        token,
        { status: 'pending_validation' }
      )

      // Notifier l'admin
      const admins = await fetchWithAuth(`profiles?select=id&role=eq.admin`, token)
      if (admins && !admins.error) {
        for (const admin of admins) {
          await postWithAuth('notifications', token, {
            user_id: admin.id,
            type: 'validation_requested',
            title: 'Validation demandee',
            message: `${profile?.first_name} ${profile?.last_name} demande la validation de son organisation (Bloc 2)`,
            data: { 
              client_id: user?.id,
              step_number: activeStep
            },
          })
        }
      }

      toast.success('Demande de validation envoyee !')
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la demande')
    }
  }

  const isStepAccessible = (stepNumber: number) => {
    const progress = stepProgress.find(p => p.steps?.number === stepNumber)
    if (!progress) return stepNumber === 1
    
    if (isFreePlan && stepNumber > 1) {
      return progress.status === 'completed'
    }
    
    return progress.status !== 'locked'
  }

  const getStepStatus = (stepNumber: number) => {
    const progress = stepProgress.find(p => p.steps?.number === stepNumber)
    return progress?.status || 'locked'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2
      case 'in_progress': return Clock
      case 'pending_validation': return Hourglass
      case 'analysis_ready': return Eye
      default: return Lock
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-stone-500">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl text-stone-800">Altarys Conseil</h1>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-stone-400 mt-1">
                Programme d'accompagnement
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-stone-700">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-stone-400">
                  {profile?.plan === 'premium' ? 'Premium' : 'Diagnostic'}
                </p>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-500">Progression globale</span>
            <span className="text-xs font-medium text-stone-700">{progressPercentage}%</span>
          </div>
          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-stone-800"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {PROGRAM_STEPS.map((step) => {
              const status = getStepStatus(step.number)
              const isLocked = !isStepAccessible(step.number)
              const isCurrent = step.number === activeStep
              const isBlockedForFree = isFreePlan && step.number > 1 && status !== 'completed'
              const StatusIcon = getStatusIcon(status)

              return (
                <button
                  key={step.number}
                  onClick={() => !isLocked && !isBlockedForFree && setActiveStep(step.number)}
                  disabled={isLocked || isBlockedForFree}
                  className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'bg-stone-800 text-white'
                      : isLocked || isBlockedForFree
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                  }`}
                  style={{ borderRadius: '1px' }}
                >
                  <StatusIcon className="w-4 h-4" />
                  <span className="text-xs font-medium tracking-wide">
                    {step.number}. {step.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {currentStepData && (
          <StepContent
            step={currentStepData}
            progress={currentProgress}
            submissions={currentProgress?.submissions}
            onSubmit={handleSubmit}
            timeEntries={timeEntries}
            onValidationRequest={handleValidationRequest}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[10px] text-stone-300 tracking-widest uppercase">
          Altarys Conseil - Accompagnement operationnel
        </p>
      </footer>
    </div>
  )
}
