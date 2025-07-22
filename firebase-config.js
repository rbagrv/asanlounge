import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // IMPORTANT: Replace the placeholder values below with your actual Firebase project configuration.
  // Go to your Firebase project settings -> "General" tab -> "Your apps" section -> "Web" app to find your config.
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Anonymous login for guest customers (table QR code users)
export const signInGuestAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    console.log('Guest signed in anonymously:', result.user.uid);
    return result;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};

export { db, auth, functions };