/* KINGDZ ADMIN PANEL - SUPABASE REALTIME & EDGE ENGINE */
const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


let statsChart = null;

async function addActivity(type, action, deviceId = "", details = "") {

    const { error } = await client
        .from("activity_logs")
        .insert([{
            type,
            action,
            device_id: deviceId,
            details
        }]);

    if (error) {
        console.error("Activity Log Error:", error);
    }

}
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
        
        const { error } = await client.auth.signInWithPassword({
    email,
    password
});
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

    const onlineCount = uData.filter(u => {
        return u.last_online &&
               (Date.now() - new Date(u.last_online).getTime()) < 60000;
    }).length;

    updateCounter("onlineUsers", onlineCount);

    renderMainUsersTable(uData);
    renderAllUsersTable(uData);
    renderKeysTable(kData);
    renderBannedTable(uData);
    updateMainCharts(uData);
 await loadStats();
   
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString();
}
async function loadStats() {

    const { data: users } = await client
        .from("users")
        .select("*");

    const { data: keys } = await client
        .from("keys")
        .select("*");

    const u = users || [];
    const k = keys || [];

    const now = Date.now();

    document.getElementById("statsUsers").textContent = u.length;

    document.getElementById("statsOnline").textContent =
        u.filter(user =>
            user.last_online &&
            (now - new Date(user.last_online).getTime()) < 60000
        ).length;

    document.getElementById("statsVip").textContent =
        u.filter(user => user.vip).length;

    document.getElementById("statsBanned").textContent =
        u.filter(user => user.banned).length;

    document.getElementById("statsKeys").textContent =
        k.length;

    document.getElementById("statsKeysNew").textContent =
        k.filter(key => key.status === "new").length;

    document.getElementById("statsKeysUsed").textContent =
        k.filter(key => key.status === "used").length;

    document.getElementById("statsVipActive").textContent =
        u.filter(user =>
            user.vip &&
            user.vip_until &&
            new Date(user.vip_until) > new Date()
        ).length;
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
    <span class="inline-flex items-center gap-1 font-bold ${
        u.banned
            ? 'text-red-400'
            : (
                u.last_online &&
                (now - new Date(u.last_online).getTime()) < 60000
            )
                ? 'text-green-400'
                : 'text-gray-500'
    } text-[10px]">
        <span class="w-1 h-1 rounded-full bg-current"></span>

        ${
            u.banned
                ? 'محظور'
                : (
                    u.last_online &&
                    (now - new Date(u.last_online).getTime()) < 60000
                )
                    ? '🟢 متصل الآن'
                    : '⚫ غير متصل'
        }
    </span>
</td>
            <td class="p-2.5 text-center pl-4">
                <button onclick="openDrawer('${u.device_id}')" class="p-1 text-purple-400 hover:bg-purple-500/10 rounded-md"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// [جدول المستخدمين الكامل - الإصدار الاحترافي]
