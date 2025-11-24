import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Hardcoded config (as per original file)
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBUiU8DmIgQH843AqqM4oiK22i4p2UJdp0",
    authDomain: "healthos-3d23f.firebaseapp.com",
    projectId: "healthos-3d23f",
    storageBucket: "healthos-3d23f.appspot.com",
    messagingSenderId: "389279862799",
    appId: "1:389279862799:web:11413867664687d603d730"
};

const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
