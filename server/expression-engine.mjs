const BINARY_OPS = new Set(['+', '-', '*', '/', '>=', '<=', '>', '<', '==', '!=', '&&', '||'])
const FUNCTIONS = new Set(['sum', 'avg', 'min', 'max', 'round', 'if'])

function tokenize(input) {
  const tokens = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      const quote = ch
      let value = ''
      i++
      while (i < input.length && input[i] !== quote) {
        value += input[i]
        i++
      }
      i++
      tokens.push({ type: 'string', value })
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let num = ch
      i++
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i]
        i++
      }
      tokens.push({ type: 'number', value: Number(num) })
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = ch
      i++
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        id += input[i]
        i++
      }
      tokens.push({ type: 'ident', value: id })
      continue
    }
    const two = input.slice(i, i + 2)
    if (BINARY_OPS.has(two)) {
      tokens.push({ type: 'op', value: two })
      i += 2
      continue
    }
    if ('+-*/(),<>=!.'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    throw new Error(`Carácter no permitido: ${ch}`)
  }
  return tokens
}

function parse(tokens) {
  let pos = 0

  function peek() {
    return tokens[pos]
  }

  function consume(type, value) {
    const t = tokens[pos]
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error('Expresión inválida')
    }
    pos++
    return t
  }

  function parsePrimary() {
    const t = peek()
    if (!t) throw new Error('Expresión incompleta')
    if (t.type === 'number' || t.type === 'string') {
      pos++
      return { kind: 'literal', value: t.value }
    }
    if (t.type === 'ident') {
      pos++
      if (peek()?.type === 'op' && peek()?.value === '(') {
        consume('op', '(')
        const args = []
        if (!(peek()?.type === 'op' && peek()?.value === ')')) {
          args.push(parseExpression())
          while (peek()?.type === 'op' && peek()?.value === ',') {
            consume('op', ',')
            args.push(parseExpression())
          }
        }
        consume('op', ')')
        if (!FUNCTIONS.has(t.value)) {
          throw new Error(`Función no permitida: ${t.value}`)
        }
        return { kind: 'call', name: t.value, args }
      }
      if (peek()?.type === 'op' && peek()?.value === '.') {
        consume('op', '.')
        const field = consume('ident')
        return { kind: 'field', group: t.value, field: field.value }
      }
      return { kind: 'field', field: t.value }
    }
    if (t.type === 'op' && t.value === '(') {
      consume('op', '(')
      const node = parseExpression()
      consume('op', ')')
      return node
    }
    throw new Error('Expresión inválida')
  }

  function parseUnary() {
    if (peek()?.type === 'op' && peek()?.value === '-') {
      consume('op', '-')
      return { kind: 'unary', op: '-', arg: parseUnary() }
    }
    return parsePrimary()
  }

  function parseMultiplicative() {
    let node = parseUnary()
    while (peek()?.type === 'op' && (peek()?.value === '*' || peek()?.value === '/')) {
      const op = consume('op').value
      node = { kind: 'binary', op, left: node, right: parseUnary() }
    }
    return node
  }

  function parseAdditive() {
    let node = parseMultiplicative()
    while (peek()?.type === 'op' && (peek()?.value === '+' || peek()?.value === '-')) {
      const op = consume('op').value
      node = { kind: 'binary', op, left: node, right: parseMultiplicative() }
    }
    return node
  }

  function parseComparison() {
    let node = parseAdditive()
    while (
      peek()?.type === 'op' &&
      ['>=', '<=', '>', '<', '==', '!='].includes(peek()?.value)
    ) {
      const op = consume('op').value
      node = { kind: 'binary', op, left: node, right: parseAdditive() }
    }
    return node
  }

  function parseLogical() {
    let node = parseComparison()
    while (peek()?.type === 'op' && (peek()?.value === '&&' || peek()?.value === '||')) {
      const op = consume('op').value
      node = { kind: 'binary', op, left: node, right: parseComparison() }
    }
    return node
  }

  function parseExpression() {
    return parseLogical()
  }

  const ast = parseExpression()
  if (pos < tokens.length) throw new Error('Expresión inválida')
  return ast
}

