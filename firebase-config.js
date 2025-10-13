// firebase-config.js

// Import các hàm bạn cần từ CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";

// Cấu hình Firebase của ứng dụng web
const firebaseConfig = {
    apiKey: "AIzaSyBjmeNXGaqpXTmC6dVkiOfKKJ_WJPoVB-g",
    authDomain: "thoi-gian-bieu-cua-minh.firebaseapp.com",
    projectId: "thoi-gian-bieu-cua-minh",
    storageBucket: "thoi-gian-bieu-cua-minh.firebasestorage.app",
    messagingSenderId: "685544265161",
    appId: "1:685544265161:web:ba2fdcfb1dbd2311238418",
    measurementId: "G-ZKPS6WNLXK"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Khởi tạo Analytics

export const auth = getAuth(app);
export const db = getFirestore(app);
