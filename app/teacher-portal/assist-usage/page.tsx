'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import PlaceholderSection from '@/components/teacher/PlaceholderSection';

export default function AssistUsagePage() {
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  return (
    <PlaceholderSection
      title="Assist Usage"
      description="How often students use language-assist features, and which ones."
      comingSoon={[
        'Per-student assist-tier breakdown (computeAssistUsageByStudent)',
        'Most common interaction types class-wide (computeInteractionTypeCounts)',
      ]}
      profile={p}
    />
  );
}
