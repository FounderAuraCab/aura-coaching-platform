import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { StepContent } from '@/components/dashboard/StepContent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  ChevronRight, CheckCircle2, Lock, Clock, LogOut, 
  Bell, Settings, Hourglass, Eye
} from 'lucide-react'
import type { StepProgress, Submission } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface StepProgressWithDetails extends StepProgress {
  steps: {
    id: string
    number: number
    title: string
    subtitle: string
  }
  submissions: Submission[]
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

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading, session, signOut } = useAuth()
  const [program, setProgram] = useState<any>(null)
  const [stepProgress, setStepProgress] = useState<StepProgressWithDetails[]>([])
  const [activeStep, setActiveStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    const token = getToken(session)
    if (!token || !user) return

    try {
      // Fetch program
      const programs = await fetchWithAuth(`programs?select=*&user_id=eq.${user.id}`, token)
      
      if (!programs || programs.length === 0 || programs.error) {
        setError('Programme non trouve')
        setLoading(false)
        return
      }

      const prog = programs[0]
      setProgram(prog)
      setActiveStep(prog.current_step || 1)

      // Fetch step_progress
      const progress = await fetchWithAuth(
        `step_progress?select=*,steps(*),submissions(*)&program_id=eq.${prog.id}`,
        token
      )

      if (progress && !progress.error) {
        const sorted = progress.sort((a: StepProgressWithDetails, b: StepProgressWithDetails) => 
          (a.steps?.number || 0) - (b.steps?.number || 0)
        )
        setStepProgress(sorted)
      }

      setLoading(false)
    } catch (e) {
      console.error('Fetch error:', e)
      setError(String(e))
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchData()
  }, [user, authLoading])

  const handleSubmission = async (data: { type: 'link' | 'file'; content: string; fileUrl?: string; fileName?: string }) => {
    const token = getToken(session)
    if (!token) {
      toast.error('Session expiree')
      return
    }

    const currentProgress = stepProgress.find(sp => sp.steps?.number === activeStep)
    if (!currentProgress) return

    try {
      await postWithAuth('submissions', token, {
        step_progress_id: currentProgress.id,
        user_id: user?.id,
        type: data.type,
        content: data.content,
        file_url: data.fileUrl || null,
        file_name: data.fileName || null,
        status: 'pending'
      })

      toast.success('Soumission envoyee !')
      fetchData()
    } catch (e) {
      console.error('Submission error:', e)
      toast.error('Erreur lors de la soumission')
    }
  }

  const getStepStatus = (stepNumber: number) => {
    const progress = stepProgress.find(sp => sp.steps?.number === stepNumber)
    return progress?.status || 'locked'
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2
      case 'in_progress': return Clock
      case 'pending_validation': return Hourglass
      case 'analysis_ready': return Eye
      default: return Lock
    }
  }

  const getStepColor = (status: string, isActive: boolean) => {
    if (isActive) return 'bg-[#2C5F6F] text-white'
    switch (status) {
      case 'completed': return 'bg-emerald-500 text-white'
      case 'in_progress': return 'bg-[#2C5F6F]/20 text-[#2C5F6F]'
      case 'pending_validation': return 'bg-amber-500 text-white'
      case 'analysis_ready': return 'bg-emerald-400 text-white'
      default: return 'bg-gray-200 text-gray-400'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#2C5F6F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#888' }}>
            Chargement de votre espace...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="text-center">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#e53e3e' }}>
            {error}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reessayer
          </Button>
        </div>
      </div>
    )
  }

  const currentStepData = PROGRAM_STEPS.find(s => s.number === activeStep)
  const currentProgress = stepProgress.find(sp => sp.steps?.number === activeStep)
  const currentSubmissions = currentProgress?.submissions || []

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: '#2C2C2C' }}>
                AURA
              </h1>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                Programme d'accompagnement
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
                {profile?.first_name} {profile?.last_name}
              </span>
              {profile?.plan && (
                <Badge variant={profile.plan === 'premium' ? 'success' : 'secondary'}>
                  {profile.plan === 'premium' ? 'Premium' : 'Free'}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Sidebar - Steps Navigation */}
          <div className="col-span-3">
            <div className="bg-white p-6 sticky top-8" style={{ borderRadius: '1px' }}>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '24px' }}>
                Votre parcours
              </h2>
              
              <div className="space-y-2">
                {PROGRAM_STEPS.map((step, index) => {
                  const status = getStepStatus(step.number)
                  const isActive = activeStep === step.number
                  const Icon = getStepIcon(status)
                  const isClickable = status !== 'locked' || step.number === 1

                  return (
                    <motion.button
                      key={step.number}
                      onClick={() => isClickable && setActiveStep(step.number)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                        isActive ? 'bg-[#F5F3EF]' : 'hover:bg-gray-50'
                      } ${!isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      style={{ borderRadius: '1px' }}
                      whileHover={isClickable ? { x: 4 } : {}}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(status, isActive)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ 
                          fontFamily: 'Inter, sans-serif', 
                          fontSize: '13px', 
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#2C2C2C' : '#5A5A5A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {step.title}
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#888' }}>
                          {step.subtitle}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#2C5F6F]" />}
                    </motion.button>
                  )
                })}
              </div>

              {/* Progress Summary */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                    Progression globale
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#2C5F6F' }}>
                    {stepProgress.filter(sp => sp.status === 'completed').length}/{PROGRAM_STEPS.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#2C5F6F] transition-all duration-500"
                    style={{ 
                      width: `${(stepProgress.filter(sp => sp.status === 'completed').length / PROGRAM_STEPS.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {currentStepData && (
              <StepContent
                step={currentStepData}
                progress={currentProgress}
                submissions={currentSubmissions}
                onSubmit={handleSubmission}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
