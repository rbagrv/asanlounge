import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAuoNz-WvITRScgfVFrCa3WECAU-dwUjB4",
  authDomain: "asanlounge-1a087.firebaseapp.com",
  projectId: "asanlounge-1a087",
  storageBucket: "asanlounge-1a087.firebasestorage.app",
  messagingSenderId: "94583613469",
  appId: "1:94583613469:web:08ebfc0db9e264ff4a3ef4",
  measurementId: "G-45PKXPT7DP"
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

// You will need to replace the placeholder values above with your actual Firebase project configuration.
// Go to your Firebase project settings -> "General" tab -> "Your apps" section -> "Web" app to find your config.