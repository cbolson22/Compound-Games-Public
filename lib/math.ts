// Safe recursive descent evaluator for arithmetic expressions.
// Supports: integers, +, -, *, /, ** (right-assoc), parentheses.
// Returns null on any invalid input rather than throwing.
export function safeEvalExpr(expr: string): number | null {
  const tokens: (number | string)[] = []
  let i = 0
  while (i < expr.length) {
    if (/\d/.test(expr[i])) {
      let num = ''
      while (i < expr.length && /\d/.test(expr[i])) num += expr[i++]
      tokens.push(parseInt(num, 10))
    } else if (expr[i] === '*' && expr[i + 1] === '*') {
      tokens.push('**'); i += 2
    } else if ('+-*/()'.includes(expr[i])) {
      tokens.push(expr[i++])
    } else {
      return null
    }
  }

  let pos = 0
  const peek = () => tokens[pos]
  const consume = () => tokens[pos++]

  function parseExpr(): number {
    let left = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  function parseTerm(): number {
    let left = parsePower()
    while (peek() === '*' || peek() === '/') {
      const op = consume()
      const right = parsePower()
      if (op === '/' && right === 0) throw new Error('div/0')
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  function parsePower(): number {
    const base = parseAtom()
    if (peek() === '**') {
      consume()
      return Math.pow(base, parsePower())
    }
    return base
  }

  function parseAtom(): number {
    const t = peek()
    if (t === '(') {
      consume()
      const val = parseExpr()
      if (consume() !== ')') throw new Error('unmatched paren')
      return val
    }
    if (typeof t === 'number') return consume() as number
    throw new Error(`unexpected token: ${t}`)
  }

  try {
    const result = parseExpr()
    return pos === tokens.length ? result : null
  } catch {
    return null
  }
}
