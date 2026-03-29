import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA0C387eKrPWG34GWa4QuuBT8ydjN_fHb0",
  authDomain: "face-acne-prediction.firebaseapp.com",
  projectId: "face-acne-prediction",
  storageBucket: "face-acne-prediction.firebasestorage.app",
  messagingSenderId: "67129478004",
  appId: "1:67129478004:web:e5d67babab1db93678ba21",
  measurementId: "G-C8VRB38QZD",
};

const app = initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => {});
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, googleProvider };
