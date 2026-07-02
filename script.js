
/**
 * KingDZ Professional Admin Dashboard
 * Keep all original Logic, Enhance UI Interactions
 */

// --- Supabase Config (UNCHANGED) ---
const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- State Management ---
let notifications = 0;
let generatedKeys = [];
let statsChart = null;

// --- Elements Mapping ---
const loginPage = document.getElementById("loginPage");
const dashboard = document.getElementById("dashboard");
const loading = document.getElementById("loading");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logout");
const notifyCount = document.getElementById("notifyCount");
const activityTable = document.getElementById("activityTable");

const pages = {
    home: document.getElementById("homePage"),
    keys: document.getElementById("keysPage"),
    users: document.getElementById("usersPage"),
    settings: document.getElementById("settingsPage")
};

// --- Page Navigation ---
document.querySelectorAll(".sidebar-nav li[data-page]").forEach(item => {
    item.onclick = () => {
        document.querySelectorAll(".sidebar-nav li").forEach(x => x.classList.remove("active"));
        item.classList.add("active");
        
        Object.values(pages).forEach(p => p.classList.remove("active"));
        const targetPage = item.dataset.page;
        pages[targetPage].classList.add("active");
        
        // Update Page Title
        document.getElementById("pageTitle").textContent = item.querySelector("span").textContent;
    };
});

// --- Auth Functions (KEEPING ORIGINAL LOGIC) ---
async function checkSession() {
    const { data } = await client.auth.getSession();
    setTimeout(() => {
        loading.style.display = "none";
        if (data.session) {
            afterLogin(data.session.user);
        } else {
            openLogin();
        }
    }, 1000);
}

function openDashboard(user) {
    loginPage.style.display = "none";
    dashboard.style.display = "flex";
    adminEmail.textContent = user.email;
    adminName.textContent = "مدير النظام";
}

function openLogin() {
    dashboard.style.display = "none";
    loginPage.style.display = "flex";
}

