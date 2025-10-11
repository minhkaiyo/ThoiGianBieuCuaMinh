// Xóa toàn bộ nội dung cũ và thay thế bằng nội dung này

const { useState, useEffect } = React;

// Import các hàm cần thiết từ Firebase SDK
import { auth } from './firebase-config.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Component chính
function AuthComponent({ user }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('login'); // 'login', 'register', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('#auth-component-wrapper')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const showMessage = (type, text, duration = 4000) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), duration);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('success', 'Đăng nhập thành công!');
            setIsOpen(false);
        } catch (error) {
            showMessage('error', 'Lỗi: Email hoặc mật khẩu không đúng.');
            console.error("Lỗi đăng nhập:", error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('success', 'Đăng ký thành công! Đang đăng nhập...');
            setIsOpen(false);
        } catch (error) {
            showMessage('error', 'Lỗi: Email có thể đã tồn tại hoặc không hợp lệ.');
            console.error("Lỗi đăng ký:", error);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            setIsOpen(false);
        } catch (error) {
            showMessage('error', 'Lỗi đăng nhập với Google.');
            console.error("Lỗi Google login:", error);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage('success', `Nếu tài khoản của bạn tồn tại, một email khôi phục đã được gửi đi.`);
        } catch (error) {
            showMessage('error', 'Lỗi: Không thể gửi email khôi phục.');
            console.error("Lỗi quên mật khẩu:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            showMessage('success', 'Đã đăng xuất.');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    };

    // Giao diện khi đã đăng nhập
    if (user) {
        return React.createElement('div', { className: 'relative', id: 'auth-component-wrapper' },
            React.createElement('button', {
                onClick: () => setIsOpen(!isOpen),
                className: 'flex items-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition'
            },
                React.createElement('img', {
                    src: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`,
                    className: 'w-8 h-8 rounded-full border-2 border-white'
                }),
                React.createElement('span', { className: 'text-sm font-semibold text-gray-700 pr-2' }, user.displayName || user.email)
            ),
            isOpen && React.createElement('div', { className: 'absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2' },
                React.createElement('button', {
                    onClick: handleLogout,
                    className: 'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
                }, 'Đăng xuất')
            )
        );
    }

    // Giao diện khi chưa đăng nhập
    return React.createElement('div', { className: 'relative', id: 'auth-component-wrapper' },
        React.createElement('button', {
            onClick: () => setIsOpen(true),
            className: 'px-4 py-2 text-sm font-semibold text-gray-700 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition'
        }, 'Đăng nhập / Đăng ký'),

        isOpen && React.createElement('div', { className: 'absolute top-full right-0 mt-2 w-72 bg-white/90 backdrop-blur-lg rounded-lg shadow-2xl p-4' },
            React.createElement('div', { className: 'flex border-b mb-4' },
                React.createElement('button', { onClick: () => setActiveTab('login'), className: `flex-1 py-2 text-sm font-semibold ${activeTab === 'login' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}` }, 'Đăng nhập'),
                React.createElement('button', { onClick: () => setActiveTab('register'), className: `flex-1 py-2 text-sm font-semibold ${activeTab === 'register' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}` }, 'Đăng ký')
            ),

            message.text && React.createElement('div', {
                className: `p-2 mb-3 rounded-md text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`
            }, message.text),

            activeTab === 'login' && React.createElement('form', { onSubmit: handleLogin, className: 'space-y-4' },
                React.createElement('input', { type: 'email', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), required: true, className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500' }),
                React.createElement('input', { type: 'password', placeholder: 'Mật khẩu', value: password, onChange: e => setPassword(e.target.value), required: true, className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500' }),
                React.createElement('button', { type: 'submit', className: 'w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition' }, 'Đăng nhập'),
                React.createElement('a', { href: '#', onClick: (e) => { e.preventDefault(); setActiveTab('forgot'); }, className: 'text-xs text-center block text-gray-500 hover:underline' }, 'Quên mật khẩu?')
            ),

            activeTab === 'register' && React.createElement('form', { onSubmit: handleRegister, className: 'space-y-4' },
                React.createElement('input', { type: 'email', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), required: true, className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500' }),
                React.createElement('input', { type: 'password', placeholder: 'Mật khẩu (ít nhất 6 ký tự)', value: password, onChange: e => setPassword(e.target.value), required: true, className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500' }),
                React.createElement('button', { type: 'submit', className: 'w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition' }, 'Đăng ký')
            ),

            activeTab === 'forgot' && React.createElement('form', { onSubmit: handlePasswordReset, className: 'space-y-4' },
                React.createElement('p', { className: 'text-sm text-gray-600' }, 'Nhập email để nhận link khôi phục mật khẩu(Check thư spam, thư rác trong gmail).'),
                React.createElement('input', { type: 'email', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), required: true, className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500' }),
                React.createElement('button', { type: 'submit', className: 'w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition' }, 'Gửi email khôi phục')
            ),

            React.createElement('div', { className: 'flex items-center my-4' },
                React.createElement('hr', { className: 'flex-grow border-t' }),
                React.createElement('span', { className: 'px-2 text-xs text-gray-500' }, 'HOẶC'),
                React.createElement('hr', { className: 'flex-grow border-t' })
            ),
            React.createElement('button', { onClick: handleGoogleLogin, className: 'w-full flex items-center justify-center gap-2 bg-white border border-gray-300 py-2 rounded-md hover:bg-gray-50 transition' },
                React.createElement('svg', { className: "w-5 h-5", viewBox: "0 0 48 48" },
                    React.createElement('path', { fill: "#FFC107", d: "M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" }),
                    React.createElement('path', { fill: "#FF3D00", d: "M6.306,14.691l6.06-4.893C14.64,5.446,19.083,4,24,4c5.268,0,10.046,2.053,13.485,5.695l-5.657,5.657C30.046,13.123,27.24,12,24,12c-4.485,0-8.52,2.57-10.425,6.306L6.306,14.691z" }),
                    React.createElement('path', { fill: "#4CAF50", d: "M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.22,0-9.643-3.336-11.284-7.94l-6.388,5.038C8.588,39.622,15.635,44,24,44z" }),
                    React.createElement('path', { fill: "#1976D2", d: "M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,34.552,44,29.836,44,24C44,22.659,43.862,21.35,43.611,20.083z" })
                ),
                React.createElement('span', { className: 'text-sm font-semibold text-gray-600' }, 'Đăng nhập với Google')
            )
        )
    );
}

export default AuthComponent;

