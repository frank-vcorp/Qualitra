import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { User } from '../types'

type Props = {
  onLogin: (user: User) => void
}

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('frank@vcorp.mx')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      onLogin(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shell narrow">
      <div className="card">
        <p className="eyebrow">Qualitra</p>
        <h1>Iniciar sesión</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary wide" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="footer-link">
          <Link to="/recovery">Recuperar acceso con código</Link>
        </p>
      </div>
    </div>
  )
}
