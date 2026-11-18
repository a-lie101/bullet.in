import { useEffect, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../api'
import type { User } from '../types'

type Mode = 'login' | 'register'

export function AuthScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .authStatus()
      .then((status) => {
        setRegistrationOpen(status.registrationOpen)
        setNeedsSetup(status.needsSetup)
        // A brand-new server goes straight to creating the first account.
        if (status.needsSetup) setMode('register')
      })
      .catch((caught) => setError(errorMessage(caught)))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { user } =
        mode === 'login' ? await api.login(email, password) : await api.register(email, password, name)
      onSignedIn(user)
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  const heading = mode === 'login' ? 'Sign in' : needsSetup ? 'Set up bullet.in' : 'Create an account'
  const intro =
    mode === 'login'
      ? 'Welcome back.'
      : needsSetup
        ? 'Create the first account on this server. Registration closes after this unless you allow more.'
        : 'Create an account on this server.'

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand brand--large">
          <span className="brand-mark" aria-hidden="true" />
          bullet.in
        </div>
        <h1>{heading}</h1>
        <p className="muted">{intro}</p>

        {mode === 'register' && (
          <label className="field">
            <span>Name (optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
          {mode === 'register' && <small className="muted">At least 8 characters.</small>}
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button button--primary button--block" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        {registrationOpen && !needsSetup && (
          <p className="auth-switch">
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        )}
      </form>
    </main>
  )
}
