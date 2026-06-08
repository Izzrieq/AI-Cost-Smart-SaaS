import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCi8WxtfGH4od8mr0W4gU8_ZkCKHKu1ATY",
  authDomain: "costsmart-f22f2.firebaseapp.com",
  projectId: "costsmart-f22f2",
  storageBucket: "costsmart-f22f2.firebasestorage.app",
  messagingSenderId: "727919164182",
  appId: "1:727919164182:web:5652164677c075c5252e37",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();