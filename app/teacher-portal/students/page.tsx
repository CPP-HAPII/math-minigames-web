import { redirect } from 'next/navigation';

/** Student Detail is now the "Student insights" section of the single teacher-portal page. */
export default function StudentDetailRedirect() {
  redirect('/teacher-portal#students');
}
