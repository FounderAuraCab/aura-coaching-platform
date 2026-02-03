import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    } catch (e) {
      console.error('Exception fetching profile:', e)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const init = async () => {
      try {
        // Timeout de securite - 5 secondes max
        timeoutId = setTimeout(() => {
          if (isMounted && isLoading) {
            console.log('Auth timeout - forcing load complete')
            setIsLoading(false)
          }
        }, 5000)

        // Essayer getSession d'abord
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return

        if (error) {
          console.error('getSession error:', error)
        }

        if (currentSession?.user) {
          console.log('Session found via getSession')
          setSession(currentSession)
          setUser(currentSession.user)
          
          const profileData = await fetchProfile(currentSession.user.id)
          if (isMounted && profileData) {
            setProfile(profileData)
          }
          setIsLoading(false)
          return
        }

        // Si pas de session via getSession, verifier localStorage directement
        const storageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession)
            if (parsed?.access_token && parsed?.user) {
              console.log('Session found in localStorage, refreshing...')
              
              // Essayer de rafraichir la session
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                refresh_token: parsed.refresh_token
              })

              if (!isMounted) return

              if (refreshError) {
                console.error('Refresh error:', refreshError)
                // Token expire, nettoyer
                localStorage.removeItem(storageKey)
                setIsLoading(false)
                return
              }

              if (refreshData.session) {
                console.log('Session refreshed successfully')
                setSession(refreshData.session)
                setUser(refreshData.session.user)
                
                const profileData = await fetchProfile(refreshData.session.user.id)
                if (isMounted && profileData) {
                  setProfile(profileData)
                }
              }
            }
          } catch (e) {
            console.error('Error parsing stored session:', e)
          }
        }

        if (isMounted) {
          setIsLoading(false)
        }
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
        } else if (newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          
          const profileData = await fetchProfile(newSession.user.id)
          if (isMounted && profileData) {
            setProfile(profileData)
          }
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
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
    if (user) {
      const profileData = await fetchProfile(user.id)
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
