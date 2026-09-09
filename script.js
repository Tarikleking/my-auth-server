/* KINGDZ ADMIN PANEL - SUPABASE REALTIME & EDGE ENGINE */
const API_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co/functions/v1/admin-users";

let ADMIN_TOKEN = localStorage.getItem("admin_token");
let liveClock = null;

// 🔐 دالة الـ api الذكية
async function api(action, data = {}) {
  const currentToken = localStorage.getItem("admin_token") || ADMIN_TOKEN;

  if (!currentToken) {
    console.warn("No admin token found. Please login.");
    return null;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + currentToken,
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
      localStorage.removeItem("admin_token");
      location.reload();
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
            } else if (targetSection === 'settings-section') {
                loadSettings();
            }
        }
    });
});

// 2. فحص وتأمين الجلسة
async function checkSession() {
    const { data } = await client.auth.getSession();
    if (document.getElementById("loading")) document.getElementById("loading").style.display = "none";
    
    if (data.session) {
        afterLogin();
    } else {
        if (document.getElementById("loginPage")) document.getElementById("loginPage").style.display = "flex";
    }
}

// 🔐 إدارة تسجيل الدخول مع التحقق الثنائي (2FA via OTP)
if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").onclick = async () => {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const errorEl = document.getElementById("loginError");
        if(errorEl) errorEl.textContent = "";
        
        if (!email || !password) {
            if(errorEl) errorEl.textContent = "الرجاء إدخال البريد وكلمة المرور!";
            return;
        }

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) { 
            if(errorEl) errorEl.textContent = "بيانات الدخول خاطئة!"; 
            return; 
        }

        if (data && data.session) {
            const { error: otpError } = await client.auth.signInWithOtp({ email });
            if (otpError) {
                if(errorEl) errorEl.textContent = "فشل إرسال رمز التحقق الثنائي (2FA)";
                return;
            }
            show2FAModal(email);
        }
    };
}

function show2FAModal(email) {
    const loginPage = document.getElementById("loginPage");
    if (!loginPage) return;

    loginPage.innerHTML = `
        <div class="glass-card p-8 rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-purple-500/20 text-center">
            <h1 class="text-2xl font-black text-white tracking-wider mb-2">التحقق الثنائي <span class="text-purple-500">2FA</span></h1>
            <p class="text-gray-400 text-xs mb-6">تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني.</p>
            
            <div class="space-y-4">
                <input type="text" id="otpCode" maxlength="6" class="w-full bg-[#161b26] border border-white/15 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none focus:border-purple-500 font-mono" placeholder="------">
                <div id="otpError" class="text-red-400 text-xs font-medium"></div>
                <button id="verifyOtpBtn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-600/30">تأكيد الرمز والدخول</button>
                <button type="button" onclick="location.reload()" class="text-xs text-gray-400 hover:underline mt-2 block mx-auto">إلغاء والعودة</button>
            </div>
        </div>
    `;

    document.getElementById("verifyOtpBtn").onclick = async () => {
        const token = document.getElementById("otpCode").value.trim();
        const errDiv = document.getElementById("otpError");
        if (!token || token.length < 6) {
            errDiv.textContent = "الرجاء إدخال الرمز المكون من 6 أرقام كاملاً";
            return;
        }

        errDiv.textContent = "جاري التحقق...";
        const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });

        if (error || !data.session) {
            errDiv.textContent = "رمز التحقق غير صحيح أو منتهي الصلاحية";
        } else {
            localStorage.setItem("admin_token", data.session.access_token);
            ADMIN_TOKEN = data.session.access_token;
            showToast("تم التحقق وتسجيل الدخول بنجاح!");
            setTimeout(() => { location.reload(); }, 1000);
        }
    };
}

document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "forgotPasswordBtn") {
        const email = document.getElementById("email").value.trim();
        const errorEl = document.getElementById("loginError");
        if (!email) {
            if (errorEl) errorEl.textContent = "الرجاء كتابة بريدك الإلكتروني في خانة الإيميل أولاً!";
            return;
        }
        
        if (errorEl) errorEl.textContent = "جاري إرسال رابط الاستعادة...";
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });

        if (error) {
            if (errorEl) errorEl.textContent = "خطأ: " + error.message;
        } else {
            if (errorEl) errorEl.textContent = "تم إرسال رابط استعادة كلمة المرور إلى بريدك!";
            errorEl.className = "text-green-400 text-xs text-center font-medium";
        }
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.querySelector("#loginPage .glass-card, #loginPage > div");
    if (loginCard && !document.getElementById("forgotPasswordBtn")) {
        const forgotBtn = document.createElement("button");
        forgotBtn.type = "button";
        forgotBtn.id = "forgotPasswordBtn";
        forgotBtn.className = "text-xs text-purple-400 hover:underline mt-3 block mx-auto text-center";
        forgotBtn.textContent = "نسيت كلمة المرور؟";
        loginCard.appendChild(forgotBtn);
    }
});

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
               (Date.now() - new Date(u.last_online).getTime()) < 300000;
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
    const totalDevEl = document.getElementById("totalDeviceCount");
    if(totalDevEl) totalDevEl.textContent = total;
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

