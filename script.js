/* KINGDZ ADMIN PANEL - SUPABASE REALTIME & EDGE ENGINE */
const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let statsChart = null;

// 1. نظام التنقل السلس بين أقسام اللوحة الجانبية
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        const targetSection = this.getAttribute('data-target');
        if (!targetSection) return;

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(section => section.classList.add('hidden'));
        
        this.classList.add('active');
        const targetEl = document.getElementById(targetSection);
        if (targetEl) {
            targetEl.classList.remove('hidden');
            if (targetSection === 'home-section' || targetSection === 'keys-section' || targetSection === 'ban-section' || targetSection === 'users-section') {
                refreshDashboard();
            }
        }
    });
});

// 2. فحص وتأمين الجلسة (تسجيل الدخول / الخروج)
async function checkSession() {
    const { data } = await client.auth.getSession();
    if (document.getElementById("loading")) document.getElementById("loading").style.display = "none";
    
    if (data.session) {
        afterLogin();
    } else {
        if (document.getElementById("loginPage")) document.getElementById("loginPage").style.display = "flex";
    }
}

if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").onclick = async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById("loginError");
        if(errorEl) errorEl.textContent = "";
        
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) { 
            if(errorEl) errorEl.textContent = "بيانات الدخول خاطئة!"; 
            return; 
        }
        checkSession();
    };
}

if (document.getElementById("logout")) {
    document.getElementById("logout").onclick = async () => {
        await client.auth.signOut();
        location.reload();
    };
}

// 3. المحرك الموحد لجلب البيانات الحقيقية من جدولين (keys و users)
async function refreshDashboard() {
    const { data: usersData } = await client.from("users").select("*");
    const { data: keysData } = await client.from("keys").select("*");

    const uData = usersData || [];
    const kData = keysData || [];

    updateCounter("usersCount", uData.length);
    updateCounter("keysCount", kData.filter(k => k.status === 'new').length);
    updateCounter("vipCount", uData.filter(u => u.vip === true).length);
   const now = Date.now();


const now = Date.now();

const onlineCount = uData.filter(u => {
    return u.last_online &&
           (now - new Date(u.last_online).getTime()) < 60000;
}).length;

updateCounter("onlineUsers", onlineCount);
    renderMainUsersTable(uData);
    renderAllUsersTable(uData); 
    renderKeysTable(kData);
    renderBannedTable(uData);
    updateMainCharts(uData);
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString();
}

// 4. عرض الأجهزة المتصلة الحقيقية في جدول لوحة التحكم الرئيسي
function renderMainUsersTable(users) {
    const tbody = document.getElementById("usersTable");
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500 text-[10px]">لا توجد أجهزة متصلة بالسيرفر حالياً.</td></tr>`;
        return;
    }
   
    const latest = users.slice(-4).reverse();
     const now = Date.now();
    tbody.innerHTML = latest.map(u => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2.5 pr-4">
                <div class="flex items-center gap-2">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.device_id}" class="w-6 h-6 rounded-full bg-[#111622]">
                    <span class="font-bold text-gray-300 text-[10px] select-all">${u.device_id ? u.device_id.substring(0, 12) : 'Device'}...</span>
                </div>
            </td>
            <td class="p-2.5 text-gray-400">${u.country || 'الجزائر 🇩🇿'}</td>
            <td class="p-2.5 text-gray-500 font-medium">${u.model || u.manufacturer || 'Smartphone'}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-extrabold ${u.vip ? 'badge-vip-gold' : 'badge-monthly'}">${u.vip ? 'VIP👑' : 'FREE'}</span></td>
            <td class="p-2.5">
                <span class="inline-flex items-center gap-1 font-bold ${u.banne${
u.banned
? 'text-red-400'
: (
u.last_online &&
(now - new Date(u.last_online).getTime()) < 60000
)
? 'text-green-400'
: 'text-gray-500'
}d ? 'text-red-400' : 'text-green-400'} text-[10px]">
                    <span class="w-1 h-1 rounded-full bg-current"></span>
                    ${u.banned ? 'محظور' : 'متصل${
    u.banned
        ? 'محظور'
        : (
            u.last_online &&
            (now - new Date(u.last_online).getTime()) < 60000
        )
            ? '🟢 متصل الآن'
            : '⚫ غير متصل'
} الآن'}
                </span>
            </td>
            <td class="p-2.5 text-center pl-4">
                <button onclick="openDrawer('${u.device_id}')" class="p-1 text-purple-400 hover:bg-purple-500/10 rounded-md"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// [جدول المستخدمين الكامل - الميزة الجديدة مع كافة التفاصيل]
