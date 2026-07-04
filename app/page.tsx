'use client';

// Login page — mirrors login_page.dart.
// No passwords; userId is a 3-digit numeric string, matching Flutter's validator.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/userStore';
import { greenTheme } from '@/lib/themes';

function validate(value: string): string {
  if (!value.trim()) return 'Please enter your Student ID.';
  if (!/^\d{3}$/.test(value)) return 'Student ID must be exactly 3 digits.';
  return '';
}

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const setStoreUserId = useUserStore((s) => s.setUserId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const msg = validate(userId);
    if (msg) {
      setError(msg);
      return;
    }
    setStoreUserId(userId);
    router.push('/home');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: greenTheme.backgroundColor }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-8 shadow-xl"
        style={{ backgroundColor: greenTheme.headerColor }}
      >
        <h1
          className="text-3xl font-bold text-center mb-1"
          style={{ color: greenTheme.contrastTextColor }}
        >
          Welcome!
        </h1>
        <p
          className="text-center text-sm mb-7"
          style={{ color: greenTheme.contrastTextColor }}
        >
          Enter your Student ID to begin
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="userId"
            className="block font-semibold mb-1 text-sm"
            style={{ color: greenTheme.contrastTextColor }}
          >
            Student ID (3 digits)
          </label>

          <input
            id="userId"
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. 123"
            className="w-full rounded-xl px-4 py-3 text-xl mb-1 outline-none border-2 transition-colors"
            style={{
              backgroundColor: greenTheme.backgroundColor,
              color: greenTheme.textColor,
              borderColor: error ? greenTheme.clearAnswerButtonColor : 'transparent',
            }}
          />

          {error && (
            <p
              className="text-sm mb-2"
              style={{ color: greenTheme.clearAnswerButtonColor }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-xl mt-5 transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              backgroundColor: greenTheme.buttonColor,
              color: greenTheme.textColor,
            }}
          >
            Let&apos;s Go!
          </button>
        </form>
      </div>
    </div>
  );
}
