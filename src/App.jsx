import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

import HomePage from './pages/HomePage'
import ClassesPage from './pages/ClassesPage'
import StudentsPage from './pages/StudentsPage'
import CouplesPage from './pages/CouplesPage'
import SeancesPage from './pages/SeancesPage'
import PaiementsPage from './pages/PaiementsPage'
import BilansPage from './pages/BilansPage'
import AssistantLoginPage from './pages/AssistantLoginPage'

import PortalPage from './pages/PortalPage'
import LoginPage from './pages/LoginPage'
import MainMenu from './components/MainMenu'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const [authPage, setAuthPage] = useState('login')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [assistantSession, setAssistantSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    let active = true

    const savedAssistantSession = localStorage.getItem('assistant_session')
    if (savedAssistantSession) {
      try {
        const parsed = JSON.parse(savedAssistantSession)
        setAssistantSession(parsed)
      } catch (error) {
        console.log(error)
        localStorage.removeItem('assistant_session')
      }
    }

    async function initAuth() {
      setLoadingAuth(true)

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.log(error)
      }

      const currentSession = data?.session || null

      if (!active) return

      setSession(currentSession)

      if (currentSession?.user?.id) {
        const loadedProfile = await fetchProfile(currentSession.user.id)
        if (!active) return
        setProfile(loadedProfile)
      } else {
        setProfile(null)
      }

      if (active) {
        setLoadingAuth(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return

      setLoadingAuth(true)
      setSession(newSession || null)

      if (newSession?.user?.id) {
        const loadedProfile = await fetchProfile(newSession.user.id)
        if (!active) return
        setProfile(loadedProfile)
      } else {
        setProfile(null)
      }

      if (active) {
        setLoadingAuth(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.log(error)
      return null
    }

    return data || null
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('assistant_session')
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setPage('home')
    setAuthPage('login')
  }

  if (!entered) {
    return <PortalPage onEnter={() => setEntered(true)} />
  }

  if (loadingAuth) {
    return <div style={{ padding: 20 }}>Chargement...</div>
  }

  const activeProfile = session ? profile : assistantSession
  const isAdmin = activeProfile?.role === 'admin'
  const isAssistant = activeProfile?.role === 'assistant'

  if (!session && !assistantSession) {
    if (authPage === 'assistant-login') {
      return (
        <AssistantLoginPage
          onLoginSuccess={(assistantData) => {
            setAssistantSession(assistantData)
            setAuthPage('login')
            setPage('home')
          }}
          onBack={() => setAuthPage('login')}
        />
      )
    }

    return (
      <LoginPage
        onOpenRegisterAssistant={() => setAuthPage('assistant-login')}
      />
    )
  }

  if (session && !profile) {
    return <div style={{ padding: 20 }}>Chargement profil...</div>
  }

  function renderPage() {
    if (page === 'home') {
      return (
        <HomePage
          onNavigate={setPage}
          profile={activeProfile}
          onLogout={logout}
        />
      )
    }

    if (page === 'classes') {
      if (!isAdmin) {
        return (
          <HomePage
            onNavigate={setPage}
            profile={activeProfile}
            onLogout={logout}
          />
        )
      }
      return <ClassesPage profile={activeProfile} />
    }

    if (page === 'students') {
      return <StudentsPage profile={activeProfile} />
    }

    if (page === 'couples') {
      return <CouplesPage profile={activeProfile} />
    }

    if (page === 'seances') {
      return <SeancesPage profile={activeProfile} />
    }

    if (page === 'paiements') {
      return <PaiementsPage profile={activeProfile} />
    }

    if (page === 'bilans') {
      return <BilansPage profile={activeProfile} />
    }

    if (page === 'create-assistant') {
      if (!isAdmin) {
        return (
          <HomePage
            onNavigate={setPage}
            profile={activeProfile}
            onLogout={logout}
          />
        )
      }

      return (
        <div style={styles.infoBox}>
          Les assistants se connectent maintenant avec le code et le mot de passe de leur classe.
        </div>
      )
    }

    return (
      <HomePage
        onNavigate={setPage}
        profile={activeProfile}
        onLogout={logout}
      />
    )
  }

  return (
    <div style={styles.app}>
      {page !== 'home' && (
        <MainMenu
          currentPage={page}
          onChangePage={setPage}
          profile={activeProfile}
          onLogout={logout}
        />
      )}

      <div style={styles.content}>{renderPage()}</div>
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#f7f1fb',
  },
  content: {
    paddingBottom: 30,
  },
  infoBox: {
    padding: 20,
    textAlign: 'center',
    color: '#2b0a78',
    fontWeight: 'bold',
  },
}
