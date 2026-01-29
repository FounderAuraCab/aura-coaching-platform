import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
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
  const [initialized, setInitialized] = useState(false)

  const fetchProfile = useCallback(async (userId: string) => {
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
    } catch (err) {
      console.error('Error in fetchProfile:', err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    if (initialized) return

    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)
          const profileData = await fetchProfile(currentSession.user.id)
          if (mounted) {
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
          setInitialized(true)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
        } else if (newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          
          // Only fetch profile if we don't have one or user changed
          if (!profile || profile.id !== newSession.user.id) {
            const profileData = await fetchProfile(newSession.user.id)
            if (mounted) {
              setProfile(profileData)
            }
          }
        }
        
        if (mounted) {
          setIsLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialized, fetchProfile, profile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    const { data, error } = await supabase.auth.signUp({
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

    if (error) return { error: error as Error }

    if (data.user) {
      try {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: email,
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          company_name: metadata.companyName,
          phone: metadata.phone,
          role: 'client',
        })

        await supabase.from('programs').insert({
          user_id: data.user.id,
          status: 'active',
          current_step: 1,
        })
      } catch (err) {
        console.error('Error creating profile/program:', err)
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const value = {
    user,
    profile,
    session,
    isLoading,
    isAdmin: profile?.role === 'admin',
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
