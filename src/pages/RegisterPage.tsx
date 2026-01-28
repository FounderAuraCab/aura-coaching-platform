import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setIsLoading(true)
    const { error } = await signUp(formData.email, formData.password, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      companyName: formData.companyName,
      phone: formData.phone,
    })
    setIsLoading(false)

    if (error) {
      toast.error(error.message || 'Une erreur est survenue')
    } else {
      toast.success('Compte créé avec succès ! Vérifiez votre email.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F3EF' }}>
      {/* Left Side - Register Form */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 relative overflow-auto"
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
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='registerPaper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23registerPaper)' opacity='0.6'/%3E%3C/svg%3E")`,
            backgroundSize: '140px 140px',
            mixBlendMode: 'multiply',
          }}
        />

        <div className="w-full max-w-md relative z-10 py-8">
          {/* Logo */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div
              className="mb-4"
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '36px',
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

          {/* Title */}
          <motion.h1
            className="text-center mb-8"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '28px',
              fontWeight: 400,
              color: '#2C2C2C',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Créer votre compte
          </motion.h1>

          {/* Register Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                name="firstName"
                label="Prénom"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Jean"
                required
                disabled={isLoading}
              />
              <Input
                type="text"
                name="lastName"
                label="Nom"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Dupont"
                required
                disabled={isLoading}
              />
            </div>

            <Input
              type="email"
              name="email"
              label="Email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jean.dupont@entreprise.fr"
              required
              disabled={isLoading}
            />

            <Input
              type="text"
              name="companyName"
              label="Nom de l'entreprise"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Ma Société SARL"
              disabled={isLoading}
            />

            <Input
              type="tel"
              name="phone"
              label="Téléphone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="06 12 34 56 78"
              disabled={isLoading}
            />

            <Input
              type="password"
              name="password"
              label="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••••"
              required
              disabled={isLoading}
            />

            <Input
              type="password"
              name="confirmPassword"
              label="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••••••"
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              className="w-full mt-4"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isLoading ? 'Création...' : 'CRÉER MON COMPTE'}
            </Button>
          </motion.form>

          {/* Login Link */}
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
            Déjà un compte ?{' '}
            <Link
              to="/login"
              style={{
                color: '#2C5F6F',
                textDecoration: 'underline',
                fontWeight: 500,
              }}
              className="hover:text-[#234550] transition-colors"
            >
              Se connecter
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
            backgroundImage: `url('https://images.unsplash.com/photo-1497366811353-6870744d04b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')`,
          }}
        >
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
