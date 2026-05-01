import { ITool, AgentContext } from '../interfaces/agent.interface';

export const CalculatorTool: ITool = {
  definition: {
    name: 'calculator',
    description:
      'Evaluate mathematical expressions. Supports arithmetic (+, -, *, /, **, %), ' +
      'parentheses, and math functions: sqrt, abs, ceil, floor, round, log, sin, cos, tan. ' +
      'Constants: PI, E. Example: "sqrt(144) + 2 ** 8"',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate',
        },
      },
      required: ['expression'],
    },
  },

  async execute(params: Record<string, unknown>, _ctx: AgentContext): Promise<string> {
    const expression = (params.expression as string).trim();
    try {
      const result = evaluate(expression);
      return `${expression} = ${result}`;
    } catch (err: unknown) {
      throw new Error(`CalculatorTool: ${(err as Error).message}`);
    }
  },
};

// ─── Safe expression parser ──────────────────────────────────────────────────

const MATH_FUNS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, ceil: Math.ceil, floor: Math.floor,
  round: Math.round, log: Math.log, log2: Math.log2, log10: Math.log10,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  exp: Math.exp, sign: Math.sign, trunc: Math.trunc,
};

const MATH_CONSTS: Record<string, number> = {
  PI: Math.PI, E: Math.E, LN2: Math.LN2, LN10: Math.LN10, SQRT2: Math.SQRT2,
};

function evaluate(expr: string): number {
  const tokens = tokenise(expr);
  const ctx = { tokens, pos: 0 };
  const result = parseExpr(ctx);
  if (ctx.pos < ctx.tokens.length) {
    throw new Error(`unexpected token "${ctx.tokens[ctx.pos].value}" at position ${ctx.pos}`);
  }
  return result;
}

type Token = { type: 'num' | 'op' | 'lparen' | 'rparen' | 'ident'; value: string };
type Ctx = { tokens: Token[]; pos: number };

function tokenise(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] ?? ''))) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: 'num', value: num });
    } else if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) ident += expr[i++];
      tokens.push({ type: 'ident', value: ident });
    } else if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch }); i++;
    } else if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch }); i++;
    } else if ('+-*/%^'.includes(ch)) {
      if (ch === '*' && expr[i + 1] === '*') {
        tokens.push({ type: 'op', value: '**' }); i += 2;
      } else {
        tokens.push({ type: 'op', value: ch }); i++;
      }
    } else {
      throw new Error(`unexpected character "${ch}"`);
    }
  }
  return tokens;
}

function peek(ctx: Ctx): Token | undefined { return ctx.tokens[ctx.pos]; }
function consume(ctx: Ctx): Token { return ctx.tokens[ctx.pos++]; }

function parseExpr(ctx: Ctx): number { return parseAddSub(ctx); }

function parseAddSub(ctx: Ctx): number {
  let left = parseMulDiv(ctx);
  while (peek(ctx)?.type === 'op' && (peek(ctx)!.value === '+' || peek(ctx)!.value === '-')) {
    const op = consume(ctx).value;
    const right = parseMulDiv(ctx);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function parseMulDiv(ctx: Ctx): number {
  let left = parsePow(ctx);
  while (peek(ctx)?.type === 'op' && ['*', '/', '%'].includes(peek(ctx)!.value)) {
    const op = consume(ctx).value;
    const right = parsePow(ctx);
    if (op === '*') left *= right;
    else if (op === '/') { if (right === 0) throw new Error('division by zero'); left /= right; }
    else left %= right;
  }
  return left;
}

function parsePow(ctx: Ctx): number {
  const base = parseUnary(ctx);
  if (peek(ctx)?.type === 'op' && peek(ctx)!.value === '**') {
    consume(ctx);
    return Math.pow(base, parsePow(ctx));
  }
  return base;
}

function parseUnary(ctx: Ctx): number {
  if (peek(ctx)?.type === 'op' && peek(ctx)!.value === '-') { consume(ctx); return -parsePrimary(ctx); }
  if (peek(ctx)?.type === 'op' && peek(ctx)!.value === '+') { consume(ctx); }
  return parsePrimary(ctx);
}

function parsePrimary(ctx: Ctx): number {
  const tok = peek(ctx);
  if (!tok) throw new Error('unexpected end of expression');
  if (tok.type === 'num') { consume(ctx); return parseFloat(tok.value); }
  if (tok.type === 'lparen') {
    consume(ctx);
    const val = parseExpr(ctx);
    if (peek(ctx)?.type !== 'rparen') throw new Error('missing closing parenthesis');
    consume(ctx);
    return val;
  }
  if (tok.type === 'ident') {
    consume(ctx);
    if (tok.value in MATH_CONSTS) return MATH_CONSTS[tok.value];
    if (tok.value in MATH_FUNS) {
      if (peek(ctx)?.type !== 'lparen') throw new Error(`expected "(" after "${tok.value}"`);
      consume(ctx);
      const arg = parseExpr(ctx);
      if (peek(ctx)?.type !== 'rparen') throw new Error(`missing ")" after "${tok.value}(...)"`);
      consume(ctx);
      return MATH_FUNS[tok.value](arg);
    }
    throw new Error(`unknown identifier "${tok.value}"`);
  }
  throw new Error(`unexpected token "${tok.value}"`);
}
