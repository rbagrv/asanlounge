import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // IMPORTANT: Replace the placeholder values below with your actual Firebase project configuration.
  // Go to your Firebase project settings -> "General" tab -> "Your apps" section -> "Web" app to find your config.
  apiKey: "AIzaSyC5yq_...-placeholder",
  authDomain: "eat-drink-app-demo.firebaseapp.com",
  projectId: "eat-drink-app-demo",
  storageBucket: "eat-drink-app-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:a1b2c3d4e5f6a7b8c9d0e1",
  measurementId: "G-ABCDEFGHIJ" // Optional
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
