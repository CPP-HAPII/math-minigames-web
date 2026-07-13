export type CalculatorOperator = '+' | '-' | '×' | '÷';

/** Rounds away floating-point noise (0.1 + 0.2 -> 0.3, not 0.30000000000000004). */
function roundToPrecision(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

/** Applies a single binary operation. Division by zero yields NaN (the UI shows "Error"). */
export function applyOperator(a: number, operator: CalculatorOperator, b: number): number {
  switch (operator) {
    case '+':
      return roundToPrecision(a + b);
    case '-':
      return roundToPrecision(a - b);
    case '×':
      return roundToPrecision(a * b);
    case '÷':
      return b === 0 ? NaN : roundToPrecision(a / b);
  }
}
