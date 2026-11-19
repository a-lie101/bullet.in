import { useEffect, useState } from 'react'
import { ApiError, api, errorMessage } from './api'
import { AuthScreen } from './components/AuthScreen'
import { Board } from './components/Board'
import type { User } from './types'

type Session =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; user: User }
  | { state: 'unreachable'; message: string }

export default function App() {
  const [session, setSession] = useState<Session>({ state: 'loading' })

  async function checkSession() {
    try {
      const { user } = await api.me()
      setSession({ state: 'signed-in', user })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setSession({ state: 'signed-out' })
      else setSession({ state: 'unreachable', message: errorMessage(error) })
    }
  }

  useEffect(() => {
    void checkSession()
  }, [])

  switch (session.state) {
    case 'loading':
      return <div className="splash" aria-busy="true" />
    case 'unreachable':
      return (
        <div className="splash">
          <p>{session.message}</p>
          <button className="button" onClick={() => void checkSession()}>
            Try again
          </button>
        </div>
      )
    case 'signed-out':
      return <AuthScreen onSignedIn={(user) => setSession({ state: 'signed-in', user })} />
    case 'signed-in':
      return <Board user={session.user} onSignedOut={() => setSession({ state: 'signed-out' })} />
  }
}
