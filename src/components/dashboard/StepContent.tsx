import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { useDropzone } from 'react-dropzone'
import { 
  FileText, Calendar, Target, Users, BarChart3, Lightbulb, 
  CheckCircle, Settings, Rocket, Upload, Link as LinkIcon, 
  ExternalLink, X, Loader2, Clock, CheckCircle2, AlertCircle,
  Lock, Hourglass, Eye, CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { StepData } from '@/lib/program-data'
import type { StepProgress, Submission } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface StepContentProps {
  step: StepData
  progress?: StepProgress
  submissions?: Submission[]
  onSubmit: (data: { type: 'link' | 'file'; content: string; fileUrl?: string; fileName?: string }) => Promise<void>
}

const iconMap: Record<string, typeof FileText> = {
  FileText, Calendar, Target, Users, BarChart3, Lightbulb, CheckCircle, Settings, Rocket,
}

const statusConfig = {
  locked: { label: 'Verrouillé', variant: 'locked' as const, icon: Lock },
  in_progress: { label: 'En cours', variant: 'pending' as const, icon: Clock },
  pending_validation: { label: 'En analyse', variant: 'warning' as const, icon: Hourglass },
  analysis_ready: { label: 'Analyse prête', variant: 'success' as const, icon: Eye },
  completed: { label: 'Terminé', variant: 'success' as const, icon: CheckCircle2 },
}

export function StepContent({ step, progress, submissions = [], onSubmit }: StepContentProps) {
  const { profile } = useAuth()
  const [linkUrl, setLinkUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const status = progress?.status || 'locked'
  const StatusIcon = statusConfig[status]?.icon || AlertCircle

  const isFreePlan = profile?.plan === 'free'
  const isFirstStep = step.number === 1

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
      toast.success('Lien soumis avec succès ! Nous analysons vos données.')
    } catch {
      toast.error('Erreur lors de la soumission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSubmit = async () => {
    if (!uploadedFile) {
      toast.error('Veuillez sélectionner un fichier')
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
      toast.success('Fichier soumis avec succès ! Nous analysons vos données.')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLocked = status === 'locked'
  const isPendingValidation = status === 'pending_validation'
  const isAnalysisReady = status === 'analysis_ready'
  const isCompleted = status === 'completed'
  const canSubmit = status === 'in_progress'

  // Pour les utilisateurs free, bloquer après le bloc 1
  const isBlockedForFree = isFreePlan && !isFirstStep && status !== 'completed'

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Card className={isLocked || isBlockedForFree ? 'opacity-60' : ''}>
        <CardHeader className="text-center pb-6 relative">
          <div className="absolute top-6 right-6">
            <Badge variant={statusConfig[status]?.variant || 'locked'}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[status]?.label || 'Verrouillé'}
            </Badge>
          </div>

          <div className="mb-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2C5F6F' }}>
            {step.subtitle} — ÉTAPE {step.number}
          </div>
          <CardTitle className="text-3xl mb-4">{step.title}</CardTitle>

          <motion.div className="w-12 h-[1px] mx-auto mb-6" style={{ background: '#2C5F6F', opacity: 0.3 }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />

          <CardDescription className="max-w-xl mx-auto text-base">{step.description}</CardDescription>
          <div className="mt-4" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
            Durée estimée : {step.durationWeeks} semaines
          </div>
        </CardHeader>

        <CardContent className="space-y-8">

          {/* État : En attente d'analyse */}
          {isPendingValidation && (
            <motion.div 
              className="bg-amber-50 border border-amber-200 p-6 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Hourglass className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#2C2C2C', marginBottom: '12px' }}>
                Données bien reçues !
              </h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A', lineHeight: '1.7' }}>
                Gaël analyse actuellement vos flux pour identifier vos <strong>3 leviers de liberté</strong>.
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#888', marginTop: '16px' }}>
                ⏱️ Temps d'attente estimé : <strong>24-48h</strong>
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888', marginTop: '8px' }}>
                Vous recevrez une notification dès que votre diagnostic sera prêt.
              </p>
            </motion.div>
          )}

          {/* État : Analyse prête (teaser pour free) */}
          {isAnalysisReady && isFreePlan && (
            <motion.div 
              className="bg-emerald-50 border border-emerald-200 p-6 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#2C2C2C', marginBottom: '12px' }}>
                Votre diagnostic est prêt !
              </h3>
              
              {/* Résumé teaser */}
              {progress?.analysis_summary && (
                <div 
                  className="bg-white border border-emerald-200 p-4 my-6 mx-auto max-w-md"
                  style={{ borderRadius: '1px' }}
                >
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: '#2C5F6F', fontWeight: 500 }}>
                    {progress.analysis_summary}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    Résultat de l'analyse de votre Time-Study
                  </p>
                </div>
              )}

              {/* Zone floutée */}
              <div className="relative my-6">
                <div 
                  className="bg-gray-100 p-6 blur-sm select-none"
                  style={{ borderRadius: '1px' }}
                >
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
                    ✓ Levier #1 : Réorganisation des créneaux clients<br/>
                    ✓ Levier #2 : Automatisation des confirmations RDV<br/>
                    ✓ Levier #3 : Délégation de la comptabilité hebdomadaire<br/><br/>
                    Plan d'action détaillé avec timeline de 12 semaines...
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
              </div>

              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A', marginBottom: '24px' }}>
                Pour débloquer votre <strong>plan d'action personnalisé</strong> et comprendre comment récupérer ces heures, réservez votre session de restitution gratuite.
              </p>

              <Button 
                size="lg"
                className="bg-[#2C5F6F] hover:bg-[#234550]"
                onClick={() => window.open('https://calendly.com/votre-lien', '_blank')}
              >
                <CalendarCheck className="w-5 h-5 mr-2" />
                Réserver ma session de restitution gratuite
              </Button>
            </motion.div>
          )}

          {/* État : Analyse prête (pour premium - afficher le contenu complet) */}
          {isAnalysisReady && !isFreePlan && (
            <motion.div 
              className="bg-emerald-50 border border-emerald-200 p-6 text-center"
              style={{ borderRadius: '1px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#2C2C2C', marginBottom: '12px' }}>
                Analyse terminée !
              </h3>
              {progress?.analysis_summary && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#2C5F6F', fontWeight: 500 }}>
                  {progress.analysis_summary}
                </p>
              )}
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A', marginTop: '16px' }}>
                Passez à l'étape suivante pour découvrir votre plan d'action.
              </p>
            </motion.div>
          )}

          {/* Objectifs - visible seulement si pas en attente */}
          {!isPendingValidation && !isAnalysisReady && (
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                Objectifs de l'étape
              </h3>
              <div className="space-y-4">
                {step.objectives.map((objective, index) => {
                  const Icon = iconMap[objective.icon] || FileText
                  return (
                    <motion.div key={index} className="flex items-start gap-4" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F5F3EF] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#2C5F6F]" />
                      </div>
                      <p className="flex-1 pt-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '1.7', color: '#4A4A4A' }}>
                        {objective.text}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Resources */}
          {step.resources.length > 0 && !isPendingValidation && !isAnalysisReady && (
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                Ressources
              </h3>
              <div className="grid gap-3">
                {step.resources.map((resource, index) => (
                  resource.type === 'disabled' ? (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-gray-100 opacity-50 cursor-not-allowed"
                      style={{ borderRadius: '1px' }}
                    >
                      <Lock className="w-5 h-5 text-gray-400" />
                      <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#888' }}>
                        {resource.title}
                      </span>
                    </div>
                  ) : (
                    
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-[#F5F3EF] hover:bg-[#E8E5DF] transition-colors group"
                      style={{ borderRadius: '1px' }}
                    >
                      <FileText className="w-5 h-5 text-[#2C5F6F]" />
                      <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#4A4A4A' }}>
                        {resource.title}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2C5F6F] transition-colors" />
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Video si disponible */}
          {step.videoUrl && !isPendingValidation && !isAnalysisReady && !isLocked && (
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                Vidéo explicative
              </h3>
              <div className="aspect-video bg-black rounded-sm overflow-hidden">
                <video 
                  src={step.videoUrl} 
                  controls 
                  className="w-full h-full"
                  poster="/video-poster.jpg"
                />
              </div>
            </div>
          )}

          {/* Previous Submissions */}
          {submissions.length > 0 && !isPendingValidation && !isAnalysisReady && (
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                Vos soumissions
              </h3>
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-[#F5F3EF]" style={{ borderRadius: '1px' }}>
                    <div className="flex items-center gap-3">
                      {sub.type === 'link' ? <LinkIcon className="w-4 h-4 text-[#2C5F6F]" /> : <FileText className="w-4 h-4 text-[#2C5F6F]" />}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#4A4A4A' }}>
                        {sub.type === 'link' ? sub.content : sub.file_name}
                      </span>
                    </div>
                    <Badge variant={sub.status === 'approved' ? 'success' : sub.status === 'rejected' ? 'destructive' : 'pending'}>
                      {sub.status === 'approved' ? 'Approuvé' : sub.status === 'rejected' ? 'Refusé' : 'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Form */}
          {canSubmit && !isBlockedForFree && (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                {isFirstStep ? 'Envoyer mon Time-Study pour analyse' : 'Soumettre un livrable'}
              </h3>

              {/* Link submission */}
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <Input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Coller le lien (Google Sheets, Drive, etc.)"
                  disabled={isSubmitting}
                />
                <Button type="submit" variant="outline" className="w-full" disabled={isSubmitting || !linkUrl.trim()}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                  {isFirstStep ? 'Envoyer pour analyse' : 'Soumettre le lien'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-sm text-gray-500">ou</span>
                </div>
              </div>

              {/* File upload */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-[#2C5F6F] bg-[#2C5F6F]/5' : 'border-gray-300 hover:border-[#2C5F6F]'
                }`}
                style={{ borderRadius: '1px' }}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-[#2C5F6F]" />
                    <div className="text-left">
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#2C2C2C' }}>{uploadedFile.name}</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888' }}>
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setUploadedFile(null) }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
                      {isDragActive ? 'Déposez le fichier ici' : 'Glissez un fichier ou cliquez pour parcourir'}
                    </p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#888', marginTop: '8px' }}>
                      PDF, DOCX, XLSX, PNG, JPG (max 10MB)
                    </p>
                  </>
                )}
              </div>

              {uploadedFile && (
                <Button onClick={handleFileSubmit} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {isFirstStep ? 'Envoyer pour analyse' : 'Envoyer le fichier'}
                </Button>
              )}
            </div>
          )}

          {/* Locked message */}
          {isLocked && !isBlockedForFree && (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#888' }}>
                Complétez l'étape précédente pour débloquer ce module
              </p>
            </div>
          )}

          {/* Blocked for free users */}
          {isBlockedForFree && (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-[#2C5F6F] mx-auto mb-4" />
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#2C2C2C', marginBottom: '12px' }}>
                Module réservé aux membres
              </h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#888', marginBottom: '24px' }}>
                Terminez votre diagnostic gratuit et réservez votre session de restitution pour accéder à l'accompagnement complet.
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open('https://calendly.com/votre-lien', '_blank')}
              >
                <CalendarCheck className="w-4 h-4 mr-2" />
                Réserver ma session gratuite
              </Button>
            </div>
          )}

          {/* Completed state */}
          {isCompleted && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A5A5A' }}>
                Cette étape est terminée. Bravo ! 🎉
              </p>
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  )
}
