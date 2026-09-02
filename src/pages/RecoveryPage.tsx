import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export function RecoveryPage() {
  const [email, setEmail] = useState('frank@vcorp.mx')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await api<{ message: string }>('/api/auth/recovery/reset', {
        method: 'POST',
        body: JSON.stringify({ email, recoveryCode, newPassword, newPasswordConfirm }),
      })
      setSuccess(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shell narrow">
      <div className="card">
        <p className="eyebrow">Qualitra</p>
        <h1>Recuperar acceso</h1>
        <p className="lead">Usa uno de los códigos de recuperación generados al crear el propietario.</p>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Código de recuperación
            <input
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              required
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
              minLength={10}
            />
          </label>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button type="submit" className="btn primary wide" disabled={loading}>
            {loading ? 'Restableciendo…' : 'Restablecer contraseña'}
          </button>
        </form>
        <p className="footer-link">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
