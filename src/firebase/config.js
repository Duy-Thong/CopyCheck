import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDbU1NC9X0uFQtTzHlajdnyIKcgljd-1so",
  authDomain: "checkbtl.firebaseapp.com",
  databaseURL: "https://checkbtl-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "checkbtl",
  storageBucket: "checkbtl.firebasestorage.app",
  messagingSenderId: "716727429836",
  appId: "1:716727429836:web:5a89d702fb866b51087069",
  measurementId: "G-Z24FY5KTKV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database, analytics };
