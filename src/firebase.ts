import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDzsZ4XPUhAzbneWILtJ6OiYYDBkqCw7EM",
  authDomain: "www.decycles.cc",
  projectId: "decycles-web-app-1777399378",
  storageBucket: "decycles-web-app-1777399378.firebasestorage.app",
  messagingSenderId: "757330802529",
  appId: "1:757330802529:web:9a9df014df77415b93b720"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
