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

  // Toggle button uses the same gradient as the play-page question cards, so
  // it reads as "part of the question" rather than a random header pill.
  const toggleButton: React.CSSProperties = {
    background: p.homeAccentGradient,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.45rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
  };

  // Dark "device" shell (theme-agnostic) with circular keys — digits stay a
  // neutral dark gray, operators pick up the theme's own accent gradient,
  // and clear/equals reuse the app's existing red/green semantics instead of
  // introducing new colors.
  const CALC_SHELL = '#1C1C1E';
  const CALC_KEY = '#333333';
  const CALC_TEXT = '#F5F6FA';

  const keyButton = (background: string): React.CSSProperties => ({
    background,
    color: CALC_TEXT,
    border: 'none',
    borderRadius: '50%',
    aspectRatio: '1 / 1',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.15rem',
    fontWeight: 700,
    cursor: 'pointer',
  });

  const equalsButton: React.CSSProperties = {
    background: p.checkAnswerButtonColor,
    color: CALC_TEXT,
    border: 'none',
    borderRadius: '999px',
    padding: '0.85rem 0',
    fontSize: '1.15rem',
    fontWeight: 700,
    cursor: 'pointer',
    gridColumn: 'span 2',
  };

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
              backgroundColor: CALC_SHELL,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '1.5rem',
              padding: '1.5rem 1.25rem',
              width: '100%',
              maxWidth: '320px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, color: CALC_TEXT }}>Calculator</span>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close calculator"
                style={{ background: 'none', border: 'none', color: CALC_TEXT, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ color: CALC_TEXT, textAlign: 'right', padding: '0 0.25rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.5, minHeight: '1.1rem' }}>{expression}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, wordBreak: 'break-all' }}>{display}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
              <button onClick={pressClear} style={keyButton(p.clearAnswerButtonColor)}>C</button>
              <span />
              <span />
              <button onClick={() => pressOperator('÷')} style={keyButton(p.homeAccentGradient)}>÷</button>

              <button onClick={() => pressDigit('7')} style={keyButton(CALC_KEY)}>7</button>
              <button onClick={() => pressDigit('8')} style={keyButton(CALC_KEY)}>8</button>
              <button onClick={() => pressDigit('9')} style={keyButton(CALC_KEY)}>9</button>
              <button onClick={() => pressOperator('×')} style={keyButton(p.homeAccentGradient)}>×</button>

              <button onClick={() => pressDigit('4')} style={keyButton(CALC_KEY)}>4</button>
              <button onClick={() => pressDigit('5')} style={keyButton(CALC_KEY)}>5</button>
              <button onClick={() => pressDigit('6')} style={keyButton(CALC_KEY)}>6</button>
              <button onClick={() => pressOperator('-')} style={keyButton(p.homeAccentGradient)}>−</button>

              <button onClick={() => pressDigit('1')} style={keyButton(CALC_KEY)}>1</button>
              <button onClick={() => pressDigit('2')} style={keyButton(CALC_KEY)}>2</button>
              <button onClick={() => pressDigit('3')} style={keyButton(CALC_KEY)}>3</button>
              <button onClick={() => pressOperator('+')} style={keyButton(p.homeAccentGradient)}>+</button>

              <button onClick={() => pressDigit('0')} style={keyButton(CALC_KEY)}>0</button>
              <button onClick={pressDecimal} style={keyButton(CALC_KEY)}>.</button>
              <button onClick={pressEquals} style={equalsButton}>=</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
