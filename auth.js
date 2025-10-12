const { useState, useEffect, Fragment } = React;

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

// === COMPONENT CON: Google SVG Icon ===
function GoogleIcon() {
    return React.createElement('svg', { className: "w-5 h-5", viewBox: "0 0 48 48" },
        React.createElement('path', { fill: "#FFC107", d: "M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" }),
        React.createElement('path', { fill: "#FF3D00", d: "M6.306,14.691l6.06-4.893C14.64,5.446,19.083,4,24,4c5.268,0,10.046,2.053,13.485,5.695l-5.657,5.657C30.046,13.123,27.24,12,24,12c-4.485,0-8.52,2.57-10.425,6.306L6.306,14.691z" }),
        React.createElement('path', { fill: "#4CAF50", d: "M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.22,0-9.643-3.336-11.284-7.94l-6.388,5.038C8.588,39.622,15.635,44,24,44z" }),
        React.createElement('path', { fill: "#1976D2", d: "M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,34.552,44,29.836,44,24C44,22.659,43.862,21.35,43.611,20.083z" })
    );
}

function AuthComponent({ user }) {
    // State quản lý việc hiển thị modal đăng nhập
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    // State quản lý việc hiển thị dropdown của user
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    // State cho form
    const [activeTab, setActiveTab] = useState('login'); // 'login', 'register', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            setIsAuthModalOpen(false);
        }
    }, [user]);

    // Đóng dropdown user khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isUserDropdownOpen && !event.target.closest('#user-menu-wrapper')) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isUserDropdownOpen]);

    const showMessage = (type, text, duration = 4000) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), duration);
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setMessage({ type: '', text: '' });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        resetForm();
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('success', 'Đăng nhập thành công!');
        } catch (error) {
            showMessage('error', 'Lỗi: Email hoặc mật khẩu không đúng.');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('success', 'Đăng ký thành công! Đang đăng nhập...');
        } catch (error) {
            showMessage('error', 'Lỗi: Email đã tồn tại hoặc không hợp lệ.');
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            showMessage('error', 'Lỗi đăng nhập với Google.');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage('success', `Email khôi phục đã được gửi đi (check cả thư rác).`);
        } catch (error) {
            showMessage('error', 'Lỗi: Không thể gửi email khôi phục.');
        }
    };

    const handleLogout = () => signOut(auth);

    // === RENDER GIAO DIỆN ===

    // 1. Giao diện khi đã đăng nhập
    if (user) {
        return React.createElement('div', { className: 'relative', id: 'user-menu-wrapper' },
            React.createElement('button', {
                onClick: () => setIsUserDropdownOpen(!isUserDropdownOpen),
                className: 'user-display-btn'
            },
                React.createElement('img', {
                    src: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random&color=fff`,
                    alt: 'User Avatar',
                    className: 'user-avatar'
                }),
                React.createElement('span', { className: 'user-name' }, user.displayName || user.email.split('@')[0])
            ),
            isUserDropdownOpen && React.createElement('div', { className: 'user-dropdown' },
                React.createElement('button', {
                    onClick: handleLogout,
                    className: 'user-dropdown-btn'
                }, 'Đăng xuất')
            )
        );
    }

    // 2. Giao diện khi chưa đăng nhập (Modal toàn màn hình)
    const renderForm = () => {
        switch (activeTab) {
            case 'register':
                return React.createElement('form', { onSubmit: handleRegister, className: 'space-y-4' },
                    React.createElement('input', { type: 'email', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), required: true, className: 'auth-form-input' }),
                    React.createElement('input', { type: 'password', placeholder: 'Mật khẩu (ít nhất 6 ký tự)', value: password, onChange: e => setPassword(e.target.value), required: true, className: 'auth-form-input' }),
                    React.createElement('button', { type: 'submit', className: 'auth-submit-btn' }, 'Đăng ký')
                );
            case 'forgot':
                return React.createElement('form', { onSubmit: handlePasswordReset, className: 'space-y-4' },
                    React.createElement('p', { className: 'text-sm text-center text-white/80' }, 'Nhập email để nhận link khôi phục mật khẩu.'),
                    React.createElement('input', { type: 'email', placeholder: 'Email của bạn', value: email, onChange: e => setEmail(e.target.value), required: true, className: 'auth-form-input' }),
                    React.createElement('button', { type: 'submit', className: 'auth-submit-btn' }, 'Gửi Email Khôi Phục')
                );
            default: // login
                return React.createElement('form', { onSubmit: handleLogin, className: 'space-y-4' },
                    React.createElement('input', { type: 'email', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), required: true, className: 'auth-form-input' }),
                    React.createElement('input', { type: 'password', placeholder: 'Mật khẩu', value: password, onChange: e => setPassword(e.target.value), required: true, className: 'auth-form-input' }),
                    React.createElement('button', { type: 'submit', className: 'auth-submit-btn' }, 'Đăng nhập'),
                    React.createElement('a', { href: '#', onClick: (e) => { e.preventDefault(); handleTabChange('forgot'); }, className: 'text-xs text-center block text-white/60 hover:underline' }, 'Quên mật khẩu?')
                );
        }
    };

    return React.createElement(Fragment, null,
        // Nút chờ, có thể ẩn đi nếu muốn modal tự hiện
        React.createElement('button', {
            onClick: () => setIsAuthModalOpen(true),
            className: 'px-4 py-2 text-sm font-semibold text-gray-700 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition'
        }, 'Đăng nhập'),

        // Lớp phủ và Modal
        React.createElement('div', { className: `auth-overlay ${isAuthModalOpen ? 'visible' : ''}` },
            React.createElement('div', { className: 'auth-modal' },
                // Tabs
                React.createElement('div', { className: 'auth-tabs' },
                    React.createElement('button', { onClick: () => handleTabChange('login'), className: `auth-tab-btn ${activeTab === 'login' ? 'active' : ''}` }, 'Đăng nhập'),
                    React.createElement('button', { onClick: () => handleTabChange('register'), className: `auth-tab-btn ${activeTab === 'register' ? 'active' : ''}` }, 'Đăng ký')
                ),

                // Vùng thông báo lỗi/thành công
                message.text && React.createElement('div', {
                    className: `auth-message ${message.type}`
                }, message.text),

                // Form động
                renderForm(),

                // Dải phân cách
                React.createElement('div', { className: 'auth-divider' }, React.createElement('span', null, 'HOẶC')),

                // Nút đăng nhập Google
                React.createElement('button', { onClick: handleGoogleLogin, className: 'auth-google-btn' },
                    React.createElement(GoogleIcon),
                    'Đăng nhập với Google'
                )
            )
        )
    );
}

export default AuthComponent;