import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setIsLoading(true)
    const { error } = await signIn(email, password)
    setIsLoading(false)

    if (error) {
      toast.error('Identifiants incorrects')
    } else {
      toast.success('Connexion reussie')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Left Side - Login Form */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 relative bg-white"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h1 className="font-serif text-4xl tracking-tight text-stone-800 mb-3">
              Altarys Conseil
            </h1>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-stone-400">
              Accompagnement operationnel
            </p>
          </motion.div>

          {/* Welcome Text */}
          <motion.h2
            className="text-center mb-12 font-serif text-3xl text-stone-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Bienvenue
          </motion.h2>

          {/* Login Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@entreprise.fr"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
                style={{ borderRadius: '1px' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
                style={{ borderRadius: '1px' }}
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                Mot de passe oublie ?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-stone-800 text-white text-sm font-medium uppercase tracking-wider hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '1px' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </motion.form>

          {/* Sign Up Link */}
          <motion.p
            className="text-center mt-8 text-xs text-stone-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            Nouveau client ?{' '}
            <Link
              to="/register"
              className="text-stone-700 underline hover:text-stone-900 transition-colors font-medium"
            >
              Creer un compte
            </Link>
          </motion.p>
        </div>
      </motion.div>

      {/* Right Side - Image */}
      <motion.div
        className="hidden lg:block lg:w-1/2 relative overflow-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://i.ibb.co/d451r7yd/cristina-gottardi-3-Y76-Quja-IDg-unsplash.jpg')`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(120, 113, 108, 0.2) 0%, rgba(168, 162, 158, 0.1) 100%)`,
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}
