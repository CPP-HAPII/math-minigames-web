'use client';

import { useEffect, useState } from 'react';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import PlaceholderSection from '@/components/teacher/PlaceholderSection';

export default function ClassOverviewPage() {
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  return (
    <PlaceholderSection
      title="Class Overview"
      description="A class-wide view of accuracy and progress across every student."
      comingSoon={[
        'Class-wide accuracy by skill/tag (computeSkillAccuracy)',
        'Weak topics across the whole class (detectWeakTopics)',
        'Average time taken per question, per skill (computeAverageTimeBySkill)',
      ]}
      profile={p}
    />
  );
}
