/* KINGDZ ADMIN PANEL - SUPABASE REALTIME & EDGE ENGINE */
const API_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co/functions/v1/admin-users";

let ADMIN_TOKEN = localStorage.getItem("admin_token");
let liveClock = null;

// 🔐 دالة الـ api الذكية (مع مانع الأخطاء والتوكن الاحتياطي لتفادي 401)
async function api(action, data = {}) {
  const currentToken = localStorage.getItem("admin_token") || ADMIN_TOKEN;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (currentToken || SUPABASE_KEY),
        "x-client-check": btoa(action + "_secure")
      },
      body: JSON.stringify({
        action,
        ...data,
        timestamp: Date.now()
      })
    });

    if (res.status === 401) {
      console.warn("Unauthorized request, check session.");
      return null;
    }

    if (!res.ok) {
      console.error("API ERROR:", res.status);
      return null;
    }

    return await res.json();

  } catch (err) {
    console.error("NETWORK ERROR:", err);
    return null;
  }
}

// 🔥 يمنع التلاعب بالـ console (basic)
(function () {
  const devtools = /./;
  devtools.toString = function () {
    this.opened = true;
  };

  setInterval(function () {
    if (devtools.opened) {
      document.body.innerHTML = "Blocked";
    }
  }, 1000);
})();

// 🚫 🔐 تعطيل inspect (حماية إضافية)
document.addEventListener("contextmenu", e => e.preventDefault());

document.addEventListener("keydown", e => {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.key === "u")
  ) {
    e.preventDefault();
  }
});

const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

client.auth.onAuthStateChange((event, session) => {
    if (session) {
        ADMIN_TOKEN = session.access_token;
        localStorage.setItem("admin_token", ADMIN_TOKEN);
    } else {
        ADMIN_TOKEN = null;
        localStorage.removeItem("admin_token");
    }
});

let statsChart = null;
let deviceChart = null;

async function addActivity(type, action, deviceId = "", details = "") {
    const res = await api("add_activity", {
        type,
        action,
        device_id: deviceId,
        details
    });

    if (res && res.error) {
        console.error("Activity Log Error:", res.error);
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
            if (targetSection === 'home-section' || targetSection === 'keys-section' || targetSection === 'ban-section' || targetSection === 'users-section' || targetSection === 'stats-section') {
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
        
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });
        if (error) { 
            if(errorEl) errorEl.textContent = "بيانات الدخول خاطئة!"; 
            return; 
        }
        if (data && data.session && data.session.access_token) {
            localStorage.setItem("admin_token", data.session.access_token);
            ADMIN_TOKEN = data.session.access_token;
        }
        checkSession();
    };
}

if (document.getElementById("logout")) {
    document.getElementById("logout").onclick = async () => {
        await client.auth.signOut();
        localStorage.removeItem("admin_token");
        location.reload();
    };
}

// 3. المحرك الموحد لجلب البيانات الحقيقية وتعبئة جداول الإحصائيات
async function refreshDashboard() {
    const usersRes = await api("get_all_users");
    const keysRes = await api("get_keys");

    const uData = (usersRes && (usersRes.data || usersRes)) || [];
    const kData = (keysRes && (keysRes.data || keysRes)) || [];

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
    updateDeviceChart(uData);
    
    await loadStats(uData, kData);
    await loadActivityLogs();
    
    await loadNewVipList();
    await loadNewBanList();
}

function updateDeviceChart(users) {
    const canvas = document.getElementById("deviceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const brands = {};

    users.forEach(user => {
        const brand = user.brand || user.manufacturer || "Unknown";
        brands[brand] = (brands[brand] || 0) + 1;
    });

    const labels = Object.keys(brands);
    const values = Object.values(brands);

    if (deviceChart) deviceChart.destroy();

    deviceChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: ["#8b5cf6", "#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            cutout: "72%"
        }
    });

    const total = users.length;
    document.getElementById("totalDeviceCount").textContent = total;
    const list = document.getElementById("deviceStatsList");
    if (!list) return;

    if (labels.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-500 text-[10px]">لا توجد بيانات</div>`;
        return;
    }

    list.innerHTML = labels.map((label, i) => {
        const percent = Math.round(values[i] / total * 100);
        return `<div class="flex justify-between text-[10px]"><span class="text-gray-300">${label}</span><span class="text-purple-400 font-bold">${percent}%</span></div>`;
    }).join("");
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString();
}

