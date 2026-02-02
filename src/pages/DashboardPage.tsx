import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
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
        console.log('Fetching data for user:', user.id)
        
        const { data: program, error: progError } = await supabase
          .from('programs')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (progError) {
          console.log('Program error:', progError)
          setError(progError.message)
          setLoading(false)
          return
        }

        console.log('Program:', program)
        setData({ program })
        setLoading(false)
      } catch (e) {
        console.log('Catch error:', e)
        setError(String(e))
        setLoading(false)
      }
    }

    fetchData()
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Chargement... (authLoading: {String(authLoading)}, loading: {String(loading)})</p>
        <p>User: {user?.id || 'null'}</p>
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
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
