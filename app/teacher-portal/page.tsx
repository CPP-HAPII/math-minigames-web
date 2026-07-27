import { redirect } from 'next/navigation';

/** /teacher-portal has no content of its own — Class Overview is the default section. */
export default function TeacherPortalIndexPage() {
  redirect('/teacher-portal/overview');
}
