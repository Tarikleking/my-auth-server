
/* KINGDZ ADMIN PANEL - REAL DATABASE ENGINE */
const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let statsChart = null;
let deviceChart = null;

// 1. التنقل بين الأقسام الفرعية للـ Sidebar
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
            if (targetSection === 'home-section' || targetSection === 'keys-section' || targetSection === 'ban-section') {
                refreshDashboard();
            }
        }
    });
});

// 2. فحص وتسجيل الدخول والخروج
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

// 3. دالة التحديث الشاملة لقراءة جدول keys الحقيقي
async function refreshDashboard() {
    // جلب كافة السجلات الحية من جدول keys
    const { data: dbData, error } = await client.from("keys").select("*");
    if (error || !dbData) return;

    // تصفية وحساب العدادات بناءً على بياناتك الفعلية
    const totalKeys = dbData.length;
    const activeKeys = dbData.filter(k => k.status === 'active' || k.status === 'جاهز').length;
    const bannedDevices = dbData.filter(k => k.banned === true).length;
    const onlineCount = dbData.filter(k => k.last_online !== null).length; // الأجهزة التي تملك بصمة اتصال

    updateCounter("usersCount", totalKeys);
    updateCounter("keysCount", activeKeys);
    updateCounter("onlineUsers", onlineCount);
    updateCounter("vipCount", dbData.filter(k => k.vip_until !== null).length);

    // ملء الجداول الفرعية حياً وبدون تعارض
    renderMainTable(dbData);
    renderKeysTable(dbData);
    renderBannedTable(dbData);
    updateMainCharts(dbData);
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString();
}

