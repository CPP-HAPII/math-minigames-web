'use client';

import Calculator from '@/components/Calculator';
import { useActiveProfile, usePlayTokens } from '@/lib/usePlayTokens';
import AssistPanelFrame from '@/components/play/AssistPanelFrame';
import { CalculatorIcon } from '@/components/play/icons';

/**
 * Bottom-right "Math Assist" panel. The calculator moved here from the header.
 * It stays mounted across questions (PlayContent doesn't key it), so a student
 * who has typed a number in doesn't lose it when the next question loads.
 */
export default function MathAssistPanel() {
  const t = usePlayTokens();
  const profile = useActiveProfile();

  return (
    <AssistPanelFrame title="Math Assist" icon={<CalculatorIcon size={24} />}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 12px',
          borderRadius: 14,
          border: `1px solid ${t.assist.rowBorder}`,
          background: t.assist.rowBg,
          boxShadow: `0 1px 4px ${t.assist.shadow}`,
        }}
      >
        <Calculator profile={profile} />
      </div>
    </AssistPanelFrame>
  );
}
