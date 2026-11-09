import { redirect } from 'next/navigation';

/** Class Overview is now part of the single teacher-portal page; keeps old links working. */
export default function ClassOverviewRedirect() {
  redirect('/teacher-portal');
}