async function loadStats(uData = null, kData = null) {
    let u = uData;
    let k = kData;

    if (!u || !k) {
        const usersRes = await api("get_all_users");
        const keysRes = await api("get_keys");
        u = (usersRes && (usersRes.data || usersRes)) || [];
        k = (keysRes && (keysRes.data || keysRes)) || [];
    }

    const regRes = await api("get_registrations");
    const rData = (regRes && (regRes.data || regRes)) || [];

    const now = Date.now();
    
    if(document.getElementById("statsUsers")) document.getElementById("statsUsers").textContent = u.length;
    if(document.getElementById("statsOnline")) document.getElementById("statsOnline").textContent = u.filter(user => user.last_online && (now - new Date(user.last_online).getTime()) < 300000).length;
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

    const usedKeysCount = k.filter(key => key.status === "used").length;
    const totalKeysCount = k.length;
    if(document.getElementById("statsActivationKeysInfo")) {
        document.getElementById("statsActivationKeysInfo").textContent = `${usedKeysCount} / ${totalKeysCount}`;
    }

    const statsDataTable = document.getElementById("statsDataTable");
    if (statsDataTable) {
        if (rData.length === 0) {
            statsDataTable.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">لا توجد بيانات مسجلة حالياً</td></tr>`;
        } else {
            statsDataTable.innerHTML = rData.map(reg => {
                const email = reg.email || "غير متوفر";
                const activationKey = reg.activation_key || "KING-DZ-XXXX";
                
                const matchedUser = u.find(user => (user.device_id || user.id || user.uuid) === reg.username) || {};
                const deviceId = matchedUser.device_id || matchedUser.id || matchedUser.uuid || reg.username || "غير مسجل/مرتبط بعد";
                
                let statusHtml = '<span class="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg">مسجل</span>';
                if (reg.approved) {
                    statusHtml = '<span class="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg">موافق عليه</span>';
                }

                return `
                    <tr class="hover:bg-white/[0.02] border-b border-white/5">
                        <td class="p-3 text-center"><input type="checkbox" class="stat-checkbox accent-purple-600 rounded w-4 h-4" data-id="${reg.id || ''}" data-email="${email}"></td>
                        <td class="p-3 text-white font-medium select-all">${email}</td>
                        <td class="p-3 font-mono text-xs text-purple-300 select-all">${deviceId}</td>
                        <td class="p-3 font-mono text-purple-400 font-bold tracking-wider select-all">${activationKey}</td>
                        <td class="p-3 text-gray-400 text-center">${statusHtml}</td>
                    </tr>
                `;
            }).join("");
        }
    }
}

document.addEventListener('click', async function(event) {
    const target = event.target.closest('#btnSelectAllStats, #btnCopySelectedStats, #btnDeleteSelectedStats');
    if (!target) return;

    if (target.id === 'btnSelectAllStats') {
        const checkboxes = document.querySelectorAll("#statsDataTable .stat-checkbox");
        if (checkboxes.length === 0) return;
        const allChecked = [...checkboxes].every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
    }

    if (target.id === 'btnCopySelectedStats') {
        const checked = [...document.querySelectorAll("#statsDataTable .stat-checkbox:checked")];
        if (checked.length === 0) { 
            if(typeof showToast === 'function') showToast("حدد إيميل واحد على الأقل"); 
            else alert("حدد إيميل واحد على الأقل"); 
            return; 
        }
        const emails = checked.map(c => c.dataset.email).join("\n");
        await navigator.clipboard.writeText(emails);
        if(typeof showToast === 'function') showToast("تم نسخ " + checked.length + " إيميل بنجاح");
        else alert("تم النسخ!");
    }

    if (target.id === 'btnDeleteSelectedStats') {
        const checked = [...document.querySelectorAll("#statsDataTable .stat-checkbox:checked")];
        if (checked.length === 0) { 
            if(typeof showToast === 'function') showToast("حدد إيميل واحد على الأقل للحذف"); 
            else alert("حدد إيميل واحد على الأقل للحذف"); 
            return; 
        }
        
        if (!confirm("هل أنت متأكد من حذف " + checked.length + " إيميل مسجل؟")) return;

        for (const cb of checked) {
            const id = cb.dataset.id;
            if (id) {
                await api("delete_registration", { id: Number(id) });
            } else {
                cb.closest("tr")?.remove();
            }
        }
        
        if(typeof showToast === 'function') showToast("تم حذف الإيميلات المحددة بنجاح");
        refreshDashboard();
    }
});

