'use client';

import { useId, useState, type ReactNode } from 'react';
import { usePlayTokens } from '@/lib/usePlayTokens';
import { ChevronIcon } from '@/components/play/icons';

interface AssistPanelFrameProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * The HAPII-style card used by both Language Assist and Math Assist: a gradient
 * border, a gradient icon badge, the title, and a chevron that collapses the body.
 */
export default function AssistPanelFrame({ title, icon, children, defaultOpen = true }: AssistPanelFrameProps) {
  const t = usePlayTokens();
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section
      aria-label={title}
      style={{
        background: t.assist.frame,
        padding: 2.5,
        borderRadius: 22,
        boxShadow: `0 6px 18px ${t.assist.shadow}`,
        fontFamily: t.bodyFont,
      }}
    >
      <div style={{ background: t.assist.surface, borderRadius: 19.5, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            border: 'none',
            background: t.assist.headerTint,
            color: t.assist.title,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              flex: 'none',
              borderRadius: '50%',
              background: t.assist.frame,
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              boxShadow: `0 2px 8px ${t.assist.shadow}`,
            }}
          >
            {icon}
          </span>
          <span style={{ flex: 1, fontFamily: t.displayFont, fontWeight: 700, fontSize: '1.45rem', lineHeight: 1.2 }}>{title}</span>
          <ChevronIcon up={open} size={26} />
        </button>

        {open && (
          <div id={bodyId} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
