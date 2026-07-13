'use client';

import { useState } from 'react';
import type { ColorProfile } from '@/lib/themes';
import { applyOperator, type CalculatorOperator } from '@/lib/calculator';

interface CalculatorProps {
  profile: ColorProfile;
}

/**
 * Scratch calculator — ported from CalcButton/CalculatorApp in calculator.dart.
 * In the Flutter reference this is a standalone arithmetic tool (digits,
 * +-×÷, decimal, clear, equals) that opens from a header button; it is NOT
 * wired into any game's answer validation, just a scratchpad the student can
 * use while working out a problem. The header button's own label
 * ("Calc Result: {value}") stays visible and up to date even while the
 * popup is closed, which this port preserves.
 */
export default function Calculator({ profile: p }: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<CalculatorOperator | null>(null);
  const [lastResult, setLastResult] = useState(0);

  function pressDigit(digit: string) {
    setDisplay((prev) => (prev === '0' || prev === 'Error' ? digit : prev + digit));
  }

  function pressDecimal() {
    setDisplay((prev) => (prev === 'Error' ? '0.' : prev.includes('.') ? prev : `${prev}.`));
  }

  function pressOperator(operator: CalculatorOperator) {
    const current = Number(display);
    if (pendingOperator !== null && previousValue !== null) {
      const result = applyOperator(previousValue, pendingOperator, current);
      setPreviousValue(result);
      setDisplay(Number.isNaN(result) ? 'Error' : String(result));
      setExpression(`${Number.isNaN(result) ? 'Error' : result} ${operator}`);
    } else {
      setPreviousValue(current);
      setExpression(`${display} ${operator}`);
    }
    setPendingOperator(operator);
    setDisplay('0');
  }

  function pressEquals() {
    if (pendingOperator === null || previousValue === null) return;
    const current = Number(display);
    const result = applyOperator(previousValue, pendingOperator, current);
    setExpression(`${previousValue} ${pendingOperator} ${current} =`);
    setDisplay(Number.isNaN(result) ? 'Error' : String(result));
    setPreviousValue(null);
    setPendingOperator(null);
    if (!Number.isNaN(result)) setLastResult(result);
  }

  function pressClear() {
    setDisplay('0');
    setExpression('');
    setPreviousValue(null);
    setPendingOperator(null);
  }

  const toggleButton: React.CSSProperties = {
    backgroundColor: p.buttonColor,
    color: p.textColor,
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.45rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const keyButton = (bg: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.75rem 0',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <>
      <button onClick={() => setIsOpen(true)} style={toggleButton} title="Click to use a calculator">
        🧮 Calc Result: {lastResult}
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: p.headerColor,
              borderRadius: '1rem',
              padding: '1.25rem',
              width: '100%',
              maxWidth: '320px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: p.contrastTextColor }}>Calculator</span>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close calculator"
                style={{ background: 'none', border: 'none', color: p.contrastTextColor, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: p.backgroundColor,
                color: p.textColor,
                borderRadius: '0.6rem',
                padding: '0.75rem',
                marginBottom: '0.75rem',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '0.85rem', opacity: 0.7, minHeight: '1.1rem' }}>{expression}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, wordBreak: 'break-all' }}>{display}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              <button onClick={pressClear} style={keyButton(p.clearAnswerButtonColor)}>C</button>
              <span />
              <span />
              <button onClick={() => pressOperator('÷')} style={keyButton(p.buttonColor)}>÷</button>

              <button onClick={() => pressDigit('7')} style={keyButton(p.disabledButtonColor)}>7</button>
              <button onClick={() => pressDigit('8')} style={keyButton(p.disabledButtonColor)}>8</button>
              <button onClick={() => pressDigit('9')} style={keyButton(p.disabledButtonColor)}>9</button>
              <button onClick={() => pressOperator('×')} style={keyButton(p.buttonColor)}>×</button>

              <button onClick={() => pressDigit('4')} style={keyButton(p.disabledButtonColor)}>4</button>
              <button onClick={() => pressDigit('5')} style={keyButton(p.disabledButtonColor)}>5</button>
              <button onClick={() => pressDigit('6')} style={keyButton(p.disabledButtonColor)}>6</button>
              <button onClick={() => pressOperator('-')} style={keyButton(p.buttonColor)}>−</button>

              <button onClick={() => pressDigit('1')} style={keyButton(p.disabledButtonColor)}>1</button>
              <button onClick={() => pressDigit('2')} style={keyButton(p.disabledButtonColor)}>2</button>
              <button onClick={() => pressDigit('3')} style={keyButton(p.disabledButtonColor)}>3</button>
              <button onClick={() => pressOperator('+')} style={keyButton(p.buttonColor)}>+</button>

              <button onClick={() => pressDigit('0')} style={keyButton(p.disabledButtonColor)}>0</button>
              <button onClick={pressDecimal} style={keyButton(p.disabledButtonColor)}>.</button>
              <button onClick={pressEquals} style={{ ...keyButton(p.checkAnswerButtonColor), gridColumn: 'span 2' }}>=</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
