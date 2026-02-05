import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { useDropzone } from 'react-dropzone'
import { 
  FileText, Calendar, Target, Users, BarChart3, Lightbulb, 
  CheckCircle, Settings, Rocket, Upload, Link as LinkIcon, 
  ExternalLink, X, Loader2, Clock, CheckCircle2,
  Lock, Hourglass, Eye, CalendarCheck, Smartphone, PieChart, Factory, Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { StepData } from '@/lib/program-data'
import type { StepProgress, Submission } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import Step2Analysis from '@/components/dashboard/Step2Analysis'

interface StepContentProps {
  step: StepData
  progress?: StepProgress
  submissions?: Submission[]
  onSubmit: (data: { type: 'link' | 'file'; content: string; fileUrl?: string; fileName?: string }) => Promise<void>
  timeEntries?: Array<{ category: string; hour_slot: string; entry_date: string }>
  onValidationRequest?: () => void
}

const iconMap: Record<string, typeof FileText> = {
  FileText, Calendar, Target, Users, BarChart3, Lightbulb, CheckCircle, Settings, Rocket, Smartphone, PieChart, Factory, Bot,
}

type BadgeVariant = 'locked' | 'pending' | 'warning' | 'success' | 'destructive' | 'default' | 'secondary' | 'outline'

const statusConfig: Record<string, { label: string; variant: BadgeVariant; icon: typeof FileText }> = {
  locked: { label: 'Verrouille', variant: 'locked', icon: Lock },
  in_progress: { label: 'En cours', variant: 'pending', icon: Clock },
  pending_validation: { label: 'En attente', variant: 'warning', icon: Hourglass },
  analysis_ready: { label: 'Analyse prete', variant: 'success', icon: Eye },
  completed: { label: 'Termine', variant: 'success', icon: CheckCircle2 },
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const getToken = (session: any): string | null => {
  if (session?.access_token) return session.access_token
  try {
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    const stored = localStorage.getItem(storageKey)
    if (stored) return JSON.parse(stored).access_token
  } catch (e) {}
  return null
}

export function StepContent({ 
  step, 
  progress, 
  submissions = [], 
  onSubmit,
  timeEntries = [],
  onValidationRequest
}: StepContentProps) {
  const { user, profile, session } = useAuth()
  const [linkUrl, setLinkUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const status = progress?.status || 'locked'
  const config = statusConfig[status] || statusConfig.locked
  const StatusIcon = config.icon

  const isFreePlan = profile?.plan === 'free'
  const isFirstStep = step.number === 1
  const isTimeStudy = step.isTimeStudy === true
  const isAnalysis = step.isAnalysis === true

  const token = getToken(session)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setUploadedFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
  })

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkUrl.trim()) {
      toast.error('Veuillez entrer un lien valide')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'link', content: linkUrl })
      setLinkUrl('')
      toast.success('Lien soumis avec succes')
    } catch {
      toast.error('Erreur lors de la soumission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSubmit = async () => {
    if (!uploadedFile) {
      toast.error('Veuillez selectionner un fichier')
      return
    }
    setIsSubmitting(true)
    try {
      const fileExt = uploadedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `submissions/${fileName}`

      const { error: uploadError } = await supabase.storage.from('files').upload(filePath, uploadedFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(filePath)
      await onSubmit({ type: 'file', content: uploadedFile.name, fileUrl: publicUrl, fileName: uploadedFile.name })
      setUploadedFile(null)
      toast.success('Fichier soumis avec succes')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de upload')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLocked = status === 'locked'
  const isPendingValidation = status === 'pending_validation'
  const isAnalysisReady = status === 'analysis_ready'
  const isCompleted = status === 'completed'
  const canSubmit = status === 'in_progress'
  const isBlockedForFree = isFreePlan && !isFirstStep && status !== 'completed'

  // Get app URL from deliverables if it's a Time Study step
  const appDeliverable = step.deliverables?.find(d => d.type === 'app')
  const appUrl = appDeliverable?.appUrl || 'https://altarys-conseil-app.vercel.app'

  // Récupérer le CA mensuel depuis le profil
  const monthlyRevenue = profile?.monthly_revenue 
    ? parseMonthlyRevenue(profile.monthly_revenue) 
    : 10000 // Valeur par défaut

  // Parser le CA mensuel (format: "5k_10k" -> moyenne 7500)
  function parseMonthlyRevenue(value: string): number {
    const ranges: Record<string, number> = {
      'less_5k': 4000,
      '5k_10k': 7500,
      '10k_20k': 15000,
      '20k_50k': 35000,
      'more_50k': 60000,
    }
    return ranges[value] || 10000
  }

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Card className={isLocked || isBlockedForFree ? 'opacity-60' : ''}>
        <CardHeader className="text-center pb-6 relative">
          <div className="absolute top-6 right-6">
            <Badge variant={config.variant}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          </div>

          <div className="mb-2 text-[10px] font-medium tracking-[0.12em] uppercase text-stone-500">
            {step.subtitle} - BLOC {step.number}
          </div>
          <CardTitle className="font-serif text-3xl text-stone-800 mb-4">{step.title}</CardTitle>

          <motion.div className="w-12 h-px mx-auto mb-6 bg-stone-300" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />

          <CardDescription className="max-w-xl mx-auto text-base text-stone-500">{step.description}</CardDescription>
          <div className="mt-4 text-xs text-stone-400">
            Duree estimee : {step.durationWeeks} semaine{step.durationWeeks > 1 ? 's' : ''}
          </div>
        </CardHeader>

        <CardContent className="space-y-8">

          {/* === BLOC 2 : ANALYSE STRATÉGIQUE === */}
          {isAnalysis && canSubmit && !isBlockedForFree && user && token && (
            <Step2Analysis
              userId={user.id}
              token={token}
              monthlyRevenue={monthlyRevenue}
              timeEntries={timeEntries}
              onValidationRequest={onValidationRequest || (() => {})}
              isValidated={isCompleted}
            />
          )}

          {/* États spéciaux : En attente de validation */}
          {isPendingValidation && (
            <motion.div 
              className="bg-amber-50 border border-amber-200 p-6 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Hourglass className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-stone-800 mb-3">
                {isAnalysis ? 'Organisation en cours de validation' : 'Donnees bien recues !'}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                {isAnalysis 
                  ? 'Votre coach examine votre organisation des taches. Vous serez notifie une fois valide.'
                  : 'Votre coach analyse actuellement vos flux pour identifier vos leviers de liberte.'}
              </p>
              <p className="text-xs text-stone-400 mt-4">
                Temps d'attente estime : 24-48h
              </p>
            </motion.div>
          )}

          {/* Analyse prête (Free) */}
          {isAnalysisReady && isFreePlan && (
            <motion.div 
              className="bg-emerald-50 border border-emerald-200 p-6 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-stone-800 mb-3">
                Votre diagnostic est pret !
              </h3>
              
              {progress?.analysis_summary && (
                <div className="bg-white border border-emerald-200 p-4 my-6 mx-auto max-w-md" style={{ borderRadius: '1px' }}>
                  <p className="font-serif text-2xl text-stone-700">
                    {progress.analysis_summary}
                  </p>
                  <p className="text-xs text-stone-400 mt-2">
                    Resultat de l'analyse de votre Time-Study
                  </p>
                </div>
              )}

              <div className="relative my-6">
                <div className="bg-stone-100 p-6 blur-sm select-none" style={{ borderRadius: '1px' }}>
                  <p className="text-sm text-stone-500">Levier 1 : Reorganisation des creneaux clients</p>
                  <p className="text-sm text-stone-500">Levier 2 : Automatisation des confirmations RDV</p>
                  <p className="text-sm text-stone-500">Levier 3 : Delegation de la comptabilite hebdomadaire</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-stone-400" />
                </div>
              </div>

              <p className="text-sm text-stone-500 mb-6">
                Pour debloquer votre plan d'action personnalise, reservez votre session de restitution.
              </p>

              <button
                onClick={() => window.open('https://calendly.com/votre-lien', '_blank')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
                style={{ borderRadius: '1px' }}
              >
                <CalendarCheck className="w-5 h-5" />
                Reserver ma session
              </button>
            </motion.div>
          )}

          {/* Analyse prête (Premium) */}
          {isAnalysisReady && !isFreePlan && (
            <motion.div 
              className="bg-emerald-50 border border-emerald-200 p-6 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-stone-800 mb-3">
                {isAnalysis ? 'Organisation validee !' : 'Analyse terminee !'}
              </h3>
              {progress?.analysis_summary && (
                <p className="text-base text-stone-600 font-medium">
                  {progress.analysis_summary}
                </p>
              )}
              <p className="text-sm text-stone-500 mt-4">
                Passez au bloc suivant pour continuer votre transformation.
              </p>
            </motion.div>
          )}

          {/* Objectifs (sauf si analyse en cours ou états spéciaux) */}
          {!isPendingValidation && !isAnalysisReady && !isAnalysis && (
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-wider uppercase text-stone-500">
                Objectifs du bloc
              </h3>
              <div className="space-y-4">
                {step.objectives.map((objective, index) => {
                  const Icon = iconMap[objective.icon] || FileText
                  return (
                    <motion.div key={index} className="flex items-start gap-4" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-stone-600" />
                      </div>
                      <p className="flex-1 pt-1 text-sm text-stone-600 leading-relaxed">
                        {objective.text}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Time Study App Access */}
          {isTimeStudy && canSubmit && !isBlockedForFree && (
            <motion.div 
              className="bg-stone-100 border border-stone-200 p-8 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="font-serif text-2xl text-stone-800 mb-3">
                Accedez a l'application Time Study
              </h3>
              
              <p className="text-sm text-stone-500 leading-relaxed mb-2">
                Connectez-vous avec vos identifiants Altarys Conseil pour commencer le suivi de votre temps.
              </p>
              <p className="text-xs text-stone-400 mb-6">
                Chaque heure, indiquez votre activite principale. Objectif : 7 jours complets.
              </p>

              <button
                onClick={() => window.open(appUrl, '_blank')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
                style={{ borderRadius: '1px' }}
              >
                <ExternalLink className="w-5 h-5" />
                Ouvrir l'application
              </button>

              <p className="text-[10px] text-stone-400 mt-4">
                Vos donnees sont automatiquement synchronisees avec votre compte
              </p>
            </motion.div>
          )}

          {/* Resources */}
          {step.resources.length > 0 && !isPendingValidation && !isAnalysisReady && !isAnalysis && (
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-wider uppercase text-stone-500">
                Ressources
              </h3>
              <div className="grid gap-3">
                {step.resources.map((resource, index) => {
                  if (resource.type === 'app') {
                    return (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-stone-100 hover:bg-stone-200 transition-colors group"
                        style={{ borderRadius: '1px' }}
                      >
                        <Smartphone className="w-5 h-5 text-stone-600" />
                        <span className="flex-1 text-sm text-stone-700 font-medium">
                          {resource.title}
                        </span>
                        <ExternalLink className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
                      </a>
                    )
                  }
                  return (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-stone-50 hover:bg-stone-100 transition-colors group"
                      style={{ borderRadius: '1px' }}
                    >
                      <FileText className="w-5 h-5 text-stone-500" />
                      <span className="flex-1 text-sm text-stone-600">
                        {resource.title}
                      </span>
                      <ExternalLink className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submissions */}
          {submissions.length > 0 && !isPendingValidation && !isAnalysisReady && (
            <div className="space-y-4">
              <h3 className="text-xs font-medium tracking-wider uppercase text-stone-500">
                Vos soumissions
              </h3>
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-stone-50" style={{ borderRadius: '1px' }}>
                    <div className="flex items-center gap-3">
                      {sub.type === 'link' ? <LinkIcon className="w-4 h-4 text-stone-500" /> : <FileText className="w-4 h-4 text-stone-500" />}
                      <span className="text-sm text-stone-600">
                        {sub.type === 'link' ? sub.content : sub.file_name}
                      </span>
                    </div>
                    <Badge variant={sub.status === 'approved' ? 'success' : sub.status === 'rejected' ? 'destructive' : 'pending'}>
                      {sub.status === 'approved' ? 'Approuve' : sub.status === 'rejected' ? 'Refuse' : 'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard submission form - pour blocs 3, 4, 5 */}
          {canSubmit && !isBlockedForFree && !isTimeStudy && !isAnalysis && (
            <div className="space-y-6 pt-6 border-t border-stone-200">
              <h3 className="text-xs font-medium tracking-wider uppercase text-stone-500">
                Soumettre un livrable
              </h3>

              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Coller le lien (Google Drive, Notion, etc.)"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-white border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
                  style={{ borderRadius: '1px' }}
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting || !linkUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
                  style={{ borderRadius: '1px' }}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  Soumettre le lien
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-xs text-stone-400">ou</span>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}`}
                style={{ borderRadius: '1px' }}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-stone-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-stone-700">{uploadedFile.name}</p>
                      <p className="text-xs text-stone-400">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setUploadedFile(null) }}
                      className="p-1 hover:bg-stone-100 rounded"
                    >
                      <X className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-stone-300 mx-auto mb-4" />
                    <p className="text-sm text-stone-500">
                      {isDragActive ? 'Deposez le fichier ici' : 'Glissez un fichier ou cliquez'}
                    </p>
                    <p className="text-xs text-stone-400 mt-2">
                      PDF, DOCX, XLSX, PNG, JPG (max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <button 
                  onClick={handleFileSubmit} 
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                  style={{ borderRadius: '1px' }}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Envoyer le fichier
                </button>
              )}
            </div>
          )}

          {/* Locked state */}
          {isLocked && !isBlockedForFree && (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-stone-200 mx-auto mb-4" />
              <p className="text-sm text-stone-400">
                Completez le bloc precedent pour debloquer ce module
              </p>
            </div>
          )}

          {/* Blocked for free users */}
          {isBlockedForFree && (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-stone-700 mb-3">
                Module reserve aux membres
              </h3>
              <p className="text-sm text-stone-400 mb-6">
                Terminez votre diagnostic gratuit et reservez votre session pour acceder a l'accompagnement complet.
              </p>
              <button
                onClick={() => window.open('https://calendly.com/votre-lien', '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
                style={{ borderRadius: '1px' }}
              >
                <CalendarCheck className="w-4 h-4" />
                Reserver ma session
              </button>
            </div>
          )}

          {/* Completed state */}
          {isCompleted && !isAnalysis && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-sm text-stone-500">
                Ce bloc est termine. Bravo !
              </p>
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  )
}
