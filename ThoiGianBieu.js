import AuthComponent from './auth.js';
import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const defaultAppData = {
    userProfile: {
        displayName: "Người dùng mới",
        photoURL: "https://placehold.co/40x40/E2E8F0/475569?text=U",
    },
    config: {
        startDate: new Date().toISOString().split('T')[0],
        goalDate: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0],
        totalWeeklyHoursTarget: 25,
        goal: 'A+',
    },
    subjects: {},
    schedule: {
        timeConfig: {
            sang: { name: '🌅 Sáng', time: '07:00-12:00' },
            chieu: { name: '☀️ Chiều', time: '13:00-18:00' },
            toi: { name: '🌙 Tối', time: '19:00-23:00' }
        },
        dayData: { T2: {}, T3: {}, T4: {}, T5: {}, T6: {}, T7: {}, CN: {} }
    },
    aiMemory: {
        facts: [],
        preferences: []
    },
    detailedSchedule: { T2: [], T3: [], T4: [], T5: [], T6: [], T7: [], CN: [] },
    studyStrategies: [],
    checklist: {
        lastDailyReset: null,
        lastWeeklyReset: null,
        daily: [{ text: "Uống đủ 2 lít nước", checked: false }],
        weekly: [{ text: "Dọn dẹp góc học tập", checked: false }]
    },
    importantNotes: {
        deadlines: [],
        resources: [],
        tips: []
    },
    placeholders: {
        subjects: "Chưa có môn học nào. Nhấn vào ô 'Môn học' để bắt đầu thêm.",
        strategies: "Chưa có chiến lược nào. Nhấn nút ✏️ để thêm.",
        notes: "Nhấn nút ✏️ để thêm các ghi chú quan trọng.",
    }
};

let appData = JSON.parse(JSON.stringify(defaultAppData));

const activityTypes = {
    class: '🏫 Lên lớp',
    study: '📖 Tự học',
    library: '📚 Thư viện',
    break: '🎉 Nghỉ ngơi',
};
const DAYS_CONFIG = [
    { key: 'T2', name: 'Thứ 2' },
    { key: 'T3', name: 'Thứ 3' },
    { key: 'T4', name: 'Thứ 4' },
    { key: 'T5', name: 'Thứ 5' },
    { key: 'T6', name: 'Thứ 6' },
    { key: 'T7', name: 'Thứ 7' },
    { key: 'CN', name: 'Chủ Nhật' }
];

let currentEditingDayKey = null;
let currentEditingContext = null;
let currentEditingSlotKey = null;
let timeChartInstance = null;
let originalAppDataState = null;

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

let blurTimer = null;
const BLUR_TIMEOUT = 7000;

document.addEventListener('mouseleave', () => {
    if (blurTimer) clearTimeout(blurTimer);

    blurTimer = setTimeout(() => {
        document.body.classList.add('blur-mode-active');
        console.log("Chế độ tiết kiệm tài nguyên đã được bật.");
    }, BLUR_TIMEOUT);
});
document.addEventListener('mouseenter', () => {
    if (blurTimer) clearTimeout(blurTimer);

    if (document.body.classList.contains('blur-mode-active')) {
        document.body.classList.remove('blur-mode-active');
        console.log("Chào mừng trở lại! Tắt chế độ tiết kiệm.");
    }
});


