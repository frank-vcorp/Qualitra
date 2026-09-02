import { FormEvent, useState } from 'react'
import { api } from '../api'
import type { Owner } from '../types'

type Props = {
  onComplete: (owner: Owner) => void
}

export function SetupPage({ onComplete }: Props) {
  const [name, setName] = useState('Frank Saavedra')
  const [email, setEmail] = useState('frank@vcorp.mx')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [createdOwner, setCreatedOwner] = useState<Owner | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api<{ owner: Owner; recoveryCodes: string[] }>('/api/setup/owner', {
        method: 'POST',
        body: JSON.stringify({ email, name, password, passwordConfirm }),
      })
      setCreatedOwner(res.owner)
      setRecoveryCodes(res.recoveryCodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear propietario')
    } finally {
      setLoading(false)
    }
  }

  if (recoveryCodes && createdOwner) {
    return (
      <div className="shell narrow">
        <div className="card">
          <h1>Propietario creado</h1>
          <p className="lead">
            Guarda estos códigos de recuperación en un lugar seguro. Cada código solo se puede usar una vez.
          </p>
          <div className="code-grid">
            {recoveryCodes.map((code) => (
              <code key={code} className="recovery-code">
                {code}
              </code>
            ))}
          </div>
          <p className="warning">
            No volverán a mostrarse. Si los pierdes, necesitarás acceso al servidor para recuperar el sistema.
          </p>
          <button type="button" className="btn primary wide" onClick={() => onComplete(createdOwner)}>
            Continuar al panel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="shell narrow">
      <div className="card">
        <p className="eyebrow">Qualitra · M00</p>
        <h1>Configuración inicial</h1>
        <p className="lead">Crea la cuenta del propietario de esta instalación.</p>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
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
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirmar contraseña
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary wide" disabled={loading}>
            {loading ? 'Creando…' : 'Crear propietario'}
          </button>
        </form>
      </div>
    </div>
  )
}
