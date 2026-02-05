import { motion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface Step {
  number: number
  label: string
  isActive: boolean
  isCompleted: boolean
}

interface ProgressHeaderProps {
  steps: Step[]
  progressPercentage?: number
}

export function ProgressHeader({ steps, progressPercentage = 0 }: ProgressHeaderProps) {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="w-full py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Top bar with logo and user info */}
        <div className="flex justify-between items-center mb-8">
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '0.03em',
              color: '#2C2C2C',
            }}
          >
            AURA
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#2C2C2C',
                  }}
                >
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    color: '#888',
                  }}
                >
                  {profile?.company_name || profile?.email}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-full bg-[#2C5F6F] flex items-center justify-center text-white"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500 }}
              >
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="relative flex items-center justify-between mt-8">
          {/* Background line */}
          <div
            className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2"
            style={{
              background: 'rgba(44, 95, 111, 0.15)',
            }}
          />

          {/* Progress line */}
          <motion.div
            className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progressPercentage / 100 }}
            transition={{
              duration: 1.5,
              ease: [0.43, 0.13, 0.23, 0.96],
              delay: 0.3,
            }}
            style={{
              transformOrigin: 'left',
              background: '#2C5F6F',
              width: '100%',
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between w-full">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="flex flex-col items-center cursor-pointer"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Circle */}
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      step.isCompleted
                        ? 'bg-[#2C5F6F]'
                        : step.isActive
                        ? 'bg-[#2C5F6F] ring-4 ring-[#2C5F6F]/10'
                        : 'bg-white border-2 border-gray-300'
                    }`}
                  />
                  {step.isCompleted && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                    >
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </div>

                {/* Label */}
                <div
                  className={`mt-4 tracking-wide transition-colors whitespace-nowrap ${
                    step.isActive || step.isCompleted
                      ? 'text-[#2C5F6F]'
                      : 'text-gray-400'
                  }`}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {step.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress Percentage */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div
            className="text-gray-500"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
            }}
          >
            PROGRESSION GLOBALE
          </div>
          <motion.div
            className="mt-2"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '28px',
              fontWeight: 400,
              color: '#2C2C2C',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            {progressPercentage}%
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
