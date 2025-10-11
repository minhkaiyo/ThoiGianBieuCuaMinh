// Xóa toàn bộ nội dung cũ và thay thế bằng nội dung này

// Import các thư viện cần thiết
import AuthComponent from './auth.js';
import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Dữ liệu mặc định của ứng dụng
let appData = {
    config: {
        startDate: '2025-10-06',
        goalDate: '2026-01-01',
        totalWeeklyHoursTarget: 42,
    },
    subjects: {
        TDT: { name: 'Trường điện từ', priority: 'critical', weeklyHours: 10, notes: 'Rất khó - Cần tập trung cao', emoji: '🔥🔥🔥' },
        LTM: { name: 'Lý thuyết mạch', priority: 'critical', weeklyHours: 9, notes: 'Rất khó - Nhiều bài tập', emoji: '🔥🔥🔥' },
        DTS: { name: 'Điện tử số', priority: 'high', weeklyHours: 7, notes: 'Quan trọng - Nền tảng', emoji: '⚡⚡' },
        TTS: { name: 'Thông tin số', priority: 'high', weeklyHours: 6, notes: 'Quan trọng - Lý thuyết nhiều', emoji: '⚡⚡' },
        CPP: { name: 'C/C++', priority: 'medium', weeklyHours: 6, notes: 'Đã có nền - Cần practice', emoji: '💻' },
        TW: { name: 'Technical Writing', priority: 'low', weeklyHours: 2.5, notes: 'Dễ - Làm bài đầy đủ', emoji: '✍️' },
        KNM: { name: 'Kỹ năng mềm', priority: 'low', weeklyHours: 1.5, notes: 'Cơ bản - Ổn định', emoji: '📱' }
    },
    schedule: {
        timeConfig: {
            sang: { name: '🌅 Sáng', time: '6:45-11:45' },
            chieu: { name: '☀️ Chiều', time: '12:30-17:30' },
            toi: { name: '🌙 Tối', time: '19:00-23:30' }
        },
        dayData: {
            T2: {
                sang: [{ type: 'class', subjects: ['TTS', 'KNM'], notes: '' }],
                chieu: [{ type: 'class', subjects: ['LTM'], notes: '' }],
                toi: [{ type: 'library', notes: 'Đọc Lý thuyết mạch' }, { type: 'study', notes: 'BT: TĐT + Điện tử số' }]
            },
            T3: {
                sang: [{ type: 'class', subjects: ['DTS', 'TDT'], notes: '' }],
                chieu: [{ type: 'study', subjects: ['TDT'], notes: 'Làm bài tập' }],
                toi: [{ type: 'library', notes: 'Đọc Điện tử số' }, { type: 'study', notes: 'BT: Lý thuyết mạch' }]
            },
            T4: {
                sang: [{ type: 'study', subjects: ['TDT', 'LTM'], notes: '🔥 Giải bài tập khó' }],
                chieu: [{ type: 'study', subjects: ['DTS', 'TTS'], notes: '' }],
                toi: [{ type: 'library', notes: 'Thông tin số' }, { type: 'study', notes: 'BT: Thông tin số + ĐTS' }]
            },
            T5: {
                sang: [{ type: 'study', subjects: ['DTS', 'TTS'], notes: 'Ôn lý thuyết + BT' }],
                chieu: [{ type: 'class', subjects: ['TW'], notes: '' }],
                toi: [{ type: 'library', notes: 'Technical W.' }, { type: 'study', notes: 'Ôn môn yếu nhất' }]
            },
            T6: {
                sang: [{ type: 'class', subjects: ['CPP'], notes: 'Sau 9:10: Code Project' }],
                chieu: [{ type: 'study', subjects: ['CPP'], notes: '12:30-15:00 Lớp' }],
                toi: [{ type: 'library', notes: 'C++ nâng cao' }, { type: 'study', notes: 'Hoàn thiện Project' }]
            },
            T7: {
                sang: [{ type: 'study', subjects: ['TDT', 'LTM'], notes: 'Giải đề khó' }],
                chieu: [{ type: 'study', subjects: ['DTS', 'TTS'], notes: 'Hệ thống hóa' }],
                toi: [{ type: 'break', subjects: [], notes: 'Thư giãn 🎮' }]
            },
            CN: {
                sang: [{ type: 'break', subjects: [], notes: 'Sạc năng lượng 🔋' }],
                chieu: [{ type: 'study', subjects: [], notes: 'Lập KH tuần' }],
                toi: [{ type: 'study', subjects: ['TTS', 'LTM'], notes: 'Preview T2' }]
            }
        }
    },
    detailedSchedule: {
        T2: [
            { time: '6:45-11:45', activity: 'Lên lớp Thông tin số + Kỹ năng mềm', category: 'Lên lớp' },
            { time: '12:00-14:30', activity: 'Ăn trưa + Nghỉ ngơi', category: 'Sinh hoạt' },
            { time: '15:05-17:30', activity: 'Lên lớp Lý thuyết mạch', category: 'Lên lớp' },
            { time: '18:00-19:00', activity: 'Ăn tối + Relax', category: 'Sinh hoạt' },
            { time: '19:00-20:45', activity: 'Thư viện - Đọc lý thuyết LTM', category: 'Thư viện' },
            { time: '21:00-23:30', activity: 'Tự học - Làm BT TĐT + ĐTS', category: 'Tự học' }
        ],
        T3: [
            { time: '6:45-11:45', activity: 'Lên lớp ĐTS + TĐT', category: 'Lên lớp' },
            { time: '12:00-14:00', activity: 'Ăn trưa + Nghỉ', category: 'Sinh hoạt' },
            { time: '14:00-17:30', activity: 'Tự học TĐT - Làm bài tập', category: 'Tự học' },
            { time: '19:00-20:45', activity: 'Thư viện - Đọc lý thuyết ĐTS', category: 'Thư viện' },
            { time: '21:00-23:30', activity: 'Tự học - BT Lý thuyết mạch', category: 'Tự học' }
        ],
        T4: [
            { time: '6:45-11:45', activity: 'Deep Focus - Giải BT khó TĐT + LTM', category: 'Tự học' },
            { time: '12:00-14:00', activity: 'Ăn trưa + Power nap', category: 'Sinh hoạt' },
            { time: '14:00-17:30', activity: 'Sprint học - ĐTS + TTS', category: 'Tự học' },
            { time: '19:00-20:45', activity: 'Thư viện - Thông tin số', category: 'Thư viện' },
            { time: '21:00-23:30', activity: 'BT Thông tin số + ĐTS', category: 'Tự học' }
        ],
        T5: [
            { time: '6:45-11:45', activity: 'Tự học - Ôn ĐTS + TTS', category: 'Tự học' },
            { time: '12:00-14:00', activity: 'Ăn trưa + Nghỉ', category: 'Sinh hoạt' },
            { time: '14:00-17:30', activity: 'Lên lớp Technical Writing', category: 'Lên lớp' },
            { time: '19:00-20:45', activity: 'Thư viện - Đọc Technical Writing', category: 'Thư viện' },
            { time: '21:00-23:30', activity: 'Ôn tập môn yếu nhất', category: 'Tự học' }
        ],
        T6: [
            { time: '6:45-11:45', activity: 'Lên lớp & Code Project C++', category: 'Lên lớp' },
            { time: '12:30-17:30', activity: 'Lên lớp & Code Project C++', category: 'Lên lớp' },
            { time: '19:00-20:45', activity: 'Thư viện - C++ nâng cao', category: 'Thư viện' },
            { time: '21:00-23:30', activity: 'Hoàn thiện Project', category: 'Tự học' }
        ],
        T7: [
            { time: '7:00-11:45', activity: 'Giải đề khó TĐT + LTM', category: 'Tự học' },
            { time: '12:00-14:00', activity: 'Ăn trưa + Nghỉ', category: 'Sinh hoạt' },
            { time: '14:00-17:30', activity: 'Hệ thống hóa kiến thức ĐTS + TTS', category: 'Tự học' },
            { time: '19:00 onwards', activity: 'Đi chơi - Thư giãn!', category: 'Giải trí' }
        ],
        CN: [
            { time: 'Sáng', activity: 'Thể thao + Sạc năng lượng', category: 'Ngoại khóa' },
            { time: 'Chiều', activity: 'Review & Lập kế hoạch tuần tới', category: 'Tự học' },
            { time: 'Tối', activity: 'Preview bài Thứ 2', category: 'Tự học' }
        ]
    },
    studyStrategies: [
        { emoji: '🎯', title: 'Pomodoro 50-10', description: 'Học 50 phút, nghỉ 10 phút. Sau 3 pomodoro nghỉ 20-30 phút.' },
        { emoji: '📝', title: 'Feynman Technique', description: 'Giải thích lại kiến thức như dạy người khác - đảm bảo hiểu sâu.' },
        { emoji: '🔄', title: 'Active Recall', description: 'Đọc xong hãy nhắm mắt nhớ lại, không xem sách. Hiệu quả gấp 3 lần!' },
        { emoji: '📊', title: 'Spaced Repetition', description: 'Ôn lại sau 1 ngày → 3 ngày → 7 ngày → 14 ngày.' },
        { emoji: '🎨', title: 'Mind Mapping', description: 'Vẽ sơ đồ tư duy cho TĐT và Lý thuyết mạch - giúp nhớ lâu hơn.' }
    ],
    weeklyChecklist: {
        academic: ['Hoàn thành tất cả BT Trường điện từ', 'Giải xong bài tập Lý thuyết mạch', 'Làm mindmap Điện tử số', 'Ôn lại bài cũ Thông tin số', 'Coding practice C++ (3 bài)', 'Nộp bài Technical Writing'],
        lifeBalance: ['Tập thể thao ít nhất 2 lần', 'Ngủ đủ 7-8 tiếng mỗi đêm', 'Gọi điện về nhà ít nhất 1 lần', 'Dành thời gian với bạn bè', 'Review tiến độ tuần này', 'Lập kế hoạch tuần sau']
    },
    importantNotes: {
        deadlines: ['Kiểm tra giữa kỳ TĐT: Tuần 7', 'Nộp project C++: Tuần 10', 'Bài tập lớn Lý thuyết mạch: Tuần 9'],
        resources: ['YouTube: Neso Academy (ĐTS)', 'Slide giảng viên + Sách', 'Group học tập lớp'],
        tips: ['Học nhóm 2-3 người TĐT, LTM', 'Hỏi thầy ngay khi chưa hiểu', 'Làm đề cũ từ tuần 8']
    }
};