function renderAllUsersTable(users) {
    const tbody = document.getElementById("allUsersTable");
    if (!tbody) return;
    
    // تفريغ الجدول قبل التعبئة
    tbody.innerHTML = ""; 

    users.forEach(u => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${u.country || '--'}</td>
            <td>${u.device_type || '--'}</td>
            <td>${u.client_status || '--'}</td>
            <td>${u.subscription_type || '--'}</td>
            <td>${u.duration || '0'}</td>
            <td>${u.expires_at || '--'}</td>
            <td style="color: ${u.cheat_detected ? '#f87171' : '#4ade80'}">
                ${u.cheat_detected ? '🚫 كشف' : '✅ نظيف'}
            </td>
            <td>
                <button onclick="openDrawer('${u.device_id}')" class="bg-purple-600 px-3 py-1 rounded text-white">إدارة</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}
// 🔑 [محرك المفاتيح الحقيقي] 
if (document.getElementById("btnGenerateKey")) {
    document.getElementById("btnGenerateKey").onclick = async () => {
        const durationType = document.getElementById("keyType").value; 
        const amount = parseInt(document.getElementById("keyAmount").value) || 1;
        let successCount = 0;

        for (let i = 0; i < amount; i++) {
            const part = () => Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X');
            const randomCode = part() + "-" + part() + "-" + part();
            let expireDate = new Date();
            
            switch (durationType) {
                case "1 دقيقة": expireDate.setMinutes(expireDate.getMinutes() + 1); break;
                case "1 ساعة": expireDate.setHours(expireDate.getHours() + 1); break;
                case "1 يوم": expireDate.setDate(expireDate.getDate() + 1); break;
                case "1 أسبوع": expireDate.setDate(expireDate.getDate() + 7); break;
                case "1 شهر": expireDate.setMonth(expireDate.getMonth() + 1); break;
                case "1 سنة": expireDate.setFullYear(expireDate.getFullYear() + 1); break;
            }
            
            const { error } = await client.from("keys").insert([{
                key: randomCode, duration: durationType, duration_type: durationType, status: "new", 
                created_at: new Date().toISOString(), expires_at: expireDate.toISOString()
            }]);
            if (!error) successCount++;
        }
        if (successCount > 0) { showToast("تم توليد " + successCount + " مفتاح"); refreshDashboard(); }
    };
}

function renderKeysTable(keys) {
    const tbody = document.getElementById("keysListTable");
    if (!tbody) return;
    tbody.innerHTML = keys.slice().reverse().map(k => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 font-mono font-bold text-purple-400 text-[10px] select-all cursor-pointer">${k.key}</td>
            <td class="p-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">${k.duration_type || 'STANDARD'}</span></td>
            <td class="p-2 text-gray-400">${k.duration || 'غير محدد'}</td>
            <td class="p-2 text-[10px] font-bold ${k.status === 'new' ? 'text-green-400' : 'text-gray-500'}">${k.status === 'new' ? 'جاهز' : 'مستعمل'}</td>
            <td class="p-2 text-center pl-4"><button onclick="deleteKeyRow(${k.id})" class="p-1 text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// 🚫 [جدار الحظر]
if (document.getElementById("btnApplyBan")) {
    document.getElementById("btnApplyBan").onclick = async () => {
        const targetDeviceId = document.getElementById("banDeviceId").value.trim();
        if (!targetDeviceId) return;
        const { error } = await client.from("users").update({ banned: true }).eq("device_id", targetDeviceId);
        if (!error) { showToast("تم الحظر 🚫"); refreshDashboard(); }
    };
}

function renderBannedTable(users) {
    const tbody = document.getElementById("bannedDevicesTable");
    if (!tbody) return;
    const bannedList = users.filter(u => u.banned === true);
    tbody.innerHTML = bannedList.reverse().map(b => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 text-red-400 font-bold font-mono text-[10px]">${b.device_id}</td>
            <td class="p-2 text-gray-400">${b.model || '---'}</td>
            <td class="p-2 text-center pl-4"><button onclick="liftUserBan('${b.device_id}')" class="text-green-400 font-bold text-[9px]">فك الحظر</button></td>
        </tr>
    `).join('');
}

async function liftUserBan(deviceId) {
    const { error } = await client.from("users").update({ banned: false }).eq("device_id", deviceId);
    if (!error) { showToast("تم فك الحظر"); refreshDashboard(); }
}

async function deleteUserRow(deviceId) {
    if (confirm("حذف الجهاز نهائياً؟")) {
        const { error } = await client.from("users").delete().eq("device_id", deviceId);
        if (!error) { showToast("تم الحذف"); refreshDashboard(); }
    }
}

async function deleteKeyRow(id) {
    if (confirm("حذف المفتاح نهائياً؟")) {
        const { error } = await client.from("keys").delete().eq("id", id);
        if (!error) { showToast("تم الحذف"); refreshDashboard(); }
    }
}

// 💎 [التحكم VIP]
if (document.getElementById("btnGrantVip")) {
    document.getElementById("btnGrantVip").onclick = async () => {
        const targetDeviceId = document.getElementById("vipDeviceId").value.trim();
        if (!targetDeviceId) return;
        const { error } = await client.from("users").update({ vip: true }).eq("device_id", targetDeviceId);
        if (!error) { showToast("تم الترقية لـ VIP ✨"); refreshDashboard(); }
    };
}

if (document.getElementById("btnRevokeVip")) {
    document.getElementById("btnRevokeVip").onclick = async () => {
        const targetDeviceId = document.getElementById("vipDeviceId").value.trim();
        if (!targetDeviceId) return;
        const { error } = await client.from("users").update({ vip: false }).eq("device_id", targetDeviceId);
        if (!error) { showToast("تم سحب VIP"); refreshDashboard(); }
    };
}

// [وظائف الـ Drawer]
function openDrawer(deviceId) { 
    document.getElementById('userDrawer').style.right = '0'; 
    loadUserDetails(deviceId); 
}

function closeDrawer() { 
    document.getElementById('userDrawer').style.right = '-450px'; 
}

async function loadUserDetails(deviceId) {
    const content = document.getElementById('drawerContent');
    const { data, error } = await client.from('users').select('*').eq('device_id', deviceId).single();
    if (error) { content.innerHTML = "حدث خطأ"; return; }
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="glass-card p-4 rounded-xl border border-white/10">
                <h4 class="text-white font-bold mb-3">بيانات الجهاز</h4>
                <div class="text-[10px] space-y-2 text-gray-400">
                    <p>ID: <span class="text-white">${data.device_id}</span></p>
                    <p>الموديل: <span class="text-white">${data.model || 'غير معروف'}</span></p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="handleAction('ban', '${data.device_id}')" class="bg-red-500/10 text-red-400 py-2 rounded-lg font-bold">حظر</button>
                <button onclick="handleAction('vip', '${data.device_id}')" class="bg-yellow-500/10 text-yellow-500 py-2 rounded-lg font-bold">VIP</button>
                <button onclick="handleAction('delete', '${data.device_id}')" class="col-span-2 bg-white/5 text-gray-400 py-2 rounded-lg font-bold">حذف نهائي</button>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function handleAction(action, deviceId) {
    if (action === 'ban') await client.from('users').update({ banned: true }).eq('device_id', deviceId);
    if (action === 'vip') await client.from('users').update({ vip: true }).eq('device_id', deviceId);
    if (action === 'delete') await client.from('users').delete().eq('device_id', deviceId);
    closeDrawer(); refreshDashboard();
}

function updateMainCharts(users) {
    const lineCtx = document.getElementById("statsChart")?.getContext("2d");
    if (!lineCtx) return;
    if (statsChart) statsChart.destroy();
    statsChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{ data: [users.length*0.4, users.length*0.6, users.length*0.5, users.length*0.8, users.length*0.7, users.length*0.9, users.length], borderColor: '#a855f7', borderWidth: 2, fill: false, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

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
    setInterval(() => {
        const liveTimeEl = document.getElementById("liveTime");
        if (liveTimeEl) liveTimeEl.textContent = new Date().toLocaleTimeString('ar-SA', { hour12: false });
    }, 1000);
}

client.channel('kingdz-realtime-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'keys' }, () => { refreshDashboard(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { refreshDashboard(); })
    .subscribe();

checkSession();