function renderMainUsersTable(users) {
    const tbody = document.getElementById("usersTable");
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500 text-[10px]">لا توجد أجهزة متصلة بالسيرفر حالياً.</td></tr>`;
        return;
    }
   
    const latest = users.slice(-4).reverse();
    const now = Date.now();
    tbody.innerHTML = latest.map(u => {
        const devId = u.device_id || u.id || u.uuid || u.device || "Unknown";
        return `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2.5 pr-4">
                <div class="flex items-center gap-2">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${devId}" class="w-6 h-6 rounded-full bg-[#111622]">
                    <span class="font-bold text-purple-300 text-[11px] select-all">${devId}</span>
                </div>
            </td>
            <td class="p-2.5 text-gray-400">${u.country || 'الجزائر 🇩🇿'}</td>
            <td class="p-2.5 text-gray-500 font-medium">${u.model || u.manufacturer || 'Smartphone'}</td>
            <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-extrabold ${u.vip ? 'badge-vip-gold' : 'badge-monthly'}">${u.vip ? 'VIP👑' : 'FREE'}</span></td>
            <td class="p-2.5">
                <span class="inline-flex items-center gap-1 font-bold ${u.banned ? 'text-red-400' : (u.last_online && (now - new Date(u.last_online).getTime()) < 300000) ? 'text-green-400' : 'text-gray-500'} text-[10px]">
                    <span class="w-1 h-1 rounded-full bg-current"></span>
                    ${u.banned ? 'محظور' : (u.last_online && (now - new Date(u.last_online).getTime()) < 300000) ? '🟢 متصل الآن' : '⚫ غير متصل'}
                </span>
            </td>
            <td class="p-2.5 text-center pl-4">
                <button onclick="openDrawer('${devId}')" class="p-1 text-purple-400 hover:bg-purple-500/10 rounded-md"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
    `;}).join('');
    lucide.createIcons();
}

