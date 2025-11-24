import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Hardcoded config (as per original file)
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBUiU8DmIgQH843AqqM4oiK22i4p2UJdp0",
    authDomain: "healthos-3d23f.firebaseapp.com",
    projectId: "healthos-3d23f",
    storageBucket: "healthos-3d23f.appspot.com",
    messagingSenderId: "389279862799",
    appId: "1:389279862799:web:11413867664687d603d730"
};

let app;
let db;
let auth;

export const initializeFirebase = () => {
    if (!app) {
        app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        auth = getAuth(app);
    }
    return { app, db, auth };
};

export const getDb = () => {
    if (!db) initializeFirebase();
    return db;
};

export const getFirebaseAuth = () => {
    if (!auth) initializeFirebase();
    return auth;
};
