// Firebase initialization for GOST.FLOW / SyntaxRoute
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhBLcTqGnlhLHMH41sBJWza6IODmGNVbo",
  authDomain: "fdqwf123.firebaseapp.com",
  databaseURL: "https://fdqwf123-default-rtdb.firebaseio.com",
  projectId: "fdqwf123",
  storageBucket: "fdqwf123.firebasestorage.app",
  messagingSenderId: "238148982718",
  appId: "1:238148982718:web:608ec6881e9d9f831dcbef",
  measurementId: "G-FH1B5XWQ4Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
