// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyASCCNgo6S9AOtBPKYf8DZk0U50dcWfe7I",
  authDomain: "kisan-connect-934de.firebaseapp.com",
  projectId: "kisan-connect-934de",
  storageBucket: "kisan-connect-934de.firebasestorage.app",
  messagingSenderId: "669124271816",
  appId: "1:669124271816:web:13749f81b1334a34c90ffd",
  measurementId: "G-NQ3BCRT1WY",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

export { db, app };
