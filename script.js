
/* KINGDZ ADMIN PANEL - COMPACT ENGINE (HTML5, REALTIME & DATABASE CONTROL) */
const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// متغيرات الرسوم البيانية العالمية لضمان عدم تكرار الـ Canvas
let statsChart = null;
let deviceChart = null;
const miniCharts = {};

// 1. محرك حركة القائمة الجانبية (Sidebar Navigation) التفاعلي
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        const targetSection = this.getAttribute('data-target');
        if (!targetSection) return;

        // تنظيف الحالات النشطة وإخفاء الأقسام بالكامل
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(section => section.classList.add('hidden'));
        
        // تفعيل القسم والزر المختار فوراً
        this.classList.add('active');
        const targetEl = document.getElementById(targetSection);
        if (targetEl) {
            targetEl.classList.remove('hidden');
            
            // تحديثات مخصصة عند فتح أقسام معينة لضمان ظهور البيانات حية فوراً
            if (targetSection === 'home-section') {
                refreshDashboard();
            } else if (targetSection === 'keys-section') {
                fetchKeysTable();
            } else if (targetSection === 'ban-section') {
                fetchBannedDevicesTable();
            }
        }
    });
});

// 2. التحقق التلقائي والأمني من الجلسة (Auth Session)
async function checkSession() {
    const { data } = await client.auth.getSession();
    if (document.getElementById("loading")) document.getElementById("loading").style.display = "none";
    
    if (data.session) {
        afterLogin();
    } else {
        if (document.getElementById("loginPage")) document.getElementById("loginPage").style.display = "flex";
    }
}

// تنفيذ عمل تسجيل الدخول
if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").onclick = async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById("loginError");
        if(errorEl) errorEl.textContent = "";
        
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) { 
            if(errorEl) errorEl.textContent = "بيانات الدخول خاطئة!"; 
            showToast("خطأ في تسجيل الدخول");
            return; 
        }
        checkSession();
    };
}

// تنفيذ تسجيل الخروج
if (document.getElementById("logout")) {
    document.getElementById("logout").onclick = async () => {
        await client.auth.signOut();
        location.reload();
    };
}

// 3. المحرك الموحد لتحديث بيانات لوحة التحكم والإحصائيات الرئيسية
async function refreshDashboard() {
    const { count: uCount } = await client.from("users").select("*", { count: "exact", head: true });
    const { count: vCount } = await client.from("users").select("*", { count: "exact", head: true }).eq("vip", true);
    const { count: kCount } = await client.from("keys").select("*", { count: "exact", head: true });
    
    const { data: allUsers } = await client.from("users").select("*");
    const onlineCount = allUsers ? allUsers.filter(x => x.online === true).length : 0;

    // حقن وتحديث الأرقام على الواجهة
    updateCounter("usersCount", uCount || 0);
    updateCounter("vipCount", vCount || 0);
    updateCounter("keysCount", kCount || 0);
    updateCounter("onlineUsers", onlineCount || 0);

    const usersData = allUsers || [];
    
    // بناء وتحديث المكونات البصرية والرسوم البيانية والجداول
    initMiniCharts();
    updateMainCharts(usersData);
    renderUsersTable(usersData);
    renderActivityFeed(usersData);
    renderCountriesList(usersData);
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value).toLocaleString();
}

