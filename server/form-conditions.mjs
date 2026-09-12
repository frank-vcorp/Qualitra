export function validateConditions(conditions = [], fieldKeys = new Set()) {
  const errors = []
  const graph = new Map()

  for (const cond of conditions) {
    if (!cond.targetFieldKey || !cond.whenFieldKey) {
      errors.push('Cada condición requiere campo objetivo y campo origen')
      continue
    }
    if (cond.whenFieldKey === cond.targetFieldKey) {
      errors.push(`Condición circular directa en ${cond.targetFieldKey}`)
    }
    if (!fieldKeys.has(cond.whenFieldKey)) {
      errors.push(`Campo origen desconocido: ${cond.whenFieldKey}`)
    }
    if (!fieldKeys.has(cond.targetFieldKey)) {
      errors.push(`Campo objetivo desconocido: ${cond.targetFieldKey}`)
    }
    if (!graph.has(cond.whenFieldKey)) graph.set(cond.whenFieldKey, [])
    graph.get(cond.whenFieldKey).push(cond.targetFieldKey)
  }

  const visiting = new Set()
  const visited = new Set()

  function dfs(node, stack) {
    if (stack.has(node)) {
      errors.push('Condiciones circulares detectadas — revisa qué campos dependen de cuáles')
      return
    }
    if (visited.has(node)) return
    visiting.add(node)
    stack.add(node)
    for (const next of graph.get(node) ?? []) {
      dfs(next, stack)
    }
    stack.delete(node)
    visiting.delete(node)
    visited.add(node)
  }

  for (const key of graph.keys()) {
    dfs(key, new Set())
  }

  return { ok: errors.length === 0, errors }
}

export function isFieldVisible(fieldKey, conditions, values) {
  const relevant = conditions.filter((c) => c.targetFieldKey === fieldKey)
  if (relevant.length === 0) return true
  return relevant.every((c) => evaluateCondition(c, values))
}

function evaluateCondition(cond, values) {
  const current = values[cond.whenFieldKey]
  const expected = cond.value
  switch (cond.operator ?? 'equals') {
    case 'not_equals':
      return String(current ?? '') !== String(expected ?? '')
    case 'equals':
    default:
      return String(current ?? '') === String(expected ?? '')
  }
}

export function normalizeLayout(layout) {
  return {
    sections: Array.isArray(layout?.sections) ? layout.sections : [],
    conditions: Array.isArray(layout?.conditions) ? layout.conditions : [],
    presentation: layout?.presentation ?? null,
  }
}
