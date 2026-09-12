import { useMemo, useState } from 'react'

type LayoutElement = {
  id: string
  type: string
  fieldKey?: string
  groupKey?: string
  label?: string
  help?: string
  required?: boolean
  text?: string
  content?: string
  template?: string
}

type Section = {
  id: string
  title: string
  elements: LayoutElement[]
}

type Condition = {
  targetFieldKey: string
  whenFieldKey: string
  operator?: string
  value: string
}

type Props = {
  sections: Section[]
  conditions: Condition[]
  schema: {
    fields?: Array<{ key: string; label: string; type: string; groupKey?: string }>
    groups?: Array<{ key: string; label: string; repeatable?: boolean }>
  }
  presentation?: Record<string, {
    title: string
    scoreField: string
    labelField: string
    messages: Record<string, string>
  }> | null
  calculationResults?: Record<string, unknown>
  interactive?: boolean
}

function isVisible(fieldKey: string, conditions: Condition[], values: Record<string, unknown>) {
  const relevant = conditions.filter((c) => c.targetFieldKey === fieldKey)
  if (relevant.length === 0) return true
  return relevant.every((c) => {
    const current = values[c.whenFieldKey]
    if (c.operator === 'not_equals') return String(current ?? '') !== String(c.value ?? '')
    return String(current ?? '') === String(c.value ?? '')
  })
}

export function FormPreview({
  sections,
  conditions,
  schema,
  presentation,
  calculationResults = {},
  interactive = true,
}: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [groups, setGroups] = useState<Record<string, Array<Record<string, unknown>>>>({
    criterios: [{ concepto: '', calificacion: '', peso: '', observacion: '' }],
  })

  const mergedValues = useMemo(
    () => ({ ...values, ...calculationResults }),
    [values, calculationResults],
  )

  function fieldMeta(key: string) {
    return schema.fields?.find((f) => f.key === key)
  }

  function renderField(el: LayoutElement) {
    const meta = el.fieldKey ? fieldMeta(el.fieldKey) : null
    const key = el.fieldKey!
    if (!isVisible(key, conditions, mergedValues)) return null

    const label = el.label || meta?.label || key
    const type = meta?.type ?? 'short_text'

    return (
      <label key={el.id} className="preview-field">
        {label}
        {(el.required || meta) && el.required && <span className="req">*</span>}
        {el.help && <span className="muted field-help">{el.help}</span>}
        {type === 'long_text' ? (
          <textarea
            rows={3}
            disabled={!interactive}
            value={String(values[key] ?? '')}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          />
        ) : type === 'boolean' ? (
          <select
            disabled={!interactive}
            value={String(values[key] ?? '')}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          >
            <option value="">—</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            disabled={!interactive}
            type={type === 'date' ? 'date' : type === 'email' ? 'email' : 'text'}
            value={String(values[key] ?? '')}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          />
        )}
      </label>
    )
  }

  function renderGroup(el: LayoutElement) {
    const group = schema.groups?.find((g) => g.key === el.groupKey)
    const rows = groups[el.groupKey!] ?? [{}]
    return (
      <div key={el.id} className="preview-group">
        <h4>{el.label || group?.label || el.groupKey}</h4>
        {rows.map((row, idx) => (
          <div key={idx} className="preview-group-row">
            <span className="field-num">{idx + 1}</span>
            {(schema.fields ?? [])
              .filter((f) => f.groupKey === el.groupKey)
              .map((f) => (
                <label key={f.key} className="preview-field compact">
                  {f.label}
                  <input
                    disabled={!interactive}
                    value={String(row[f.key] ?? '')}
                    onChange={(e) => {
                      setGroups((g) => {
                        const copy = { ...g }
                        const list = [...(copy[el.groupKey!] ?? [])]
                        list[idx] = { ...list[idx], [f.key]: e.target.value }
                        copy[el.groupKey!] = list
                        return copy
                      })
                    }}
                  />
                </label>
              ))}
          </div>
        ))}
        {interactive && group?.repeatable && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() =>
              setGroups((g) => ({
                ...g,
                [el.groupKey!]: [...(g[el.groupKey!] ?? []), {}],
              }))
            }
          >
            + Agregar {group.label?.toLowerCase() ?? 'elemento'}
          </button>
        )}
      </div>
    )
  }

  function renderPresentation(el: LayoutElement) {
    const cfg = presentation?.[el.template ?? '']
    if (!cfg) return null
    const score = calculationResults[cfg.scoreField]
    const label = calculationResults[cfg.labelField]
    const message = cfg.messages[String(label ?? '')] ?? ''
    return (
      <div key={el.id} className="result-card">
        <p className="eyebrow">{cfg.title}</p>
        <p className="result-score">{score != null ? `${score} puntos` : '—'}</p>
        <p className={`result-label pill ${String(label).toLowerCase().replace(/\s+/g, '-')}`}>{String(label ?? '—')}</p>
        {message && <p className="result-message">{message}</p>}
      </div>
    )
  }

  return (
    <div className="form-preview">
      {sections.map((section) => (
        <section key={section.id} className="preview-section">
          {section.title && <h3>{section.title}</h3>}
          {section.elements.map((el) => {
            switch (el.type) {
              case 'header':
                return (
                  <h4 key={el.id} className="preview-header">
                    {el.text}
                  </h4>
                )
              case 'text':
                return (
                  <p key={el.id} className="muted preview-info">
                    {el.content}
                  </p>
                )
              case 'field':
                return renderField(el)
              case 'group':
                return renderGroup(el)
              case 'calculated': {
                const val = calculationResults[el.fieldKey!]
                return (
                  <div key={el.id} className="preview-calculated">
                    <span>{el.label || el.fieldKey}</span>
                    <strong>{val != null ? String(val) : '—'}</strong>
                  </div>
                )
              }
              case 'presentation':
                return renderPresentation(el)
              default:
                return null
            }
          })}
        </section>
      ))}
    </div>
  )
}