// 4. بناء الرسوم الخطية والدائرية المصغرة (Chart.js System)
function updateMainCharts(users) {
    const lineCtx = document.getElementById("statsChart")?.getContext("2d");
    const donutCtx = document.getElementById("deviceChart")?.getContext("2d");
    if (!lineCtx || !donutCtx) return;

    if (statsChart) statsChart.destroy();
    if (deviceChart) deviceChart.destroy();

    const total = users.length || 1;
    const android = users.filter(u => (u.manufacturer || '').toLowerCase().includes('android')).length;
    const ios = users.filter(u => (u.manufacturer || '').toLowerCase().includes('apple') || (u.manufacturer || '').toLowerCase().includes('iphone')).length;
    const windows = users.filter(u => (u.manufacturer || '').toLowerCase().includes('windows')).length;
    const others = total - (android + ios + windows);

    if(document.getElementById("totalDeviceCount")) {
        document.getElementById("totalDeviceCount").textContent = users.length.toLocaleString();
    }

    deviceChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [android, windows, ios, others],
                backgroundColor: ['#a855f7', '#3b82f6', '#ec4899', '#4b5563'],
                borderWidth: 0,
                hoverOffset: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '82%' }
    });

    const statsListEl = document.getElementById("deviceStatsList");
    if (statsListEl) {
        statsListEl.innerHTML = `
            <div class="flex justify-between text-[10px] font-bold text-gray-400">
                <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>أندرويد</div>
                <span>${Math.round((android/total)*100)}%</span>
            </div>
            <div class="flex justify-between text-[10px] font-bold text-gray-400">
                <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>ويندوز</div>
                <span>${Math.round((windows/total)*100)}%</span>
            </div>
            <div class="flex justify-between text-[10px] font-bold text-gray-400">
                <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-pink-500"></span>آيفون</div>
                <span>${Math.round((ios/total)*100)}%</span>
            </div>
        `;
    }

    statsChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                data: [total * 0.3, total * 0.45, total * 0.38, total * 0.6, total * 0.55, total * 0.75, total],
                borderColor: '#a855f7',
                borderWidth: 2,
                pointBackgroundColor: '#a855f7',
                pointRadius: 1.5,
                fill: true,
                backgroundColor: 'rgba(168, 85, 247, 0.03)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#4b5563', font: { size: 8, family: 'Cairo' } } },
                y: { grid: { color: 'rgba(255,255,255,0.01)' }, ticks: { color: '#4b5563', font: { size: 8 } } }
            }
        }
    });
}