// 📈 دالة تحديث الإحصائيات وجلب البيانات من الجداول (users و registrations)
async function loadStats(uData = null, kData = null) {
    let u = uData;
    let k = kData;

    // جلب البيانات تلقائياً في حال لم يتم تمريرها
    if (!u || !k) {
        const usersRes = await api("get_all_users");
        const keysRes = await api("get_keys");
        u = (usersRes && (usersRes.data || usersRes)) || [];
        k = (keysRes && (keysRes.data || keysRes)) || [];
    }

    // جلب الإيميلات وأكواد التفعيل من جدول registrations (يتطلب دالة backend "get_registrations" في Edge Function)
    const regRes = await api("get_registrations");
    const rData = (regRes && (regRes.data || regRes)) || [];

    const now = Date.now();
    
    // 1. تحديث البطاقات الرئيسية (Home)
    if(document.getElementById("statsUsers")) document.getElementById("statsUsers").textContent = u.length;
    if(document.getElementById("statsOnline")) document.getElementById("statsOnline").textContent = u.filter(user => user.last_online && (now - new Date(user.last_online).getTime()) < 60000).length;
    if(document.getElementById("statsVip")) document.getElementById("statsVip").textContent = u.filter(user => user.vip).length;
    if(document.getElementById("statsBanned")) document.getElementById("statsBanned").textContent = u.filter(user => user.banned).length;
    
    if(document.getElementById("statsKeys")) document.getElementById("statsKeys").textContent = k.length;
    if(document.getElementById("statsKeysNew")) document.getElementById("statsKeysNew").textContent = k.filter(key => key.status === "new").length;
    if(document.getElementById("statsKeysUsed")) document.getElementById("statsKeysUsed").textContent = k.filter(key => key.status === "used").length;
    
    const activeVips = u.filter(user => user.vip && user.vip_until && new Date(user.vip_until) > new Date()).length;
    if(document.getElementById("statsVipActive")) document.getElementById("statsVipActive").textContent = activeVips;
    if(document.getElementById("activeVipCount")) document.getElementById("activeVipCount").textContent = activeVips;

    const newEmailsCount = rData.filter(r => r.email && r.email.trim() !== "").length;
    if(document.getElementById("statsNewEmails")) document.getElementById("statsNewEmails").textContent = newEmailsCount;

    const passwordChangesCount = u.filter(user => user.password_changed || user.password_attempts > 0 || user.reset_password_count > 0).length;
    if(document.getElementById("statsPasswordChanges")) document.getElementById("statsPasswordChanges").textContent = passwordChangesCount;

    const usedKeysCount = k.filter(key => key.status === "used").length;
    const totalKeysCount = k.length;
    if(document.getElementById("statsActivationKeysInfo")) {
        document.getElementById("statsActivationKeysInfo").textContent = `${usedKeysCount} /${totalKeysCount}`;
    }

    // 2. 🎯 تعبئة الجدول الجديد الخاص بالإيميلات وأكواد التفعيل ديناميكياً (الربط بين users و registrations)
    const statsDataTable = document.getElementById("statsDataTable");
    if (statsDataTable) {
        if (u.length === 0) {
            statsDataTable.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">لا توجد بيانات مسجلة حالياً</td></tr>`;
        } else {
            statsDataTable.innerHTML = u.map(user => {
                // البحث عن التسجيل المطابق في جدول registrations عبر device_id
                const registration = rData.find(r => r.device_id === user.device_id);
                const email = (registration && registration.email) || "غير متوفر";
                const activationKey = (registration && registration.activation_key) || "غير مستخدم";
                
                // جلب حالة الحظر وحالة الـ VIP من جدول users
                const passwordStatus = user.password_attempts > 0 
                    ? '<span class="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg">محاولة (' + user.password_attempts + ')</span>' 
                    : '<span class="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-lg">عادي</span>';
                
                let statusHtml = '<span class="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg">نشط</span>';
                if (user.banned) {
                    statusHtml = '<span class="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg">محظور</span>';
                } else if (user.vip) {
                    statusHtml = '<span class="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg">VIP</span>';
                }

                return `
                    <tr>
                        <td class="p-3 text-white font-medium select-all">${email}</td>
                        <td class="p-3">${passwordStatus}</td>
                        <td class="p-3 font-mono text-purple-400 font-bold tracking-wider select-all">${activationKey}</td>
                        <td class="p-3 text-gray-400 text-center">${statusHtml}</td>
                    </tr>
                `;
            }).join("");
        }
    }
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
            <td class="p-2.5
