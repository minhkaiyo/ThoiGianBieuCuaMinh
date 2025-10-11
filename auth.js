// auth.js

const { useState, useEffect } = React;

import { auth } from './firebase-config.js';

import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


function AuthComponent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                console.log("Đã đăng nhập:", currentUser.uid);
                onLogin();
            } else {
                console.log("Đã đăng xuất.");
                onLogout();
            }
        });
        return () => unsubscribe();
    }, [onLogin, onLogout]);

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Lỗi đăng nhập Google:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    };

    if (user) {
        return React.createElement('div', { className: 'p-4 text-center text-sm' },
            React.createElement('span', null, `Chào mừng, `, React.createElement('strong', null, user.email), `!`),
            React.createElement('button', { onClick: handleLogout, className: 'ml-4 px-3 py-1 bg-red-500 text-white rounded-md text-xs' }, 'Đăng xuất')
        );
    }

    const handleLogin = async () => await signInWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));

    return React.createElement('div', { className: 'flex justify-center items-center gap-2 p-4' },
        React.createElement('input', { type: 'email', value: email, onChange: e => setEmail(e.target.value), placeholder: 'Email', className: 'modal-input p-2 text-sm w-40' }),
        React.createElement('input', { type: 'password', value: password, onChange: e => setPassword(e.target.value), placeholder: 'Mật khẩu', className: 'modal-input p-2 text-sm w-40' }),
        React.createElement('button', { onClick: handleLogin, className: 'px-3 py-2 bg-blue-600 text-white rounded-lg text-sm' }, 'Đăng nhập'),
        React.createElement('button', { onClick: handleGoogleLogin, className: 'px-3 py-2 bg-white text-gray-700 rounded-lg shadow' }, 'Login với Google')
    );
}

export default AuthComponent;