// config.js 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

export const firebaseConfig = {
    apiKey: "AIzaSyDxYKhzf5vm3VXZyvSefnuwYwYvXohaAk8",
    authDomain: "derivajuridico-2cc99.firebaseapp.com",
    projectId: "derivajuridico-2cc99",
    storageBucket: "derivajuridico-2cc99.firebasestorage.app",
    messagingSenderId: "327704878028",
    appId: "1:327704878028:web:2686f0d8c734d7e9dedb69"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firebase Storage
export const storage = getStorage(app);