function initMiniCharts() {
    const configs = { miniChart1: '#22c55e', miniChart2: '#3b82f6', miniChart3: '#eab308', miniChart4: '#ec4899', miniChart5: '#a855f7' };
    Object.entries(configs).forEach(([id, color]) => {
        const ctx = document.getElementById(id)?.getContext("2d");
        if (!ctx || miniCharts[id]) return;
        miniCharts[id] = new Chart(ctx, {
            type: 'line',
            data: { labels: [1, 2, 3, 4, 5], datasets: [{ data: [10, 15, 8, 22, 18], borderColor: color, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
    });
}

// 5. بناء وتغذية جدول آخر المستخدمين النشطين الرئيسي
function renderUsersTable(users) {
    const tbody = document.getElementById("usersTable");
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500 text-[10px]">لا يوجد مستخدمين مسجلين حالياً.</td></tr>`;
        return;
    }

    const displayUsers = users.slice(-4).reverse();
    tbody.innerHTML = displayUsers.map(u => {
        let badgeClass = "badge-monthly";
        let badgeText = "MONTHLY";
        if (u.vip) {
            badgeClass = u.manufacturer?.toLowerCase().includes('apple') ? "badge-vip-silver" : "badge-vip-gold";
            badgeText = u.manufacturer?.toLowerCase().includes('apple') ? "VIP SILVER 💎" : "VIP GOLD 👑";
        }

        return `
            <tr class="hover:bg-white/[0.005]">
                <td class="p-2.5 pr-4">
                    <div class="flex items-center gap-2">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.device_id}" class="w-6 h-6 rounded-full bg-[#111622] border border-white/5">
                        <span class="font-bold text-gray-300 text-[11px]">${u.device_id?.substring(0, 10) || 'User_DZ'}</span>
                    </div>
                </td>
                <td class="p-2.5 font-medium text-gray-400">${u.country || 'الجزائر 🇩🇿'}</td>
                <td class="p-2.5 text-gray-500 font-medium">${u.manufacturer || 'Smartphone'}</td>
                <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-extrabold ${badgeClass}">${badgeText}</span></td>
                <td class="p-2.5">
                    <span class="inline-flex items-center gap-1 font-bold ${u.online ? 'text-green-400' : 'text-red-400'} text-[10px]">
                        <span class="w-1 h-1 rounded-full bg-current ${u.online ? 'animate-pulse' : ''}"></span>
                        ${u.online ? 'متصل الآن' : 'غير متصل'}
                    </span>
                </td>
                <td class="p-2.5 text-center pl-4">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="deleteUser('${u.device_id}')" class="p-1 text-red-500 hover:bg-red-500/5 rounded-md transition-all"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function renderCountriesList(users) {
    const container = document.getElementById("countriesList");
    if (!container) return;
    const defaults = [
        { name: 'الجزائر', flag: '🇩🇿', count: 85 }, { name: 'السعودية', flag: '🇸🇦', count: 65 },
        { name: 'مصر', flag: '🇪🇬', count: 45 }, { name: 'المغرب', flag: '🇲🇦', count: 30 }
    ];
    container.innerHTML = defaults.map(c => `
        <div class="space-y-1">
            <div class="flex justify-between text-[10px] font-bold text-gray-400">
                <span class="flex items-center gap-1"><span>${c.flag}</span>${c.name}</span>
                <span>${c.count}%</span>
            </div>
            <div class="w-full bg-white/[0.01] h-1 rounded-full overflow-hidden">
                <div class="bg-purple-500 h-full rounded-full" style="width: ${c.count}%"></div>
            </div>
        </div>
    `).join('');
}

function renderActivityFeed(users) {
    const feed = document.getElementById("liveActivityFeed");
    if (!feed) return;
    const mockActivities = [
        { text: 'تم تسجيل دخول مستخدم جديد', time: 'منذ ثوانٍ', color: 'bg-green-500' },
        { text: 'تم إنشاء مفتاح جديد بالسيرفر', time: 'منذ دقيقة', color: 'bg-purple-500' }
    ];
    feed.innerHTML = mockActivities.map(act => `
        <div class="flex items-start gap-2.5 relative z-10">
            <span class="w-1.5 h-1.5 rounded-full ${act.color} mt-1 shrink-0"></span>
            <div class="flex-1 flex justify-between items-center leading-none">
                <p class="text-[10px] font-bold text-gray-300">${act.text}</p>
                <span class="text-[8px] font-semibold text-gray-600 shrink-0">${act.time}</span>
            </div>
        </div>
    `).join('');
}

async function deleteUser(id) {
    if (confirm("هل تريد إزالة هذا الجهاز نهائياً من السيرفر؟")) {
        const { error } = await client.from("users").delete().eq("device_id", id);
        if(!error) { showToast("تم حذف المستخدم بنجاح"); refreshDashboard(); }
    }
}

// =======================================================
// 🔑 [التحكم بالمفاتيح] دالة توليد وعرض وحذف مفاتيح التفعيل
// =======================================================
if (document.getElementById("btnGenerateKey")) {
    document.getElementById("btnGenerateKey").onclick = async () => {
        const type = document.getElementById("keyType").value;
        const duration = parseInt(document.getElementById("keyDuration").value) || 30;
        const amount = parseInt(document.getElementById("keyAmount").value) || 1;
        let inserted = 0;

        for (let i = 0; i < amount; i++) {
            const randomCode = "KINGDZ-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
            const { error } = await client.from("keys").insert([{ key_code: randomCode, type: type, duration_days: duration, status: "active", created_at: new Date().toISOString() }]);
            if (!error) inserted++;
        }

        if (inserted > 0) {
            showToast(`تم توليد ${inserted} مفتاح بنجاح!`);
            refreshDashboard();
            fetchKeysTable();
        } else {
            showToast("فشل توليد المفاتيح! تأكد من وجود جدول keys");
        }
    };
}

async function fetchKeysTable() {
    const tbody = document.getElementById("keysListTable");
    const badge = document.getElementById("keysTotalBadge");
    if (!tbody) return;

    const { data: keys, count } = await client.from("keys").select("*", { count: "exact" });
    if(badge) badge.textContent = `${count || 0} مفتاح`;

    if (!keys || keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-gray-500 text-[10px]">لا توجد مفاتيح تفعيل حالياً.</td></tr>`;
        return;
    }

    tbody.innerHTML = keys.reverse().map(k => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 font-mono font-bold text-purple-400 text-[10px] select-all cursor-pointer">${k.key_code}</td>
            <td class="p-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold text-purple-400 bg-purple-500/10 border border-purple-500/20">${k.type}</span></td>
            <td class="p-2 text-gray-400">${k.duration_days} يوم</td>
            <td class="p-2"><span class="text-[10px] ${k.status === 'active' ? 'text-green-400' : 'text-gray-500'} font-bold">${k.status === 'active' ? 'جاهز' : 'مستعمل'}</span></td>
            <td class="p-2 text-center pl-4">
                <button onclick="deleteKey('${k.key_code}')" class="p-1 text-red-500 hover:bg-red-500/5 rounded-md transition-all"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function deleteKey(keyCode) {
    if (confirm(`حذف المفتاح ${keyCode} نهائياً؟`)) {
        const { error } = await client.from("keys").delete().eq("key_code", keyCode);
        if (!error) { showToast("تم الحذف"); fetchKeysTable(); refreshDashboard(); }
    }
}

// =======================================================
// 🚫 [جدار الحظر] دالة إدراج وفك حظر الأجهزة
// =======================================================
if (document.getElementById("btnApplyBan")) {
    document.getElementById("btnApplyBan").onclick = async () => {
        const deviceId = document.getElementById("banDeviceId").value.trim();
        const reason = document.getElementById("banReason").value.trim() || "مخالفة السياسات";
        if (!deviceId) { showToast("أدخل الـ Device ID أولاً"); return; }

        const { error } = await client.from("banned_devices").insert([{ device_id: deviceId, reason: reason, banned_at: new Date().toISOString() }]);
        if (!error) {
            await client.from("users").update({ online: false }).eq("device_id", deviceId);
            showToast("تم إدراج الجهاز في قائمة الحظر 🚫");
            document.getElementById("banDeviceId").value = "";
            document.getElementById("banReason").value = "";
            fetchBannedDevicesTable();
            refreshDashboard();
        } else { showToast("الجهاز محظور مسبقاً أو الجدول غير متوفر"); }
    };
}

async function fetchBannedDevicesTable() {
    const tbody = document.getElementById("bannedDevicesTable");
    if (!tbody) return;

    const { data: bans } = await client.from("banned_devices").select("*");
    if (!bans || bans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-gray-500 text-[10px]">قائمة الحظر فارغة.</td></tr>`;
        return;
    }

    tbody.innerHTML = bans.reverse().map(b => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 text-red-400 font-bold font-mono text-[10px]">${b.device_id}</td>
            <td class="p-2 text-gray-400">${b.reason}</td>
            <td class="p-2 text-center pl-4">
                <button onclick="unbanDevice('${b.device_id}')" class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-[9px] rounded-md transition-all">فك الحظر</button>
            </td>
        </tr>
    `).join('');
}

async function unbanDevice(deviceId) {
    if (confirm("هل تريد إلغاء الحظر عن هذا الجهاز؟")) {
        const { error } = await client.from("banned_devices").delete().eq("device_id", deviceId);
        if (!error) { showToast("تم فك الحظر"); fetchBannedDevicesTable(); }
    }
}

// =======================================================
// 💎 [رتب VIP] ترفيع الحسابات يدوياً بضغطة زر
// =======================================================
if (document.getElementById("btnGrantVip")) {
    document.getElementById("btnGrantVip").onclick = async () => {
        const deviceId = document.getElementById("vipDeviceId").value.trim();
        if (!deviceId) { showToast("أدخل معرّف الجهاز"); return; }
        const { error } = await client.from("users").update({ vip: true }).eq("device_id", deviceId);
        if (!error) { showToast("تمت الترقية إلى رتبة VIP ✨"); document.getElementById("vipDeviceId").value = ""; refreshDashboard(); }
        else { showToast("لم يتم العثور على الجهاز"); }
    };
}

if (document.getElementById("btnRevokeVip")) {
    document.getElementById("btnRevokeVip").onclick = async () => {
        const deviceId = document.getElementById("vipDeviceId").value.trim();
        if (!deviceId) { showToast("أدخل معرّف الجهاز"); return; }
        const { error } = await client.from("users").update({ vip: false }).eq("device_id", deviceId);
        if (!error) { showToast("تم سحب رتبة VIP بنجاح"); document.getElementById("vipDeviceId").value = ""; refreshDashboard(); }
        else { showToast("لم يتم العثور على الجهاز"); }
    };
}

// 6. نظام الإشعارات المنبثقة الصغير (Toast System)
function showToast(text) {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toastText");
    if (!toast || !toastText) return;
    toastText.textContent = text;
    toast.classList.remove("translate-y-12", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
    setTimeout(() => { toast.classList.remove("translate-y-0", "opacity-100"); toast.classList.add("translate-y-12", "opacity-0"); }, 2500);
}

function afterLogin() {
    if (document.getElementById("loginPage")) document.getElementById("loginPage").style.display = "none";
    if (document.getElementById("dashboard")) document.getElementById("dashboard").style.display = "flex";
    
    refreshDashboard();
    fetchKeysTable();
    fetchBannedDevicesTable();
    
    setInterval(() => {
        const liveTimeEl = document.getElementById("liveTime");
        if (liveTimeEl) liveTimeEl.textContent = new Date().toLocaleTimeString('ar-SA', { hour12: false });
    }, 1000);
}

// 7. تشغيل القنوات اللحظية (Supabase Realtime) للتحديث الفوري بدون إنعاش
client.channel('kingdz-live-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { refreshDashboard(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'keys' }, () => { fetchKeysTable(); refreshDashboard(); })
    .subscribe();

// إنطلاق الفحص الأساسي الفوري
checkSession();
