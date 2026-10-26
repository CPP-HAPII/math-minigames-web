'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useThemeStore } from '@/lib/stores/themeStore';
import { themes, type ColorProfile } from '@/lib/themes';
import type { AssistLevel } from '@/lib/types';


const ASSIST_LEVELS: { label: string; key: AssistLevel; description: string }[] = [
  {
    label: 'Novice',
    key: 'novice',
    description: 'Automatic Spanish translations and question read-aloud support where available.',
  },
  {
    label: 'Intermediate',
    key: 'intermediate',
    description: 'Show Spanish translations when you choose Translate.',
  },
  {
    label: 'Advanced',
    key: 'advanced',
    description: 'Turn on word translation during a question to translate individual words on hover.',
  },
];

export default function SettingsMenu({ profile: p, hydrated }: { profile: ColorProfile; hydrated: boolean }) {
  const level = useAssistStore((s) => s.level);
  const setLevel = useAssistStore((s) => s.setLevel);
  const themeIndex = useThemeStore((s) => s.themeIndex);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeLevel = hydrated ? level : 'novice';
  const activeThemeIndex = hydrated && themes[themeIndex] ? themeIndex : 0;

  function openSettings() {
    if (!dialogRef.current || dialogRef.current.open) return;
    // Native modal behavior keeps keyboard focus inside and handles Escape.
    dialogRef.current.showModal();
    setOpen(true);
  }

  function closeSettings() {
    dialogRef.current?.close();
  }

  // Coach selection and language support share the same radio-option layout.
  const groups = [
    {
      id: 'coach', name: 'home-coach', title: 'Coach',
      help: 'Your coach sets the school colors and banners.',
      options: themes.map((theme, index) => ({
        value: index, label: theme.homeLabel, description: '', selected: activeThemeIndex === index,
        onChange: () => setTheme(index),
      })),
    },
    {
      id: 'assist', name: 'home-assist-mode', title: 'Language Assist',
      help: 'These modes change language support during games.',
      options: ASSIST_LEVELS.map(({ key, label, description }) => ({
        value: key, label, description, selected: activeLevel === key,
        onChange: () => setLevel(key),
      })),
    },
  ];

  return (
    <>
      <button
        ref={triggerRef} className="settings-trigger" type="button" onClick={openSettings}
        aria-label="Settings" aria-haspopup="dialog" aria-expanded={open} aria-controls="home-settings"
        style={{ color: p.headerColor, background: p.contrastTextColor, borderRadius: '50%' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M9.7 4.3 10.2 2h3.6l.5 2.3 1.8 1 2.3-.7 1.8 3.1-1.7 1.6v2.1l1.7 1.6-1.8 3.1-2.3-.7-1.8 1-.5 2.3h-3.6l-.5-2.3-1.8-1-2.3.7L3.8 13l1.7-1.6V9.3L3.8 7.7l1.8-3.1 2.3.7 1.8-1Z" transform="translate(0 1.65)" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <dialog
        ref={dialogRef} id="home-settings" className="settings-dialog"
        aria-labelledby="home-settings-title" aria-describedby="home-settings-description"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={({ target, currentTarget, clientX, clientY }) => {
          if (target !== currentTarget) return;
          const { left, right, top, bottom } = currentTarget.getBoundingClientRect();
          if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
            closeSettings();
          }
        }}
      >
        <div className="settings-heading">
          <h2 id="home-settings-title">Settings</h2>
          <button type="button" className="settings-close" aria-label="Close settings" onClick={closeSettings} autoFocus>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p id="home-settings-description" className="settings-description">Choose your coach and language support.</p>

        {groups.map(({ id, name, title, help, options }) => (
          <fieldset key={id} className={`settings-group ${id}`}>
            <legend>{title}</legend>
            <p className="settings-help">{help}</p>
            <div className="options">
              {options.map(({ value, label, description, selected, onChange }) => (
                <label key={value} className="settings-option" data-selected={selected}>
                  <span className="option-content">
                    <input
                      type="radio" name={name} value={value} checked={selected} onChange={onChange}
                      aria-labelledby={`${id}-label-${value}`}
                      aria-describedby={description ? `${id}-description-${value}` : undefined}
                    />
                    <span>
                      <span id={`${id}-label-${value}`} className="option-title">{label}</span>
                      {description && <span id={`${id}-description-${value}`} className="option-description">{description}</span>}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="settings-footer">
          <p className="settings-help">Your choices are saved automatically.</p>
          <button type="button" className="settings-done" onClick={closeSettings} style={{ background: p.homeAccentGradient, color: p.contrastTextColor }}>Done</button>
        </div>
      </dialog>

      <style jsx>{`
        /* Dialog and shared controls */
        .settings-trigger, .settings-close {
          width: 44px; height: 44px; flex-shrink: 0;
          display: grid; place-items: center;
          padding: 0; border: 0; border-radius: 12px;
          background: transparent; color: inherit; cursor: pointer;
        }
        .settings-trigger { justify-self: end; }
        button:focus-visible, input:focus-visible {
          outline: 2px solid currentColor; outline-offset: 3px;
        }
        .settings-dialog {
          position: fixed; inset: 100px clamp(12px, 3vw, 34px) auto auto;
          width: min(440px, calc(100vw - 24px)); max-width: none; max-height: calc(100dvh - 116px);
          box-sizing: border-box; margin: 0; padding: 24px;
          overflow-y: auto; overscroll-behavior: contain;
          border: 1px solid ${p.homeBorder}; border-radius: 20px;
          background: ${p.homeSurfaceBackground}; color: ${p.homeInk}; box-shadow: none;
          font-family: var(--font-nunito), sans-serif;
        }
        .settings-dialog::backdrop {
          background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none;
        }
        .settings-heading, .settings-footer {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }

        /* Text and option groups */
        h2 { font-size: 26px; font-weight: 800; margin: 0; }
        .settings-description, .settings-help {
          color: ${p.homeInkSoft}; font-size: 14px; line-height: 1.5; margin: 0;
        }
        .settings-description { margin: 4px 0 24px; }
        .settings-group { border: 0; margin: 0; padding: 0; min-width: 0; }
        .settings-group + .settings-group { margin-top: 24px; }
        legend { padding: 0; margin-bottom: 6px; font-size: 18px; font-weight: 800; }
        .options { display: grid; gap: 8px; margin-top: 12px; }
        .settings-option {
          box-sizing: border-box; min-width: 0; padding: 12px;
          border: 2px solid ${p.homeBorder}; border-radius: 12px;
          background: ${p.homeSurfaceBackground}; cursor: pointer;
        }
        .settings-option[data-selected='true'] {
          border-color: ${p.homeAccentSolid}; background: ${p.homePanelBackground};
        }
        .option-content { display: flex; align-items: flex-start; gap: 12px; }
        input {
          width: 18px; height: 18px; margin: 3px 0 0; flex-shrink: 0;
          accent-color: ${p.homeAccentSolid}; cursor: pointer;
        }
        .option-title { display: block; font-size: 15px; font-weight: 800; line-height: 1.4; }
        .option-description { display: block; margin-top: 3px; color: ${p.homeInkSoft}; font-size: 13px; line-height: 1.45; }
        .coach .options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .coach .settings-option { display: flex; align-items: center; min-height: 44px; padding: 10px 8px; }
        .coach .option-content { gap: 6px; }
        .coach .option-title { font-size: 13px; }
        .coach input { width: 16px; height: 16px; margin-top: 1px; }
        .settings-footer { border-top: 1px solid ${p.homeBorder}; padding-top: 18px; margin-top: 24px; }
        .settings-footer p { font-size: 12px; }
        .settings-done { border: 0; border-radius: 999px; padding: 12px 24px; min-height: 44px; font: inherit; font-weight: 800; cursor: pointer; }

        /* Small screens */
        @media (max-width: 380px) {
          .settings-dialog { padding: 18px; }
          .coach .options { grid-template-columns: 1fr; }
        }
        @media (max-height: 640px) {
          .settings-dialog { top: 12px; max-height: calc(100dvh - 24px); }
        }
      `}</style>
    </>
  );
}

// Shared banner for the level overview and the current question.
// Pass onHome to show a Home button before the title (the play screen does;
// the level overview leaves it out, since it is already home).
export function CoachHeader({ profile: p, hydrated, children, onHome }: {
  profile: ColorProfile;
  hydrated: boolean;
  children: ReactNode;
  onHome?: () => void;
}) {
  return (
    <header className="coach-header" style={{
      background: p.homeHeaderBackground,
      borderBottom: p.homeHeaderBorderBottom || undefined,
    }}>
      <div className="coach-title">
        {onHome && (
          <button
            type="button" className="coach-home" onClick={onHome}
            aria-label="Home" title="Back to home"
            style={{ color: p.headerColor, background: p.contrastTextColor }}
          >
            {/* public/icons/home.svg, painted in the button's colour (like the gear) so it follows the theme. */}
            <span className="coach-home-icon" aria-hidden="true" />
          </button>
        )}
        <h1 style={{ fontFamily: p.homeWelcomeFont, color: p.homeWelcomeColor || p.contrastTextColor }}>
          {children}
        </h1>
      </div>
      <div className="coach-settings">
        <SettingsMenu profile={p} hydrated={hydrated} />
      </div>
<style jsx>{`
  .coach-header {
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(120px, 18vw, 260px) 44px;
    align-items: center;
    gap: 16px;
    min-height: 92px;
    padding: 18px clamp(16px, 3vw, 34px);
  }
.coach-header::before {
  content: '';
  position: absolute;
  right: calc(clamp(16px, 3vw, 34px) + 60px); /* header padding + gear (44px) + gap (16px) */
  bottom: ${p.homeHeaderImageOffset || '0'};
  height: ${p.homeHeaderImageHeight || '100%'};
  aspect-ratio: 3 / 1;
  background: ${p.homeHeaderImage ? `url("${p.homeHeaderImage}")` : 'none'} right bottom / cover no-repeat;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 40%, #000 88%, transparent);
  mask-image: linear-gradient(to right, transparent, #000 40%, #000 88%, transparent);
  pointer-events: none;
}
  .coach-title, .coach-settings { position: relative; z-index: 1; }
  .coach-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .coach-home {
    width: 44px; height: 44px; flex-shrink: 0;
    display: grid; place-items: center;
    padding: 0; border: 0; border-radius: 50%; cursor: pointer;
  }
  .coach-home-icon {
    width: 28px; height: 28px;
    background: currentColor;
    -webkit-mask: url('/icons/home.svg') center / contain no-repeat;
    mask: url('/icons/home.svg') center / contain no-repeat;
  }
  .coach-home:hover { opacity: 0.85; }
  .coach-home:focus-visible { outline: 2px solid ${p.contrastTextColor}; outline-offset: 3px; }
  h1 { margin: 0; font-size: clamp(1.2rem, 2vw, 1.65rem); font-weight: 800; line-height: 1.3; overflow-wrap: anywhere; }
  .coach-settings { grid-column: 3; align-self: center; }
  @media (max-width: 760px) {
    .coach-header {
      grid-template-columns: minmax(0, 1fr) 44px;
      min-height: 76px;
      padding: 14px 16px;
    }
    .coach-settings { grid-column: 2; }
    .coach-header::before { opacity: 0.5; } /* keep the title readable over the art */
  }
`}</style>
    </header>
  );
}