const activityTypes = {
    class: '🏫 Lên lớp',
    study: '📖 Tự học',
    library: '📚 Thư viện',
    break: '🎉 Nghỉ ngơi',
};

let currentEditingDayKey = null;
let currentEditingContext = null;
let timeChartInstance = null;

const chartThemes = {
    vibrant: {
        name: 'Rực Rỡ',
        colors: ['#ff0054', '#ff5400', '#ffbd00', '#00a878', '#007ae5', '#8a2be2', '#4b0082'],
        borderColor: '#ffffff',
        pointer: { type: 'rainbow' }
    },
    technology: {
        name: 'Công Nghệ',
        colors: ['#00e6e6', '#00aaff', '#0055ff', '#5500ff', '#aa00ff', '#ff00aa', '#00ffff'],
        borderColor: '#0d1117',
        glowColor: 'rgba(0, 230, 230, 0.75)',
        pointer: { type: 'electric' }
    },
    nature: {
        name: 'Thiên Nhiên',
        colors: ['#2e8b57', '#6b8e23', '#228b22', '#008000', '#556b2f', '#8fbc8f', '#3cb371'],
        borderColor: '#ffffff',
        pointer: { type: 'vine' }
    },
    sunset: {
        name: 'Hoàng Hôn',
        colors: ['#ff4800', '#ff6d00', '#ff9a00', '#ffc300', '#c70039', '#900c3f', '#581845'],
        borderColor: '#ffffff',
        pointer: { type: 'ray' }
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const loadingOverlay = document.getElementById('loading-overlay');
    const mainContent = document.getElementById('main-content');
    const authContainer = document.getElementById('auth-container');
    const authRoot = ReactDOM.createRoot(authContainer);

    // Điểm khởi đầu của ứng dụng
    onAuthStateChanged(auth, async (user) => {
        try {
            // Hiển thị component auth ngay lập tức với trạng thái user hiện tại
            authRoot.render(React.createElement(AuthComponent, { user }));

            if (user) {
                // Nếu người dùng đã đăng nhập, tải dữ liệu của họ
                await loadUserData(user);
                renderAll(); // Sau đó hiển thị toàn bộ ứng dụng
            } else {
                // Nếu chưa đăng nhập, chỉ hiển thị giao diện mặc định
                renderAll();
            }
        } catch (error) {
            console.error("Lỗi nghiêm trọng khi khởi tạo ứng dụng:", error);
            // Có thể hiển thị một thông báo lỗi ở đây
        } finally {
            // Luôn ẩn màn hình chờ và hiện nội dung chính sau khi xử lý xong
            loadingOverlay.style.display = 'none';
            mainContent.style.display = 'block';
        }
    });

    async function saveDataToFirebase() {
        const user = auth.currentUser;
        if (user) {
            try {
                const userDocRef = doc(db, 'userData', user.uid);
                await setDoc(userDocRef, appData);
                console.log('Dữ liệu đã được lưu lên Firebase!');
            } catch (error) { // **FIXED**: Thêm dấu ngoặc nhọn bị thiếu
                console.error("Lỗi khi lưu dữ liệu:", error);
            }
        }
    }

    async function loadUserData(user) {
        if (!user) return;
        const userDocRef = doc(db, 'userData', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            console.log("Đã tải dữ liệu từ Firebase!");
            appData = docSnap.data();
        } else {
            console.log("Người dùng mới, tạo dữ liệu mặc định.");
            await saveDataToFirebase();
        }
    }

    function renderAll() {
        setDynamicBackground();
        renderHeaderAndStats();
        renderSchedule();
        renderOtherSections();
        renderTimeAllocationChart();
        attachEventListeners();
        setupClassicClock();
    }

    function renderHeaderAndStats() {
        const headerDetailsContainer = document.getElementById('header-details');
        const footerSummaryElement = document.getElementById('footer-summary');

        const startDate = new Date(appData.config.startDate + 'T00:00:00');
        const goalDate = new Date(appData.config.goalDate + 'T00:00:00');
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const msPerDay = 1000 * 60 * 60 * 24;

        const totalDuration = Math.ceil((goalDate - startDate) / msPerDay);
        const daysPassed = Math.max(0, Math.floor((now - startDate) / msPerDay));
        const daysRemaining = Math.ceil((goalDate - now) / msPerDay);
        const progressPercentage = totalDuration > 0 ? Math.min(100, (daysPassed / totalDuration) * 100) : 0;

        const currentWeek = totalDuration > 0 ? Math.floor(daysPassed / 7) + 1 : 0;
        const totalWeeks = totalDuration > 0 ? Math.ceil(totalDuration / 7) : 0;

        let detailsHTML = `
            <div class="flex items-center justify-center gap-3 text-sm font-medium bg-white/20 text-white py-2 px-4 rounded-full">
                <span>Từ: <strong>${startDate.toLocaleDateString('vi-VN', dateOptions)}</strong></span>
                <span>-</span>
                <span>Đến: <strong>${goalDate.toLocaleDateString('vi-VN', dateOptions)}</strong></span>
                <button id="edit-dates-btn" class="ml-2 text-lg hover:text-yellow-300 transition" title="Chỉnh sửa thời gian học">✏️</button>
            </div>
        `;

        detailsHTML += `
            <div id="progress-section">
                <div id="progress-bar-container">
                    <div id="progress-bar-fill" style="width: ${progressPercentage}%;"></div>
                </div>
                <p id="progress-text">Ngày thứ ${daysPassed} / Tổng số ${totalDuration} ngày</p>
            </div>
        `;
        headerDetailsContainer.innerHTML = detailsHTML;

        document.getElementById('stat-subjects').textContent = Object.keys(appData.subjects).length;
        document.getElementById('stat-hours').textContent = appData.config.totalWeeklyHoursTarget;

        const statWeekEl = document.getElementById('stat-week');
        const statWeekLabelEl = document.getElementById('stat-week-label');
        if (statWeekEl && statWeekLabelEl) {
            statWeekEl.textContent = currentWeek;
            statWeekLabelEl.textContent = `Tuần học ( ${currentWeek}/${totalWeeks} )`;
        }
    }

    function renderScheduleHead() {
        const scheduleHead = document.getElementById('schedule-head');
        const days = { T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5', T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ Nhật' };
        const dayEntries = Object.entries(days);

        const dayKeyMap = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };
        const todayKey = dayKeyMap[new Date().getDay()];

        let headHTML = '<tr>';
        headHTML += '<th class="transparent-cell p-3 text-left font-bold rounded-tl-xl border-b">⏰ Giờ</th>';

        for (let i = 0; i < dayEntries.length; i++) {
            const [key, value] = dayEntries[i];
            let cornerClass = (i === dayEntries.length - 1) ? 'rounded-tr-xl' : ''; // Bo tròn góc ô cuối

            const cellClass = (key === todayKey) ? 'current-day-header' : 'transparent-cell';

            headHTML += `<th class="${cellClass} ${cornerClass} p-3 text-center font-bold border-b">${value} <button class="edit-day-btn text-xs" data-day-key="${key}">✏️</button></th>`;
        }

        headHTML += '</tr>';
        scheduleHead.innerHTML = headHTML;
    }

    function renderSchedule() {
        renderScheduleHead();

        const scheduleBody = document.getElementById('schedule-body');
        if (!scheduleBody) return;
        scheduleBody.innerHTML = '';
        const timeSlotEntries = Object.entries(appData.schedule.timeConfig);
        const days = Object.keys(appData.schedule.dayData);

        timeSlotEntries.forEach(([slotKey, slotConfig], index) => {
            const row = document.createElement('tr');

            const isLastRow = index === timeSlotEntries.length - 1;
            const cornerClass = isLastRow ? 'rounded-bl-xl' : '';

            row.innerHTML = `<td class="transparent-cell p-3 font-semibold border-b ${cornerClass}">${slotConfig.name}<br><span class="text-xs text-gray-500">${slotConfig.time}</span></td>`;

            days.forEach(dayKey => {
                const cell = document.createElement('td');
                cell.className = 'p-3 border-b';
                const activities = appData.schedule.dayData[dayKey][slotKey] || [];
                if (activities.length > 0) {
                    const timeSlotDiv = document.createElement('div');
                    timeSlotDiv.className = 'time-slot';
                    activities.forEach(activity => {
                        let titleHtml = `<span class="subject-pill activity-${activity.type}">${activityTypes[activity.type]}</span>`;
                        timeSlotDiv.innerHTML += titleHtml;
                        if (activity.subjects && activity.subjects.length > 0) {
                            timeSlotDiv.innerHTML += `<div class="mt-2">${activity.subjects.map(sKey => appData.subjects[sKey] ? `<span class="subject-pill priority-${appData.subjects[sKey].priority}">${appData.subjects[sKey].name}</span>` : '').join('')}</div>`;
                        }
                        if (activity.notes) timeSlotDiv.innerHTML += `<div class="text-xs text-gray-500 mt-2">${activity.notes}</div>`;
                    });
                    cell.appendChild(timeSlotDiv);
                }
                row.appendChild(cell);
            });
            scheduleBody.appendChild(row);
        });
        renderDetailedScheduleContent();
    }

    function renderOtherSections() {
        const container = document.getElementById('other-sections');
        const totalAllocatedHours = Object.values(appData.subjects).reduce((sum, s) => sum + s.weeklyHours, 0);

        const priorityMatrixHTML = Object.values(appData.subjects).sort((a, b) => {
            const priorities = { critical: 3, high: 2, medium: 1, low: 0 };
            return priorities[b.priority] - priorities[a.priority];
        }).map(subject => `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="subject-pill priority-${subject.priority}">${subject.name}</span>
                    <span class="text-sm text-gray-600">${subject.notes}</span>
                </div>
                <div class="text-2xl">${subject.emoji}</div>
            </div>`).join('');

        const studyHoursHTML = Object.values(appData.subjects).map(subject => {
            const percentage = appData.config.totalWeeklyHoursTarget > 0 ? (subject.weeklyHours / appData.config.totalWeeklyHoursTarget) * 100 : 0;
            return `
            <div>
                <div class="flex justify-between mb-1">
                    <span class="text-sm font-semibold text-gray-700">${subject.name}</span>
                    <span class="text-sm font-bold text-purple-600">${subject.weeklyHours}h</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" data-width="${percentage.toFixed(1)}%"></div></div>
            </div>`;
        }).join('');

        const studyStrategiesHTML = appData.studyStrategies.map(s => `
            <div class="flex items-start gap-2"><span class="text-lg">${s.emoji}</span><p><strong>${s.title}:</strong> ${s.description}</p></div>
        `).join('');

        const academicChecklistHTML = appData.weeklyChecklist.academic.map(item => `<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"><input type="checkbox" class="w-4 h-4 text-purple-600 rounded"><span>${item}</span></label>`).join('');
        const lifeBalanceChecklistHTML = appData.weeklyChecklist.lifeBalance.map(item => `<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"><input type="checkbox" class="w-4 h-4 text-purple-600 rounded"><span>${item}</span></label>`).join('');

        const deadlinesHTML = appData.importantNotes.deadlines.map(note => `<li>• ${note}</li>`).join('');
        const resourcesHTML = appData.importantNotes.resources.map(note => `<li>• ${note}</li>`).join('');
        const tipsHTML = appData.importantNotes.tips.map(note => `<li>• ${note}</li>`).join('');

        container.innerHTML = `
            <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div id="subjects-section" class="glass-card rounded-2xl p-6">
                    <h3 class="heading-font text-xl font-bold mb-4 text-gray-800">
                        🎯 Danh sách môn học
                        <button id="edit-subjects-btn" class="text-sm align-middle" title="Chỉnh sửa môn học">✏️</button>
                    </h3>
                    <div class="space-y-3">${priorityMatrixHTML}</div>
                </div>
                <div id="time-allocation-card" class="glass-card rounded-2xl p-6">
                    <h3 class="heading-font text-xl font-bold mb-4 text-gray-800">
                        ⏱️ Phân Bổ Thời Gian Tuần
                        <button id="edit-time-alloc-btn" class="text-sm align-middle" title="Chỉnh sửa phân bổ">✏️</button>
                    </h3>
                    <div class="chart-container">
                        <canvas id="timeAllocationChart"></canvas>
                        <div id="sunset-animation" class="chart-decoration hidden">☀️</div>
                        <div id="vibrant-animation" class="chart-decoration hidden">🌈</div>
                        <div id="tech-animation" class="chart-decoration hidden">
                            <span>01</span><div class="chip">💻</div><span>10</span>
                        </div>
                        <div id="nature-animation" class="chart-decoration hidden">🌳</div>
                        <div id="theme-menu-container">
                            <button id="theme-menu-trigger" title="Chọn style biểu đồ">🎨</button>
                            <div id="theme-options"></div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div class="flex justify-between font-bold text-sm text-gray-700 border-b pb-2 mb-2">
                            <span>Tổng mục tiêu: ${appData.config.totalWeeklyHoursTarget}h</span>
                            <span>Đã phân bổ: ${totalAllocatedHours.toFixed(1)}h</span>
                        </div>
                        ${studyHoursHTML}
                    </div>
                </div>
            </div>
            <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div class="glass-card rounded-2xl p-6">
                    <h3 class="heading-font text-xl font-bold mb-4 text-gray-800">
                        💡 Chiến Lược Học Tập
                        <button id="edit-strategies-btn" class="text-sm align-middle" title="Chỉnh sửa chiến lược">✏️</button>
                    </h3>
                    <div class="space-y-3 text-sm text-gray-700">${studyStrategiesHTML}</div>
                </div>
                <div class="quote-card">
                    <h3 class="heading-font text-xl font-bold mb-4">✨ Động Lực Mỗi Ngày</h3>
                    <p id="quote-text" class="text-lg italic mb-4">Đang tải trích dẫn...</p>
                    <p id="quote-translation" class="text-sm opacity-90 mb-4"></p>
                    <div class="mt-4 pt-4 border-t border-white border-opacity-30">
                        <p class="text-sm font-semibold">🎯 Nhắc nhở:</p>
                        <ul class="text-sm mt-2 space-y-1"><li>• Mỗi ngày tiến bộ 1%</li><li>• Học đều đặn > Học dồn trước thi</li><li>• Nghỉ ngơi đúng cách = Học tập hiệu quả</li></ul>
                    </div>
                </div>
            </div>
            <div class="glass-card rounded-2xl p-6 mb-8">
                <h3 class="heading-font text-xl font-bold mb-4 text-gray-800">
                    ✅ Checklist Hàng Tuần
                    <button id="edit-checklist-btn" class="text-sm align-middle" title="Chỉnh sửa checklist">✏️</button>
                </h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div><h4 class="font-bold text-gray-700 mb-3">🎯 Mục tiêu học tập</h4><div class="space-y-2 text-sm">${academicChecklistHTML}</div></div>
                    <div><h4 class="font-bold text-gray-700 mb-3">🎪 Cân bằng cuộc sống</h4><div class="space-y-2 text-sm">${lifeBalanceChecklistHTML}</div></div>
                </div>
            </div>
            <div class="glass-card rounded-2xl p-6 mb-8">
                <h3 class="heading-font text-xl font-bold mb-4 text-gray-800">
                    📌 Lưu Ý Quan Trọng
                    <button id="edit-notes-btn" class="text-sm align-middle" title="Chỉnh sửa lưu ý">✏️</button>
                </h3>
                <div class="grid md:grid-cols-3 gap-4">
                    <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded"><h4 class="font-bold text-red-700 mb-2">🚨 Deadline Gần</h4><ul class="text-sm text-red-600 space-y-1">${deadlinesHTML}</ul></div>
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded"><h4 class="font-bold text-blue-700 mb-2">📚 Tài Nguyên Học</h4><ul class="text-sm text-blue-600 space-y-1">${resourcesHTML}</ul></div>
                    <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded"><h4 class="font-bold text-green-700 mb-2">💪 Tips Hiệu Quả</h4><ul class="text-sm text-green-600 space-y-1">${tipsHTML}</ul></div>
                </div>
            </div>
        `;
    }

    function renderTimeAllocationChart() {
        if (timeChartInstance) {
            timeChartInstance.destroy();
        }
        const ctx = document.getElementById('timeAllocationChart');
        if (!ctx) return;

        const themeOptionsContainer = document.getElementById('theme-options');
        themeOptionsContainer.innerHTML = Object.entries(chartThemes).map(([key, theme]) =>
            `<button data-theme="${key}" class="theme-option-btn">${theme.name}</button>`
        ).join('');

        const customEffectsPlugin = {
            id: 'customEffects',
            afterDraw: (chart) => {
                const activeElements = chart.getActiveElements();
                if (activeElements.length > 0) {
                    const { ctx } = chart;
                    const activeEl = activeElements[0];
                    const { startAngle, endAngle } = activeEl.element;
                    const angle = startAngle + (endAngle - startAngle) / 2;
                    const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                    const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;

                    const outerRadius = activeEl.element.outerRadius - 5;
                    const x = centerX + Math.cos(angle) * outerRadius;
                    const y = centerY + Math.sin(angle) * outerRadius;

                    const currentThemeKey = localStorage.getItem('selectedChartTheme') || 'vibrant';
                    const themePointer = chartThemes[currentThemeKey].pointer;

                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);

                    if (themePointer.type === 'rainbow') {
                        const gradient = ctx.createLinearGradient(centerX, centerY, x, y);
                        gradient.addColorStop(0, 'red');
                        gradient.addColorStop(0.2, 'orange');
                        gradient.addColorStop(0.4, 'yellow');
                        gradient.addColorStop(0.6, 'green');
                        gradient.addColorStop(0.8, 'blue');
                        gradient.addColorStop(1, 'purple');
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 3;
                        ctx.lineTo(x, y);
                    } else if (themePointer.type === 'electric') {
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 2;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = '#00ffff';
                        for (let i = 0; i <= 1; i += 0.1) {
                            const midX = centerX + (x - centerX) * i + (Math.random() - 0.5) * 10;
                            const midY = centerY + (y - centerY) * i + (Math.random() - 0.5) * 10;
                            ctx.lineTo(midX, midY);
                        }
                        ctx.lineTo(x, y);
                    } else if (themePointer.type === 'vine') {
                        ctx.strokeStyle = '#3cb371';
                        ctx.lineWidth = 4;
                        ctx.lineCap = 'round';
                        ctx.quadraticCurveTo(centerX + (x - centerX) * 0.5 + 20, centerY + (y - centerY) * 0.5, x, y);
                    } else if (themePointer.type === 'ray') {
                        const rayGradient = ctx.createLinearGradient(centerX, centerY, x, y);
                        rayGradient.addColorStop(0, 'rgba(255, 255, 0, 0)');
                        rayGradient.addColorStop(0.5, 'rgba(255, 220, 0, 1)');
                        rayGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
                        ctx.strokeStyle = rayGradient;
                        ctx.lineWidth = 6;
                        ctx.lineTo(x, y);
                    }

                    ctx.stroke();
                    ctx.restore();
                }
            },
            beforeDatasetsDraw: (chart) => {
                const currentThemeKey = localStorage.getItem('selectedChartTheme') || 'vibrant';
                const theme = chartThemes[currentThemeKey];
                if (theme.glowColor) {
                    chart.ctx.shadowColor = theme.glowColor;
                    chart.ctx.shadowBlur = 20;
                }
            },
            afterDatasetsDraw: (chart) => {
                chart.ctx.shadowColor = 'rgba(0,0,0,0)';
                chart.ctx.shadowBlur = 0;
            }
        };

        const savedThemeKey = localStorage.getItem('selectedChartTheme') || 'vibrant';
        const activeTheme = chartThemes[savedThemeKey];
        document.querySelector(`.theme-option-btn[data-theme="${savedThemeKey}"]`)?.classList.add('active-theme');

        const subjects = Object.values(appData.subjects);
        const data = subjects.map(s => s.weeklyHours);

        timeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: subjects.map(s => s.name),
                datasets: [{
                    data: data,
                    backgroundColor: activeTheme.colors,
                    borderColor: activeTheme.borderColor,
                    borderWidth: 3,
                    hoverOffset: 25,
                    borderRadius: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        titleFont: { size: 14 },
                        bodyFont: { size: 14 },
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                cutout: '65%',
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            },
            plugins: [customEffectsPlugin]
        });
    }

    function openEditModal(dayKey) {
        currentEditingDayKey = dayKey;
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        const dayName = { T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5', T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ Nhật' }[dayKey];
        document.getElementById('modal-title').textContent = `Chỉnh sửa lịch học: ${dayName}`;
        modalBody.innerHTML = '';
        const dayData = appData.schedule.dayData[dayKey];
        const subjectOptions = Object.entries(appData.subjects).map(([key, value]) => `<option value="${key}">${value.name}</option>`).join('');
        const activityOptions = Object.entries(activityTypes).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');

        Object.entries(appData.schedule.timeConfig).forEach(([slotKey, slotConfig]) => {
            const activity = (dayData[slotKey] && dayData[slotKey][0]) ? dayData[slotKey][0] : { type: 'break', subjects: [], notes: '' };
            let subjectSelectors = '';
            for (let i = 0; i < 4; i++) {
                const selectedSub = (activity.subjects && activity.subjects[i]) ? activity.subjects[i] : '';
                subjectSelectors += `<select class="modal-select subject-select"><option value="">-- Chọn môn ${i + 1} --</option>${subjectOptions.replace(`value="${selectedSub}"`, `value="${selectedSub}" selected`)}</select>`;
            }
            modalBody.innerHTML += `
                <div class="p-4 border rounded-lg bg-white/50" data-slot="${slotKey}">
                    <h4 class="font-bold text-lg mb-3">${slotConfig.name}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="font-semibold text-sm">Khung giờ</label><input type="text" value="${slotConfig.time}" class="modal-input time-input"></div>
                        <div><label class="font-semibold text-sm">Hoạt động</label><select class="modal-select activity-type-select">${activityOptions.replace(`value="${activity.type}"`, `value="${activity.type}" selected`)}</select></div>
                        <div class="md:col-span-2"><label class="font-semibold text-sm">Ghi chú</label><input type="text" value="${activity.notes}" class="modal-input notes-input"></div>
                        <div class="md:col-span-2 grid grid-cols-2 gap-2">${subjectSelectors}</div>
                    </div>
                </div>
            `;
        });
        modal.classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('edit-modal').classList.add('hidden');
    }

    function openSubjectsEditModal() {
        currentEditingContext = 'subjects';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Quản lý Môn học';
        modalBody.innerHTML = '';
        const priorityOptions = `
            <option value="critical">Rất cao (Critical)</option>
            <option value="high">Cao (High)</option>
            <option value="medium">Trung bình (Medium)</option>
            <option value="low">Thấp (Low)</option>
        `;
        Object.entries(appData.subjects).forEach(([key, subject]) => {
            modalBody.innerHTML += `
                <div class="p-4 border-b pb-4" data-subject-key="${key}">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-lg text-purple-700">${subject.name}</h4>
                        <button class="delete-subject-btn text-red-500 hover:text-red-700 font-bold text-xl" title="Xóa môn học này">🗑️</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="font-semibold text-sm">Tên môn học</label><input type="text" value="${subject.name}" class="modal-input subject-name"></div>
                        <div><label class="font-semibold text-sm">Giờ/tuần</label><input type="number" step="0.5" value="${subject.weeklyHours}" class="modal-input subject-hours"></div>
                        <div><label class="font-semibold text-sm">Độ ưu tiên</label><select class="modal-select subject-priority">${priorityOptions.replace(`value="${subject.priority}"`, `value="${subject.priority}" selected`)}</select></div>
                        <div><label class="font-semibold text-sm">Biểu tượng</label><input type="text" value="${subject.emoji}" class="modal-input subject-emoji"></div>
                        <div class="md:col-span-2"><label class="font-semibold text-sm">Ghi chú</label><input type="text" value="${subject.notes}" class="modal-input subject-notes"></div>
                    </div>
                </div>
            `;
        });
        modalBody.innerHTML += `<div class="mt-4"><button id="add-new-subject-btn" class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold">＋ Thêm môn học mới</button></div>`;
        modal.classList.remove('hidden');
    }

    function openTimeAllocationModal() {
        currentEditingContext = 'time';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Chỉnh sửa Phân bổ Thời gian';
        let totalAllocated = Object.values(appData.subjects).reduce((sum, s) => sum + s.weeklyHours, 0);
        let subjectInputsHTML = Object.entries(appData.subjects).map(([key, subject]) => `
            <div class="flex items-center justify-between gap-4">
                <label class="font-semibold text-sm flex-1">${subject.name}</label>
                <input type="number" step="0.5" min="0" value="${subject.weeklyHours}" data-subject-key="${key}" class="modal-input w-24 text-center time-alloc-input">
            </div>
        `).join('');
        modalBody.innerHTML = `
            <div class="p-4 border rounded-lg bg-white/50 space-y-4">
                <div class="flex items-center justify-between gap-4">
                    <label for="total-hours-target" class="font-bold text-lg">Tổng giờ mục tiêu/tuần:</label>
                    <input type="number" id="total-hours-target" min="0" value="${appData.config.totalWeeklyHoursTarget}" class="modal-input w-24 text-center font-bold">
                </div>
                <hr>
                <div class="space-y-3">${subjectInputsHTML}</div>
                <hr>
                    <div class="flex justify-between font-bold text-lg text-purple-700">
                    <span>Đã phân bổ:</span>
                    <span id="total-allocated-display">${totalAllocated.toFixed(1)}h / ${appData.config.totalWeeklyHoursTarget}h</span>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    function openStrategiesEditModal() {
        currentEditingContext = 'strategies';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Chỉnh sửa Chiến Lược Học Tập';
        const suggestedEmojis = ['🎯', '📝', '🔄', '📊', '🎨', '💡', '🧠', '✍️', '🗣️', '🧑‍🏫', '🔍', '📈'];

        let strategiesHTML = appData.studyStrategies.map((strategy, index) => `
            <div class="p-4 border-b" data-strategy-index="${index}">
                <div class="flex justify-between items-center mb-3">
                     <h4 class="font-bold text-lg text-purple-700">Chiến lược ${index + 1}</h4>
                     <button class="delete-item-btn text-red-500 hover:text-red-700 font-bold text-xl" title="Xóa chiến lược này">🗑️</button>
                </div>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="font-semibold text-sm">Biểu tượng (Emoji)</label>
                        <div class="flex items-center gap-2 mt-1">
                             <input type="text" value="${strategy.emoji}" class="modal-input w-16 text-center strategy-emoji">
                             <div class="flex-1 p-2 bg-gray-100 rounded-lg flex flex-wrap gap-2 emoji-picker">
                                ${suggestedEmojis.map(emoji => `<span class="cursor-pointer p-1 rounded hover:bg-gray-300">${emoji}</span>`).join('')}
                             </div>
                        </div>
                    </div>
                    <div><label class="font-semibold text-sm">Tiêu đề</label><input type="text" value="${strategy.title}" class="modal-input strategy-title"></div>
                    <div><label class="font-semibold text-sm">Mô tả</label><textarea class="modal-input strategy-desc h-20">${strategy.description}</textarea></div>
                </div>
            </div>
        `).join('');

        modalBody.innerHTML = strategiesHTML + `<div class="mt-4"><button id="add-new-strategy-btn" class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold">＋ Thêm chiến lược mới</button></div>`;
        modal.classList.remove('hidden');
    }

    function openChecklistEditModal() {
        currentEditingContext = 'checklist';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Chỉnh sửa Checklist Hàng Tuần';

        modalBody.innerHTML = `
            <div class="p-4 space-y-4">
                <div>
                    <label for="academic-checklist" class="font-bold text-lg text-gray-700">🎯 Mục tiêu học tập</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi mục tiêu trên một dòng.</p>
                    <textarea id="academic-checklist" class="modal-input h-40">${appData.weeklyChecklist.academic.join('\n')}</textarea>
                </div>
                 <div>
                    <label for="life-balance-checklist" class="font-bold text-lg text-gray-700">🎪 Cân bằng cuộc sống</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi mục tiêu trên một dòng.</p>
                    <textarea id="life-balance-checklist" class="modal-input h-40">${appData.weeklyChecklist.lifeBalance.join('\n')}</textarea>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    function addNewSubjectForm() {
        const modalBody = document.getElementById('modal-body');
        const newKey = `new-${Date.now()}`;
        const priorityOptions = `
            <option value="medium">Trung bình (Medium)</option>
            <option value="critical">Rất cao (Critical)</option>
            <option value="high">Cao (High)</option>
            <option value="low">Thấp (Low)</option>
        `;
        const newFormHTML = `
            <div class="p-4 border-b pb-4" data-subject-key="${newKey}">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-lg text-green-700">Môn học mới</h4>
                        <button class="delete-subject-btn text-red-500 hover:text-red-700 font-bold text-xl" title="Xóa môn học này">🗑️</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="font-semibold text-sm">Tên môn học</label><input type="text" placeholder="VD: Tâm lý học" class="modal-input subject-name"></div>
                    <div><label class="font-semibold text-sm">Giờ/tuần</label><input type="number" step="0.5" value="3" class="modal-input subject-hours"></div>
                    <div><label class="font-semibold text-sm">Độ ưu tiên</label><select class="modal-select subject-priority">${priorityOptions}</select></div>
                    <div><label class="font-semibold text-sm">Biểu tượng</label><input type="text" value="💡" class="modal-input subject-emoji"></div>
                    <div class="md:col-span-2"><label class="font-semibold text-sm">Ghi chú</label><input type="text" placeholder="Ghi chú ngắn" class="modal-input subject-notes"></div>
                </div>
            </div>
        `;
        document.getElementById('add-new-subject-btn').parentElement.insertAdjacentHTML('beforebegin', newFormHTML);
    }

    function addNewStrategyForm() {
        const modalBody = document.getElementById('modal-body');
        const newIndex = modalBody.querySelectorAll('[data-strategy-index]').length;
        const suggestedEmojis = ['🎯', '📝', '🔄', '📊', '🎨', '💡', '🧠', '✍️', '🗣️', '🧑‍🏫', '🔍', '📈'];
        const newFormHTML = `
            <div class="p-4 border-b" data-strategy-index="${newIndex}">
                <div class="flex justify-between items-center mb-3">
                     <h4 class="font-bold text-lg text-green-700">Chiến lược mới</h4>
                     <button class="delete-item-btn text-red-500 hover:text-red-700 font-bold text-xl" title="Xóa chiến lược này">🗑️</button>
                </div>
                <div class="grid grid-cols-1 gap-4">
                     <div>
                        <label class="font-semibold text-sm">Biểu tượng (Emoji)</label>
                        <div class="flex items-center gap-2 mt-1">
                             <input type="text" value="💡" class="modal-input w-16 text-center strategy-emoji">
                             <div class="flex-1 p-2 bg-gray-100 rounded-lg flex flex-wrap gap-2 emoji-picker">
                                ${suggestedEmojis.map(emoji => `<span class="cursor-pointer p-1 rounded hover:bg-gray-300">${emoji}</span>`).join('')}
                             </div>
                        </div>
                    </div>
                    <div><label class="font-semibold text-sm">Tiêu đề</label><input type="text" placeholder="Tên chiến lược" class="modal-input strategy-title"></div>
                    <div><label class="font-semibold text-sm">Mô tả</label><textarea class="modal-input strategy-desc h-20" placeholder="Mô tả ngắn gọn"></textarea></div>
                </div>
            </div>
        `;
        document.getElementById('add-new-strategy-btn').parentElement.insertAdjacentHTML('beforebegin', newFormHTML);
    }

    function saveSubjectChanges() {
        const newSubjects = {};
        const deletedKeys = [];
        document.querySelectorAll('#modal-body [data-subject-key]').forEach(subjectEl => {
            const key = subjectEl.dataset.subjectKey;
            if (subjectEl.style.display === 'none') {
                if (!key.startsWith('new-')) { deletedKeys.push(key); }
                return;
            }
            const name = subjectEl.querySelector('.subject-name').value.trim();
            if (!name) return;
            const newKey = key.startsWith('new-') ? name.split(' ').map(word => word[0] || '').join('').toUpperCase() + Math.floor(Math.random() * 100) : key;
            newSubjects[newKey] = {
                name: name,
                weeklyHours: parseFloat(subjectEl.querySelector('.subject-hours').value) || 0,
                priority: subjectEl.querySelector('.subject-priority').value,
                emoji: subjectEl.querySelector('.subject-emoji').value,
                notes: subjectEl.querySelector('.subject-notes').value,
            };
        });
        appData.subjects = newSubjects;
        if (deletedKeys.length > 0) {
            Object.keys(appData.schedule.dayData).forEach(dayKey => {
                Object.keys(appData.schedule.dayData[dayKey]).forEach(slotKey => {
                    appData.schedule.dayData[dayKey][slotKey].forEach(activity => {
                        if (activity.subjects) {
                            activity.subjects = activity.subjects.filter(subKey => !deletedKeys.includes(subKey));
                        }
                    });
                });
            });
        }
        closeModal();
        renderOtherSections();
        renderTimeAllocationChart();
        attachEventListeners();
        saveDataToFirebase();
    }

    function saveTimeAllocationChanges() {
        appData.config.totalWeeklyHoursTarget = parseFloat(document.getElementById('total-hours-target').value) || 0;
        document.querySelectorAll('.time-alloc-input').forEach(input => {
            const key = input.dataset.subjectKey;
            if (appData.subjects[key]) {
                appData.subjects[key].weeklyHours = parseFloat(input.value) || 0;
            }
        });
        closeModal();
        renderOtherSections();
        renderTimeAllocationChart();
        attachEventListeners();
    }

    function saveStrategiesChanges() {
        const newStrategies = [];
        document.querySelectorAll('#modal-body [data-strategy-index]').forEach(el => {
            if (el.style.display === 'none') return;

            const title = el.querySelector('.strategy-title').value.trim();
            if (title) {
                newStrategies.push({
                    emoji: el.querySelector('.strategy-emoji').value,
                    title: title,
                    description: el.querySelector('.strategy-desc').value.trim()
                });
            }
        });
        appData.studyStrategies = newStrategies;
        closeModal();
        renderAll();
        renderOtherSections();
        attachEventListeners();
    }

    function saveChecklistChanges() {
        const academicText = document.getElementById('academic-checklist').value;
        const lifeBalanceText = document.getElementById('life-balance-checklist').value;

        appData.weeklyChecklist.academic = academicText.split('\n').map(item => item.trim()).filter(item => item);
        appData.weeklyChecklist.lifeBalance = lifeBalanceText.split('\n').map(item => item.trim()).filter(item => item);

        closeModal();
        renderOtherSections();
        attachEventListeners();
    }

    function saveScheduleChanges() {
        const dayData = appData.schedule.dayData[currentEditingDayKey];
        document.querySelectorAll('#modal-body [data-slot]').forEach(slotEl => {
            const slotKey = slotEl.dataset.slot;
            if (slotEl.querySelector('.time-input')) appData.schedule.timeConfig[slotKey].time = slotEl.querySelector('.time-input').value;
            const activityType = slotEl.querySelector('.activity-type-select').value;
            const notes = slotEl.querySelector('.notes-input').value;
            const subjects = Array.from(slotEl.querySelectorAll('.subject-select')).map(select => select.value).filter(value => value !== '');
            dayData[slotKey] = [{ type: activityType, subjects: subjects, notes: notes }];
        });
        closeModal();
        renderSchedule();
        saveDataToFirebase();
    }

    async function fetchAndDisplayQuote() {
        const quoteTextEl = document.getElementById('quote-text');
        const quoteTranslationEl = document.getElementById('quote-translation');
        const today = new Date().toISOString().split('T')[0];

        try {
            const cachedQuote = JSON.parse(localStorage.getItem('dailyQuote'));
            if (cachedQuote && cachedQuote.date === today) {
                quoteTextEl.textContent = `"${cachedQuote.text}"`;
                quoteTranslationEl.textContent = cachedQuote.translation;
                return;
            }

            const quoteResponse = await fetch('https://api.quotable.io/random');
            if (!quoteResponse.ok) throw new Error('Failed to fetch quote');
            const quoteData = await quoteResponse.json();
            const englishQuote = quoteData.content;
            quoteTextEl.textContent = `"${englishQuote}"`;

            const transResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishQuote)}&langpair=en|vi`);
            if (!transResponse.ok) throw new Error('Failed to fetch translation');
            const transData = await transResponse.json();
            const vietnameseTranslation = transData.responseData.translatedText;
            quoteTranslationEl.textContent = vietnameseTranslation;

            localStorage.setItem('dailyQuote', JSON.stringify({
                date: today,
                text: englishQuote,
                translation: vietnameseTranslation
            }));

        } catch (error) {
            console.error("Quote fetch error:", error);
            quoteTextEl.textContent = `"The secret to getting ahead is getting started."`;
            quoteTranslationEl.textContent = "Bí quyết để vượt lên phía trước là hãy bắt đầu.";
        }
    }

    function attachEventListeners() {
        document.getElementById('edit-subjects-btn')?.addEventListener('click', openSubjectsEditModal);
        document.getElementById('edit-time-alloc-btn')?.addEventListener('click', openTimeAllocationModal);
        document.getElementById('edit-strategies-btn')?.addEventListener('click', openStrategiesEditModal);
        document.getElementById('edit-checklist-btn')?.addEventListener('click', openChecklistEditModal);
        document.getElementById('edit-notes-btn')?.addEventListener('click', openNotesEditModal);

        const header = document.querySelector('header');
        header?.addEventListener('click', (e) => {
            if (e.target.closest('#edit-dates-btn')) {
                openDatesEditModal();
            }
        });

        const scheduleSection = document.getElementById('schedule-section');
        scheduleSection?.addEventListener('click', (e) => {
            const editDayBtn = e.target.closest('.edit-day-btn');
            if (editDayBtn) {
                currentEditingContext = 'schedule';
                openEditModal(editDayBtn.dataset.dayKey);
                return;
            }
            const toggleDetailedBtn = e.target.closest('#toggle-detailed-schedule');
            if (toggleDetailedBtn) {
                const detailedContainer = document.getElementById('detailed-schedule-container');
                detailedContainer.classList.toggle('expanded');
                toggleDetailedBtn.classList.toggle('toggled');
                if (detailedContainer.classList.contains('expanded')) {
                    toggleDetailedBtn.innerHTML = '&times;';
                    setTimeout(() => {
                        detailedContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                } else {
                    toggleDetailedBtn.innerHTML = '+';
                }
                return;
            }
            const collapseBtn = e.target.closest('#collapse-detailed-schedule-btn');
            if (collapseBtn) {
                const scheduleSection = document.getElementById('schedule-section');
                const detailedContainer = document.getElementById('detailed-schedule-container');
                const toggleBtn = document.getElementById('toggle-detailed-schedule');
                if (scheduleSection && detailedContainer && toggleBtn) {
                    detailedContainer.classList.remove('expanded');
                    toggleBtn.classList.remove('toggled');
                    toggleBtn.innerHTML = '+';
                    scheduleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }
            const editDayCardBtn = e.target.closest('.edit-day-card-btn');
            if (editDayCardBtn) {
                openDetailedDayModal(editDayCardBtn.dataset.dayKey);
                return;
            }
        });

        const timeAllocCard = document.getElementById('time-allocation-card');
        timeAllocCard?.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('#toggle-time-alloc-btn');
            if (toggleBtn) {
                const isCollapsed = timeAllocCard.classList.toggle('collapsed');
                if (!isCollapsed && timeChartInstance) {
                    setTimeout(() => timeChartInstance.resize(), 300);
                }
                return;
            }
            const themeMenuTrigger = e.target.closest('#theme-menu-trigger');
            const themeOptions = document.getElementById('theme-options');
            if (themeMenuTrigger) {
                e.stopPropagation();
                themeOptions.classList.toggle('visible');
                return;
            }
            const themeOptionBtn = e.target.closest('.theme-option-btn');
            if (themeOptionBtn) {
                const themeKey = themeOptionBtn.dataset.theme;
                localStorage.setItem('selectedChartTheme', themeKey);
                themeOptions.classList.remove('visible');
                document.querySelectorAll('.chart-decoration').forEach(deco => deco.classList.add('hidden'));
                const activeDecoration = document.getElementById({
                    sunset: 'sunset-animation',
                    vibrant: 'vibrant-animation',
                    technology: 'tech-animation',
                    nature: 'nature-animation'
                }[themeKey]);
                if (activeDecoration) activeDecoration.classList.remove('hidden');
                if (themeKey === 'technology') {
                    let currentRotation = timeChartInstance.options.rotation || 0;
                    let targetRotation = currentRotation + 360;
                    let animationDuration = 800;
                    let startTime = null;
                    function rotateAnimation(timestamp) {
                        if (!startTime) startTime = timestamp;
                        const progress = timestamp - startTime;
                        const rotation = currentRotation + (targetRotation - currentRotation) * (progress / animationDuration);
                        timeChartInstance.options.rotation = rotation;
                        timeChartInstance.update('none');
                        if (progress < animationDuration) {
                            requestAnimationFrame(rotateAnimation);
                        } else {
                            timeChartInstance.options.rotation = targetRotation % 360;
                            renderTimeAllocationChart();
                        }
                    }
                    requestAnimationFrame(rotateAnimation);
                } else {
                    renderTimeAllocationChart();
                }
            }
        });
        document.addEventListener('click', (e) => {
            const themeMenu = document.getElementById('theme-options');
            const themeTrigger = document.getElementById('theme-menu-trigger');
            if (themeMenu && themeTrigger && !e.target.closest('#theme-menu-container')) {
                themeMenu.classList.remove('visible');
            }
        });

        const modal = document.getElementById('edit-modal');
        modal.addEventListener('click', function (e) {
            if (e.target.id === 'close-modal-btn' || e.target.id === 'cancel-btn') {
                closeModal();
                return;
            }
            if (e.target.id === 'save-btn') {
                switch (currentEditingContext) {
                    case 'dates': saveDatesChanges(); break;
                    case 'schedule': saveScheduleChanges(); break;
                    case 'detailedDay': saveDetailedDayChanges(currentEditingDayKey); break;
                    case 'subjects': saveSubjectChanges(); break;
                    case 'time': saveTimeAllocationChanges(); break;
                    case 'strategies': saveStrategiesChanges(); break;
                    case 'checklist': saveChecklistChanges(); break;
                    case 'notes': saveNotesChanges(); break;
                }
                return;
            }
            if (e.target.id === 'add-new-subject-btn') addNewSubjectForm();
            if (e.target.id === 'add-new-strategy-btn') addNewStrategyForm();
            if (e.target.id === 'add-activity-btn') {
                const list = document.getElementById('detailed-activities-list');
                if (!list) return;
                const newIndex = list.children.length;
                const categories = ['Sinh hoạt', 'Ngoại khóa', 'Tự học', 'Lên lớp', 'Thư viện', 'Nghỉ ngơi', 'Giải trí', 'Đi làm'];
                const categoryOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');
                const newRow = document.createElement('div');
                newRow.className = 'p-3 border rounded-lg grid grid-cols-1 md:grid-cols-4 gap-2 items-center';
                newRow.dataset.activityIndex = newIndex;
                newRow.innerHTML = `
                    <input type="text" class="modal-input md:col-span-1 activity-time" placeholder="VD: 8:00-9:00">
                    <input type="text" class="modal-input md:col-span-2 activity-desc" placeholder="Hoạt động">
                    <select class="modal-select activity-category">${categoryOptions}</select>
                    <button class="delete-activity-btn bg-red-100 text-red-600 rounded px-2 py-1 text-xs hover:bg-red-200">Xóa</button>
                `;
                list.appendChild(newRow);
            }
            if (e.target.matches('.delete-activity-btn') || e.target.matches('.delete-subject-btn') || e.target.matches('.delete-item-btn')) {
                e.target.closest('[data-activity-index], [data-subject-key], [data-strategy-index]').remove();
            }
            if (e.target.matches('.emoji-picker span')) {
                const input = e.target.closest('.flex.items-center.gap-2').querySelector('.strategy-emoji');
                if (input) input.value = e.target.textContent;
            }
        });
        modal.addEventListener('input', function (e) {
            if (e.target.matches('.time-alloc-input, #total-hours-target')) {
                let totalAllocated = 0;
                document.querySelectorAll('.time-alloc-input').forEach(input => { totalAllocated += parseFloat(input.value) || 0; });
                const totalTarget = document.getElementById('total-hours-target').value;
                document.getElementById('total-allocated-display').textContent = `${totalAllocated.toFixed(1)}h / ${totalTarget}h`;
            }
        });

        document.querySelectorAll('.glass-card input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function () { this.closest('label').classList.toggle('checklist-item-done', this.checked); });
        });
        setTimeout(() => { document.querySelectorAll('.progress-fill').forEach(fill => { fill.style.width = fill.getAttribute('data-width'); }); }, 300);
        fetchAndDisplayQuote();
    }
    function openNotesEditModal() {
        currentEditingContext = 'notes';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Chỉnh sửa Lưu Ý Quan Trọng';

        const { deadlines, resources, tips } = appData.importantNotes;

        modalBody.innerHTML = `
            <div class="p-4 space-y-4">
                <div>
                    <label for="deadlines-notes" class="font-bold text-lg text-red-700">🚨 Deadline Gần</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi mục trên một dòng.</p>
                    <textarea id="deadlines-notes" class="modal-input h-24">${deadlines.join('\n')}</textarea>
                </div>
                <div>
                    <label for="resources-notes" class="font-bold text-lg text-blue-700">📚 Tài Nguyên Học</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi mục trên một dòng.</p>
                    <textarea id="resources-notes" class="modal-input h-24">${resources.join('\n')}</textarea>
                </div>
                <div>
                    <label for="tips-notes" class="font-bold text-lg text-green-700">💪 Tips Hiệu Quả</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi mục trên một dòng.</p>
                    <textarea id="tips-notes" class="modal-input h-24">${tips.join('\n')}</textarea>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    }
    function saveNotesChanges() {
        const deadlinesText = document.getElementById('deadlines-notes').value;
        const resourcesText = document.getElementById('resources-notes').value;
        const tipsText = document.getElementById('tips-notes').value;

        appData.importantNotes.deadlines = deadlinesText.split('\n').map(item => item.trim()).filter(item => item);
        appData.importantNotes.resources = resourcesText.split('\n').map(item => item.trim()).filter(item => item);
        appData.importantNotes.tips = tipsText.split('\n').map(item => item.trim()).filter(item => item);

        closeModal();
        renderOtherSections();
        attachEventListeners();
    }
    function openDetailedDayModal(dayKey) {
        currentEditingContext = 'detailedDay';
        currentEditingDayKey = dayKey;
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        const dayName = { T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5', T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ Nhật' }[dayKey];
        document.getElementById('modal-title').textContent = `Chỉnh sửa chi tiết: ${dayName}`;

        const activities = appData.detailedSchedule[dayKey] || [];
        const categories = ['Sinh hoạt', 'Ngoại khóa', 'Tự học', 'Lên lớp', 'Thư viện', 'Nghỉ ngơi', 'Giải trí', 'Đi làm'];
        const categoryOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

        let activitiesHTML = activities.map((activity, index) => `
            <div class="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-4 gap-2 items-center" data-activity-index="${index}">
                <input type="text" value="${activity.time}" class="modal-input md:col-span-1 activity-time" placeholder="VD: 8:00-9:00">
                <input type="text" value="${activity.activity}" class="modal-input md:col-span-2 activity-desc" placeholder="Hoạt động">
                <select class="modal-select activity-category">${categoryOptions.replace(`value="${activity.category}"`, `value="${activity.category}" selected`)}</select>
                <button class="delete-activity-btn bg-red-100 text-red-600 rounded px-2 py-1 text-xs hover:bg-red-200">Xóa</button>
            </div>
        `).join('');

        modalBody.innerHTML = `
            <div id="detailed-activities-list" class="space-y-3">
                ${activitiesHTML}
            </div>
            <div class="mt-4">
                <button id="add-activity-btn" class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold">＋ Thêm hoạt động</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    function saveDetailedDayChanges(dayKey) {
        const newActivities = [];
        document.querySelectorAll('#detailed-activities-list [data-activity-index]').forEach(row => {
            const time = row.querySelector('.activity-time').value.trim();
            const activity = row.querySelector('.activity-desc').value.trim();
            const category = row.querySelector('.activity-category').value;

            if (activity) {
                newActivities.push({ time, activity, category });
            }
        });

        appData.detailedSchedule[dayKey] = newActivities;
        closeModal();
        renderDetailedScheduleContent();
    }

    function renderDetailedScheduleContent() {
        const detailedContainer = document.getElementById('detailed-schedule-container');
        if (!detailedContainer) return;

        detailedContainer.innerHTML = '';

        const dayNames = { T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5', T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ Nhật' };
        const detailedCardsHTML = Object.entries(appData.detailedSchedule).map(([dayKey, activities]) => `
            <div class="day-card">
                <div class="flex justify-between items-center mb-3 pb-3 border-b border-white/20">
                    <h4 class="heading-font text-lg font-bold text-purple-700">${dayNames[dayKey]}</h4>
                    <button class="edit-day-card-btn text-sm" data-day-key="${dayKey}" title="Chỉnh sửa chi tiết">✏️</button>
                </div>
                <ul class="day-schedule-list space-y-2">
                    ${activities.map(act => `
                        <li class="flex items-start">
                            <span class="time">${act.time}</span>
                            <span class="activity flex-1">${act.activity}</span>
                            <span class="category-pill category-${act.category.toLowerCase().replace(/ /g, '-')}">${act.category}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        const collapseButtonHTML = `
            <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center mt-4">
                <button id="collapse-detailed-schedule-btn" class="px-4 py-2 bg-white/60 text-purple-700 font-semibold rounded-lg hover:bg-white/90 transition-all duration-300 shadow-md flex items-center gap-2 mx-auto backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
                    Thu Gọn
                </button>
            </div>
        `;

        if (!detailedContainer.classList.contains('grid')) {
            detailedContainer.className += ' grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-4';
        }

        detailedContainer.innerHTML = detailedCardsHTML + collapseButtonHTML;
    }

    function setDynamicBackground() {
        const currentHour = new Date().getHours();
        const body = document.body;

        body.classList.remove('day-bg', 'sunset-bg', 'night-bg');

        if (currentHour >= 5 && currentHour < 17) {
            body.classList.add('day-bg');
        } else if (currentHour >= 17 && currentHour < 19) {
            body.classList.add('sunset-bg');
        } else {
            body.classList.add('night-bg');
        }
    }

    function openDatesEditModal() {
        currentEditingContext = 'dates';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Cập nhật Thời gian Học tập';

        modalBody.innerHTML = `
            <div class="p-4 space-y-4">
                <div>
                    <label for="start-date-input" class="font-semibold text-sm mb-1 block">Ngày bắt đầu</label>
                    <input type="date" id="start-date-input" class="modal-input" value="${appData.config.startDate}">
                </div>
                <div>
                    <label for="goal-date-input" class="font-semibold text-sm mb-1 block">Ngày kết thúc (Mục tiêu)</label>
                    <input type="date" id="goal-date-input" class="modal-input" value="${appData.config.goalDate}">
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    function saveDatesChanges() {
        const newStartDate = document.getElementById('start-date-input').value;
        const newGoalDate = document.getElementById('goal-date-input').value;
        if (newStartDate && newGoalDate) {
            appData.config.startDate = newStartDate;
            appData.config.goalDate = newGoalDate;
        }

        closeModal();
        renderAll();
    }

    function attachDynamicEventListeners() {
        document.getElementById('edit-subjects-btn')?.addEventListener('click', openSubjectsEditModal);
        document.getElementById('edit-time-alloc-btn')?.addEventListener('click', openTimeAllocationModal);
        document.getElementById('edit-strategies-btn')?.addEventListener('click', openStrategiesEditModal);
        document.getElementById('edit-checklist-btn')?.addEventListener('click', openChecklistEditModal);
        document.getElementById('edit-notes-btn')?.addEventListener('click', openNotesEditModal);

        const timeAllocCard = document.getElementById('time-allocation-card');
        timeAllocCard?.addEventListener('click', (e) => {
            const themeMenuTrigger = e.target.closest('#theme-menu-trigger');
            if (themeMenuTrigger) {
                e.stopPropagation();
                document.getElementById('theme-options').classList.toggle('visible');
                return;
            }

            const themeOptionBtn = e.target.closest('.theme-option-btn');
            if (themeOptionBtn) {
                const themeKey = themeOptionBtn.dataset.theme;
                localStorage.setItem('selectedChartTheme', themeKey);
                document.getElementById('theme-options').classList.remove('visible');
                renderTimeAllocationChart();
            }
        });

        document.querySelectorAll('.glass-card input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function () { this.closest('label').classList.toggle('checklist-item-done', this.checked); });
        });
    }

    function setupClassicClock() {
        const hourHand = document.querySelector('.hour-hand');
        const minuteHand = document.querySelector('.minute-hand');
        const secondHand = document.querySelector('.second-hand');

        if (!hourHand || !minuteHand || !secondHand) return;

        function setDate() {
            const now = new Date();

            const seconds = now.getSeconds();
            const secondsDegrees = ((seconds / 60) * 360) + 90;
            secondHand.style.transform = `rotate(${secondsDegrees}deg)`;

            const minutes = now.getMinutes();
            const minutesDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6) + 90;
            minuteHand.style.transform = `rotate(${minutesDegrees}deg)`;

            const hours = now.getHours();
            const hourDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30) + 90;
            hourHand.style.transform = `rotate(${hourDegrees}deg)`;
        }

        setInterval(setDate, 1000);
        setDate();
    }

    console.log("Ứng dụng thời gian biểu đã được khởi chạy!");
});