function renderAllUsersTable(users) {
    const tbody = document.getElementById("allUsersTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    const now = Date.now();
    users.forEach(u => {
        const devId = u.device_id || u.id || u.uuid || u.device || "Unknown";
        const online = u.last_online && (now - new Date(u.last_online).getTime()) < 300000;
        const statusText = u.banned ? "🚫 محظور" : (online ? "🟢 متصل الآن" : "⚫ غير متصل");
        const device = u.model || u.device_type || u.manufacturer || "--";
        const vip = u.vip ? '<span class="text-yellow-400 font-bold">👑 VIP</span>' : '<span class="text-gray-400">FREE</span>';
        const row = document.createElement("tr");
        row.innerHTML = `<td>${u.country || '--'}</td><td>${device}</td><td>${statusText}</td><td>${vip}</td><td class="text-yellow-400 font-bold">${u.duration_type || '--'}</td><td>${u.vip_until ? getRemainingTime(u.vip_until) : '--'}</td><td>${formatDate(u.vip_until)}</td><td style="color:${u.cheat_detected ? '#f87171' : '#4ade80'}">${u.cheat_detected ? '🚫 كشف' : '✅ نظيف'}</td><td><button onclick="openDrawer('${devId}')" class="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white">إدارة</button></td>`;
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
            const res = await api("create_key", { key: randomCode, duration: durationType, duration_type: durationType, status: "new", created_at: new Date().toISOString(), expires_at: expireDate.toISOString() });
            if (res && !res.error) successCount++;
        }
       if (successCount > 0) {
            showToast("تم توليد " + successCount + " مفتاح");
            refreshDashboard();
        }
    };
}

function renderKeysTable(keys) {
    const tbody = document.getElementById("keysListTable");
    if (!tbody) return;
    tbody.innerHTML = keys.slice().reverse().map(k => `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 text-center"><input type="checkbox" class="key-checkbox accent-purple-600 rounded" data-id="${k.id}" data-key="${k.key}"></td>
            <td class="p-2 pr-4 font-mono font-bold text-purple-400 text-[10px] select-all cursor-pointer">${k.key}</td>
            <td class="p-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">${k.duration_type || 'STANDARD'}</span></td>
            <td class="p-2 text-gray-400">${k.duration || 'غير محدد'}</td>
            <td class="p-2 text-[10px] font-bold ${k.status === 'new' ? 'text-green-400' : 'text-gray-500'}">${k.status === 'new' ? 'جاهز' : 'مستعمل'}</td>
            <td class="p-2 text-center pl-4"><button onclick="deleteKeyRow(${k.id})" class="p-1 text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
    initSelectAllButton();
}

if (document.getElementById("btnApplyBan")) {
    document.getElementById("btnApplyBan").onclick = async () => {
        const targetDeviceId = document.getElementById("banDeviceId").value.trim();
        if (!targetDeviceId) return;
        const res = await api("ban_user", { device_id: targetDeviceId, banned: true });
        if (res && !res.error) { showToast("تم الحظر 🚫"); refreshDashboard(); }
    };
}

function renderBannedTable(users) {
    const tbody = document.getElementById("bannedDevicesTable");
    if (!tbody) return;
    const bannedList = users.filter(u => u.banned === true);
    tbody.innerHTML = bannedList.reverse().map(b => {
        const devId = b.device_id || b.id || b.uuid || b.device || "Unknown";
        return `
        <tr class="hover:bg-white/[0.005]">
            <td class="p-2 pr-4 text-red-400 font-bold font-mono text-[10px]">${devId}</td>
            <td class="p-2 text-gray-400">${b.model || '---'}</td>
            <td class="p-2 text-center pl-4"><button onclick="liftUserBan('${devId}')" class="text-green-400 font-bold text-[9px]">فك الحظر</button></td>
        </tr>
    `;}).join('');
}

async function liftUserBan(deviceId) {
    const res = await api("ban_user", { device_id: deviceId, banned: false });
    if (res && !res.error) {
        showToast("تم فك الحظر");
        refreshDashboard();
    }
}

async function deleteUserRow(deviceId) {
    if (confirm("حذف الجهاز نهائياً؟")) {
        const res = await api("delete_user", { device_id: deviceId });
        if (res && !res.error) {
            showToast("تم الحذف");
            refreshDashboard();
        }
    }
}

async function deleteKeyRow(id) {
    if (confirm("حذف المفتاح نهائياً؟")) {
        const res = await api("delete_key", { id });
        if (res && !res.error) {
            showToast("تم الحذف");
            refreshDashboard();
        }
    }
}

if (document.getElementById("btnGrantVip")) {
    document.getElementById("btnGrantVip").onclick = async () => {
        const targetDeviceId = document.getElementById("vipDeviceId").value.trim();
        if (!targetDeviceId) return;
        const res = await api("update_vip", { device_id: targetDeviceId, vip: true });
        if (res && !res.error) {
            showToast("تم الترقية لـ VIP ✨");
            refreshDashboard();
        }
    };
}

if (document.getElementById("btnRevokeVip")) {
    document.getElementById("btnRevokeVip").onclick = async () => {
        const targetDeviceId = document.getElementById("vipDeviceId").value.trim();
        if (!targetDeviceId) return;
        const res = await api("update_vip", { device_id: targetDeviceId, vip: false });
        if (res && !res.error) {
            showToast("تم سحب VIP");
            refreshDashboard();
        }
    };
}

function openDrawer(deviceId) { 
    const drawer = document.getElementById('userDrawer');
    if(drawer) drawer.style.right = '0'; 
    loadUserDetails(deviceId); 
}

function closeDrawer() { 
    const drawer = document.getElementById('userDrawer');
    if(drawer) drawer.style.right = '-450px'; 
}

// دالة loadUserDetails المحدثة والشاملة
async function loadUserDetails(deviceId) {
    const content = document.getElementById("drawerContent");

    if (!content) {
        console.error("drawerContent not found");
        return;
    }

    content.innerHTML = `
        <div class="flex items-center justify-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
    `;

    try {
        const data = await api("get_user_details", {
            device_id: deviceId
        });

        if (!data || !data.user) {
            content.innerHTML = `
                <div class="text-center py-10 text-red-400">
                    لم يتم العثور على بيانات المستخدم
                </div>
            `;
            return;
        }

        const user = data.user;

        // حماية النصوص من HTML
        const esc = (value) => {
            if (value === null || value === undefined || value === "") {
                return "—";
            }

            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const yesNo = (value) => {
            return value === true
                ? '<span class="text-green-400">نعم</span>'
                : '<span class="text-gray-400">لا</span>';
        };

        const dateValue = (value) => {
            if (!value) return "—";

            try {
                return formatDate(value);
            } catch (e) {
                return esc(value);
            }
        };

        const vipRemaining = user.vip_until
            ? getRemainingTime(user.vip_until)
            : "—";

        content.innerHTML = `
            <div class="space-y-4">

                <!-- الحساب -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-purple-400 font-bold mb-3">
                        👤 معلومات الحساب
                    </h3>

                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">اسم المستخدم</span>
                            <span class="text-white font-medium break-all">
                                ${esc(user.username)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">Device ID</span>
                            <span class="text-white font-mono text-xs break-all">
                                ${esc(user.device_id)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">User ID</span>
                            <span class="text-white font-mono text-xs break-all">
                                ${esc(user.id)}
                            </span>
                        </div>
                    </div>
                </div>


                <!-- الرصيد -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-yellow-400 font-bold mb-3">
                        💰 الرصيد
                    </h3>

                    <div class="grid grid-cols-2 gap-3">

                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-gray-400 text-xs">
                                USD
                            </div>
                            <div class="text-green-400 text-lg font-bold mt-1">
                                $${esc(user.balance_usd)}
                            </div>
                        </div>

                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-gray-400 text-xs">
                                DZD
                            </div>
                            <div class="text-green-400 text-lg font-bold mt-1">
                                ${esc(user.balance_dzd)} DA
                            </div>
                        </div>

                    </div>
                </div>


                <!-- VIP -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-purple-400 font-bold mb-3">
                        ⭐ معلومات VIP
                    </h3>

                    <div class="space-y-2 text-sm">

                        <div class="flex justify-between">
                            <span class="text-gray-400">VIP</span>
                            <span>
                                ${yesNo(user.vip)}
                            </span>
                        </div>

                        <div class="flex justify-between">
                            <span class="text-gray-400">نوع المدة</span>
                            <span class="text-white">
                                ${esc(user.duration_type)}
                            </span>
                        </div>

                        <div class="flex justify-between">
                            <span class="text-gray-400">ينتهي في</span>
                            <span class="text-white text-xs">
                                ${dateValue(user.vip_until)}
                            </span>
                        </div>

                        <div class="flex justify-between">
                            <span class="text-gray-400">المدة المتبقية</span>
                            <span class="text-yellow-400 font-medium">
                                ${esc(vipRemaining)}
                            </span>
                        </div>

                    </div>
                </div>


                <!-- الجهاز -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-blue-400 font-bold mb-3">
                        📱 معلومات الجهاز
                    </h3>

                    <div class="space-y-2 text-sm">

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">الموديل</span>
                            <span class="text-white">
                                ${esc(user.model)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">الشركة المصنعة</span>
                            <span class="text-white">
                                ${esc(user.manufacturer)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">Brand</span>
                            <span class="text-white">
                                ${esc(user.brand)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">Android</span>
                            <span class="text-white">
                                ${esc(user.android_version)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">SDK</span>
                            <span class="text-white">
                                ${esc(user.sdk)}
                            </span>
                        </div>

                    </div>
                </div>


                <!-- الاتصال والنشاط -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-cyan-400 font-bold mb-3">
                        🌐 النشاط والاتصال
                    </h3>

                    <div class="space-y-2 text-sm">

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">الدولة</span>
                            <span class="text-white">
                                ${esc(user.country)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">اللغة</span>
                            <span class="text-white">
                                ${esc(user.language)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">آخر ظهور</span>
                            <span class="text-white text-xs">
                                ${dateValue(user.last_online)}
                            </span>
                        </div>

                        <div class="flex justify-between">
                            <span class="text-gray-400">عدد تسجيلات الدخول</span>
                            <span class="text-white font-bold">
                                ${esc(user.login_count)}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">أول تسجيل دخول</span>
                            <span class="text-white text-xs">
                                ${dateValue(user.first_login)}
                            </span>
                        </div>

                    </div>
                </div>


                <!-- البطارية -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-green-400 font-bold mb-3">
                        🔋 البطارية
                    </h3>

                    <div class="space-y-2 text-sm">

                        <div class="flex justify-between">
                            <span class="text-gray-400">نسبة البطارية</span>
                            <span class="text-white font-bold">
                                ${esc(user.battery)}%
                            </span>
                        </div>

                        <div class="flex justify-between">
                            <span class="text-gray-400">الشحن</span>
                            <span>
                                ${yesNo(user.charging)}
                            </span>
                        </div>

                    </div>
                </div>


                <!-- الأمان -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-red-400 font-bold mb-3">
                        🛡️ الأمان
                    </h3>

                    <div class="space-y-2 text-sm">

                        <div class="flex justify-between">
                            <span class="text-gray-400">محظور</span>
                            <span>
                                ${yesNo(user.banned)}
                            </span>
                        </div>

                        <div class="flex justify-between">
                            <span class="text-gray-400">Cheat Detected</span>
                            <span>
                                ${yesNo(user.cheat_detected)}
                            </span>
                        </div>

                    </div>
                </div>


                <!-- التحكم -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-orange-400 font-bold mb-3">
                        ⚙️ التحكم
                    </h3>

                    <div class="flex gap-2">

                        <button
                            onclick="handleAction('vip','${esc(user.device_id)}')"
                            class="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold">
                            ${user.vip === true ? "إلغاء VIP" : "منح VIP"}
                        </button>

                        <button
                            onclick="handleAction('ban','${esc(user.device_id)}')"
                            class="flex-1 px-3 py-2 rounded-lg ${
                                user.banned === true
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                            } text-white text-sm font-bold">
                            ${user.banned === true ? "إلغاء الحظر" : "حظر"}
                        </button>

                    </div>
                </div>

            </div>
        `;

    } catch (error) {
        console.error("loadUserDetails error:", error);

        content.innerHTML = `
            <div class="text-center py-10">
                <div class="text-red-400 font-bold mb-2">
                    ❌ فشل تحميل بيانات المستخدم
                </div>

                <div class="text-gray-500 text-xs break-all">
                    ${esc(error.message || error)}
                </div>
            </div>
        `;
    }
}

// دالة handleAction المحدثة بالكامل
async function handleAction(action, deviceId) {
    if (!deviceId) {
        showToast("Device ID غير موجود");
        return;
    }

    try {
        const userRes = await api("get_user_details", {
            device_id: deviceId
        });

        if (!userRes || !userRes.user) {
            showToast("تعذر العثور على المستخدم");
            return;
        }

        const user = userRes.user;

        if (action === "ban") {
            const newStatus = user.banned !== true;

            const res = await api("ban_user", {
                device_id: deviceId,
                banned: newStatus
            });

            if (!res || res.error) {
                showToast("فشل تغيير حالة الحظر");
                return;
            }

            showToast(newStatus ? "تم حظر المستخدم 🚫" : "تم فك حظر المستخدم ✅");
        }

        else if (action === "vip") {
            const newStatus = user.vip !== true;

            const res = await api("update_vip", {
                device_id: deviceId,
                vip: newStatus
            });

            if (!res || res.error) {
                showToast("فشل تغيير حالة VIP");
                return;
            }

            showToast(newStatus ? "تم منح VIP 👑" : "تم سحب VIP");
        }

        else if (action === "delete") {
            if (!confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) {
                return;
            }

            const res = await api("delete_user", {
                device_id: deviceId
            });

            if (!res || res.error) {
                showToast("فشل حذف المستخدم");
                return;
            }

            showToast("تم حذف المستخدم");
        }

        closeDrawer();
        await refreshDashboard();

    } catch (error) {
        console.error("handleAction error:", error);
        showToast("حدث خطأ أثناء تنفيذ العملية");
    }
}

function updateMainCharts(users) {
    const lineCtx = document.getElementById("statsChart")?.getContext("2d");
    if (!lineCtx) return;

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();

    users.forEach(u => {
        const dateRaw = u.last_online || u.first_login || u.created_at;
        if (!dateRaw) return;
        const d = new Date(dateRaw);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
            counts[d.getDay()]++;
        }
    });

    if (statsChart) statsChart.destroy();
    statsChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: dayNames,
            datasets: [{
                label: 'الأجهزة النشطة',
                data: counts,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#a855f7',
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                }
            }
        }
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
    loadSettings();
    
    if (!liveClock) {
        liveClock = setInterval(() => {
            const liveTimeEl = document.getElementById("liveTime");
            if (liveTimeEl) {
                liveTimeEl.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
            }
        }, 1000);
    }
}

function formatDate(date) {
    if (!date) return "--";
    return new Date(date).toLocaleString("ar-DZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

let refreshTimer = null;
function debouncedRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
        refreshDashboard();
    }, 1200);
}

let logsTimer = null;
function debouncedLogs() {
    clearTimeout(logsTimer);
    logsTimer = setTimeout(() => {
        loadActivityLogs();
    }, 800);
}

client.channel('kingdz-realtime-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'keys' }, () => { debouncedRefresh(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { debouncedRefresh(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => { debouncedLogs(); })
    .subscribe();

document.getElementById("btnCopyAllKeys")?.addEventListener("click", async () => {
    const checked = document.querySelectorAll(".key-checkbox:checked");
    if (checked.length === 0) { showToast("حدد مفتاحًا واحدًا على الأقل"); return; }
    const keys = [...checked].map(cb => cb.dataset.key);
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
        btn.innerHTML = selectAll ? "❌ إلغاء التحديد" : "☑ تحديد الكل";
    };
}

document.getElementById("btnDeleteSelected")?.addEventListener("click", async () => {
    const checked = [...document.querySelectorAll(".key-checkbox:checked")];
    if (checked.length === 0) { showToast("حدد مفتاحًا واحدًا على الأقل"); return; }
    if (!confirm(`سيتم حذف ${checked.length} مفتاح، هل أنت متأكد؟`)) return;
    const ids = checked.map(cb => Number(cb.dataset.id));
    const res = await api("delete_keys_batch", { ids });
    if (!res || res.error) { showToast("فشل الحذف"); return; }
    showToast(`تم حذف ${ids.length} مفتاح`);
    refreshDashboard();
});

async function loadActivityLogs() {
    const container = document.getElementById("activityLogs");
    if (!container) return;
    const res = await api("get_logs");
    const data = (res && (res.data || res)) || null;
    if (!res || res.error) { container.innerHTML = `<div class="text-red-400 text-center">فشل تحميل السجلات</div>`; return; }
    if (!data || data.length === 0) { container.innerHTML = `<div class="text-gray-500 text-center py-8">لا توجد سجلات نشاط</div>`; return; }
    
    container.innerHTML = "";
    data.forEach(log => {
        let color = "text-purple-400"; 
        let icon = "📋";
        
        if (log.type === "USER" || log.type === "AUTH") { color = "text-blue-400"; icon = "👤"; }
        else if (log.type === "VIP") { color = "text-yellow-400"; icon = "👑"; }
        else if (log.type === "KEY") { color = "text-cyan-400"; icon = "🔑"; }
        else if (log.type === "ORDER") { color = "text-emerald-400"; icon = "📦"; }
        else if (log.type === "TOPUP" || log.type === "GAME") { color = "text-indigo-400"; icon = "🎮"; }
        else if (log.type === "PAYMENT") { color = "text-amber-400"; icon = "💳"; }
        else if (log.type === "NAVIGATION") { color = "text-gray-400"; icon = "🧭"; }
        else if (log.type === "AI") { color = "text-pink-400"; icon = "🤖"; }

        let actionName = log.action;
        const actionTranslations = {
            "APP_OPENED": "فتح التطبيق",
            "USER_LOGOUT": "تسجيل خروج",
            "SECTION_VIEWED": "تصفح قسم",
            "SERVICE_SELECTED": "تحديد خدمة",
            "GAME_VIEWED": "مشاهدة لعبة",
            "GAME_TOPUP_COMPLETED": "نجاح شحن اللعبة",
            "GAME_TOPUP_FAILED": "فشل شحن اللعبة",
            "ORDER_COMPLETED": "اكتمال طلب",
            "ORDER_FAILED": "فشل طلب",
            "BALANCE_RECHARGE_INITIATED": "بدء شحن رصيد",
            "KEY_ACTIVATED": "تفعيل مفتاح VIP",
            "KEY_ACTIVATION_FAILED": "فشل تفعيل مفتاح",
            "AI_CHAT_OPENED": "استخدام المساعد الذكي",
            "VIP_GRANTED": "منح VIP",
            "VIP_REVOKED": "سحب VIP",
            "USER_DELETED": "حذف مستخدم",
            "USER_BANNED": "حظر مستخدم",
            "USER_UNBANNED": "فك حظر مستخدم",
            "KEY_CREATED": "إنشاء مفتاح",
            "KEY_DELETED": "حذف مفتاح",
            "KEYS_DELETED": "حذف عدة مفاتيح"
        };
        if (actionTranslations[log.action]) {
            actionName = actionTranslations[log.action];
        }

        let displayHtml = "";
        let isJsonParsed = false;

        try {
            if (log.details && (log.details.startsWith("{") || log.details.startsWith("["))) {
                const parsed = JSON.parse(log.details);
                isJsonParsed = true;

                const username = parsed.username && parsed.username !== "Unknown" ? parsed.username : (log.device_id || "مستخدم");
                const service = parsed.service && parsed.service !== "N/A" ? `<span class="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs ml-2">${parsed.service}</span>` : "";
                const amount = parsed.amount > 0 ? `<span class="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs ml-2">${parsed.amount} ${parsed.currency || ''}</span>` : "";
                const msg = parsed.message ? parsed.message : "";

                displayHtml = `
                    <div class="flex flex-wrap items-center gap-1 text-xs text-gray-300 mt-1">
                        <span class="text-white font-bold">${username}</span>: 
                        <span>${msg}</span>
                        ${service}
                        ${amount}
                    </div>
                `;
            }
        } catch (e) {
            isJsonParsed = false;
        }

        if (!isJsonParsed) {
            displayHtml = `<div class="text-white text-xs mt-1">${log.details || "--"}</div>`;
        }

        container.innerHTML += `
            <div class="glass-card p-4 rounded-xl border border-white/5 hover:border-purple-500/40 transition-all flex items-center gap-3">
                <input type="checkbox" class="log-checkbox w-4 h-4 accent-purple-600" data-id="${log.id}">
                <div class="flex-1 flex justify-between items-start">
                    <div class="text-right">
                        <div class="${color} font-bold text-sm flex items-center gap-2">
                            <span>${icon}</span>
                            <span>${actionName}</span>
                            ${log.device_id ? `<span class="text-[10px] text-gray-500 font-mono">(${log.device_id})</span>` : ''}
                        </div>
                        ${displayHtml}
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-400">🕒 ${formatDate(log.created_at)}</span>
                        <button onclick="deleteActivityLog('${log.id}')" class="text-red-500 hover:text-red-400 transition text-lg" title="حذف السجل">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });
}

async function deleteActivityLog(id) {
    if (!confirm("حذف هذا السجل؟")) return;
    const res = await api("delete_log", { id });
    if (res && !res.error) { showToast("تم حذف السجل"); loadActivityLogs(); }
}

document.getElementById("btnRefreshActivity")?.addEventListener("click", () => { loadActivityLogs(); showToast("تم تحديث سجل النشاط"); });
document.getElementById("btnSelectAllLogs")?.addEventListener("click", () => {
    const checkboxes = document.querySelectorAll(".log-checkbox");
    const allChecked = [...checkboxes].every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
});

document.getElementById("btnDeleteSelectedLogs")?.addEventListener("click", async () => {
    const checked = [...document.querySelectorAll(".log-checkbox:checked")];
    if (checked.length === 0) { showToast("حدد سجلاً واحداً على الأقل"); return; }
    if (!confirm(`سيتم حذف ${checked.length} سجل، هل أنت متأكد؟`)) return;
    for (const cb of checked) await api("delete_log", { id: cb.dataset.id });
    showToast("تم الحذف بنجاح");
    loadActivityLogs();
});

async function loadSettings() {
    const res = await api("get_settings");
    const data = (res && (res.data || res)) || null;
    if (!res || res.error || !data) return;
    document.getElementById("mod_enabled").checked = !!data.mod_enabled;
    document.getElementById("vip_enabled").checked = !!data.vip_enabled;
    document.getElementById("force_update").checked = !!data.force_update;
    document.getElementById("latest_version").value = data.latest_version || "";
    document.getElementById("message").value = data.message || "";
    document.getElementById("maintenance_message").value = data.maintenance_message || "";
    document.getElementById("update_url").value = data.update_url || "";
    
    const rateEl = document.getElementById("usd_to_dzd");
    if (rateEl) {
        rateEl.value = data.usd_to_dzd || 300;
    }
}

document.getElementById("btnSaveSettings")?.addEventListener("click", async () => {
    const payload = {
        mod_enabled: document.getElementById("mod_enabled").checked,
        vip_enabled: document.getElementById("vip_enabled").checked,
        force_update: document.getElementById("force_update").checked,
        latest_version: document.getElementById("latest_version").value,
        message: document.getElementById("message").value,
        maintenance_message: document.getElementById("maintenance_message").value,
        update_url: document.getElementById("update_url").value
    };

    const rateInput = document.getElementById("usd_to_dzd");
    if (rateInput && rateInput.value) {
        payload.usd_to_dzd = Number(rateInput.value);
    }

    const res = await api("update_settings", payload);
    if (!res || res.error) showToast("فشل حفظ الإعدادات");
    else showToast("تم حفظ الإعدادات بنجاح");
});

async function loadNewVipList() {
    const selectElement = document.getElementById("vipDeviceId");
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="" disabled selected>اختر...</option>';

    try {
        const usersRes = await api("get_all_users");
        const users = (usersRes && (usersRes.data || usersRes)) || [];

        if (Array.isArray(users) && users.length > 0) {
            users.forEach(user => {
                const deviceId = user.device_id || user.id || user.uuid || user.device;
                if (!deviceId) return;

                const option = document.createElement("option");
                option.value = deviceId;
                const badge = user.vip ? "⭐" : "☆";
                option.textContent = `${badge} ${deviceId}`;
                selectElement.appendChild(option);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadNewBanList() {
    const selectElement = document.getElementById("banDeviceId");
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="" disabled selected>اختر الجهاز للحظر...</option>';

    try {
        const usersRes = await api("get_all_users");
        const users = (usersRes && (usersRes.data || usersRes)) || [];

        if (Array.isArray(users) && users.length > 0) {
            users.forEach(user => {
                const deviceId = user.device_id || user.id || user.uuid || user.device;
                if (!deviceId) return;

                const option = document.createElement("option");
                option.value = deviceId;
                const badge = user.vip ? "⭐" : "☆";
                option.textContent = `${badge} ${deviceId}`;
                selectElement.appendChild(option);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

checkSession();
