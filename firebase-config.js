// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "thoi-gian-bieu-cua-minh.firebaseapp.com",
    projectId: "thoi-gian-bieu-cua-minh",
    storageBucket: "thoi-gian-bieu-cua-minh.appspot.com",
    messagingSenderId: "685544265161",
    appId: "1:685544265161:web:ba2fdcfb1dbd2311238418",
    measurementId: "G-ZKPS6WNLXK"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo và EXPORT các dịch vụ để file khác có thể dùng
export const auth = getAuth(app);
export const db = getFirestore(app);