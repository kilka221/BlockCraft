import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBhBLcTqGnlhLHMH41sbJWza6IODmGNVbo",
  authDomain: "fdqwf123.firebaseapp.com",
  projectId: "fdqwf123",
  storageBucket: "fdqwf123.firebasestorage.app",
  messagingSenderId: "238148982718",
  appId: "1:238148982718:web:608ec6881e9d9f831dcbef",
  measurementId: "G-FH1B5XWQ4Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
