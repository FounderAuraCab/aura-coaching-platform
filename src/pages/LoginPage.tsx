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
      toast.success('Connexion réussie')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F3EF' }}>
      {/* Left Side - Login Form */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 relative"
        style={{
          backgroundColor: '#FEFDFB',
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.8) 0%, rgba(254, 253, 251, 1) 100%)
          `,
        }}
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Fine paper texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='loginPaper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23loginPaper)' opacity='0.6'/%3E%3C/svg%3E")`,
            backgroundSize: '140px 140px',
            mixBlendMode: 'multiply',
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div
              className="mb-4"
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '40px',
                fontWeight: 400,
                letterSpacing: '0.03em',
                color: '#2C2C2C',
              }}
            >
              AURA
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#2C5F6F',
              }}
            >
              Cabinet de conseil
            </div>
          </motion.div>

          {/* Welcome Text */}
          <motion.h1
            className="text-center mb-12"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '32px',
              fontWeight: 400,
              color: '#2C2C2C',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Bienvenue
          </motion.h1>

          {/* Login Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@entreprise.fr"
              required
              disabled={isLoading}
            />

            <Input
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isLoading}
            />

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: '#888',
                  textDecoration: 'none',
                }}
                className="hover:text-[#2C5F6F] transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isLoading ? 'Connexion...' : 'SE CONNECTER'}
            </Button>
          </motion.form>

          {/* Sign Up Link */}
          <motion.p
            className="text-center mt-8"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: '#666',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            Nouveau client ?{' '}
            <Link
              to="/register"
              style={{
                color: '#2C5F6F',
                textDecoration: 'underline',
                fontWeight: 500,
              }}
              className="hover:text-[#234550] transition-colors"
            >
              Créer un compte
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
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzM2ODAyNjgwfDA&ixlib=rb-4.1.0&q=80&w=1080')`,
          }}
        >
          {/* Architectural overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(135deg, rgba(44, 95, 111, 0.15) 0%, rgba(168, 153, 104, 0.08) 100%),
                linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, transparent 50%)
              `,
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}
