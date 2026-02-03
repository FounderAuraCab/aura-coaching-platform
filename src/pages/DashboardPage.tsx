import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { ProgressHeader } from '@/components/dashboard/ProgressHeader'
import { StepContent } from '@/components/dashboard/StepContent'
import { toast } from 'sonner'
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
  const { user, profile, session } = useAuth()
  const [program, setProgram] = useState<Program | null>(null)
  const [stepProgress, setStepProgress] = useState<StepProgressWithSubmissions[]>([])
  const [activeStep, setActiveStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const isFreePlan = profile?.plan === 'free'

  // Fetch program and progress data
  const fetchData = async () => {
    const token = getToken(session)
    if (!token || !user) {
      setIsLoading(false)
      return
    }

    try {
      // Fetch user's program
      const programs = await fetchWithAuth(`programs?select=*&user_id=eq.${user.id}`, token)

      if (!programs || programs.length === 0 || programs.error) {
        console.error('Error fetching program:', programs)
        setIsLoading(false)
        return
      }

      const programData = programs[0]
      setProgram(programData)
      setActiveStep(programData.current_step || 1)

      // Fetch step progress with submissions and steps info
      const progressData = await fetchWithAuth(
        `step_progress?select=*,submissions(*),steps(*)&program_id=eq.${programData.id}`,
        token
      )

      if (progressData && !progressData.error) {
        // Trier par numero de step
        const sorted = progressData.sort((a: StepProgressWithSubmissions, b: StepProgressWithSubmissions) => 
          (a.steps?.number || 0) - (b.steps?.number || 0)
        )
        setStepProgress(sorted)
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

  // Calculate overall progress
  const progressPercentage = useMemo(() => {
    if (!stepProgress.length) return 0
    const completed = stepProgress.filter(p => p.status === 'completed').length
    return Math.round((completed / PROGRAM_STEPS.length) * 100)
  }, [stepProgress])

  // Prepare steps with status for header
  const headerSteps = useMemo(() => {
    return PROGRAM_STEPS.map(step => {
      const progress = stepProgress.find(p => p.steps?.number === step.number)

      return {
        number: step.number,
        label: step.title.split(' ')[0],
        isActive: step.number === activeStep,
        isCompleted: progress?.status === 'completed',
      }
    })
  }, [stepProgress, activeStep])

  // Get current step data
  const currentStepData = PROGRAM_STEPS.find(s => s.number === activeStep)
  const currentProgress = stepProgress.find(p => p.steps?.number === activeStep)

  // Handle submission
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
      // Create submission
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

      // Update step progress to pending validation
      await patchWithAuth(
        `step_progress?id=eq.${currentProgress.id}`,
        token,
        { status: 'pending_validation' }
      )

      // Create notification for admin
      const admins = await fetchWithAuth(`profiles?select=id&role=eq.admin`, token)

      if (admins && !admins.error) {
        for (const admin of admins) {
          await postWithAuth('notifications', token, {
            user_id: admin.id,
            type: 'submission_received',
            title: 'Nouvelle soumission',
            message: `${profile?.first_name} ${profile?.last_name} a soumis un livrable pour l etape ${activeStep}`,
            data: { 
              client_id: user?.id,
              step_number: activeStep,
              submission_type: data.type 
            },
          })
        }
      }

      toast.success('Soumission envoyee avec succes !')
      
      // Refresh data
      fetchData()

    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Erreur lors de la soumission')
      throw error
    }
  }

  // Check if step is accessible
  const isStepAccessible = (stepNumber: number) => {
    const progress = stepProgress.find(p => p.steps?.number === stepNumber)
    if (!progress) return stepNumber === 1
    
    // Pour les users free, seul le bloc 1 est accessible
    if (isFreePlan && stepNumber > 1) {
      return progress.status === 'completed'
    }
    
    return progress.status !== 'locked'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-2 border-[#2C5F6F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
            Chargement...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundColor: '#F5F3EF',
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(245, 243, 239, 1) 0%, rgba(238, 235, 229, 1) 100%)
        `,
      }}
    >
      {/* Texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paperTexture'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' seed='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paperTexture)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Progress Header */}
      <ProgressHeader steps={headerSteps} progressPercentage={progressPercentage} />

      {/* Step Navigation */}
      <div className="max-w-5xl mx-auto px-6 pb-4">
        <div className="flex gap-2">
          {PROGRAM_STEPS.map((step) => {
            const progress = stepProgress.find(p => p.steps?.number === step.number)
            const isLocked = !isStepAccessible(step.number)
            const isCurrent = step.number === activeStep
            const isBlockedForFree = isFreePlan && step.number > 1 && progress?.status !== 'completed'

            return (
              <button
                key={step.number}
                onClick={() => !isLocked && !isBlockedForFree && setActiveStep(step.number)}
                disabled={isLocked || isBlockedForFree}
                className={`px-4 py-2 whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-[#2C5F6F] text-white'
                    : isLocked || isBlockedForFree
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-[#5A5A5A] hover:bg-[#E8E5DF]'
                }`}
                style={{
                  borderRadius: '1px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {step.number}. {step.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
        {currentStepData && (
          <StepContent
            step={currentStepData}
            progress={currentProgress}
            submissions={currentProgress?.submissions}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
