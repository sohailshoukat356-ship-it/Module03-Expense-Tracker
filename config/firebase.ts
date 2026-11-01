
import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";

// @ts-ignore - React Native-specific Firebase export
import { getReactNativePersistence } from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBw7ZlSd2r-_5wWjjrAxUyEFbfxWQysnxY",
  authDomain: "module04-expense-tracker.firebaseapp.com",
  projectId: "module04-expense-tracker",
  storageBucket: "module04-expense-tracker.firebasestorage.app",
  messagingSenderId: "466440707261",
  appId: "1:466440707261:web:298aadcdba333e64f06bd4",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