// 4. عرض آخر المفاتيح والأجهزة بالجدول الرئيسي للوحة التحكم
function renderMainTable(data) {
    const tbody = document.getElementById("usersTable");
    if (!tbody) return;

    const latest = data.slice(-4).reverse();
    tbody.innerHTML = latest.map(u => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2.5 pr-4">
                <div class="flex items-center gap-2">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.key}" class="w-6 h-6 rounded-full bg-[#111622]">
                    <span class="font-bold text-gray-300 text-[10px] select-all">${u.key}</span>
                </div>
            </td>
            <td class="p-2.5 text-gray-400">${u.country || 'غير معروف'}</td>
            <td class="p-2.5 text-gray-500">${u.model || u.manufacturer || 'لا يوجد جهاز'}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-extrabold ${u.vip_until ? 'badge-vip-gold' : 'badge-monthly'}">${u.duration_type || 'MONTHLY'}</span></td>
            <td class="p-2.5">
                <span class="inline-flex items-center gap-1 font-bold ${u.banned ? 'text-red-500' : 'text-green-400'} text-[10px]">
                    <span class="w-1 h-1 rounded-full bg-current"></span>
                    ${u.banned ? 'محظور' : 'نشط'}
                </span>
            </td>
            <td class="p-2.5 text-center pl-4">
                <button onclick="deleteRow(${u.id})" class="p-1 text-red-500 hover:bg-red-500/5 rounded-md"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// 5. [🔑 إدارة المفاتيح الفرعي] دالة توليد وعرض وحذف المفاتيح الحقيقية
if (document.getElementById("btnGenerateKey")) {
    document.getElementById("btnGenerateKey").onclick = async () => {
        const durationType = document.getElementById("keyType").value;
        const durationDays = document.getElementById("keyDuration").value;
        const amount = parseInt(document.getElementById("keyAmount").value) || 1;
        let successCount = 0;

        for (let i = 0; i < amount; i++) {
            // توليد كود عشوائي نظيف ومتناسق لقاعدتك
            const randomCode = "KINGDZ-" + Math.random().toString(36).substring(2, 7).toUpperCase();
            
            const { error } = await client.from("keys").insert([
                {
                    key: randomCode,
                    duration: durationDays + " يوم",
                    duration_type: durationType,
                    status: "active",
                    banned: false,
                    created_at: new Date().toISOString()
                }
            ]);
            if (!error) successCount++;
        }

        if (successCount > 0) {
            showToast(`تم توليد ${successCount} مفتاح حقيقي بنجاح!`);
            refreshDashboard();
        } else {
            showToast("حدث خطأ أثناء الإرسال للسيرفر");
        }
    };
}

function renderKeysTable(data) {
    const tbody = document.getElementById("keysListTable");
    const badge = document.getElementById("keysTotalBadge");
    if (!tbody) return;

    if(badge) badge.textContent = `${data.length} مفتاح كلي`;

    tbody.innerHTML = data.slice().reverse().map(k => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 font-mono font-bold text-purple-400 text-[10px] select-all cursor-pointer">${k.key}</td>
            <td class="p-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">${k.duration_type || 'STANDARD'}</span></td>
            <td class="p-2 text-gray-400">${k.duration || 'غير محدد'}</td>
            <td class="p-2 text-[10px] font-bold ${k.banned ? 'text-red-400' : 'text-green-400'}">${k.banned ? 'محظور' : 'جاهز للعمل'}</td>
            <td class="p-2 text-center pl-4">
                <button onclick="deleteRow(${k.id})" class="p-1 text-red-500 hover:bg-red-500/5 rounded-md"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// 6. [🚫 جدار الحظر الفرعي] دالة تفعيل وفك الحظر المباشر
if (document.getElementById("btnApplyBan")) {
    document.getElementById("btnApplyBan").onclick = async () => {
        const targetKey = document.getElementById("banDeviceId").value.trim();
        if (!targetKey) { showToast("الرجاء إدخال رمز المفتاح المستهدف أولاً"); return; }

        // تحويل حالة الحظر إلى true للمفتاح المدخل
        const { error } = await client.from("keys").update({ banned: true }).eq("key", targetKey);
        
        if (!error) {
            showToast("تم تطبيق الحظر الفوري على المفتاح");
            document.getElementById("banDeviceId").value = "";
            refreshDashboard();
        } else {
            showToast("فشل الحظر، تأكد من كود المفتاح");
        }
    };
}

function renderBannedTable(data) {
    const tbody = document.getElementById("bannedDevicesTable");
    if (!tbody) return;

    const bannedList = data.filter(k => k.banned === true);

    if (bannedList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-gray-500 text-[10px]">لا توجد أي مفاتيح محظورة حالياً.</td></tr>`;
        return;
    }

    tbody.innerHTML = bannedList.reverse().map(b => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 text-red-400 font-bold font-mono text-[10px] select-all">${b.key}</td>
            <td class="p-2 text-gray-400">${b.model || b.manufacturer || 'مخالفة السياسات وعمليات النظام'}</td>
            <td class="p-2 text-center pl-4">
                <button onclick="liftBan(${b.id})" class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-[9px] rounded-md transition-all">فك الحظر</button>
            </td>
        </tr>
    `).join('');
}

async function liftBan(id) {
    const { error } = await client.from("keys").update({ banned: false }).eq("id", id);
    if (!error) { showToast("تم إلغاء وفك الحظر بنجاح"); refreshDashboard(); }
}

async function deleteRow(id) {
    if (confirm("هل أنت متأكد من حذف هذا السجل نهائياً من قاعدة البيانات؟")) {
        const { error } = await client.from("keys").delete().eq("id", id);
        if (!error) { showToast("تم الحذف النهائي"); refreshDashboard(); }
    }
}

// 7. [💎 إدارة VIP يدوياً]
if (document.getElementById("btnGrantVip")) {
    document.getElementById("btnGrantVip").onclick = async () => {
        const targetKey = document.getElementById("vipDeviceId").value.trim();
        if (!targetKey) return;
        const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 30); // إضافة 30 يوم
        
        const { error } = await client.from("keys").update({ vip_until: futureDate.toISOString(), duration_type: "VIP_GOLD" }).eq("key", targetKey);
        if (!error) { showToast("تمت ترقية المفتاح لـ VIP بنجاح ✨"); document.getElementById("vipDeviceId").value = ""; refreshDashboard(); }
    };
}

if (document.getElementById("btnRevokeVip")) {
    document.getElementById("btnRevokeVip").onclick = async () => {
        const targetKey = document.getElementById("vipDeviceId").value.trim();
        if (!targetKey) return;
        const { error } = await client.from("keys").update({ vip_until: null, duration_type: "MONTHLY" }).eq("key", targetKey);
        if (!error) { showToast("تم سحب رتبة الـ VIP"); document.getElementById("vipDeviceId").value = ""; refreshDashboard(); }
    };
}

// 8. الرسوم البيانية المتوافقة
function updateMainCharts(data) {
    const lineCtx = document.getElementById("statsChart")?.getContext("2d");
    if (!lineCtx) return;
    if (statsChart) statsChart.destroy();

    statsChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{ data: [data.length*0.4, data.length*0.6, data.length*0.5, data.length*0.8, data.length*0.7, data.length*0.9, data.length], borderColor: '#a855f7', borderWidth: 2, fill: false, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// نظام التنبيهات الصغير (Toast)
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

// تحديث فوري تلقائي عند حدوث تغيير بالسيرفر
client.channel('kingdz-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'keys' }, () => { refreshDashboard(); }).subscribe();

checkSession();