function resolveField(node, ctx) {
  if (node.group) {
    if (ctx.row && ctx.inGroup === node.group) {
      return ctx.row[node.field]
    }
    const rows = ctx.groups?.[node.group] ?? []
    if (rows.length === 1) return rows[0][node.field]
    throw new Error(`Referencia de grupo requiere sum() o fila: ${node.group}.${node.field}`)
  }
  if (Object.hasOwn(ctx.fields ?? {}, node.field)) {
    return ctx.fields[node.field]
  }
  throw new Error(`Campo desconocido: ${node.field}`)
}

function evaluateNode(node, ctx) {
  switch (node.kind) {
    case 'literal':
      return node.value
    case 'field':
      return resolveField(node, ctx)
    case 'unary':
      return -Number(evaluateNode(node.arg, ctx))
    case 'binary': {
      const left = evaluateNode(node.left, ctx)
      const right = evaluateNode(node.right, ctx)
      switch (node.op) {
        case '+':
          return Number(left) + Number(right)
        case '-':
          return Number(left) - Number(right)
        case '*':
          return Number(left) * Number(right)
        case '/':
          return Number(left) / Number(right)
        case '>=':
          return Number(left) >= Number(right)
        case '<=':
          return Number(left) <= Number(right)
        case '>':
          return Number(left) > Number(right)
        case '<':
          return Number(left) < Number(right)
        case '==':
          return left == right
        case '!=':
          return left != right
        case '&&':
          return Boolean(left) && Boolean(right)
        case '||':
          return Boolean(left) || Boolean(right)
        default:
          throw new Error(`Operador no soportado: ${node.op}`)
      }
    }
    case 'call': {
      const { name, args } = node
      if (name === 'if') {
        if (args.length !== 3) throw new Error('if() requiere 3 argumentos')
        const cond = evaluateNode(args[0], ctx)
        return cond ? evaluateNode(args[1], ctx) : evaluateNode(args[2], ctx)
      }
      const groupKey = findGroupKeyInNode(args[0])
      const rows = groupKey ? (ctx.groups?.[groupKey] ?? []) : [null]
      const values = rows.map((row) =>
        evaluateNode(args[0], { ...ctx, row, inGroup: groupKey }),
      )
      switch (name) {
        case 'sum':
          return values.reduce((a, b) => a + Number(b || 0), 0)
        case 'avg':
          return values.length ? values.reduce((a, b) => a + Number(b || 0), 0) / values.length : 0
        case 'min':
          return values.length ? Math.min(...values.map(Number)) : 0
        case 'max':
          return values.length ? Math.max(...values.map(Number)) : 0
        case 'round': {
          const n = Number(evaluateNode(args[0], ctx))
          const digits = args[1] ? Number(evaluateNode(args[1], ctx)) : 0
          const factor = 10 ** digits
          return Math.round(n * factor) / factor
        }
        default:
          throw new Error(`Función no soportada: ${name}`)
      }
    }
    default:
      throw new Error('Nodo desconocido')
  }
}

function findGroupKeyInNode(node) {
  if (node.kind === 'field' && node.group) return node.group
  if (node.kind === 'binary') {
    return findGroupKeyInNode(node.left) || findGroupKeyInNode(node.right)
  }
  if (node.kind === 'unary') return findGroupKeyInNode(node.arg)
  return null
}

export function compileExpression(expression) {
  const trimmed = String(expression ?? '').trim()
  if (!trimmed) throw new Error('Expresión vacía')
  const tokens = tokenize(trimmed)
  const ast = parse(tokens)
  return { expression: trimmed, ast }
}

export function evaluateExpression(expression, context) {
  const { ast } = compileExpression(expression)
  return evaluateNode(ast, context)
}

export function evaluateSchemaCalculations(schema, sampleData) {
  const ctx = {
    fields: { ...(sampleData.fields ?? {}) },
    groups: sampleData.groups ?? {},
  }
  const results = {}
  const errors = []
  for (const calc of schema.calculations ?? []) {
    try {
      const value = evaluateExpression(calc.expression, ctx)
      results[calc.key] = value
      ctx.fields[calc.key] = value
    } catch (err) {
      errors.push({
        key: calc.key,
        message: err instanceof Error ? err.message : 'Error de cálculo',
      })
    }
  }
  return { results, errors }
}
