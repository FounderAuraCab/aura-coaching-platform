import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PROGRAM_STEPS } from '@/lib/program-data'
import { ProgressHeader } from '@/components/dashboard/ProgressHeader'
import { StepContent } from '@/components/dashboard/StepContent'
import { toast } from 'sonner'
import type { Program, StepProgress, Submission } from '@/types/database'

interface StepProgressWithSubmissions extends StepProgress {
  submissions?: Submission[]
}

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const [program, setProgram] = useState<Program | null>(null)
  const [stepProgress, setStepProgress] = useState<StepProgressWithSubmissions[]>([])
  const [activeStep, setActiveStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Fetch program and progress data
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setIsLoading(false)
      return
    }
    if (hasLoaded) return

    const fetchData = async () => {
      try {
        // Fetch user's program
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (programError && programError.code !== 'PGRST116') {
          console.error('Error fetching program:', programError)
        }

        if (programData) {
          setProgram(programData)
          setActiveStep(programData.current_step)

          // Fetch step progress with submissions
          const { data: progressData, error: progressError } = await supabase
            .from('step_progress')
            .select(`
              *,
              submissions (*)
            `)
            .eq('program_id', programData.id)
            .order('created_at', { ascending: true })

          if (progressError) {
            console.error('Error fetching progress:', progressError)
          }

          setStepProgress(progressData || [])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
        setHasLoaded(true)
      }
    }

    fetchData()
  }, [user, authLoading, hasLoaded])

  // Calculate overall progress
  const progressPercentage = useMemo(() => {
    if (!stepProgress.length) return 0
    const completed = stepProgress.filter(p => p.status === 'completed').length
    return Math.round((completed / PROGRAM_STEPS.length) * 100)
  }, [stepProgress])

  // Prepare steps with status for header
  const headerSteps = useMemo(() => {
    return PROGRAM_STEPS.map((step, index) => {
      const progress = stepProgress[index]
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
  const currentProgress = stepProgress[activeStep - 1]

  // Handle submission
  const handleSubmit = async (data: { 
    type: 'link' | 'file'
    content: string
    fileUrl?: string
    fileName?: string 
  }) => {
    if (!program || !currentProgress) {
      toast.error('Erreur: programme non trouvé')
      return
    }

    try {
      const { error: submitError } = await supabase.from('submissions').insert({
        step_progress_id: currentProgress.id,
        type: data.type,
        content: data.content,
        file_url: data.fileUrl,
        file_name: data.fileName,
        status: 'pending',
      })

      if (submitError) throw submitError

      const { error: updateError } = await supabase
        .from('step_progress')
        .update({ status: 'pending_validation' })
        .eq('id', currentProgress.id)

      if (updateError) throw updateError

      // Refresh data
      const { data: updatedProgress } = await supabase
        .from('step_progress')
        .select('*, submissions (*)')
        .eq('program_id', program.id)
        .order('created_at', { ascending: true })

      setStepProgress(updatedProgress || [])

    } catch (error) {
      console.error('Submit error:', error)
      throw error
    }
  }

  // Show loading only during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-12 h-12 border-2 border-[#2C5F6F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
            Chargement...
          </p>
        </motion.div>
      </div>
    )
  }

  // Show loading during data fetch, but only if we haven't loaded yet
  if (isLoading && !hasLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-12 h-12 border-2 border-[#2C5F6F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
            Chargement de votre programme...
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
        backgroundImage: `radial-gradient(circle at 50% 0%, rgba(245, 243, 239, 1) 0%, rgba(238, 235, 229, 1) 100%)`,
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
        <div className="flex gap-2 overflow-x-auto pb-2">
          {PROGRAM_STEPS.map((step, index) => {
            const progress = stepProgress[index]
            const isLocked = !progress || progress.status === 'locked'
            const isCurrent = step.number === activeStep

            return (
              <button
                key={step.number}
                onClick={() => !isLocked && setActiveStep(step.number)}
                disabled={isLocked}
                className={`px-4 py-2 whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-[#2C5F6F] text-white'
                    : isLocked
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
