/**
 * scripts/verify-firestore-attempt.ts
 *
 * Reads back one quizAttempts/{userId}/attempts/{docId} document and prints
 * it as JSON, so a Playwright smoke script can shell out to this after
 * driving /test-translate + "Submit to Firestore" and assert against real
 * persisted data rather than just client-side store state.
 *
 * Usage: npx tsx scripts/verify-firestore-attempt.ts <userId> <docId>
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const [userId, docId] = process.argv.slice(2);
  if (!userId || !docId) {
    console.error('Usage: npx tsx scripts/verify-firestore-attempt.ts <userId> <docId>');
    process.exit(1);
  }

  const { initializeApp } = await import('firebase/app');
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');

  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const db = getFirestore(app);
  const ref = doc(db, 'quizAttempts', userId, 'attempts', docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.error(`No such document: quizAttempts/${userId}/attempts/${docId}`);
    process.exit(1);
  }

  console.log(JSON.stringify(snap.data()));
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e.message ?? e);
  process.exit(1);
});
