'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import PlaceholderSection from '@/components/teacher/PlaceholderSection';

export default function StudentDetailPage() {
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  return (
    <PlaceholderSection
      title="Student Detail"
      description="Drill into one student's accuracy, weak topics, and timing."
      comingSoon={[
        'Student picker (by userId)',
        'Per-student accuracy by skill/tag (computeSkillAccuracyByStudent)',
        "That student's weak topics (detectWeakTopics)",
      ]}
      profile={p}
    />
  );
}