document.addEventListener('DOMContentLoaded', function () {
    const loadingOverlay = document.getElementById('loading-overlay');
    const mainContent = document.getElementById('main-content');
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;
    const authRoot = ReactDOM.createRoot(authContainer);

    onAuthStateChanged(auth, async (user) => {
        authRoot.render(React.createElement(AuthComponent, { user }));
        if (user) {
            await loadUserData(user);
        } else {
            appData = JSON.parse(JSON.stringify(defaultAppData));
        }
        renderAll();
        setupThemeControls();
        setupQuoteRotator();
        setupAIChat();
        const minLoadingTime = 1500;

        setTimeout(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('fade-out');

                loadingOverlay.addEventListener('transitionend', () => {
                    loadingOverlay.style.display = 'none';
                }, { once: true });
            }

            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
            }
        }, minLoadingTime);
    });

    async function loadUserData(user) {
        const userDocRef = doc(db, 'userData', user.uid);
        const docSnap = await getDoc(userDocRef);
        let needsSave = false;

        if (docSnap.exists()) {
            appData = { ...JSON.parse(JSON.stringify(defaultAppData)), ...docSnap.data() };
            if (appData.weeklyChecklist) {
                appData.checklist = {
                    lastDailyReset: null, lastWeeklyReset: null,
                    daily: [], weekly: [].concat(appData.weeklyChecklist.academic || [], appData.weeklyChecklist.lifeBalance || [])
                };
                delete appData.weeklyChecklist;
                needsSave = true;
            }
        } else {
            appData = JSON.parse(JSON.stringify(defaultAppData));
            appData.userProfile.displayName = user.displayName || "Người dùng mới";
            appData.userProfile.photoURL = user.photoURL || defaultAppData.userProfile.photoURL;
            needsSave = true;
        }

        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        if (appData.checklist.lastDailyReset !== todayString) {
            appData.checklist.daily.forEach(item => item.checked = false);
            appData.checklist.lastDailyReset = todayString;
            needsSave = true;
        }
        const isMonday = today.getDay() === 1;
        if (isMonday && appData.checklist.lastWeeklyReset !== todayString) {
            appData.checklist.weekly.forEach(item => item.checked = false);
            appData.checklist.lastWeeklyReset = todayString;
            needsSave = true;
        }

        if (needsSave) await saveDataToFirebase();
    }
    async function saveDataToFirebase() {
        const user = auth.currentUser;
        if (user) {
            const dataToSave = JSON.parse(JSON.stringify(appData));
            delete dataToSave.placeholders;
            try {
                await setDoc(doc(db, 'userData', user.uid), dataToSave);
                console.log('Dữ liệu đã được lưu!');
            } catch (error) {
                fetchAndDisplayQuote()
                console.error("Lỗi khi lưu dữ liệu:", error);
            }
        }
    }


    function renderAll() {
        renderHeaderAndStats();
        renderSchedule();
        renderOtherSections();
        renderTimeAllocationChart();
        attachEventListeners();
        attachDynamicEventListeners();
        setupOnlineClock();
        renderFooter();
        // setupAIChat(); 
    }

    function renderHeaderAndStats() {
        const headerDetailsContainer = document.getElementById('header-details');

        if (!appData.config || !appData.config.startDate || !appData.config.goalDate) return;

        const startDate = new Date(appData.config.startDate + 'T00:00:00');
        const goalDate = new Date(appData.config.goalDate + 'T00:00:00');
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const msPerDay = 1000 * 60 * 60 * 24;

        const totalDuration = Math.ceil((goalDate - startDate) / msPerDay);
        const daysPassed = Math.max(0, Math.floor((now - startDate) / msPerDay));
        const progressPercentage = totalDuration > 0 ? Math.min(100, (daysPassed / totalDuration) * 100) : 0;

        const currentWeek = totalDuration > 0 ? Math.floor(daysPassed / 7) + 1 : 0;
        const totalWeeks = totalDuration > 0 ? Math.ceil(totalDuration / 7) : 0;

        let detailsHTML = `
            <div class="flex items-center justify-center gap-3 text-sm font-medium bg-white/20 text-white py-2 px-4 rounded-full">
                <span>Từ: <strong>${startDate.toLocaleDateString('vi-VN', dateOptions)}</strong></span>
                <span>-</span>
                <span>Đến: <strong>${goalDate.toLocaleDateString('vi-VN', dateOptions)}</strong></span>
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
        document.getElementById('stat-goal').textContent = appData.config.goal || 'A+';

        const statWeekEl = document.getElementById('stat-week');
        const statWeekLabelEl = document.getElementById('stat-week-label');
        if (statWeekEl && statWeekLabelEl) {
            statWeekEl.textContent = currentWeek;
            statWeekLabelEl.textContent = `Tuần học (${currentWeek}/${totalWeeks})`;
        }
    }

    function renderScheduleHead() {
        const scheduleHead = document.getElementById('schedule-head');
        const dayKeyMap = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };
        const todayKey = dayKeyMap[new Date().getDay()];

        let headHTML = '<tr>';
        headHTML += '<th class="transparent-cell p-3 text-left font-bold rounded-tl-xl border-b">⏰ Giờ</th>';

        DAYS_CONFIG.forEach((day, index) => {
            const isLastHeader = index === DAYS_CONFIG.length - 1;
            const cornerClass = isLastHeader ? 'rounded-tr-xl' : '';
            const cellClass = (day.key === todayKey) ? 'current-day-header' : 'transparent-cell';

            headHTML += `<th class="${cellClass} ${cornerClass} p-3 text-center font-bold border-b">${day.name}</th>`;
        });

        headHTML += '</tr>';
        scheduleHead.innerHTML = headHTML;
    }


    function renderSchedule() {
        const scheduleSection = document.getElementById('schedule-section');
        const header = scheduleSection?.querySelector('.flex.justify-between');
        if (header && !header.querySelector('#reset-main-schedule-btn')) {
            header.innerHTML = `
                    <h2 class="heading-font text-2xl font-bold text-gray-800">📚 Thời Khóa Biểu</h2>
                    <div class="flex items-center gap-2">
                        <button id="reset-main-schedule-btn" class="p-1.5 rounded-full text-red-500 hover:bg-red-100 transition" title="Reset toàn bộ lịch trình trong bảng này">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186A7.002 7.002 0 0112 15.052a1 1 0 11-1.414 1.414A9.002 9.002 0 0019 9a9.002 9.002 0 00-8-8.947V2a1 1 0 01-1-1z" clip-rule="evenodd" />
                                <path d="M4.053 7.053A1 1 0 014 6a1 1 0 011-1h2.053a1 1 0 110 2H5a1 1 0 01-.947-.646z" />
                            </svg>
                        </button>
                        <button id="toggle-detailed-schedule" class="text-3xl font-bold text-purple-600 hover:text-indigo-600 transition-transform duration-300" title="Xem/Ẩn chi tiết từng ngày">+</button>
                    </div>
                `;
        }
        renderScheduleHead();

        const scheduleBody = document.getElementById('schedule-body');
        if (!scheduleBody) return;
        scheduleBody.innerHTML = '';

        const timeSlotOrder = ['sang', 'chieu', 'toi'];

        timeSlotOrder.forEach((slotKey, index) => {
            const slotConfig = appData.schedule.timeConfig[slotKey];
            if (!slotConfig) return;

            const row = document.createElement('tr');
            const isLastRow = index === timeSlotOrder.length - 1;
            const cornerClass = isLastRow ? 'rounded-bl-xl' : '';

            row.innerHTML = `<td class="transparent-cell p-3 font-semibold border-b ${cornerClass}">${slotConfig.name}<br><span class="text-xs text-gray-500">${slotConfig.time}</span></td>`;

            DAYS_CONFIG.forEach(day => {
                const dayKey = day.key;
                const cell = document.createElement('td');
                // === BẮT ĐẦU THAY ĐỔI ===
                // Thêm data-day-key và data-slot-key để định danh ô
                cell.className = 'schedule-cell p-3 border-b relative cursor-pointer hover:bg-black/5 transition-colors';
                cell.dataset.dayKey = dayKey;
                cell.dataset.slotKey = slotKey;
                // === KẾT THÚC THAY ĐỔI ===
                const activities = (appData.schedule.dayData[dayKey] && appData.schedule.dayData[dayKey][slotKey]) ? appData.schedule.dayData[dayKey][slotKey] : [];


                if (activities.length > 0) {
                    const timeSlotDiv = document.createElement('div');
                    timeSlotDiv.className = 'time-slot-enhanced';

                    activities.forEach(activity => {
                        const activityCard = document.createElement('div');
                        activityCard.className = `activity-card activity-${activity.type} mb-2`;

                        let cardContent = `
                            <div class="activity-header">
                                <span class="activity-badge">${activityTypes[activity.type]}</span>
                            </div>
                        `;

                        if (activity.subjects && activity.subjects.length > 0) {
                            cardContent += `<div class="subjects-container mt-2">`;
                            activity.subjects.forEach(sKey => {
                                if (appData.subjects[sKey]) {
                                    const subject = appData.subjects[sKey];
                                    cardContent += `
                                        <div class="subject-tag priority-${subject.priority}">
                                            <span class="subject-emoji">${subject.emoji}</span>
                                            <span class="subject-name">${subject.name}</span>
                                        </div>
                                    `;
                                }
                            });
                            cardContent += `</div>`;
                        }

                        if (activity.notes) {
                            cardContent += `<div class="activity-notes">${activity.notes}</div>`;
                        }

                        activityCard.innerHTML = cardContent;
                        timeSlotDiv.appendChild(activityCard);
                    });

                    cell.appendChild(timeSlotDiv);
                } else {
                    cell.innerHTML = '<div class="empty-slot">---</div>';
                }
                row.appendChild(cell);
            });

            scheduleBody.appendChild(row);
        });

        renderDetailedScheduleContent();
    }

    function renderOtherSections() {
        const container = document.getElementById('other-sections');
        if (!container) return;

        // --- (Phần xử lý logic dữ liệu ở đầu hàm vẫn giữ nguyên) ---
        const totalAllocatedHours = Object.values(appData.subjects).reduce((sum, s) => sum + (s.weeklyHours || 0), 0);
        const subjectsExist = Object.keys(appData.subjects).length > 0;
        const strategiesExist = appData.studyStrategies.length > 0;
        const notesExist = appData.importantNotes.deadlines.length > 0 || appData.importantNotes.resources.length > 0 || appData.importantNotes.tips.length > 0;

        const subjectsHTML = subjectsExist ? Object.values(appData.subjects).sort((a, b) => {
            const priorities = { critical: 3, high: 2, medium: 1, low: 0 };
            return priorities[b.priority] - priorities[a.priority];
        }).map(subject => `
            <div class="flex items-center justify-between p-2 rounded-md hover:bg-black/5">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${subject.emoji}</span>
                    <div>
                        <span class="font-semibold">${subject.name}</span>
                        <span class="text-xs opacity-60 block">${subject.notes || '...'}</span>
                    </div>
                </div>
                <span class="subject-tag-small priority-${subject.priority}">${subject.priority}</span>
            </div>`).join('') : `<p class="placeholder-text">${appData.placeholders.subjects}</p>`;

        const timeAllocationHTML = subjectsExist ? Object.values(appData.subjects).map(subject => {
            const percentage = appData.config.totalWeeklyHoursTarget > 0 ? ((subject.weeklyHours || 0) / appData.config.totalWeeklyHoursTarget) * 100 : 0;
            return `
                <div>
                    <div class="flex justify-between mb-1">
                        <span class="text-sm font-semibold">${subject.name}</span>
                        <span class="text-sm font-bold text-purple-600">${subject.weeklyHours || 0}h</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" data-width="${percentage.toFixed(1)}%"></div></div>
                </div>`;
        }).join('') : '';

        const studyStrategiesHTML = strategiesExist ? appData.studyStrategies.map(s => `
            <div class="flex items-start gap-3"><span class="text-lg mt-1">${s.emoji}</span><p><strong>${s.title}:</strong> ${s.description}</p></div>
        `).join('') : `<p class="placeholder-text">${appData.placeholders.strategies}</p>`;

        const deadlinesHTML = appData.importantNotes.deadlines.length > 0 ? appData.importantNotes.deadlines.map(note => `<li>• ${note}</li>`).join('') : '<li>Không có</li>';
        const resourcesHTML = appData.importantNotes.resources.length > 0 ? appData.importantNotes.resources.map(note => `<li>• ${note}</li>`).join('') : '<li>Không có</li>';
        const tipsHTML = appData.importantNotes.tips.length > 0 ? appData.importantNotes.tips.map(note => `<li>• ${note}</li>`).join('') : '<li>Không có</li>';

        const notesContent = `
            <div class="grid md:grid-cols-3 gap-4">
                <div class="bg-red-500/10 border-l-4 border-red-500 p-4 rounded"><h4 class="font-bold text-red-700 mb-2">🚨 Deadline Gần</h4><ul class="text-sm space-y-1">${deadlinesHTML}</ul></div>
                <div class="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded"><h4 class="font-bold text-blue-700 mb-2">📚 Tài Nguyên Học</h4><ul class="text-sm space-y-1">${resourcesHTML}</ul></div>
                <div class="bg-green-500/10 border-l-4 border-green-500 p-4 rounded"><h4 class="font-bold text-green-700 mb-2">💪 Tips Hiệu Quả</h4><ul class="text-sm space-y-1">${tipsHTML}</ul></div>
            </div>
        `;

        // === BẮT ĐẦU PHẦN SỬA LỖI CẤU TRÚC HTML ===
        container.innerHTML = `
            <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div id="subjects-section" class="glass-card rounded-2xl p-6">
                    <h3 class="heading-font text-xl font-bold mb-4">🎯 Danh sách môn học</h3>
                    <div class="space-y-2">${subjectsHTML}</div>
                </div>
                <div id="time-allocation-card" class="glass-card rounded-2xl p-6">
                    <h3 class="heading-font text-xl font-bold mb-4">⏱️ Phân Bổ Thời Gian Tuần</h3>
                    <div class="chart-container mb-4">
                        <canvas id="timeAllocationChart"></canvas>
                        <div id="theme-menu-container">
                            <button id="theme-menu-trigger" title="Chọn style biểu đồ">🎨</button>
                            <div id="theme-options"></div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div class="flex justify-between font-bold text-sm border-b pb-2 mb-2">
                            <span>Tổng mục tiêu: ${appData.config.totalWeeklyHoursTarget}h</span>
                            <span>Đã phân bổ: ${totalAllocatedHours.toFixed(1)}h</span>
                        </div>
                        ${timeAllocationHTML}
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="glass-card rounded-2xl p-6 md:col-span-2">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="heading-font text-xl font-bold">📌 Lưu Ý Quan Trọng</h3>
                        <button class="edit-btn text-xl opacity-70 hover:opacity-100" data-modal="notes" title="Chỉnh sửa lưu ý">✏️</button>
                    </div>
                    ${notesExist ? notesContent : `<p class="placeholder-text">${appData.placeholders.notes}</p>`}
                </div>

                <div id="checklist-card" class="glass-card rounded-2xl p-6 md:col-span-2">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="heading-font text-xl font-bold">✅ Checklist</h3>
                        <button class="edit-btn text-xl opacity-70 hover:opacity-100" data-modal="checklist" title="Chỉnh sửa checklist">✏️</button>
                    </div>
                    <div class="grid md:grid-cols-2 gap-6 mt-4">
                        <div>
                            <h4 class="font-semibold mb-2">Nhiệm vụ hàng ngày</h4>
                            <div class="space-y-2 text-sm" id="daily-checklist-container"></div>
                        </div>
                        <div>
                            <h4 class="font-semibold mb-2">Nhiệm vụ hàng tuần</h4>
                            <div class="space-y-2 text-sm" id="weekly-checklist-container"></div>
                        </div>
                    </div>
                </div>

                <div class="glass-card rounded-2xl p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="heading-font text-xl font-bold">💡 Chiến Lược Học Tập</h3>
                        <button class="edit-btn text-xl opacity-70 hover:opacity-100" data-modal="strategies" title="Chỉnh sửa chiến lược">✏️</button>
                    </div>
                    <div class="space-y-3 text-sm">${studyStrategiesHTML}</div>
                </div>
                
                <div class="quote-card">
                    <h3 class="heading-font text-xl font-bold mb-4">✨ Động Lực Mỗi Ngày</h3>
                    <p id="quote-text" class="text-lg italic mb-4">Đang tải trích dẫn...</p>
                    <p id="quote-translation" class="text-sm opacity-90"></p>
                </div>
            </div>
        `;
        // === KẾT THÚC PHẦN SỬA LỖI CẤU TRÚC HTML ===

        renderChecklists();
    }

    function renderChecklists() {
        const createChecklistHTML = (category) => {
            if (!appData.checklist || !appData.checklist[category] || appData.checklist[category].length === 0) {
                return `<p class="text-xs text-gray-500">Chưa có nhiệm vụ. Nhấn ✏️ để thêm.</p>`;
            }
            return appData.checklist[category]
                .sort((a, b) => a.checked - b.checked)
                .map(item => `
                <label class="flex items-center gap-2 cursor-pointer hover:bg-black/5 p-2 rounded ${item.checked ? 'checklist-item-done' : ''}">
                    <input type="checkbox" class="w-4 h-4 text-purple-600 rounded-lg focus:ring-purple-500 checklist-checkbox" data-category="${category}" data-text="${item.text}" ${item.checked ? 'checked' : ''}>
                    <span>${item.text}</span>
                </label>
            `).join('');
        };

        const dailyContainer = document.getElementById('daily-checklist-container');
        const weeklyContainer = document.getElementById('weekly-checklist-container');

        if (dailyContainer) {
            dailyContainer.innerHTML = createChecklistHTML('daily');
        }
        if (weeklyContainer) {
            weeklyContainer.innerHTML = createChecklistHTML('weekly');
        }
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
        const timeSlotOrder = ['sang', 'chieu', 'toi'];

        timeSlotOrder.forEach(slotKey => {
            const slotConfig = appData.schedule.timeConfig[slotKey];
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
        // Dòng code lỗi đã được xóa khỏi đây
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
        document.getElementById('modal-title').textContent = 'Chỉnh sửa Checklist';

        const dailyTasks = appData.checklist.daily || [];
        const weeklyTasks = appData.checklist.weekly || [];

        modalBody.innerHTML = `
            <div class="p-4 space-y-4">
                <div>
                    <label for="daily-checklist-input" class="font-bold text-lg text-gray-700">✅ Nhiệm vụ hàng ngày</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi nhiệm vụ trên một dòng.</p>
                    <textarea id="daily-checklist-input" class="modal-input h-32">${dailyTasks.map(item => item.text).join('\n')}</textarea>
                </div>
                <div>
                    <label for="weekly-checklist-input" class="font-bold text-lg text-gray-700">📅 Nhiệm vụ hàng tuần</label>
                    <p class="text-xs text-gray-500 mb-2">Mỗi nhiệm vụ trên một dòng.</p>
                    <textarea id="weekly-checklist-input" class="modal-input h-32">${weeklyTasks.map(item => item.text).join('\n')}</textarea>
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

    // ĐOẠN MÃ MỚI để thay thế cho 7 hàm save...Changes cũ

    function saveSubjectChanges() {
        const newSubjects = {};
        document.querySelectorAll('#modal-body [data-subject-key]').forEach(subjectEl => {
            const key = subjectEl.dataset.subjectKey;
            const name = subjectEl.querySelector('.subject-name').value.trim();
            if (!name) return;
            const newKey = key.startsWith('new-') ? name.replace(/\s/g, '') + Date.now().toString().slice(-3) : key;

            newSubjects[newKey] = {
                name: name,
                weeklyHours: parseFloat(subjectEl.querySelector('.subject-hours').value) || 0,
                priority: subjectEl.querySelector('.subject-priority').value,
                emoji: subjectEl.querySelector('.subject-emoji').value,
                notes: subjectEl.querySelector('.subject-notes').value,
            };
        });
        appData.subjects = newSubjects;
        saveAndClose();
    }

    function saveTimeAllocationChanges() {
        appData.config.totalWeeklyHoursTarget = parseFloat(document.getElementById('total-hours-target').value) || 0;
        document.querySelectorAll('.time-alloc-input').forEach(input => {
            const key = input.dataset.subjectKey;
            if (appData.subjects[key]) {
                appData.subjects[key].weeklyHours = parseFloat(input.value) || 0;
            }
        });
        saveAndClose();
    }

    function saveStrategiesChanges() {
        const newStrategies = [];
        document.querySelectorAll('#modal-body [data-strategy-index]').forEach(el => {
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
        saveAndClose();
    }

    function saveChecklistChanges() {
        const dailyText = document.getElementById('daily-checklist-input').value;
        const weeklyText = document.getElementById('weekly-checklist-input').value;

        const createNewList = (newText, oldList = []) => {
            const newItems = newText.split('\n').map(item => item.trim()).filter(Boolean);
            return newItems.map(text => {
                const oldItem = oldList.find(item => item.text === text);
                return { text: text, checked: oldItem ? oldItem.checked : false };
            });
        };

        appData.checklist.daily = createNewList(dailyText, appData.checklist.daily);
        appData.checklist.weekly = createNewList(weeklyText, appData.checklist.weekly);
        saveAndClose();
    }

    function saveDatesChanges() {
        const newStartDate = document.getElementById('start-date-input').value;
        const newGoalDate = document.getElementById('goal-date-input').value;
        if (newStartDate && newGoalDate) {
            appData.config.startDate = newStartDate;
            appData.config.goalDate = newGoalDate;
        }
        saveAndClose();
    }

    function saveGoalChanges() {
        const modal = document.getElementById('edit-modal');
        const selectedGoal = modal.dataset.selectedGoal;
        if (selectedGoal) {
            appData.config.goal = selectedGoal;
        }
        saveAndClose();
    }

    function saveNotesChanges() {
        const deadlinesText = document.getElementById('deadlines-notes').value;
        const resourcesText = document.getElementById('resources-notes').value;
        const tipsText = document.getElementById('tips-notes').value;

        appData.importantNotes.deadlines = deadlinesText.split('\n').map(item => item.trim()).filter(Boolean);
        appData.importantNotes.resources = resourcesText.split('\n').map(item => item.trim()).filter(Boolean);
        appData.importantNotes.tips = tipsText.split('\n').map(item => item.trim()).filter(Boolean);
        saveAndClose();
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
        renderHeaderAndStats();
        renderOtherSections();
        renderTimeAllocationChart();
        attachEventListeners();
        saveDataToFirebase();
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
        renderTimeAllocationChart();
        attachEventListeners();
        saveDataToFirebase();
    }

    function saveChecklistChanges() {
        const dailyText = document.getElementById('daily-checklist-input').value;
        const weeklyText = document.getElementById('weekly-checklist-input').value;

        const createNewList = (newText, oldList = []) => {
            const newItems = newText.split('\n').map(item => item.trim()).filter(Boolean);
            return newItems.map(text => {
                const oldItem = oldList.find(item => item.text === text);
                return { text: text, checked: oldItem ? oldItem.checked : false };
            });
        };

        appData.checklist.daily = createNewList(dailyText, appData.checklist.daily);
        appData.checklist.weekly = createNewList(weeklyText, appData.checklist.weekly);

        closeModal();
        renderOtherSections();
        saveDataToFirebase();
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
        if (!quoteTextEl || !quoteTranslationEl) return;

        quoteTextEl.classList.add('quote-updating');
        quoteTranslationEl.classList.add('quote-updating');

        setTimeout(async () => {
            try {
                const twoHoursInMs = 2 * 60 * 60 * 1000;
                const cachedQuote = JSON.parse(localStorage.getItem('dailyQuote'));

                if (cachedQuote && (Date.now() - cachedQuote.timestamp < twoHoursInMs)) {
                    quoteTextEl.textContent = `"${cachedQuote.text}"`;
                    quoteTranslationEl.textContent = cachedQuote.translation;
                } else {
                    const quoteResponse = await fetch('https://api.quotable.io/random');
                    if (!quoteResponse.ok) throw new Error('Failed to fetch quote');
                    const quoteData = await quoteResponse.json();
                    const englishQuote = quoteData.content;

                    const transResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishQuote)}&langpair=en|vi`);
                    if (!transResponse.ok) throw new Error('Failed to fetch translation');
                    const transData = await transResponse.json();
                    const vietnameseTranslation = transData.responseData.translatedText;

                    quoteTextEl.textContent = `"${englishQuote}"`;
                    quoteTranslationEl.textContent = vietnameseTranslation;

                    localStorage.setItem('dailyQuote', JSON.stringify({
                        timestamp: Date.now(),
                        text: englishQuote,
                        translation: vietnameseTranslation
                    }));
                }

            } catch (error) {
                console.error("Quote fetch error:", error);
                quoteTextEl.textContent = `"The secret to getting ahead is getting started."`;
                quoteTranslationEl.textContent = "Bí quyết để vượt lên phía trước là hãy bắt đầu.";
            } finally {
                quoteTextEl.classList.remove('quote-updating');
                quoteTranslationEl.classList.remove('quote-updating');
            }
        }, 500);
    }


    function attachEventListeners() {
        const helpTriggerBtn = document.getElementById('help-trigger-btn');
        const helpModal = document.getElementById('help-modal');
        const closeHelpBtn = document.getElementById('close-help-modal-btn');
        let helpModalHideTimeout;

        helpTriggerBtn?.addEventListener('click', () => {
            helpModal?.classList.remove('hidden');
        });

        closeHelpBtn?.addEventListener('click', () => {
            helpModal?.classList.add('hidden');
        });

        // Đóng khi nhấp ra ngoài
        helpModal?.addEventListener('click', (e) => {
            if (e.target.id === 'help-modal') {
                helpModal.classList.add('hidden');
            }
        });

        // Tự động đóng khi rời chuột
        helpModal?.addEventListener('mouseleave', () => {
            helpModalHideTimeout = setTimeout(() => {
                helpModal.classList.add('hidden');
            }, 2000);
        });

        // Hủy đóng nếu chuột quay lại
        helpModal?.addEventListener('mouseenter', () => {
            clearTimeout(helpModalHideTimeout);
        });


        const themeMenuContainer = document.getElementById('theme-menu-container');
        const themeOptions = document.getElementById('theme-options');
        let chartMenuHideTimeout;

        themeMenuContainer?.addEventListener('mouseleave', () => {
            chartMenuHideTimeout = setTimeout(() => {
                themeOptions?.classList.remove('visible');
            }, 500);
        });

        themeMenuContainer?.addEventListener('mouseenter', () => {
            clearTimeout(chartMenuHideTimeout);
        });


        document.getElementById('subjects-stat-card')?.addEventListener('click', (e) => { e.preventDefault(); openSubjectsEditModal(); });
        document.getElementById('hours-stat-card')?.addEventListener('click', (e) => { e.preventDefault(); openTimeAllocationModal(); });
        document.getElementById('week-stat-card')?.addEventListener('click', (e) => { e.preventDefault(); openDatesEditModal(); });
        document.getElementById('goal-card')?.addEventListener('click', (e) => { e.preventDefault(); openGoalEditModal(); });

        document.addEventListener('click', (e) => {
            const themeMenu = document.getElementById('theme-options');
            const themeTrigger = document.getElementById('theme-menu-trigger');
            if (themeMenu && themeTrigger && !e.target.closest('#theme-menu-container')) {
                themeMenu.classList.remove('visible');
            }
        });

        const modal = document.getElementById('edit-modal');
        modal.addEventListener('click', function (e) {
            if (e.target.id === 'edit-modal') {
                closeModal();
                return;
            }

            if (e.target.id === 'close-modal-btn' || e.target.id === 'cancel-btn') {
                closeModal();
                return;
            }

            if (e.target.id === 'add-slot-activity-btn') {
                const container = document.getElementById('slot-activities-container');
                if (container) {
                    const newIndex = container.children.length;
                    const newFormHTML = createActivityFormHTML({}, newIndex);
                    container.insertAdjacentHTML('beforeend', newFormHTML);
                }
                return;
            }

            const deleteSlotBtn = e.target.closest('.delete-slot-activity-btn');
            if (deleteSlotBtn) {
                deleteSlotBtn.closest('.slot-activity-form-group').remove();
                return;
            }

            if (e.target.id === 'save-btn') {
                switch (currentEditingContext) {
                    case 'goal': saveGoalChanges(); break;
                    case 'dates': saveDatesChanges(); break;
                    case 'slot': saveSlotChanges(); break;
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

            if (e.target.matches('.delete-activity-btn, .delete-subject-btn, .delete-item-btn')) {
                e.target.closest('[data-activity-index], [data-subject-key], [data-strategy-index]').remove();
            }

            if (e.target.matches('.emoji-picker span')) {
                const input = e.target.closest('.flex.items-center.gap-2').querySelector('.strategy-emoji');
                if (input) input.value = e.target.textContent;
            }
        });
        // === KẾT THÚC NÂNG CẤP: Logic cho Bảng Chỉnh Sửa Chính ===

        modal.addEventListener('input', function (e) {
            if (e.target.matches('.time-alloc-input, #total-hours-target')) {
                let totalAllocated = 0;
                document.querySelectorAll('.time-alloc-input').forEach(input => { totalAllocated += parseFloat(input.value) || 0; });
                const totalTarget = document.getElementById('total-hours-target').value;
                document.getElementById('total-allocated-display').textContent = `${totalAllocated.toFixed(1)}h / ${totalTarget}h`;
            }
        });

        // Các listener còn lại
        setTimeout(() => { document.querySelectorAll('.progress-fill').forEach(fill => { fill.style.width = fill.getAttribute('data-width'); }); }, 300);
        document.body.removeEventListener('click', handleBodyClick);
        document.body.addEventListener('click', handleBodyClick);
        document.body.removeEventListener('change', handleChecklistChange);
        document.body.addEventListener('change', handleChecklistChange);
    }


    function handleBodyClick(e) {
        if (e.target.closest('#reset-main-schedule-btn')) {
            if (confirm('⚠️ Bạn có chắc muốn xóa TOÀN BỘ lịch trình trong bảng này không? Hành động này không thể hoàn tác.')) {
                Object.keys(appData.schedule.dayData).forEach(dayKey => {
                    appData.schedule.dayData[dayKey] = {};
                });
                saveAndClose();
            }
            return;
        }


        if (e.target.closest('#subjects-stat-card')) { e.preventDefault(); openSubjectsEditModal(); }
        if (e.target.closest('#hours-stat-card')) { e.preventDefault(); openTimeAllocationModal(); }
        if (e.target.closest('#week-stat-card')) { e.preventDefault(); openDatesEditModal(); }
        if (e.target.closest('#goal-card')) { e.preventDefault(); openGoalEditModal(); }
        if (e.target.closest('#user-profile-container')) { openProfileEditModal(); }

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
            return;
        }

        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const modalType = editBtn.dataset.modal;
            if (modalType === 'strategies') openStrategiesEditModal();
            if (modalType === 'checklist') openChecklistEditModal();
            if (modalType === 'notes') openNotesEditModal();
        }

        // === BẮT ĐẦU PHẦN BỔ SUNG ===
        // Thêm lại logic cho nút edit của từng ngày trong bảng chi tiết
        const editDayBtn = e.target.closest('.edit-day-btn');
        if (editDayBtn) {
            const dayKey = editDayBtn.dataset.dayKey;
            openEditModal(dayKey); // <-- Gọi hàm openEditModal ở đây
        }
        // === KẾT THÚC PHẦN BỔ SUNG ===

        const scheduleCell = e.target.closest('.schedule-cell');
        if (scheduleCell) {
            const dayKey = scheduleCell.dataset.dayKey;
            const slotKey = scheduleCell.dataset.slotKey;
            if (dayKey && slotKey) {
                openSlotEditModal(dayKey, slotKey);
            }
        }

        const editDayCardBtn = e.target.closest('.edit-day-card-btn');
        if (editDayCardBtn) {
            openDetailedDayModal(editDayCardBtn.dataset.dayKey);
        }

        const collapseBtn = e.target.closest('#collapse-detailed-schedule-btn');
        if (collapseBtn) {
            const scheduleSection = document.getElementById('schedule-section');
            const detailedContainer = document.getElementById('detailed-schedule-container');
            const toggleBtn = document.getElementById('toggle-detailed-schedule');

            if (toggleBtn) {
                toggleBtn.classList.remove('toggled');
                toggleBtn.innerHTML = '+';
            }
            if (detailedContainer) {
                detailedContainer.classList.remove('expanded');
            }

            scheduleSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const toggleBtn = e.target.closest('#toggle-detailed-schedule');
        if (toggleBtn) {
            const container = document.getElementById('detailed-schedule-container');
            const isExpanding = !container.classList.contains('expanded');
            toggleBtn.classList.toggle('toggled');

            if (isExpanding) {
                toggleBtn.innerHTML = '&times;';
                container.classList.add('expanded');
                renderDetailedScheduleContent();
                setTimeout(() => {
                    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 200);
            } else {
                toggleBtn.innerHTML = '+';
                container.classList.remove('expanded');
            }
        }
    }

    function handleChecklistChange(e) {
        if (e.target.classList.contains('checklist-checkbox')) {
            const category = e.target.dataset.category;
            const text = e.target.dataset.text;
            const item = appData.checklist[category]?.find(i => i.text === text);
            if (item) {
                item.checked = e.target.checked;
                saveDataToFirebase();
                renderChecklists();
            }
        }
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
        renderTimeAllocationChart();
        attachEventListeners();
        saveDataToFirebase();
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

        if (!detailedContainer.classList.contains('expanded')) {
            detailedContainer.innerHTML = '';
            return;
        }

        const detailedCardsHTML = DAYS_CONFIG.map(({ key, name }) => {
            const activities = appData.detailedSchedule[key] || [];
            const activitiesHTML = activities.length > 0
                ? activities.map(act => `
                    <li class="flex items-start">
                        <span class="time">${act.time}</span>
                        <span class="activity flex-1">${act.activity}</span>
                        <span class="category-pill category-${act.category.toLowerCase().replace(/ /g, '-')}">${act.category}</span>
                    </li>`).join('')
                : '<li><p class="text-xs text-gray-500 italic p-2">Chưa có lịch trình chi tiết.</p></li>';

            return `
                <div class="day-card">
                    <div class="flex justify-between items-center mb-3 pb-3 border-b border-white/20">
                        <h4 class="heading-font text-lg font-bold text-purple-700">${name}</h4>
                        <button class="edit-day-card-btn text-sm" data-day-key="${key}" title="Chỉnh sửa chi tiết">✏️</button>
                    </div>
                    <ul class="day-schedule-list space-y-2">${activitiesHTML}</ul>
                </div>`;
        }).join('');

        const controlsHTML = `
            <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center mt-4 flex justify-center items-center gap-4">
                <button id="reset-detailed-schedule-btn" class="p-2 rounded-full text-red-500 hover:bg-red-100 transition" title="Reset toàn bộ lịch trình chi tiết">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186A7.002 7.002 0 0112 15.052a1 1 0 11-1.414 1.414A9.002 9.002 0 0019 9a9.002 9.002 0 00-8-8.947V2a1 1 0 01-1-1z" clip-rule="evenodd" />
                        <path d="M4.053 7.053A1 1 0 014 6a1 1 0 011-1h2.053a1 1 0 110 2H5a1 1 0 01-.947-.646z" />
                    </svg>
                </button>
                <button id="collapse-detailed-schedule-btn" class="px-4 py-2 bg-white/60 text-purple-700 font-semibold rounded-lg hover:bg-white/90 transition-all duration-300 shadow-md flex items-center gap-2 mx-auto backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
                    Thu Gọn
                </button>
            </div>
        `;

        detailedContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:col-span-3 gap-4 expanded';
        detailedContainer.innerHTML = detailedCardsHTML + controlsHTML;
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
        saveDataToFirebase();
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

    function openGoalEditModal() {
        currentEditingContext = 'goal';
        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = 'Chọn Mục Tiêu Học Tập';

        const goals = ['A+', 'A', 'B+', 'B', 'C+', 'C'];
        const currentGoal = appData.config.goal || 'A+';

        modalBody.innerHTML = `
            <div class="p-4">
                <p class="text-center opacity-80 mb-6">Hãy chọn mục tiêu bạn muốn hướng tới trong kỳ học này.</p>
                <div class="grid grid-cols-3 gap-4 text-center">
                    ${goals.map(goal => `
                        <button 
                            class="goal-option-btn p-4 rounded-lg text-2xl font-bold border-2 transition 
                            ${currentGoal === goal
                ? 'bg-indigo-600 text-white border-transparent'
                : 'bg-gray-100 hover:bg-gray-200 border-gray-200'}"
                            data-goal="${goal}"
                        >
                            ${goal}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.querySelectorAll('.goal-option-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.goal-option-btn').forEach(btn => {
                    btn.className = btn.className.replace('bg-indigo-600 text-white border-transparent', 'bg-gray-100 hover:bg-gray-200 border-gray-200');
                });
                button.className = button.className.replace('bg-gray-100 hover:bg-gray-200 border-gray-200', 'bg-indigo-600 text-white border-transparent');
                modal.dataset.selectedGoal = button.dataset.goal;
            });
        });
    }

    function saveGoalChanges() {
        const modal = document.getElementById('edit-modal');
        const selectedGoal = modal.dataset.selectedGoal;

        if (selectedGoal) {
            appData.config.goal = selectedGoal;
            saveDataToFirebase();
            renderHeaderAndStats();
        }
        closeModal();
    }

    function openModal(context, title, content) {
        currentEditingContext = context;
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('edit-modal').classList.remove('hidden');
    }
    function closeModal() { document.getElementById('edit-modal').classList.add('hidden'); }

    function openProfileEditModal() {
        const { displayName, photoURL } = appData.userProfile;
        const modalContent = `
            <div class="flex flex-col items-center">
                <img id="avatar-preview" src="${photoURL}" alt="Avatar preview">
                <div class="avatar-upload-container">
                    <label for="avatar-upload-input" class="avatar-upload-label">Chọn ảnh mới</label>
                    <input type="file" id="avatar-upload-input" accept="image/*">
                </div>
            </div>
            <div class="mt-4">
                <label class="font-semibold text-sm">Tên hiển thị</label>
                <input type="text" id="displayNameInput" value="${displayName}" class="modal-input mt-1">
            </div>
        `;

        openModal('profile', 'Chỉnh sửa thông tin', modalContent);

        // Thêm event listener để xem trước ảnh
        const fileInput = document.getElementById('avatar-upload-input');
        const preview = document.getElementById('avatar-preview');
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async function saveProfileChanges() {
        const user = auth.currentUser;
        if (!user) {
            alert("Bạn cần đăng nhập để thực hiện việc này.");
            return;
        }

        appData.userProfile.displayName = document.getElementById('displayNameInput').value;
        const fileInput = document.getElementById('avatar-upload-input');
        const file = fileInput.files[0];

        if (file) {
            try {
                // --- BẮT ĐẦU TỐI ƯU HÓA ---
                // 1. Thay vì tải file gốc, chúng ta sẽ resize nó
                const resizedFile = await resizeImage(file, 256, 256, 0.9); // Resize thành ảnh 256x256, chất lượng 90%

                console.log("Đang tải ảnh đã tối ưu hóa...");
                const storageRef = ref(storage, `avatars/${user.uid}/avatar.jpg`); // Dùng tên cố định để ghi đè ảnh cũ

                // 2. Tải file đã được resize lên
                const snapshot = await uploadBytes(storageRef, resizedFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                appData.userProfile.photoURL = downloadURL;
                console.log("Tải ảnh thành công!");
                // --- KẾT THÚC TỐI ƯU HÓA ---

            } catch (error) {
                console.error("Lỗi khi xử lý ảnh:", error);
                alert("Đã xảy ra lỗi khi tải ảnh lên. Vui lòng thử lại.");
                return;
            }
        }

        renderHeaderAndStats(); // Cập nhật avatar trên giao diện ngay lập tức
        saveAndClose();
    }

    function resizeImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }


    function saveAndClose() {
        saveDataToFirebase();
        closeModal();
        renderAll(); // Render lại toàn bộ để đảm bảo tính nhất quán
    }



    function spawnCuteAnimals() {
        const animals = ['🐰', '🦊', '🐻', '🐼', '🐸', '🐿️', '🦔', '🐥', '🦄'];
        const runway = document.querySelector('.animal-runway');
        if (!runway) return;

        // Tạo ngẫu nhiên từ 2 đến 4 con vật mỗi lần load
        const numberOfAnimals = Math.floor(Math.random() * 3) + 2;

        for (let i = 0; i < numberOfAnimals; i++) {
            const animalElement = document.createElement('div');
            animalElement.classList.add('cute-animal');

            // Chọn ngẫu nhiên một con vật trong danh sách
            animalElement.textContent = animals[Math.floor(Math.random() * animals.length)];

            // Phân bổ vị trí ngẫu nhiên trên mặt đất
            animalElement.style.left = `${Math.random() * 70 + 15}%`; // Vị trí từ 15% -> 85%

            // Tạo sự khác biệt trong animation để chúng không nhảy đồng đều
            animalElement.style.animationDelay = `${Math.random() * 1.5}s`;
            animalElement.style.animationDuration = `${(Math.random() * 0.5 + 1.2).toFixed(2)}s`;

            runway.appendChild(animalElement);
        }
    }

    spawnCuteAnimals();


    function setupOnlineClock() {
        const hoursEl = document.getElementById('clock-hours');
        const minutesEl = document.getElementById('clock-minutes');
        const secondsEl = document.getElementById('clock-seconds');

        if (!hoursEl) return;

        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            hoursEl.textContent = hours;
            minutesEl.textContent = minutes;
            secondsEl.textContent = seconds;
        }

        setInterval(updateClock, 1000);
        updateClock();
    }



    function setupThemeControls() {
        const themeTrigger = document.getElementById('theme-settings-trigger');
        const themePanel = document.getElementById('theme-settings-panel');
        const themeChoices = document.querySelector('.theme-choices');
        const themeResetBtn = document.getElementById('theme-reset-btn');
        let panelHideTimeout; // Biến để quản lý độ trễ

        function applyBackground(theme) {
            if (theme) {
                document.body.classList.remove('day-bg', 'sunset-bg', 'night-bg');
                document.body.classList.add(`${theme}-bg`);
                document.querySelectorAll('.theme-choice-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.theme === theme);
                });
            } else {
                setDynamicBackground();
                document.querySelectorAll('.theme-choice-btn').forEach(btn => btn.classList.remove('active'));
            }
        }

        function loadSettings() {
            const savedTheme = localStorage.getItem('manualTheme');
            applyBackground(savedTheme);
        }

        // --- BẮT ĐẦU PHẦN SỬA LỖI ---
        // Chỉ giữ lại MỘT lần gán sự kiện click
        themeTrigger?.addEventListener('click', () => {
            themePanel?.classList.toggle('visible');
        });

        // Tự động đóng khi chuột rời khỏi bảng (giảm thời gian chờ xuống 500ms cho mượt hơn)
        themePanel?.addEventListener('mouseleave', () => {
            panelHideTimeout = setTimeout(() => {
                themePanel.classList.remove('visible');
            }, 500);
        });

        // Nếu chuột quay lại bảng, hủy việc đóng
        themePanel?.addEventListener('mouseenter', () => {
            clearTimeout(panelHideTimeout);
        });

        // Đóng bảng khi nhấp chuột ra ngoài
        document.addEventListener('click', (e) => {
            if (themePanel?.classList.contains('visible') && !themePanel.contains(e.target) && !themeTrigger.contains(e.target)) {
                themePanel.classList.remove('visible');
            }
        });

        // *** ĐÃ XÓA ĐOẠN GÁN SỰ KIỆN BỊ LẶP LẠI Ở ĐÂY ***
        // --- KẾT THÚC PHẦN SỬA LỖI ---

        if (themeChoices) {
            themeChoices.addEventListener('click', (e) => {
                const button = e.target.closest('.theme-choice-btn');
                if (button) {
                    const selectedTheme = button.dataset.theme;
                    localStorage.setItem('manualTheme', selectedTheme);
                    applyBackground(selectedTheme);
                }
            });
        }

        if (themeResetBtn) {
            themeResetBtn.addEventListener('click', () => {
                localStorage.removeItem('manualTheme');
                loadSettings();
            });
        }

        loadSettings();
    }

    function openSlotEditModal(dayKey, slotKey) {
        currentEditingDayKey = dayKey;
        currentEditingSlotKey = slotKey;
        currentEditingContext = 'slot';

        const modal = document.getElementById('edit-modal');
        const modalBody = document.getElementById('modal-body');
        const dayName = DAYS_CONFIG.find(d => d.key === dayKey).name;
        const slotName = appData.schedule.timeConfig[slotKey].name;

        document.getElementById('modal-title').textContent = `Chỉnh sửa: ${slotName} - ${dayName}`;

        const activities = (appData.schedule.dayData[dayKey] && appData.schedule.dayData[dayKey][slotKey]) || [];
        let activitiesHTML = '';

        if (activities.length > 0) {
            activitiesHTML = activities.map((act, index) => createActivityFormHTML(act, index)).join('');
        } else {
            activitiesHTML = createActivityFormHTML({}, 0);
        }

        modalBody.innerHTML = `
            <div id="slot-activities-container" class="space-y-0 max-h-[60vh] overflow-y-auto pr-2">
                ${activitiesHTML}
            </div>
            <div class="mt-4">
                <button id="add-slot-activity-btn" class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-semibold">＋ Thêm hoạt động</button>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    function saveSlotChanges() {
        if (!currentEditingDayKey || !currentEditingSlotKey) return;

        const newActivities = [];
        // Lấy tất cả các form hoạt động có trong modal
        const formGroups = document.querySelectorAll('.slot-activity-form-group');

        formGroups.forEach(group => {
            const activityType = group.querySelector('.activity-type').value;
            const notes = group.querySelector('.activity-notes').value.trim();
            const subjects = Array.from(group.querySelectorAll('.subject-select'))
                .map(select => select.value)
                .filter(Boolean); // Lọc bỏ các giá trị rỗng

            // Chỉ lưu hoạt động nếu nó có nội dung
            if (activityType !== 'break' || subjects.length > 0 || notes !== '') {
                newActivities.push({
                    type: activityType,
                    subjects: subjects,
                    notes: notes
                });
            }
        });

        if (!appData.schedule.dayData[currentEditingDayKey]) {
            appData.schedule.dayData[currentEditingDayKey] = {};
        }
        // Ghi đè mảng hoạt động cũ bằng mảng mới
        appData.schedule.dayData[currentEditingDayKey][currentEditingSlotKey] = newActivities;

        closeModal();
        renderSchedule();
        saveDataToFirebase();
    }

    function createActivityFormHTML(activity = { type: 'break', subjects: [], notes: '' }, index = 0) {
        const subjectOptions = Object.entries(appData.subjects).map(([key, value]) => `<option value="${key}">${value.name}</option>`).join('');
        const activityOptions = Object.entries(activityTypes).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');

        // Tạo các ô chọn môn học và chọn sẵn giá trị (nếu có)
        let subjectSelectors = '';
        for (let i = 0; i < 4; i++) {
            const selectedSub = (activity.subjects && activity.subjects[i]) ? activity.subjects[i] : '';
            subjectSelectors += `<select class="modal-select subject-select"><option value="">-- Chọn môn ${i + 1} --</option>${subjectOptions.replace(`value="${selectedSub}"`, `value="${selectedSub}" selected`)}</select>`;
        }

        // Trả về mã HTML cho form
        return `
            <div class="slot-activity-form-group p-4 border rounded-lg bg-white/50 space-y-3 relative mt-4 first:mt-0" data-index="${index}">
                <button class="delete-slot-activity-btn absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold" title="Xóa hoạt động này">&times;</button>
                <div>
                    <label class="font-semibold text-sm">Hoạt động</label>
                    <select class="modal-select activity-type">${activityOptions.replace(`value="${activity.type}"`, `value="${activity.type}" selected`)}</select>
                </div>
                <div>
                    <label class="font-semibold text-sm">Các môn học (nếu có)</label>
                    <div class="grid grid-cols-2 gap-2 mt-1">${subjectSelectors}</div>
                </div>
                <div>
                    <label class="font-semibold text-sm">Ghi chú</label>
                    <input type="text" value="${activity.notes || ''}" class="modal-input activity-notes">
                </div>
            </div>
        `;
    }

    function renderFooter() {
        const footer = document.querySelector('footer');
        if (!footer) return;

        const motivationalQuote = `<p class="text-gray-600 mb-2">💪 <strong>Remember:</strong> Consistency beats intensity. Mỗi ngày một chút, đến cuối kỳ sẽ thấy kỳ tích!</p>`;

        const authorInfoHTML = `
            <div class="mt-4 border-t border-white/20 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="text-sm text-gray-500 text-center sm:text-left">
                    <p class="font-bold">Made with ❤️ by Phạm Văn Minh</p>
                    <p>ET1-05 K68 HUST</p>
                </div>
                <div class="flex items-center gap-5 text-gray-600">
                    <a href="mailto:minhkaiyo@gmail.com" target="_blank" title="Email" class="hover:text-purple-600 transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/></svg>
                    </a>
                    <a href="https://www.facebook.com/btieuthuan1607" target="_blank" title="Facebook" class="hover:text-purple-600 transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v2.385z"/></svg>
                    </a>
                    <a href="https://www.tiktok.com/@tieuthuan1607" target="_blank" title="TikTok" class="hover:text-purple-600 transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.86-.95-6.69-2.81-1.77-1.77-2.69-4.14-2.5-6.6.13-1.61.69-3.16 1.6-4.48 1.08-1.55 2.68-2.68 4.39-3.23.01-.01.01-.02.02-.02.01-3.48.01-6.97.02-10.45Z"/></svg>
                    </a>
                </div>
            </div>
        `;

        footer.innerHTML = motivationalQuote + authorInfoHTML;
    }

    function setupQuoteRotator() {
        fetchAndDisplayQuote();

        const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
        setInterval(fetchAndDisplayQuote, TEN_MINUTES_IN_MS);
    }




    // ============================================================
    // ==== BẮT ĐẦU KHỐI CODE CHO TRỢ LÝ HỌC TẬP AI ====
    // ============================================================
    function mergeDeep(target, source) {
        const isObject = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);

        // Kiểm tra xem AI có yêu cầu "nối thêm" vào mảng không
        const isAppendAction = source._mergeAction === 'append';

        Object.keys(source).forEach(key => {
            // Bỏ qua key đặc biệt dùng để chỉ dẫn
            if (key === '_mergeAction') return;

            const targetValue = target[key];
            const sourceValue = source[key];

            if (isAppendAction && Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                // HÀNH ĐỘNG MỚI: Nối mảng source vào mảng target
                target[key] = targetValue.concat(sourceValue);
            } else if (isObject(targetValue) && isObject(sourceValue)) {
                // Xử lý việc xóa một key (khi AI trả về null)
                if (sourceValue === null) {
                    delete target[key];
                } else {
                    target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
                }
            } else {
                // Xử lý việc xóa một key hoặc ghi đè giá trị
                if (sourceValue === null) {
                    delete target[key];
                } else {
                    target[key] = sourceValue;
                }
            }
        });

        return target;
    }
    function createSlimAppDataForAI(fullData) {
        const slimData = {
            config: fullData.config, // Giữ nguyên config
            subjects: {}, // Sẽ rút gọn bên dưới
            schedule: fullData.schedule,
            detailedSchedule: fullData.detailedSchedule,
            studyStrategies: fullData.studyStrategies,
            checklist: fullData.checklist,
            importantNotes: fullData.importantNotes,
        };

        // Chỉ lấy những thông tin cần thiết của mỗi môn học để giảm độ dài
        for (const key in fullData.subjects) {
            const subject = fullData.subjects[key];
            slimData.subjects[key] = {
                name: subject.name,
                weeklyHours: subject.weeklyHours,
                priority: subject.priority
            };
        }
        return slimData;
    }

    async function getAIPlan(userMessage, previousAttemptFailed = false) {
        const API_KEY = 'AIzaSyCX3DyUyMXH27V89LNIY4Z8Vx3S9-XJGgs';
        const MODEL_NAME = 'gemini-2.5-flash';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

        try {
            const slimDataForAI = createSlimAppDataForAI(appData);
            const retryInstruction = previousAttemptFailed ? "Lưu ý: Đề xuất trước đó không được chấp nhận." : "";

            const prompt = `
            Tên của bạn là MyMee, do người tên Văn Minh cố gắng tích hợp vào trong web này. Bạn là một trợ lý AI siêu thông minh, là bộ não của ứng dụng "Excellence Planner".
            **Nhiệm vụ:**
            Phân tích yêu cầu của người dùng và trả về một đối tượng JSON để cập nhật dữ liệu. Bạn có thể chỉnh sửa thông tin trong web bất kì mục nào theo yêu cầu của người dùng.
            - Để **THAY THẾ** một giá trị hoặc một danh sách, chỉ cần trả về giá trị mới.
            - Để **THÊM** vào một danh sách (checklist, deadlines, resources, tips, studyStrategies), hãy thêm key đặc biệt "_mergeAction": "append" vào đối tượng chứa danh sách đó.
            - Để **XÓA** một mục, hãy trả về giá trị 'null' cho key của nó.

            **Cấu trúc dữ liệu của người dùng:**
            ${JSON.stringify(slimDataForAI)}

            **Yêu cầu của người dùng:**
            "${userMessage}"
            ${retryInstruction}

            --- CÁC VÍ DỤ ---
            **Ví dụ 1 (Thay thế hoạt động):**
            - Yêu cầu: "Đặt lịch học Xác suất thống kê vào sáng thứ 3" (key: 'XSTK123')
            - JSON: { "schedule": { "dayData": { "T3": { "sang": [{ "type": "class", "subjects": ["XSTK123"] }] } } } }

            **Ví dụ 2 (THÊM vào checklist):**
            - Yêu cầu: "Thêm nhiệm vụ 'đọc sách' vào checklist hàng ngày"
            - JSON: { "checklist": { "_mergeAction": "append", "daily": [{ "text": "đọc sách", "checked": false }] } }

            **Ví dụ 3 (XÓA môn học):**
            - Yêu cầu: "Xóa môn Triết học" (key: 'TrietHoc456')
            - JSON: { "subjects": { "TrietHoc456": null } }
            --- KẾT THÚC VÍ DỤ ---

            **JSON kết quả:**
        `;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error?.message || 'Lỗi API.');
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Phản hồi từ AI không hợp lệ.');

            const aiResponseText = data.candidates[0].content.parts[0].text;
            const cleanedJsonString = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanedJsonString);

        } catch (error) {
            console.error("Lỗi khi gọi AI:", error);
            alert("Trợ lý AI đang gặp sự cố. Chi tiết: " + error.message);
            return null;
        }
    }


    async function getAIChatResponse(userMessage, chatHistory = [], memory = {}) {
        const API_KEY = 'AIzaSyCX3DyUyMXH27V89LNIY4Z8Vx3S9-XJGgs';
        const MODEL_NAME = 'gemini-2.5-flash';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

        const system_context = `
        BỐI CẢNH HỆ THỐNG: 
        - Tên của bạn là MyMee, mặc định bạn sẽ cư xử như 1 người con gái, do người tên Văn Minh(con trai) cố gắng tích hợp vào web này.bạn là một trợ lý AI, được tích hợp trong ứng dụng "Excellence Planner".
        - Chức năng chính của bạn là giúp người dùng (sinh viên) lập kế hoạch và quản lý việc học.
        - Hãy luôn trả lời với tư cách là MyMee, một người bạn đồng hành học tập thông minh và thân thiện.
        - Mặc định sẽ xưng hô là "mình- bạn", còn nếu người dùng muốn thay đổi xưng hô như nào thì hãy làm theo người dùng.
        - Hãy giao tiếp như 1 người thân thiết với người dùng, dùng các ngôn ngữ genZ tạo cảm hứng, vui nhộn nhưng cũng chuẩn mực.
        - Nếu có người hỏi bạn những câu hỏi phản cảm, không đúng tiêu chuẩn đạo đức thì bạn hãy phản hồi là: "Xin lỗi, yêu cầu bạn xem xét lại ý thức của bạn"
        - Nếu có người muốn nhắn nội dung 18+ thì bạn trả lời là nội dung không hợp lệ
    `;

        const memoryContext = `Đây là một vài điều tôi biết về người dùng: ${[...memory.facts, ...memory.preferences].join('. ')}.`;

        const contents = [];
        contents.push({ role: 'user', parts: [{ text: system_context }] });
        contents.push({ role: 'model', parts: [{ text: "Đã hiểu. Tên tôi là Kai, trợ lý AI của Excellence Planner." }] });

        if (memory.facts.length > 0 || memory.preferences.length > 0) {
            contents.push({ role: 'user', parts: [{ text: memoryContext }] });
            contents.push({ role: 'model', parts: [{ text: "Tôi sẽ ghi nhớ những điều này." }] });
        }

        chatHistory.forEach(entry => {
            contents.push({
                role: entry.sender === 'user' ? 'user' : 'model',
                parts: [{ text: entry.text }]
            });
        });
        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: contents })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Lỗi API.');
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Lỗi khi gọi AI Chat:", error);
            return "Xin lỗi, tôi đang gặp sự cố nhỏ.";
        }
    }

    async function detectUserIntent(userMessage) {
        const API_KEY = 'AIzaSyCX3DyUyMXH27V89LNIY4Z8Vx3S9-XJGgs';
        const MODEL_NAME = 'gemini-2.5-flash';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

        const prompt = `
        Phân tích yêu cầu của người dùng và trả về MỘT từ duy nhất: "command" nếu người dùng muốn thay đổi, thêm, xóa, hoặc lên kế hoạch dữ liệu (như lịch học, checklist, mục tiêu). Nếu không, trả về "chat".

        Ví dụ:
        - "xóa lịch học sáng mai" -> command
        - "thêm môn toán vào thứ 3" -> command
        - "hôm nay bạn thế nào?" -> chat
        - "gợi ý cho tôi một cuốn sách hay" -> chat
        - "đặt mục tiêu của tôi là loại A+" -> command
        - "chào bạn" -> chat

        Yêu cầu của người dùng: "${userMessage}"
        Kết quả:
    `;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            const result = data.candidates[0].content.parts[0].text.trim().toLowerCase();
            return result.includes('command') ? 'command' : 'chat';
        } catch (error) {
            console.error("Lỗi khi phân biệt ý định:", error);
            return 'chat'; // Mặc định là chat nếu có lỗi
        }
    }

    async function extractMemoryFromChat(userMessage) {
        const API_KEY = 'AIzaSyCX3DyUyMXH27V89LNIY4Z8Vx3S9-XJGgs';
        const MODEL_NAME = 'gemini-2.5-flash';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

        const prompt = `
        Phân tích câu nói của người dùng. Nếu nó chứa thông tin cá nhân (tên, tuổi, trường lớp), sở thích, hoặc một sự thật cụ thể về bản thân họ, hãy tóm tắt nó thành một câu ngắn gọn. Nếu không có gì đáng nhớ, trả về "null".

        Ví dụ:
        - "tên của mình là Minh, mình học ở đại học Bách Khoa" -> "Tên người dùng là Minh, học tại Đại học Bách Khoa."
        - "mình rất thích học môn toán vào buổi sáng" -> "Người dùng thích học môn Toán vào buổi sáng."
        - "chào bạn, hôm nay thế nào?" -> null
        - "hãy lên lịch học cho tôi" -> null

        Câu nói của người dùng: "${userMessage}"
        Tóm tắt (hoặc null):
    `;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            const result = data.candidates[0].content.parts[0].text.trim();

            return result.toLowerCase() === 'null' ? null : result;

        } catch (error) {
            console.error("Lỗi khi trích xuất ký ức:", error);
            return null;
        }
    }

    function showFeedbackBar(message, userMessage) {
        const bar = document.getElementById('ai-feedback-bar');
        const likeBtn = document.getElementById('ai-like-btn');
        const dislikeBtn = document.getElementById('ai-dislike-btn');

        document.getElementById('ai-feedback-message').textContent = message;
        bar.classList.remove('hidden');

        // Gỡ bỏ listener cũ để tránh gọi nhiều lần
        const newLikeBtn = likeBtn.cloneNode(true);
        likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);

        const newDislikeBtn = dislikeBtn.cloneNode(true);
        dislikeBtn.parentNode.replaceChild(newDislikeBtn, dislikeBtn);

        newLikeBtn.onclick = () => {
            saveDataToFirebase();
            originalAppDataState = null;
            bar.classList.add('hidden');
            // Cập nhật tin nhắn trong chatbox
            addMessageToChatbox("Tuyệt vời! Kế hoạch đã được lưu.", "ai");
        };

        newDislikeBtn.onclick = async () => {
            if (originalAppDataState) {
                appData = originalAppDataState; // Hoàn tác thay đổi
                originalAppDataState = null;
                renderAll();
            }
            bar.classList.add('hidden');
            addMessageToChatbox("Rất tiếc, tôi sẽ thử lại một phương án khác.", "ai");

            document.getElementById('loading-overlay').style.display = 'flex';
            document.getElementById('loading-text').textContent = 'AI đang suy nghĩ lại...';

            const aiSuggestedChanges = await getAIPlan(userMessage, true);

            document.getElementById('loading-overlay').style.display = 'none';

            if (aiSuggestedChanges) {
                originalAppDataState = JSON.parse(JSON.stringify(appData));
                appData = mergeDeep(appData, aiSuggestedChanges);
                renderAll();
                showFeedbackBar("Đây là phương án khác. Bạn thấy sao?", userMessage);
            }
        };
    }

    function setupAIChat() {
        const trigger = document.getElementById('ai-chat-trigger');
        const windowEl = document.getElementById('ai-chat-window');
        const input = document.getElementById('ai-chat-input');
        const messagesContainer = document.getElementById('ai-chat-messages');
        let chatHistory = [];
        let isAITyping = false; // Biến cờ để ngăn người dùng gửi tin nhắn khi AI đang gõ

        if (!trigger || !windowEl || !input || !messagesContainer) {
            console.error("Lỗi: Không tìm thấy các thành phần của chat widget.");
            return;
        }

        trigger.addEventListener('click', () => {
            windowEl.classList.toggle('hidden');
            if (!windowEl.classList.contains('hidden')) input.focus();
        });

        // HÀM HIỂN THỊ TIN NHẮN (ĐÃ NÂNG CẤP VỚI HIỆU ỨNG GÕ CHỮ)
        function addMessageToChatbox(text, sender, animate = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${sender}-message`;
            messagesContainer.appendChild(messageDiv);

            if (animate && sender === 'ai') {
                isAITyping = true; // Bắt đầu gõ
                input.disabled = true; // Vô hiệu hóa ô nhập liệu
                messageDiv.textContent = '';
                let i = 0;
                const typingSpeed = 30; // Tốc độ gõ (ms/ký tự), bạn có thể điều chỉnh

                const typingInterval = setInterval(() => {
                    if (i < text.length) {
                        messageDiv.textContent += text.charAt(i);
                        i++;
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    } else {
                        clearInterval(typingInterval);
                        isAITyping = false; // Kết thúc gõ
                        input.disabled = false; // Bật lại ô nhập liệu
                        input.focus();
                    }
                }, typingSpeed);
            } else {
                messageDiv.textContent = text;
            }

            if (sender !== 'ai-typing') {
                chatHistory.push({ text, sender });
                if (chatHistory.length > 6) chatHistory.shift();
            }
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // HÀM XỬ LÝ CHÍNH KHI GỬI TIN NHẮN
        async function handleSendMessage() {
            if (isAITyping) return; // Nếu AI đang gõ, không cho gửi

            const userMessage = input.value.trim();
            if (userMessage === '') return;

            addMessageToChatbox(userMessage, "user");
            input.value = '';

            // Bước 1: Phân biệt ý định
            const intent = await detectUserIntent(userMessage);

            // Bước 2: Hành động dựa trên ý định
            if (intent === 'command') {
                addMessageToChatbox("Đang xử lý yêu cầu...", "ai");
                const aiSuggestedChanges = await getAIPlan(userMessage);
                // Xóa tin nhắn "Đang xử lý..."
                messagesContainer.removeChild(messagesContainer.lastChild);

                if (aiSuggestedChanges) {
                    originalAppDataState = JSON.parse(JSON.stringify(appData));
                    appData = mergeDeep(appData, aiSuggestedChanges);
                    renderAll();
                    showFeedbackBar("AI đã cập nhật kế hoạch. Bạn thấy sao?", userMessage);
                    windowEl.classList.add('hidden');
                    saveDataToFirebase();
                } else {
                    addMessageToChatbox("Rất tiếc, đã có lỗi khi xử lý lệnh của bạn.", "ai", true);
                }
            } else {
                // Nếu là trò chuyện
                const memoryToSave = await extractMemoryFromChat(userMessage);
                if (memoryToSave) {
                    if (!appData.aiMemory.facts.includes(memoryToSave)) {
                        appData.aiMemory.facts.push(memoryToSave);
                        saveDataToFirebase();
                    }
                }

                // Bước 3: Hiển thị câu trả lời của AI với hiệu ứng gõ chữ
                const aiResponse = await getAIChatResponse(userMessage, chatHistory, appData.aiMemory);
                addMessageToChatbox(aiResponse, "ai", true); // Kích hoạt hiệu ứng gõ chữ ở đây
            }
        }

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendMessage();
        });
    }
    console.log("Ứng dụng thời gian biểu đã được khởi chạy!");
});

