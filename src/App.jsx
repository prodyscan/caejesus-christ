import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import AssistantProfilePage from './pages/AssistantProfilePage'
import AssistantsPage from './pages/AssistantsPage'"

import HomePage from './pages/HomePage'
import CentresPage from './pages/CentresPage'
import StudentsPage from './pages/StudentsPage'
import CouplesPage from './pages/CouplesPage'
import SeancesPage from './pages/SeancesPage'
import PaiementsPage from './pages/PaiementsPage'
import BilansPage from './pages/BilansPage'
import AssistantLoginPage from './pages/AssistantLoginPage'
import RattrapagesPage from './pages/RattrapagesPage'
import PortalPage from './pages/PortalPage'
import LoginPage from './pages/LoginPage'
import MainMenu from './components/MainMenu'

function withTimeout(promise, ms = 7000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout exceeded')), ms)
    ),
  ])
}

export default function App() {
  const [entered, setEntered] = useState(false)
  const [page, setPage] = useState('home')
  const [authPage, setAuthPage] = useState('login')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [assistantSession, setAssistantSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState('')
  const [hasBooted, setHasBooted] = useState(
    sessionStorage.getItem('app_booted') === '1'
  )

  useEffect(() => {
    let active = true

    try {
      const savedAssistantSession = localStorage.getItem('assistant_session')
      if (savedAssistantSession) {
        const parsed = JSON.parse(savedAssistantSession)
        setAssistantSession(parsed)
      }
    } catch (error) {
      console.log(error)
      localStorage.removeItem('assistant_session')
    }

    async function initAuth() {
      try {
        setLoadingAuth(true)
        setAuthError('')

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          7000
        )

        if (error) {
          console.log(error)
        }

        const currentSession = data?.session || null

        if (!active) return

        setSession(currentSession)

        if (currentSession?.user?.id) {
          const loadedProfile = await withTimeout(
            fetchProfile(currentSession.user.id),
            7000
          )

          if (!active) return

          if (loadedProfile) {
            setProfile(loadedProfile)
            setAuthError('')
          } else {
            setProfile(null)
            setAuthError('Profil introuvable pour cet utilisateur.')
          }
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('initAuth error:', error)

        if (!active) return

        setAuthError('Impossible de vérifier la session pour le moment.')
      } finally {
        if (active) {
          setLoadingAuth(false)
          setHasBooted(true)
          sessionStorage.setItem('app_booted', '1')
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        if (!active) return

        setLoadingAuth(!!newSession)
        setAuthError('')
        setSession(newSession || null)

        if (newSession?.user?.id) {
          const loadedProfile = await withTimeout(
            fetchProfile(newSession.user.id),
            7000
          )

          if (!active) return

          if (loadedProfile) {
            setProfile(loadedProfile)
            setAuthError('')
          } else {
            setProfile(null)
            setAuthError('Profil introuvable pour cet utilisateur.')
          }
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.log('onAuthStateChange error:', error)

        if (!active) return

        setAuthError('Session indisponible pour le moment.')
      } finally {
        if (active) {
          setLoadingAuth(false)
        }
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      console.log('fetchProfile userId =', userId)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('fetchProfile data =', data)
      console.log('fetchProfile error =', error)

      if (error) {
        return null
      }

      return data || null
    } catch (error) {
      console.log('fetchProfile crash =', error)
      return null
    }
  }

  async function resetSession() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log(error)
    }

    localStorage.removeItem('assistant_session')
    sessionStorage.removeItem('app_booted')
    setHasBooted(false)
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setAuthError('')
    setLoadingAuth(false)
    setPage('home')
    setAuthPage('login')
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log(error)
    }

    localStorage.removeItem('assistant_session')
    sessionStorage.removeItem('app_booted')
    setHasBooted(false)
    setSession(null)
    setProfile(null)
    setAssistantSession(null)
    setAuthError('')
    setPage('home')
    setAuthPage('login')
  }

  if (!entered) {
    return <PortalPage onEnter={() => setEntered(true)} />
  }

  if (loadingAuth && !hasBooted) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Chargement...</p>
          {authError ? <p style={styles.errorText}>{authError}</p> : null}

          <button
            type="button"
            style={styles.reloadButton}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </button>
        </div>
      </div>
    )
  }

  const activeProfile = session ? profile : assistantSession
  const isAdmin = activeProfile?.role === 'admin'

  if (!session && !assistantSession) {
    if (authPage === 'assistant-login') {
      return (
        <AssistantLoginPage
          onLoginSuccess={(assistantData) => {
            localStorage.setItem(
              'assistant_session',
              JSON.stringify(assistantData)
            )
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

  if (session && !profile && loadingAuth) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Chargement profil...</p>
          {authError ? <p style={styles.errorText}>{authError}</p> : null}

          <button
            type="button"
            style={styles.reloadButton}
            onClick={() => window.location.reload()}
          >
            Actualiser
          </button>

          <button
            type="button"
            style={styles.resetButton}
            onClick={resetSession}
          >
            Réinitialiser session
          </button>
        </div>
      </div>
    )
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

      return <CentresPage profile={activeProfile} />
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
    
    if (page === 'assistants') {
      return <AssistantsPage profile={activeProfile} />
    }


    if (page === 'rattrapages') {
      return <RattrapagesPage profile={activeProfile} />
    }

    if (page === 'paiements') {
      return <PaiementsPage profile={activeProfile} />
    }

    if (page === 'bilans') {
      return <BilansPage profile={activeProfile} />
    }

    if (page === 'assistant-profile') {
      return <AssistantProfilePage profile={activeProfile} />
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
          Les assistants se connectent maintenant avec le code et le mot de
          passe de leur classe.
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

  loadingPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f7f1fb',
    padding: 20,
  },

  loadingBox: {
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
  },

  loadingText: {
    fontSize: 24,
    color: '#666',
    marginBottom: 16,
  },

  errorText: {
    color: '#d91e18',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 1.5,
  },

  reloadButton: {
    display: 'block',
    width: '100%',
    maxWidth: 220,
    margin: '0 auto 16px',
    padding: 14,
    borderRadius: 18,
    border: 'none',
    background: '#2b0a78',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  resetButton: {
    display: 'block',
    width: '100%',
    maxWidth: 260,
    margin: '0 auto',
    padding: 14,
    borderRadius: 18,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}
