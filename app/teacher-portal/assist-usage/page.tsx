import { redirect } from 'next/navigation';

/** Assist Usage is now part of the single teacher-portal page (class panel + student insights). */
export default function AssistUsageRedirect() {
  redirect('/teacher-portal#assist');
}
