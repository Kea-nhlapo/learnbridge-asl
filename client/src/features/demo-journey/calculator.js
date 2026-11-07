const tokenPattern = /(?:\d+(?:\.\d*)?|\.\d+)|π|sqrt|[+\-*/%^()]/gy;

function tokenize(expression) {
  const normalized = expression
    .replace(/\s+/g, '')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('√', 'sqrt');
  const tokens = [];
  let index = 0;

  while (index < normalized.length) {
    tokenPattern.lastIndex = index;
    const match = tokenPattern.exec(normalized);
    if (!match || match.index !== index) throw new Error('Invalid expression');
    tokens.push(match[0]);
    index = tokenPattern.lastIndex;
  }
  return tokens;
}

export function evaluateExpression(expression) {
  const tokens = tokenize(expression);
  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];

  function primary() {
    const token = take();
    if (token === undefined) throw new Error('Incomplete expression');
    if (token === '(') {
      const value = addition();
      if (take() !== ')') throw new Error('Missing closing bracket');
      return value;
    }
    if (token === 'sqrt') {
      if (take() !== '(') throw new Error('Square root needs brackets');
      const value = addition();
      if (take() !== ')') throw new Error('Missing closing bracket');
      if (value < 0) throw new Error('Cannot square root a negative number');
      return Math.sqrt(value);
    }
    if (token === 'π') return Math.PI;
    if (token === '+') return primary();
    if (token === '-') return -primary();
    const number = Number(token);
    if (Number.isNaN(number)) throw new Error('Expected a number');
    return number;
  }

  function power() {
    let value = primary();
    while (peek() === '^') {
      take();
      value **= primary();
    }
    while (peek() === '%') {
      take();
      value /= 100;
    }
    return value;
  }

  function multiplication() {
    let value = power();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const next = power();
      value = operator === '*' ? value * next : value / next;
    }
    return value;
  }

  function addition() {
    let value = multiplication();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const next = multiplication();
      value = operator === '+' ? value + next : value - next;
    }
    return value;
  }

  if (!tokens.length) return '';
  const value = addition();
  if (cursor !== tokens.length) throw new Error('Invalid expression');
  if (!Number.isFinite(value)) throw new Error('Result is not finite');
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}
