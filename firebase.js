// firebase.js
// 1. Palitan ang mga value sa ubos base sa imong Firebase project settings
//    (Firebase Console > Project Settings > General > Your apps > SDK setup and configuration)
// 2. Siguradoha nga naka-enable ang Cloud Firestore sa imong Firebase project.
// 3. Kini nga file gina-import sa tanang pages (login.html, student.html, admin.html)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);