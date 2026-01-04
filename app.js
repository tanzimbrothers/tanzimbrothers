import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserSessionPersistence, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEo-hTWKMww8C1XAG6Hh0wxNVHvk_sTzM",
    authDomain: "tanzimbrothers.firebaseapp.com",
    projectId: "tanzimbrothers",
    storageBucket: "tanzimbrothers.firebasestorage.app",
    messagingSenderId: "14689849610",
    appId: "1:14689849610:web:8e24f0402fbd1791586af3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ফোর্স লগআউট অন রিফ্রেশ (ল্যান্ডিং পেজ দেখানোর জন্য)
signOut(auth);

// UI Logic
if(document.getElementById('open-login-btn')){
    document.getElementById('open-login-btn').onclick = () => document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('close-login-btn').onclick = () => document.getElementById('login-modal').style.display = 'none';

    document.getElementById('login-btn').onclick = async () => {
        const email = document.getElementById('admin-email').value;
        const pass = document.getElementById('admin-password').value;
        try {
            await setPersistence(auth, browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, pass);
            window.location.href = "dashboard.html"; 
        } catch (e) { alert("ভুল ইমেইল বা পাসওয়ার্ড!"); }
    };
}