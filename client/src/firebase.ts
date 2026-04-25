import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyC2uCaTkEiMkp0Je65uIufuwPjFq_eW1fo",
  authDomain: "bva-budget.firebaseapp.com",
  projectId: "bva-budget",
  storageBucket: "bva-budget.firebasestorage.app",
  messagingSenderId: "1008831888338",
  appId: "1:1008831888338:web:4ae351c80dac881b2be60b"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// Explicitly connect to the default database
export const db = getFirestore(app, '(default)')
export const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signOutUser = () => signOut(auth)
