import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface SignUpMetadata {
  firstName: string
  lastName: string
  companyName?: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper pour obtenir le token depuis localStorage
const getStoredSession = () => {
  try {
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Error getting stored session:', e)
  }
  return null
}

// Fetch profile avec fetch direct (contourne le bug Web Locks)
const fetchProfileDirect = async (userId: string, token: string): Promise<Profile | null> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const data = await response.json()
    if (data && data.length > 0) {
      return data[0]
    }
    return null
  } catch (e) {
    console.error('Error fetching profile:', e)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        // Verifier d'abord le localStorage
        const storedSession = getStoredSession()
        
        if (storedSession?.access_token && storedSession?.user) {
          console.log('Found stored session, validating...')
          
          // Essayer de rafraichir la session pour s'assurer qu'elle est valide
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: storedSession.refresh_token
          })

          if (!isMounted) return

          if (refreshError) {
            console.log('Refresh failed, clearing session:', refreshError.message)
            // Session invalide, nettoyer
            const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
            localStorage.removeItem(storageKey)
            setIsLoading(false)
            return
          }

          if (refreshData.session) {
            console.log('Session refreshed successfully')
            setSession(refreshData.session)
            setUser(refreshData.session.user)
            
            // Fetch profile avec fetch direct
            const profileData = await fetchProfileDirect(
              refreshData.session.user.id,
              refreshData.session.access_token
            )
            
            if (isMounted && profileData) {
              setProfile(profileData)
            }
            
            setIsLoading(false)
            return
          }
        }

        // Pas de session stockee, essayer getSession (pour le cas de connexion initiale)
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!isMounted) return

        if (currentSession?.user) {
          console.log('Session found via getSession')
          setSession(currentSession)
          setUser(currentSession.user)
          
          const profileData = await fetchProfileDirect(
            currentSession.user.id,
            currentSession.access_token
          )
          
          if (isMounted && profileData) {
            setProfile(profileData)
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Auth init error:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    // Listener pour les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return
        
        console.log('Auth event:', event)
        
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
        } else if (newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          
          // Fetch profile avec fetch direct
          const profileData = await fetchProfileDirect(
            newSession.user.id,
            newSession.access_token
          )
          
          if (isMounted && profileData) {
            setProfile(profileData)
          }
          
          setIsLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          company_name: metadata.companyName,
          phone: metadata.phone,
        },
      },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user && session) {
      const profileData = await fetchProfileDirect(user.id, session.access_token)
      if (profileData) setProfile(profileData)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isLoading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
