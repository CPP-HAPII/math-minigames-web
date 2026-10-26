'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePlayTokens } from '@/lib/usePlayTokens';
import { ArrowDownIcon, CheckIcon, RefreshIcon } from '@/components/play/icons';

/** Soft green panel that holds the answer area, the word blocks and the buttons. */
export function BuilderPanel({ children }: { children: ReactNode }) {
  const t = usePlayTokens();
  return (
    <section
      style={{
        background: t.builderBg,
        border: `1.5px solid ${t.builderBorder}`,
        borderRadius: 18,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: t.bodyFont,
      }}
    >
      {children}
    </section>
  );
}

interface AnswerAreaProps {
  /** Shown (with a down arrow) while nothing has been picked yet. */
  placeholder?: string;
  /** True once there is something to show instead of the placeholder. */
  filled: boolean;
  children?: ReactNode;
  minHeight?: number;
}

/** The dashed "build your sentence" area. */
export function AnswerArea({ placeholder, filled, children, minHeight = 104 }: AnswerAreaProps) {
  const t = usePlayTokens();
  return (
    <div
      data-testid="answer-area"
      style={{
        background: t.answerBg,
        border: `2px dashed ${t.answerBorder}`,
        borderRadius: 14,
        minHeight,
        padding: '16px 18px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: filled ? 'flex-start' : 'center',
        gap: 8,
        color: t.answerInk,
      }}
    >
      {filled ? (
        children
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 14, color: t.placeholderInk, fontSize: '1.15rem', fontWeight: 500 }}>
          <span style={{ flex: 'none', display: 'flex' }}>
            <ArrowDownIcon />
          </span>
          {placeholder}
        </span>
      )}
    </div>
  );
}

/** A gold word block. As a button it picks a word; as a plain span it shows one already placed. */
export function WordBlock({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const t = usePlayTokens();
  const style: CSSProperties = {
    background: t.blockBg,
    color: t.blockInk,
    border: `1.5px solid ${t.blockBorder}`,
    borderRadius: 10,
    padding: '9px 16px',
    fontFamily: t.bodyFont,
    fontSize: '1.2rem',
    fontWeight: 600,
    lineHeight: 1.2,
  };

  if (!onClick) return <span style={style}>{label}</span>;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...style, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
    >
      {label}
    </button>
  );
}

/** The row of word blocks to choose from. */
export function BlockRow({ children }: { children: ReactNode }) {
  return (
    <div role="group" aria-label="Word blocks" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {children}
    </div>
  );
}

interface ActionButtonProps {
  kind: 'primary' | 'secondary';
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

/** Check Answer (primary) and Clear (secondary). Disabled states fade rather than swap colours, so contrast holds on every palette. */
export function ActionButton({ kind, label, icon, onClick, disabled = false }: ActionButtonProps) {
  const t = usePlayTokens();
  const primary = kind === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 52,
        padding: '10px 28px',
        borderRadius: 14,
        border: primary ? 'none' : `1.5px solid ${t.secondaryBorder}`,
        background: primary ? t.primaryBg : t.secondaryBg,
        color: primary ? t.primaryInk : t.secondaryInk,
        boxShadow: primary && !disabled ? `0 3px 10px ${t.primaryShadow}` : 'none',
        fontFamily: t.displayFont,
        fontWeight: 700,
        fontSize: '1.3rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

interface ActionRowProps {
  onClear?: () => void;
  onCheck: () => void;
  clearDisabled?: boolean;
  checkDisabled?: boolean;
  /** Extra buttons that go before Clear (e.g. the microphone in Read Aloud). */
  leading?: ReactNode;
}

/** Clear + Check Answer, side by side as in the mockup. */
export function ActionRow({ onClear, onCheck, clearDisabled, checkDisabled, leading }: ActionRowProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {leading}
      {onClear && <ActionButton kind="secondary" label="Clear" icon={<RefreshIcon />} onClick={onClear} disabled={clearDisabled} />}
      <ActionButton kind="primary" label="Check Answer" icon={<CheckIcon />} onClick={onCheck} disabled={checkDisabled} />
    </div>
  );
}