loginBtn.onclick = async () => {
    loginError.textContent = "";
    loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...`;
    
    const { error } = await client.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value
    });

    if (error) {
        loginError.textContent = "بيانات الدخول غير صحيحة";
        loginBtn.innerHTML = `<span>تسجيل الدخول</span> <i class="fa-solid fa-arrow-left"></i>`;
        return;
    }
    checkSession();
};

logoutBtn.onclick = async () => {
    await client.auth.signOut();
    openLogin();
};

// --- Stats & Charts (ENHANCED VISUALS) ---
function drawChart(users, keys, vip, banned) {
    const ctx = document.getElementById("statsChart").getContext("2d");
    if (statsChart) statsChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    statsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["المستخدمين", "المفاتيح", "VIP", "المحظورين"],
            datasets: [{
                label: "إحصائيات حية",
                data: [users, keys, vip, banned],
                borderColor: "#6366f1",
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: "#6366f1",
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94a3b8" } },
                x: { grid: { display: false }, ticks: { color: "#94a3b8" } }
            }
        }
    });
}

async function refreshDashboard() {
    const { count: users } = await client.from("users").select("*", { count: "exact", head: true });
    const { count: keys } = await client.from("keys").select("*", { count: "exact", head: true });
    const { count: vip } = await client.from("users").select("*", { count: "exact", head: true }).eq("vip", true);
    const { count: banned } = await client.from("users").select("*", { count: "exact", head: true }).eq("banned", true);

    document.getElementById("usersCount").textContent = users || 0;
    document.getElementById("keysCount").textContent = keys || 0;
    document.getElementById("vipCount").textContent = vip || 0;
    document.getElementById("bannedCount").textContent = banned || 0;

    drawChart(users || 0, keys || 0, vip || 0, banned || 0);

    // Dynamic stats
    const { data: allUsers } = await client.from("users").select("*");
    if (allUsers) {
        const today = new Date().toDateString();
        document.getElementById("todayUsers").textContent = allUsers.filter(u => new Date(u.created_at).toDateString() == today).length;
        document.getElementById("onlineUsers").textContent = allUsers.filter(x => x.online === true).length;
    }
}

// --- Keys Manager (KEEPING ORIGINAL LOGIC) ---
function randomKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
    let key = "";
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) key += "-";
        key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
}

function calculateExpire(text) {
    const now = new Date();
    if (text === "1 دقيقة") now.setMinutes(now.getMinutes() + 1);
    else if (text === "1 ساعة") now.setHours(now.getHours() + 1);
    else if (text === "1 يوم") now.setDate(now.getDate() + 1);
    else if (text === "1 أسبوع") now.setDate(now.getDate() + 7);
    else if (text === "1 شهر") now.setMonth(now.getMonth() + 1);
    else if (text === "1 سنة") now.setFullYear(now.getFullYear() + 1);
    return now.toISOString();
}

async function loadKeys() {
    const { data, error } = await client.from("keys").select("*").order("created_at", { ascending: false });
    if (error) return;

    const table = document.getElementById("keysTable");
    table.innerHTML = "";
    generatedKeys = [];

    data.forEach(k => {
        generatedKeys.push(k.key);
        table.innerHTML += `
            <tr>
                <td class="font-mono">${k.key}</td>
                <td><span class="status-pill online">${k.duration}</span></td>
                <td>${k.status === "used" ? "❌ مستعمل" : "✅ متاح"}</td>
                <td>
                    <button class="btn-secondary" onclick="deleteKey('${k.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

document.getElementById("generate").onclick = async () => {
    const total = parseInt(document.getElementById("count").value);
    const duration = document.getElementById("duration").value;
    
    if (total < 1 || total > 100) return showToast("العدد بين 1 و 100 فقط");

    const btn = document.getElementById("generate");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري التوليد...`;

    for (let i = 0; i < total; i++) {
        const key = randomKey();
        const expire = calculateExpire(duration);
        await client.from("keys").insert({
            key: key,
            status: "new",
            created_at: new Date().toISOString(),
            expires_at: expire,
            duration: duration,
            duration_type: duration
        });
    }

    await loadKeys();
    await refreshDashboard();
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-plus"></i> توليد`;
    showToast(`تم توليد ${total} مفتاح بنجاح`);
};

document.getElementById("copy").onclick = async () => {
    if (generatedKeys.length === 0) return showToast("لا توجد مفاتيح للنسخ");
    await navigator.clipboard.writeText(generatedKeys.join("\n"));
    showToast("تم نسخ جميع المفاتيح إلى الحافظة");
};

async function deleteKey(id) {
    if (!confirm("هل أنت متأكد من حذف هذا المفتاح؟")) return;
    await client.from("keys").delete().eq("id", id);
    loadKeys();
    refreshDashboard();
}

// --- Users Manager (KEEPING ORIGINAL LOGIC) ---
async function loadUsers() {
    const { data, error } = await client.from("users").select("*").order("created_at", { ascending: false });
    if (error) return;

    const table = document.getElementById("usersTable");
    const keyword = document.getElementById("searchUser").value.toLowerCase();
    table.innerHTML = "";

    data.filter(u => 
        (u.device_id || "").toLowerCase().includes(keyword) ||
        (u.manufacturer || "").toLowerCase().includes(keyword) ||
        (u.country || "").toLowerCase().includes(keyword)
    ).forEach(user => {
        table.innerHTML += `
            <tr>
                <td>${user.device_id || "-"}</td>
                <td>${user.manufacturer || "-"}</td>
                <td><span class="status-pill ${user.vip ? 'online' : ''}">${user.vip ? 'VIP ذهبي' : 'عادي'}</span></td>
                <td><span class="status-pill ${user.banned ? 'offline' : 'online'}">${user.banned ? 'محظور' : 'نشط'}</span></td>
                <td>${user.country || "-"}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="toggleVip('${user.device_id}', ${user.vip})" title="VIP"><i class="fa-solid fa-star"></i></button>
                        <button onclick="toggleBan('${user.device_id}', ${user.banned})" title="حظر"><i class="fa-solid fa-ban"></i></button>
                        <button onclick="deleteUser('${user.device_id}')" title="حذف"><i class="fa-solid fa-user-xmark"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// --- Functions (KEEPING ORIGINAL NAMES) ---
async function toggleBan(deviceId, banned) {
    await client.from("users").update({ banned: !banned }).eq("device_id", deviceId);
    loadUsers();
    refreshDashboard();
}

async function toggleVip(deviceId, vip) {
    await client.from("users").update({ vip: !vip }).eq("device_id", deviceId);
    loadUsers();
    refreshDashboard();
}

async function deleteUser(deviceId) {
    if (!confirm("حذف المستخدم نهائياً؟")) return;
    await client.from("users").delete().eq("device_id", deviceId);
    loadUsers();
    refreshDashboard();
}

document.getElementById("searchUser").oninput = () => loadUsers();
document.getElementById("searchKey").oninput = () => loadKeys();

async function loadActivity() {
    const { data } = await client.from("users").select("*").order("last_online", { ascending: false }).limit(10);
    if (!data) return;
    activityTable.innerHTML = "";
    data.forEach(u => {
        activityTable.innerHTML += `
            <tr>
                <td>${u.model || "-"}</td>
                <td>${u.manufacturer || "-"}</td>
                <td>${u.country || "-"}</td>
                <td><small>${new Date(u.last_online).toLocaleTimeString('ar-SA')}</small></td>
            </tr>
        `;
    });
}

// --- Realtime Sync ---
client.channel("kingdz-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadUsers(); refreshDashboard(); loadActivity(); pushNotification();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "keys" }, () => {
        loadKeys(); refreshDashboard();
    })
    .subscribe();

function showToast(text) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function pushNotification() {
    notifications++;
    if (notifyCount) notifyCount.textContent = notifications;
    showToast("📢 تحديث جديد في قاعدة البيانات");
}

async function afterLogin(user) {
    openDashboard(user);
    await refreshDashboard();
    await loadKeys();
    await loadUsers();
    await loadActivity();
}

// --- Initialize ---
checkSession();