function renderAllUsersTable(users) {
    const tbody = document.getElementById("allUsersTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    const now = Date.now();

    users.forEach(u => {

        const online =
            u.last_online &&
            (now - new Date(u.last_online).getTime()) < 60000;

        const statusText = u.banned
            ? "🚫 محظور"
            : (online ? "🟢 متصل الآن" : "⚫ غير متصل");

        const device =
            u.model ||
            u.device_type ||
            u.manufacturer ||
            "--";

        const vip =
            u.vip
                ? '<span class="text-yellow-400 font-bold">👑 VIP</span>'
                : '<span class="text-gray-400">FREE</span>';

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${u.country || '--'}</td>

            <td>${device}</td>

            <td>${statusText}</td>

            <td>${vip}</td>

       <td class="text-yellow-400 font-bold">
    ${u.duration_type || '--'}
</td>

<td>
    ${u.vip_until ? getRemainingTime(u.vip_until) : '--'}
</td>

<td>
    ${formatDate(u.vip_until)}
</td>     
            <td style="color:${u.cheat_detected ? '#f87171' : '#4ade80'}">
                ${u.cheat_detected ? '🚫 كشف' : '✅ نظيف'}
            </td>

            <td>
                <button
                    onclick="openDrawer('${u.device_id}')"
                    class="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white">
                    إدارة
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function getRemainingTime(vipUntil) {

    const now = new Date();
    const end = new Date(vipUntil);

    const diff = end - now;

    if (diff <= 0) return "منتهي";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return days + " يوم";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return hours + " ساعة";

    const minutes = Math.floor(diff / (1000 * 60));

    return minutes + " دقيقة";
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

            <td class="p-2 text-center">
                <input
    type="checkbox"
    class="key-checkbox"
    data-id="${k.id}"
    data-key="${k.key}">
            </td>

            <td class="p-2 pr-4 font-mono font-bold text-purple-400 text-[10px] select-all cursor-pointer">
                ${k.key}
            </td>

            <td class="p-2">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    ${k.duration_type || 'STANDARD'}
                </span>
            </td>

            <td class="p-2 text-gray-400">
                ${k.duration || 'غير محدد'}
            </td>

            <td class="p-2 text-[10px] font-bold ${k.status === 'new' ? 'text-green-400' : 'text-gray-500'}">
                ${k.status === 'new' ? 'جاهز' : 'مستعمل'}
            </td>

            <td class="p-2 text-center pl-4">
                <button onclick="deleteKeyRow(${k.id})" class="p-1 text-red-500">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </td>

        </tr>
    `).join('');

    lucide.createIcons();

initSelectAllButton();

    const selectAll = document.getElementById("selectAllKeys");

    if (selectAll) {
        selectAll.onchange = function () {
            document.querySelectorAll(".key-checkbox").forEach(cb => {
                cb.checked = this.checked;
            });
        };
    }
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

    const { error } = await client
        .from("users")
        .update({ banned: false })
        .eq("device_id", deviceId);

    if (!error) {

        await addActivity(
            "USER",
            "USER_UNBANNED",
            deviceId,
            "تم فك الحظر"
        );

        showToast("تم فك الحظر");

        refreshDashboard();
    }

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
       if (!error) {

    await addActivity(
        "VIP",
        "VIP_REVOKED",
        targetDeviceId,
        "تم سحب اشتراك VIP"
    );

    showToast("تم سحب VIP");
    refreshDashboard();

}
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

    const content = document.getElementById("drawerContent");

    const { data, error } = await client
        .from("users")
        .select("*")
        .eq("device_id", deviceId)
        .single();

    if (error) {
        content.innerHTML = "حدث خطأ";
        return;
    }

    const online =
        data.last_online &&
        (Date.now() - new Date(data.last_online).getTime()) < 60000;

    content.innerHTML = `

<div class="space-y-4">

<div class="glass-card p-4 rounded-xl">

<div class="flex items-center gap-3 mb-4">

<img
src="https://api.dicebear.com/7.x/avataaars/svg?seed=${data.device_id}"
class="w-14 h-14 rounded-full bg-[#161b26]">

<div>

<h3 class="text-white font-bold text-lg">
${data.username || "Player"}
</h3>

<p class="text-gray-500 text-xs">
${data.device_id}
</p>

</div>

</div>

</div>


<div class="glass-card p-4 rounded-xl">

<h4 class="text-purple-400 font-bold mb-3">

📱 معلومات الجهاز

</h4>

<div class="grid grid-cols-2 gap-2 text-[11px]">

<div>الموديل</div>
<div class="text-white">${data.model || "--"}</div>

<div>الشركة</div>
<div class="text-white">${data.manufacturer || "--"}</div>

<div>العلامة</div>
<div class="text-white">${data.brand || "--"}</div>

<div>Android</div>
<div class="text-white">${data.android_version || "--"}</div>

<div>SDK</div>
<div class="text-white">${data.sdk || "--"}</div>

<div>الدولة</div>
<div class="text-white">${data.country || "--"}</div>

<div>اللغة</div>
<div class="text-white">${data.language || "--"}</div>


<div>البطارية</div>
<div class="text-white">
    ${data.battery ?? '--'}%
</div>

<div>الشحن</div>
<div class="${data.charging ? 'text-green-400' : 'text-gray-400'}">
    ${data.charging ? '🔌 يشحن الآن' : '🔋 غير موصول'}
</div>
</div>


<div class="glass-card p-4 rounded-xl">

<h4 class="text-green-400 font-bold mb-3">

📊 حالة المستخدم

</h4>

<div class="grid grid-cols-2 gap-2 text-[11px]">

<div>الحالة</div>

<div class="${online ? 'text-green-400' : 'text-gray-400'}">

${online ? "🟢 متصل الآن" : "⚫ غير متصل"}

</div>

<div>VIP</div>

<div class="${data.vip ? 'text-yellow-400' : 'text-gray-400'}">

${data.vip ? "👑 مفعل" : "FREE"}

</div>

<div>الحظر</div>

<div class="${data.banned ? 'text-red-400' : 'text-green-400'}">

${data.banned ? "🚫 نعم" : "✅ لا"}

</div>

<div>عدد مرات الدخول</div>

<div class="text-white">

${data.login_count || 0}

</div>

<div>أول دخول</div>

<div class="text-white">
${formatDate(data.first_login)}
</div>

<div>آخر اتصال</div>

<div class="text-white">

${formatDate(data.last_online)}
</div>

</div>

</div>


<div class="grid grid-cols-2 gap-2">

<button
onclick="handleAction('vip','${data.device_id}')"
class="bg-yellow-500/10 text-yellow-400 py-2 rounded-lg font-bold">

👑 VIP

</button>

<button
onclick="handleAction('ban','${data.device_id}')"
class="bg-red-500/10 text-red-400 py-2 rounded-lg font-bold">

🚫 حظر

</button>

<button
onclick="handleAction('delete','${data.device_id}')"
class="col-span-2 bg-white/5 text-gray-300 py-2 rounded-lg font-bold">

🗑 حذف نهائي

</button>

</div>

</div>

`;

    lucide.createIcons();
}

async function handleAction(action, deviceId) {
    if (action === 'ban') {
    await client
        .from('users')
        .update({ banned: true })
        .eq('device_id', deviceId);

    await addActivity(
        "USER",
        "USER_BANNED",
        deviceId,
        "تم حظر المستخدم"
    );
}
    if (action === 'vip') {

    await client
        .from('users')
        .update({ vip: true })
        .eq('device_id', deviceId);

    await addActivity(
        "VIP",
        "VIP_GRANTED",
        deviceId,
        "تم منح اشتراك VIP"
    );

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
function formatDate(date) {
    if (!date) return "--";

    return new Date(date).toLocaleString("ar-DZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}
client.channel('kingdz-realtime-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'keys' }, () => { refreshDashboard(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { refreshDashboard(); })
    .subscribe();
document.getElementById("btnCopyAllKeys")?.addEventListener("click", async () => {

    const checked = document.querySelectorAll(".key-checkbox:checked");

    if (checked.length === 0) {
        showToast("حدد مفتاحًا واحدًا على الأقل");
        return;
    }

    const keys = [];

    checked.forEach(cb => {
        keys.push(cb.dataset.key);
    });

    await navigator.clipboard.writeText(keys.join("\n"));

    showToast("تم نسخ " + keys.length + " مفتاح");
});
function initSelectAllButton() {

    const btn = document.getElementById("btnSelectAll");
    if (!btn) return;

    btn.onclick = function () {

        const checkboxes = document.querySelectorAll(".key-checkbox");

        if (checkboxes.length === 0) return;

        const checkedCount = [...checkboxes].filter(cb => cb.checked).length;

        const selectAll = checkedCount !== checkboxes.length;

        checkboxes.forEach(cb => cb.checked = selectAll);

        btn.innerHTML = selectAll
            ? "❌ إلغاء التحديد"
            : "☑ تحديد الكل";
    };

}
document.getElementById("btnDeleteSelected")?.addEventListener("click", async () => {

    const checked = [...document.querySelectorAll(".key-checkbox:checked")];

    if (checked.length === 0) {
        showToast("حدد مفتاحًا واحدًا على الأقل");
        return;
    }

    if (!confirm(`سيتم حذف ${checked.length} مفتاح، هل أنت متأكد؟`))
        return;

    const ids = checked.map(cb => Number(cb.dataset.id));

    const { error } = await client
        .from("keys")
        .delete()
        .in("id", ids);

    if (error) {
        showToast("فشل الحذف");
        console.error(error);
        return;
    }

    showToast(`تم حذف ${ids.length} مفتاح`);

    refreshDashboard();

});


checkSession();
