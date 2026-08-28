import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA0_rrIGM4_f7PNznJOrm82SC6LAURPk1Y",
  authDomain: "caramel-geode-zhnbb.firebaseapp.com",
  projectId: "caramel-geode-zhnbb",
  storageBucket: "caramel-geode-zhnbb.firebasestorage.app",
  messagingSenderId: "617942658669",
  appId: "1:617942658669:web:027eb73c7c6e68b06ad964"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "ai-studio-08b3ee50-3f7d-4e18-91c6-2256132f3a17");
