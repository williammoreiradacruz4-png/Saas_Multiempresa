import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCkns06bQpPGcGFXvdSFE2xYCxj2HIFj0M",
  authDomain: "saas-lava-jato.firebaseapp.com",
  projectId: "saas-lava-jato",
  storageBucket: "saas-lava-jato.firebasestorage.app",
  messagingSenderId: "289937435993",
  appId: "1:289937435993:web:851ccaeb8ae6d40d633048"
};

// Initialize Firebase (singleton safe)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
