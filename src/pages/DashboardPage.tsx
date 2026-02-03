import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading, session } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Recuperer le token depuis localStorage si session n'est pas dispo
        let token = session?.access_token
        if (!token) {
          const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            const parsed = JSON.parse(stored)
            token = parsed.access_token
          }
        }

        if (!token) {
          setError('No access token available')
          setLoading(false)
          return
        }

        console.log('Fetching with token...')

        // Fetch program
        const progResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/programs?select=*&user_id=eq.${user.id}`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        const programs = await progResponse.json()
        console.log('Programs response:', programs)

        if (!programs || programs.length === 0) {
          setError('No program found')
          setLoading(false)
          return
        }

        const program = programs[0]

        // Fetch step_progress avec steps et submissions
        const progressResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/step_progress?select=*,steps(*),submissions(*)&program_id=eq.${program.id}`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        const stepProgress = await progressResponse.json()
        console.log('Step progress response:', stepProgress)

        setData({ program, stepProgress })
        setLoading(false)

      } catch (e) {
        console.error('Fetch error:', e)
        setError(String(e))
        setLoading(false)
      }
    }

    fetchData()
  }, [user, authLoading, session])

  if (authLoading || loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Chargement... (authLoading: {String(authLoading)}, loading: {String(loading)})</p>
        <p>User: {user?.id || 'null'}</p>
        <p>Session: {session ? 'present' : 'null'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
        <p>Erreur: {error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '50px' }}>
      <h1>Dashboard Simple</h1>
      <p>User: {user?.email}</p>
      <p>Profile: {profile?.first_name} {profile?.last_name}</p>
      <p>Program ID: {data?.program?.id}</p>
      <p>Status: {data?.program?.status}</p>
      <p>Current Step: {data?.program?.current_step}</p>
      <hr />
      <h2>Step Progress ({data?.stepProgress?.length} steps)</h2>
      {data?.stepProgress?.map((sp: any) => (
        <div key={sp.id} style={{ marginBottom: '10px', padding: '10px', background: '#f0f0f0' }}>
          <strong>Step {sp.steps?.number}: {sp.steps?.title}</strong>
          <br />
          Status: {sp.status}
          {sp.analysis_summary && <><br />Analysis: {sp.analysis_summary}</>}
        </div>
      ))}
    </div>
  )
}
