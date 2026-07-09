// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLSEM6d3dp15pITzGTl8ZR-GYinB0aD6k",
  authDomain: "ccs-attendance-system.firebaseapp.com",
  projectId: "ccs-attendance-system",
  storageBucket: "ccs-attendance-system.firebasestorage.app",
  messagingSenderId: "913514346772",
  appId: "1:913514346772:web:ec7e3fab838ae6bfe8ea01"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);