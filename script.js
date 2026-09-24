/* KINGDZ ADMIN PANEL - SUPABASE REALTIME & EDGE ENGINE */
const API_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co/functions/v1/admin-users";

let ADMIN_TOKEN = localStorage.getItem("admin_token");
let liveClock = null;

// 🔐 دالة API - نسخة تشخيصية
async function api(action, data = {}) {
  const currentToken = localStorage.getItem("admin_token") || ADMIN_TOKEN;

  if (!currentToken) {
    console.warn("No admin token found. Please login.");
    return null;
  }

  console.log("API REQUEST:", action, data);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + currentToken
      },
      body: JSON.stringify({
        action,
        ...data
      })
    });

    const responseText = await res.text();

    console.log("API RESPONSE:", {
      action,
      status: res.status,
      ok: res.ok,
      body: responseText
    });

    if (res.status === 401) {
      console.warn("Unauthorized request, check session.");
      localStorage.removeItem("admin_token");
      location.reload();
      return null;
    }

    let responseData = null;

    try {
      responseData = responseText
        ? JSON.parse(responseText)
        : null;
    } catch (parseError) {
      console.error("API JSON PARSE ERROR:", parseError);
      return null;
    }

    if (!res.ok) {
      console.error("API ERROR:", {
        action,
        status: res.status,
        response: responseData
      });

      return responseData || {
        error: `HTTP ${res.status}`
      };
    }

    return responseData;

  } catch (err) {
    console.error("NETWORK ERROR:", {
      action,
      error: err
    });

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
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async function () {
        const targetSection = this.getAttribute('data-target');
        if (!targetSection) return;

        document.querySelectorAll('.nav-item').forEach(i => {
            i.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.add('hidden');
        });

        this.classList.add('active');

        const targetEl = document.getElementById(targetSection);
        if (!targetEl) return;

        targetEl.classList.remove('hidden');

        // =====================================================
        // MEDIATION DISPUTES
        // =====================================================
        if (targetSection === 'mediation-section') {
            console.log('MEDIATION NAV CLICK');

            // لا تستدعِ refreshDashboard ولا get_all_users هنا
            await loadMediationDisputes();

            return;
        }

        // =====================================================
        // OTHER SECTIONS
        // =====================================================
        if (
            targetSection === 'home-section' ||
            targetSection === 'keys-section' ||
            targetSection === 'ban-section' ||
            targetSection === 'users-section' ||
            targetSection === 'stats-section'
        ) {
            refreshDashboard();
            return;
        }

        if (targetSection === 'settings-section') {
            loadSettings();
            return;
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
                    <tr class="hover:bg-white/[0.005] border-b border-white/5">
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

// ============================================================
// MEDIATION DISPUTES
// ============================================================

async function loadMediationDisputes() {
    const table = document.getElementById("mediationDisputesTable");
    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="8" class="p-6 text-center text-gray-500">
                جاري تحميل نزاعات الوساطة...
            </td>
        </tr>
    `;

    const res = await api("get_mediation_disputes");

    if (!res || res.error) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="p-6 text-center text-red-400">
                    تعذر تحميل نزاعات الوساطة
                </td>
            </tr>
        `;
        return;
    }

    const deals = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.deals)
            ? res.deals
            : Array.isArray(res)
                ? res
                : [];

    if (!deals.length) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="p-6 text-center text-gray-500">
                    لا توجد صفقات في حالة نزاع حالياً
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = deals.map(deal => {
        const dealId = deal.id ?? deal.deal_id ?? "";
        const code = deal.code ?? deal.deal_code ?? "—";
        const amount = deal.amount_usd ?? deal.amount ?? 0;
        const buyer = deal.buyer_id ?? "—";
        const seller = deal.seller_id ?? "—";
        const status = deal.status ?? "dispute";
        const disputeAt =
            deal.dispute_opened_at ??
            deal.opened_at ??
            deal.created_at ??
            "";

        return `
            <tr class="hover:bg-white/[0.02]">
                <td class="p-3 text-white font-mono">${escapeHtml(String(dealId))}</td>
                <td class="p-3 text-purple-400 font-mono">${escapeHtml(String(code))}</td>
                <td class="p-3 text-white">$${escapeHtml(Number(amount || 0).toFixed(2))}</td>
                <td class="p-3 text-gray-300">${escapeHtml(String(buyer))}</td>
                <td class="p-3 text-gray-300">${escapeHtml(String(seller))}</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded-lg bg-red-500/10 text-red-400">
                        ${escapeHtml(String(status))}
                    </span>
                </td>
                <td class="p-3 text-gray-400">${formatMediationDate(disputeAt)}</td>
                <td class="p-3 text-center">
                    <button
                        class="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-1.5 rounded-lg"
                        data-mediation-deal-id="${escapeHtml(String(dealId))}">
                        عرض الأدلة
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    table.querySelectorAll("[data-mediation-deal-id]").forEach(button => {
        button.addEventListener("click", () => {
            const dealId = Number(button.dataset.mediationDealId);
            if (Number.isInteger(dealId) && dealId > 0) {
                loadMediationEvidence(dealId);
            }
        });
    });
}

function mediationEvidenceStat(title, value) {
    return `
        <div class="bg-white/[0.03] border border-white/5 rounded-xl p-3">
            <div class="text-gray-500 text-[10px]">${escapeHtml(title)}</div>
            <div class="text-white font-bold text-sm mt-1">${escapeHtml(String(value))}</div>
        </div>
    `;
}

// ============================================================
// 🤖 AI / SMART MEDIATION ANALYSIS
// التحليل هنا مساعد للإدمن فقط ولا ينفذ أي قرار
// ============================================================

async function analyzeMediationDispute(dealId) {
    if (!Number.isInteger(Number(dealId)) || Number(dealId) <= 0) {
        showToast("رقم الصفقة غير صالح");
        return;
    }

    const resultPanel = document.getElementById("mediationAnalysisPanel");

    if (resultPanel) {
        resultPanel.innerHTML = `
            <div class="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                    <div>
                        <div class="text-purple-300 font-bold text-sm">
                            🤖 جاري تحليل النزاع...
                        </div>
                        <div class="text-gray-500 text-[10px] mt-1">
                            تتم مقارنة الأدلة المتوفرة فقط. القرار النهائي للإدمن.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const res = await api("analyze_mediation_dispute", {
        deal_id: Number(dealId)
    });

    if (!res || res.error || !res.analysis) {
        if (resultPanel) {
            resultPanel.innerHTML = `
                <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                    <div class="text-red-400 font-bold text-sm">
                        ❌ تعذر تحليل النزاع
                    </div>
                    <div class="text-gray-500 text-[10px] mt-1">
                        ${escapeHtml(String(res?.error || "حدث خطأ أثناء التحليل"))}
                    </div>
                </div>
            `;
        }

        showToast("فشل تحليل النزاع");
        return;
    }

    const analysis = res.analysis;

    const buyerPercentage = Number(analysis.buyer_percentage || 0);
    const sellerPercentage = Number(analysis.seller_percentage || 0);
    const confidence = Number(analysis.confidence_percentage || 0);

    const findings = Array.isArray(analysis.findings)
        ? analysis.findings
        : [];

    const limitations = Array.isArray(analysis.limitations)
        ? analysis.limitations
        : [];

    const sideLabel = (side) => {
        if (side === "buyer") return "المشتري";
        if (side === "seller") return "البائع";
        return "محايد";
    };

    const sideClass = (side) => {
        if (side === "buyer") {
            return "text-blue-400 bg-blue-500/10 border-blue-500/20";
        }

        if (side === "seller") {
            return "text-orange-400 bg-orange-500/10 border-orange-500/20";
        }

        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    };

    const statusInfo = {
        preliminary_assessment: {
            text: "ترجيح أولي",
            cls: "text-green-400 bg-green-500/10 border-green-500/20"
        },
        needs_admin_review: {
            text: "يحتاج مراجعة الإدمن",
            cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
        },
        insufficient_directional_evidence: {
            text: "أدلة غير كافية للترجيح",
            cls: "text-gray-400 bg-gray-500/10 border-gray-500/20"
        }
    };

    const status = statusInfo[analysis.status] || {
        text: analysis.status || "غير محدد",
        cls: "text-gray-400 bg-gray-500/10 border-gray-500/20"
    };

    const findingsHtml = findings.length
        ? findings.map(item => `
            <div class="bg-black/20 border border-white/5 rounded-xl p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="px-2 py-1 rounded-lg border text-[10px] font-bold ${sideClass(item.side)}">
                        ${sideLabel(item.side)}
                    </span>

                    <span class="text-gray-500 text-[10px]">
                        وزن الإشارة: ${Number(item.weight || 0)}%
                    </span>
                </div>

                <div class="text-white font-bold text-xs mt-3">
                    ${escapeHtml(String(item.title || item.code || "إشارة أدلة"))}
                </div>

                <div class="text-gray-400 text-[11px] mt-1 leading-5">
                    ${escapeHtml(String(item.detail || ""))}
                </div>
            </div>
        `).join("")
        : `
            <div class="text-gray-500 text-xs text-center py-5">
                لا توجد إشارات تحليلية مباشرة.
            </div>
        `;

    const limitationsHtml = limitations.length
        ? limitations.map(item => `
            <div class="flex gap-2 items-start text-[11px] text-gray-400">
                <span class="text-yellow-400">⚠️</span>
                <span>${escapeHtml(String(item))}</span>
            </div>
        `).join("")
        : `
            <div class="text-gray-500 text-xs">
                لا توجد قيود إضافية مسجلة.
            </div>
        `;

    if (!resultPanel) {
        console.warn("mediationAnalysisPanel not found");
        return;
    }

    resultPanel.innerHTML = `
        <div class="bg-white/[0.03] border border-purple-500/20 rounded-2xl p-5">

            <!-- Header -->
            <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h5 class="text-white font-black text-sm">
                        🤖 التحليل الذكي للنزاع
                    </h5>

                    <p class="text-gray-500 text-[10px] mt-1">
                        تحليل آلي مساعد مبني على الأدلة المتاحة فقط
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 rounded-lg border text-[10px] font-bold ${status.cls}">
                        ${escapeHtml(status.text)}
                    </span>

                    <span class="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-[10px] font-bold">
                        ${escapeHtml(String(analysis.methodology || "deterministic_evidence_v1"))}
                    </span>
                </div>
            </div>

            <!-- Percentages -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">

                <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <div class="text-blue-300 text-[10px]">
                        ترجيح المشتري
                    </div>

                    <div class="text-blue-400 text-3xl font-black mt-2">
                        ${buyerPercentage}%
                    </div>
                </div>

                <div class="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                    <div class="text-orange-300 text-[10px]">
                        ترجيح البائع
                    </div>

                    <div class="text-orange-400 text-3xl font-black mt-2">
                        ${sellerPercentage}%
                    </div>
                </div>

                <div class="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                    <div class="text-purple-300 text-[10px]">
                        مستوى الثقة
                    </div>

                    <div class="text-purple-400 text-3xl font-black mt-2">
                        ${confidence}%
                    </div>
                </div>

            </div>

            <!-- Visual split -->
            <div class="mt-4">
                <div class="flex justify-between text-[10px] mb-2">
                    <span class="text-blue-400 font-bold">
                        المشتري ${buyerPercentage}%
                    </span>

                    <span class="text-orange-400 font-bold">
                        البائع ${sellerPercentage}%
                    </span>
                </div>

                <div class="h-3 rounded-full bg-black/30 overflow-hidden flex">
                    <div
                        class="bg-blue-500 h-full transition-all"
                        style="width:${Math.max(0, Math.min(100, buyerPercentage))}%">
                    </div>

                    <div
                        class="bg-orange-500 h-full transition-all"
                        style="width:${Math.max(0, Math.min(100, sellerPercentage))}%">
                    </div>
                </div>
            </div>

            <!-- Important notice -->
            <div class="mt-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div class="text-yellow-300 text-xs font-black mb-1">
                    ⚠️ القرار النهائي
                </div>

                <div class="text-gray-400 text-[11px] leading-5">
                    هذا التحليل ترجيح أولي فقط لمساعدة الإدمن في مراجعة الملف.
                    لا يتم إصدار قرار تلقائي، ولا يتم تحويل الأموال أو تغيير حالة الصفقة أو حظر أي مستخدم من خلال هذا التحليل.
                </div>
            </div>

            <!-- Findings -->
            <div class="mt-5">
                <div class="mb-3">
                    <h6 class="text-white font-bold text-xs">
                        🔎 الإشارات التي اعتمد عليها التحليل
                    </h6>

                    <p class="text-gray-500 text-[10px] mt-1">
                        كل إشارة معروضة بشكل مستقل حتى يتمكن الإدمن من التحقق منها.
                    </p>
                </div>

                <div class="space-y-2">
                    ${findingsHtml}
                </div>
            </div>

            <!-- Limitations -->
            <div class="mt-5">
                <div class="mb-3">
                    <h6 class="text-white font-bold text-xs">
                        ⚠️ حدود التحليل
                    </h6>
                </div>

                <div class="space-y-2">
                    ${limitationsHtml}
                </div>
            </div>

            <!-- Summary -->
            <div class="mt-5 bg-black/20 border border-white/5 rounded-xl p-4">
                <div class="text-gray-500 text-[10px] mb-1">
                    الخلاصة
                </div>

                <div class="text-gray-200 text-xs leading-6">
                    ${escapeHtml(String(
                        analysis.summary ||
                        "لا توجد خلاصة متاحة."
                    ))}
                </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span class="text-gray-600 text-[9px]">
                    Deal #${escapeHtml(String(analysis.deal_id || dealId))}
                </span>

                <span class="text-gray-600 text-[9px]">
                    القرار النهائي: Admin
                </span>
            </div>

        </div>
    `;

    showToast("تم تحليل النزاع بنجاح 🤖");
}

async function loadMediationEvidence(dealId) {
    const panel =
        document.getElementById("mediationEvidencePanel") ||
        document.getElementById("mediation-evidence-panel") ||
        document.getElementById("mediationEvidence");

    if (!panel) {
        console.error("Mediation evidence panel not found");
        return;
    }

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    const esc = (value) => {
        if (value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const num = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const pct = (value) => {
        return Math.max(0, Math.min(100, num(value)));
    };

    const strengthLabel = {
        strong: "قوي",
        medium: "متوسط",
        weak: "ضعيف"
    };

    const sideLabel = {
        buyer: "المشتري",
        seller: "البائع",
        neutral: "محايد"
    };

    const assessmentLabel = {
        buyer_supported: "الأدلة تميل للمشتري",
        seller_supported: "الأدلة تميل للبائع",
        mixed_evidence: "أدلة متعارضة",
        inconclusive: "الأدلة غير حاسمة",
        insufficient_evidence: "أدلة غير كافية"
    };

    const priorityLabel = {
        high: "مراجعة دقيقة",
        medium: "مراجعة",
        normal: "مراجعة عادية"
    };

    // ---------------------------------------------------------
    // Loading
    // ---------------------------------------------------------

    panel.innerHTML = `
        <div class="med-score-loading">
            <div class="med-score-spinner"></div>
            <div>
                <strong>جاري تحليل الأدلة...</strong>
                <div class="med-muted">
                    يتم فحص الأدلة والاتساق والتناقضات
                </div>
            </div>
        </div>
    `;

    try {
        // -----------------------------------------------------
        // Call deterministic evidence engine
        // -----------------------------------------------------

        const response = await api(
            "analyze_mediation_dispute",
            {
                deal_id: Number(dealId)
            }
        );

        if (!response || response.success !== true) {
            throw new Error(
                response?.error ||
                response?.message ||
                "فشل تحليل الأدلة"
            );
        }

        const result = response;
        const assessment = result.assessment || {};
        const summary = result.evidence_summary || {};
        const findings = Array.isArray(result.findings)
            ? result.findings
            : [];
        const limitations = Array.isArray(result.limitations)
            ? result.limitations
            : [];
        const adminReview = result.admin_review || {};
        const evidence = result.evidence || {};

        // -----------------------------------------------------
        // Values
        // -----------------------------------------------------

        const buyerPct = pct(assessment.buyer_percentage);
        const sellerPct = pct(assessment.seller_percentage);
        const coverage = pct(assessment.evidence_coverage);
        const confidence = pct(assessment.analysis_confidence);

        const buyerSupport = num(
            assessment.buyer_support
        );

        const sellerSupport = num(
            assessment.seller_support
        );

        const contradictionCount = num(
            assessment.contradiction_count
        );

        const strong = num(summary.strong);
        const medium = num(summary.medium);
        const weak = num(summary.weak);

        const assessmentText =
            assessmentLabel[assessment.result] ||
            "غير محدد";

        const priorityText =
            priorityLabel[adminReview.admin_review_priority] ||
            "مراجعة";

        // -----------------------------------------------------
        // Assessment state
        // -----------------------------------------------------

        let assessmentClass = "neutral";

        if (assessment.result === "buyer_supported") {
            assessmentClass = "buyer";
        } else if (assessment.result === "seller_supported") {
            assessmentClass = "seller";
        } else if (
            assessment.result === "mixed_evidence"
        ) {
            assessmentClass = "warning";
        } else if (
            assessment.result === "insufficient_evidence"
        ) {
            assessmentClass = "danger";
        }

        // -----------------------------------------------------
        // Findings
        // -----------------------------------------------------

        const findingHtml = findings.length
            ? findings.map((finding) => {

                const side = finding.side || "neutral";
                const strength = finding.strength || "weak";

                const sideText =
                    sideLabel[side] || "محايد";

                const strengthText =
                    strengthLabel[strength] || strength;

                const sideClass =
                    side === "buyer"
                        ? "buyer"
                        : side === "seller"
                            ? "seller"
                            : "neutral";

                const strengthClass =
                    strength === "strong"
                        ? "strong"
                        : strength === "medium"
                            ? "medium"
                            : "weak";

                return `
                    <div class="med-finding ${sideClass}">

                        <div class="med-finding-top">

                            <div class="med-finding-title">
                                <span class="med-side-dot ${sideClass}"></span>

                                <strong>
                                    ${esc(finding.title || "دليل")}
                                </strong>
                            </div>

                            <div class="med-finding-badges">

                                <span class="med-badge ${sideClass}">
                                    ${esc(sideText)}
                                </span>

                                <span class="med-badge ${strengthClass}">
                                    ${esc(strengthText)}
                                </span>

                                <span class="med-weight">
                                    +${num(finding.weight)}
                                </span>

                            </div>
                        </div>

                        <div class="med-finding-code">
                            ${esc(finding.code || "")}
                        </div>

                        <div class="med-finding-description">
                            ${esc(
                                finding.explanation ||
                                "لا يوجد شرح إضافي."
                            )}
                        </div>

                        <div class="med-finding-source">
                            المصدر:
                            <strong>
                                ${esc(finding.source || "غير محدد")}
                            </strong>
                        </div>

                    </div>
                `;
            }).join("")
            : `
                <div class="med-empty">
                    لا توجد إشارات تقييمية كافية.
                </div>
            `;

        // -----------------------------------------------------
        // Limitations
        // -----------------------------------------------------

        const limitationsHtml = limitations.length
            ? limitations.map((item) => `
                <div class="med-limitation">

                    <div class="med-limit-icon">!</div>

                    <div>
                        <strong>
                            ${esc(item.title || "بيانات ناقصة")}
                        </strong>

                        <div class="med-muted">
                            ${esc(
                                item.explanation ||
                                ""
                            )}
                        </div>

                        <div class="med-limit-code">
                            ${esc(item.code || "")}
                        </div>
                    </div>

                </div>
            `).join("")
            : `
                <div class="med-success-note">
                    لم يتم تسجيل قيود إضافية على الأدلة.
                </div>
            `;

        // -----------------------------------------------------
        // Admin actions
        // -----------------------------------------------------

        const adminActions = Array.isArray(
            adminReview.actions
        )
            ? adminReview.actions
            : [];

        const adminActionsHtml = adminActions.length
            ? adminActions.map((action) => `
                <li>${esc(action)}</li>
            `).join("")
            : `
                <li>
                    راجع الأدلة المتاحة واتخذ القرار يدوياً.
                </li>
            `;

        // -----------------------------------------------------
        // Integrity / evidence counters
        // -----------------------------------------------------

        const chatCount = Array.isArray(evidence.chat_logs)
            ? evidence.chat_logs.length
            : 0;

        const attachmentCount = Array.isArray(
            evidence.attachments
        )
            ? evidence.attachments.length
            : 0;

        const timelineCount = Array.isArray(
            evidence.timeline
        )
            ? evidence.timeline.length
            : 0;

        // -----------------------------------------------------
        // Render
        // -----------------------------------------------------

        panel.innerHTML = `

            <div class="med-scorecard">

                <!-- =========================================
                     HEADER
                ========================================== -->

                <div class="med-score-header">

                    <div>
                        <div class="med-eyebrow">
                            MEDIATION EVIDENCE ENGINE
                        </div>

                        <h3>
                            Evidence Scorecard
                        </h3>

                        <div class="med-muted">
                            Deal #${esc(dealId)}
                            · تحليل آلي منظم للأدلة
                        </div>
                    </div>

                    <div class="
                        med-assessment
                        ${assessmentClass}
                    ">
                        <span class="med-assessment-label">
                            التقييم الأولي
                        </span>

                        <strong>
                            ${esc(assessmentText)}
                        </strong>

                        <small>
                            ${esc(priorityText)}
                        </small>
                    </div>

                </div>


                <!-- =========================================
                     MAIN METRICS
                ========================================== -->

                <div class="med-metrics">

                    <div class="med-metric-card buyer">

                        <div class="med-metric-label">
                            دعم الأدلة للمشتري
                        </div>

                        <div class="med-metric-value">
                            ${buyerPct}%
                        </div>

                        <div class="med-progress">
                            <div
                                class="med-progress-fill buyer"
                                style="width:${buyerPct}%"
                            ></div>
                        </div>

                        <div class="med-metric-sub">
                            وزن الأدلة: ${buyerSupport}
                        </div>

                    </div>


                    <div class="med-metric-card seller">

                        <div class="med-metric-label">
                            دعم الأدلة للبائع
                        </div>

                        <div class="med-metric-value">
                            ${sellerPct}%
                        </div>

                        <div class="med-progress">
                            <div
                                class="med-progress-fill seller"
                                style="width:${sellerPct}%"
                            ></div>
                        </div>

                        <div class="med-metric-sub">
                            وزن الأدلة: ${sellerSupport}
                        </div>

                    </div>


                    <div class="med-metric-card">

                        <div class="med-metric-label">
                            تغطية الأدلة
                        </div>

                        <div class="med-metric-value">
                            ${coverage}%
                        </div>

                        <div class="med-progress">
                            <div
                                class="med-progress-fill neutral"
                                style="width:${coverage}%"
                            ></div>
                        </div>

                        <div class="med-metric-sub">
                            جودة وتوفر المصادر
                        </div>

                    </div>


                    <div class="med-metric-card">

                        <div class="med-metric-label">
                            ثقة التحليل
                        </div>

                        <div class="med-metric-value">
                            ${confidence}%
                        </div>

                        <div class="med-progress">
                            <div
                                class="med-progress-fill neutral"
                                style="width:${confidence}%"
                            ></div>
                        </div>

                        <div class="med-metric-sub">
                            ليست احتمالاً لصحة الادعاء
                        </div>

                    </div>

                </div>


                <!-- =========================================
                     EVIDENCE QUALITY
                ========================================== -->

                <div class="med-section">

                    <div class="med-section-header">
                        <div>
                            <h4>جودة الأدلة</h4>
                            <span>
                                تصنيف الأدلة التي اعتمد عليها المحرك
                            </span>
                        </div>
                    </div>

                    <div class="med-quality-grid">

                        <div class="med-quality strong">
                            <strong>${strong}</strong>
                            <span>أدلة قوية</span>
                        </div>

                        <div class="med-quality medium">
                            <strong>${medium}</strong>
                            <span>أدلة متوسطة</span>
                        </div>

                        <div class="med-quality weak">
                            <strong>${weak}</strong>
                            <span>أدلة ضعيفة</span>
                        </div>

                        <div class="
                            med-quality
                            ${contradictionCount > 0
                                ? "danger"
                                : ""}
                        ">
                            <strong>
                                ${contradictionCount}
                            </strong>
                            <span>تناقضات</span>
                        </div>

                    </div>

                </div>


                <!-- =========================================
                     EVIDENCE SOURCES
                ========================================== -->

                <div class="med-section">

                    <div class="med-section-header">

                        <div>
                            <h4>مصادر الأدلة</h4>
                            <span>
                                ما الذي توفر للمحرك؟
                            </span>
                        </div>

                    </div>

                    <div class="med-source-grid">

                        <div class="med-source">
                            <span>المحادثة</span>
                            <strong>
                                ${chatCount}
                            </strong>
                        </div>

                        <div class="med-source">
                            <span>المرفقات</span>
                            <strong>
                                ${attachmentCount}
                            </strong>
                        </div>

                        <div class="med-source">
                            <span>الأحداث الزمنية</span>
                            <strong>
                                ${timelineCount}
                            </strong>
                        </div>

                        <div class="med-source">
                            <span>إشارات النزاهة</span>
                            <strong>
                                ${num(summary.integrity_signals)}
                            </strong>
                        </div>

                        <div class="med-source">
                            <span>الفئات المتوفرة</span>
                            <strong>
                                ${num(summary.available_categories)}
                                /
                                ${num(summary.possible_categories)}
                            </strong>
                        </div>

                    </div>

                </div>


                <!-- =========================================
                     FINDINGS
                ========================================== -->

                <div class="med-section">

                    <div class="med-section-header">

                        <div>
                            <h4>
                                تحليل الأدلة
                            </h4>

                            <span>
                                كل إشارة مستقلة مع مصدرها ودرجة قوتها
                            </span>
                        </div>

                        <span class="med-count">
                            ${findings.length} دليل
                        </span>

                    </div>

                    <div class="med-findings">
                        ${findingHtml}
                    </div>

                </div>


                <!-- =========================================
                     LIMITATIONS
                ========================================== -->

                <div class="med-section">

                    <div class="med-section-header">

                        <div>
                            <h4>
                                الأدلة الناقصة والقيود
                            </h4>

                            <span>
                                معلومات لم يتمكن المحرك من التحقق منها
                            </span>
                        </div>

                        <span class="med-count">
                            ${limitations.length}
                        </span>

                    </div>

                    <div class="med-limitations">
                        ${limitationsHtml}
                    </div>

                </div>


                <!-- =========================================
                     ADMIN REVIEW
                ========================================== -->

                <div class="med-admin-review">

                    <div class="med-admin-review-header">

                        <div>
                            <div class="med-eyebrow">
                                ADMIN REVIEW
                            </div>

                            <h4>
                                القرار النهائي للإدمن
                            </h4>
                        </div>

                        <span class="med-admin-required">
                            مطلوب تدخل الإدمن
                        </span>

                    </div>

                    <div class="med-admin-warning">

                        <strong>
                            هذا التحليل لا يتخذ القرار النهائي.
                        </strong>

                        <p>
                            النتائج أعلاه هي تقييم منظم للأدلة
                            المتوفرة فقط. لا يتم تلقائياً تحرير
                            الأموال أو معاقبة أي طرف أو إغلاق النزاع.
                        </p>

                    </div>

                    <div class="med-admin-actions">

                        <strong>
                            نقاط يجب على الإدمن مراجعتها:
                        </strong>

                        <ul>
                            ${adminActionsHtml}
                        </ul>

                    </div>

                    <div class="med-admin-status">

                        <span>
                            القرار النهائي:
                        </span>

                        <strong>
                            بانتظار الإدمن
                        </strong>

                    </div>

                </div>

            </div>
        `;

        // -----------------------------------------------------
        // Inject stylesheet once
        // -----------------------------------------------------

        if (!document.getElementById("mediation-scorecard-style")) {

            const style = document.createElement("style");

            style.id = "mediation-scorecard-style";

            style.textContent = `

                .med-scorecard {
                    width: 100%;
                    color: #e5e7eb;
                    font-family: inherit;
                }

                .med-score-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .med-eyebrow {
                    font-size: 10px;
                    letter-spacing: 1.4px;
                    font-weight: 800;
                    opacity: .55;
                    margin-bottom: 5px;
                }

                .med-score-header h3,
                .med-section h4,
                .med-admin-review h4 {
                    margin: 0;
                }

                .med-muted {
                    color: #94a3b8;
                    font-size: 12px;
                    line-height: 1.6;
                }

                .med-assessment {
                    min-width: 190px;
                    padding: 13px 16px;
                    border-radius: 14px;
                    border: 1px solid #334155;
                    background: #0f172a;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .med-assessment.buyer {
                    border-color: rgba(59,130,246,.45);
                }

                .med-assessment.seller {
                    border-color: rgba(34,197,94,.45);
                }

                .med-assessment.warning {
                    border-color: rgba(245,158,11,.55);
                }

                .med-assessment.danger {
                    border-color: rgba(239,68,68,.55);
                }

                .med-assessment-label {
                    color: #94a3b8;
                    font-size: 11px;
                }

                .med-assessment strong {
                    font-size: 15px;
                }

                .med-assessment small {
                    color: #94a3b8;
                }

                .med-metrics {
                    display: grid;
                    grid-template-columns:
                        repeat(4, minmax(0, 1fr));
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .med-metric-card {
                    padding: 15px;
                    background: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 14px;
                }

                .med-metric-label {
                    color: #94a3b8;
                    font-size: 12px;
                    margin-bottom: 8px;
                }

                .med-metric-value {
                    font-size: 27px;
                    font-weight: 800;
                    margin-bottom: 10px;
                }

                .med-metric-sub {
                    color: #64748b;
                    font-size: 10px;
                    margin-top: 7px;
                }

                .med-progress {
                    height: 6px;
                    background: #1e293b;
                    border-radius: 99px;
                    overflow: hidden;
                }

                .med-progress-fill {
                    height: 100%;
                    border-radius: inherit;
                    transition: width .35s ease;
                }

                .med-progress-fill.buyer {
                    background: #3b82f6;
                }

                .med-progress-fill.seller {
                    background: #22c55e;
                }

                .med-progress-fill.neutral {
                    background: #94a3b8;
                }

                .med-section {
                    background: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 14px;
                    padding: 17px;
                    margin-bottom: 14px;
                }

                .med-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 14px;
                }

                .med-section-header span {
                    color: #64748b;
                    font-size: 11px;
                }

                .med-count {
                    background: #1e293b;
                    color: #cbd5e1 !important;
                    padding: 5px 9px;
                    border-radius: 8px;
                }

                .med-quality-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(4, minmax(0, 1fr));
                    gap: 10px;
                }

                .med-quality {
                    padding: 13px;
                    border-radius: 11px;
                    background: #111827;
                    border: 1px solid #1f2937;
                }

                .med-quality strong {
                    display: block;
                    font-size: 22px;
                }

                .med-quality span {
                    color: #94a3b8;
                    font-size: 11px;
                }

                .med-quality.strong {
                    border-color: rgba(34,197,94,.35);
                }

                .med-quality.medium {
                    border-color: rgba(245,158,11,.35);
                }

                .med-quality.weak {
                    border-color: rgba(148,163,184,.25);
                }

                .med-quality.danger {
                    border-color: rgba(239,68,68,.5);
                }

                .med-source-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(5, minmax(0, 1fr));
                    gap: 9px;
                }

                .med-source {
                    background: #111827;
                    border: 1px solid #1f2937;
                    border-radius: 10px;
                    padding: 11px;
                }

                .med-source span {
                    display: block;
                    color: #94a3b8;
                    font-size: 10px;
                    margin-bottom: 5px;
                }

                .med-source strong {
                    font-size: 17px;
                }

                .med-findings {
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                }

                .med-finding {
                    padding: 13px;
                    border-radius: 11px;
                    background: #111827;
                    border: 1px solid #1f2937;
                }

                .med-finding.buyer {
                    border-right: 3px solid #3b82f6;
                }

                .med-finding.seller {
                    border-right: 3px solid #22c55e;
                }

                .med-finding.neutral {
                    border-right: 3px solid #94a3b8;
                }

                .med-finding-top {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    align-items: center;
                }

                .med-finding-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                }

                .med-side-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex: 0 0 auto;
                }

                .med-side-dot.buyer {
                    background: #3b82f6;
                }

                .med-side-dot.seller {
                    background: #22c55e;
                }

                .med-side-dot.neutral {
                    background: #94a3b8;
                }

                .med-finding-badges {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .med-badge {
                    font-size: 10px;
                    padding: 4px 7px;
                    border-radius: 7px;
                    background: #1e293b;
                }

                .med-badge.buyer {
                    color: #93c5fd;
                }

                .med-badge.seller {
                    color: #86efac;
                }

                .med-badge.strong {
                    border: 1px solid rgba(239,68,68,.25);
                }

                .med-badge.medium {
                    border: 1px solid rgba(245,158,11,.25);
                }

                .med-badge.weak {
                    border: 1px solid rgba(148,163,184,.2);
                }

                .med-weight {
                    font-size: 11px;
                    font-weight: 800;
                    color: #cbd5e1;
                }

                .med-finding-code,
                .med-limit-code {
                    font-size: 9px;
                    color: #64748b;
                    margin-top: 7px;
                    font-family: monospace;
                }

                .med-finding-description {
                    margin-top: 8px;
                    color: #cbd5e1;
                    font-size: 12px;
                    line-height: 1.7;
                }

                .med-finding-source {
                    margin-top: 8px;
                    color: #64748b;
                    font-size: 10px;
                }

                .med-finding-source strong {
                    color: #94a3b8;
                }

                .med-limitations {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .med-limitation {
                    display: flex;
                    gap: 10px;
                    padding: 11px;
                    background: #111827;
                    border-radius: 10px;
                    border: 1px solid #1f2937;
                }

                .med-limit-icon {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                    background: rgba(245,158,11,.12);
                    color: #f59e0b;
                    font-weight: 800;
                    flex: 0 0 auto;
                }

                .med-success-note {
                    color: #86efac;
                    font-size: 12px;
                    padding: 10px;
                }

                .med-admin-review {
                    border: 1px solid #334155;
                    border-radius: 15px;
                    padding: 18px;
                    margin-top: 16px;
                    background:
                        linear-gradient(
                            135deg,
                            #111827,
                            #0f172a
                        );
                }

                .med-admin-review-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 15px;
                    align-items: center;
                }

                .med-admin-required {
                    font-size: 10px;
                    padding: 6px 9px;
                    border-radius: 8px;
                    background: rgba(245,158,11,.12);
                    color: #fbbf24;
                }

                .med-admin-warning {
                    margin-top: 14px;
                    padding: 12px;
                    border-radius: 10px;
                    background: rgba(245,158,11,.07);
                    border: 1px solid rgba(245,158,11,.18);
                }

                .med-admin-warning p {
                    margin: 5px 0 0;
                    color: #94a3b8;
                    font-size: 11px;
                    line-height: 1.7;
                }

                .med-admin-actions {
                    margin-top: 15px;
                    color: #cbd5e1;
                    font-size: 12px;
                }

                .med-admin-actions ul {
                    margin: 8px 0 0;
                    padding-right: 20px;
                    color: #94a3b8;
                    line-height: 1.9;
                }

                .med-admin-status {
                    margin-top: 15px;
                    padding-top: 13px;
                    border-top: 1px solid #1e293b;
                    display: flex;
                    justify-content: space-between;
                    color: #64748b;
                    font-size: 11px;
                }

                .med-admin-status strong {
                    color: #fbbf24;
                }

                .med-empty {
                    padding: 20px;
                    text-align: center;
                    color: #64748b;
                }

                .med-score-loading {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 30px;
                    color: #cbd5e1;
                }

                .med-score-spinner {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid #334155;
                    border-top-color: #94a3b8;
                    animation: med-spin .7s linear infinite;
                }

                @keyframes med-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 900px) {

                    .med-metrics {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .med-quality-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .med-source-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 600px) {

                    .med-score-header {
                        flex-direction: column;
                    }

                    .med-assessment {
                        width: 100%;
                        box-sizing: border-box;
                    }

                    .med-metrics {
                        grid-template-columns: 1fr;
                    }

                    .med-quality-grid {
                        grid-template-columns: 1fr 1fr;
                    }

                    .med-finding-top {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .med-admin-review-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            `;

            document.head.appendChild(style);
        }

    } catch (error) {

        console.error(
            "loadMediationEvidence error:",
            error
        );

        panel.innerHTML = `
            <div style="
                padding:18px;
                border:1px solid rgba(239,68,68,.3);
                background:rgba(239,68,68,.06);
                border-radius:12px;
                color:#fca5a5;
            ">
                <strong>
                    تعذر تحليل أدلة الوساطة
                </strong>

                <div style="
                    margin-top:7px;
                    font-size:12px;
                    color:#94a3b8;
                ">
                    ${esc(
                        error?.message ||
                        "حدث خطأ غير معروف"
                    )}
                </div>
            </div>
        `;
    }
}

function formatMediationDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("ar-DZ");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document.getElementById("btnRefreshMediation")?.addEventListener("click", loadMediationDisputes);

document.getElementById("btnCloseMediationEvidence")?.addEventListener("click", () => {
    document.getElementById("mediationEvidencePanel")?.classList.add("hidden");
});

function openDrawer(deviceId) { 
    const drawer = document.getElementById('userDrawer');
    if(drawer) drawer.style.right = '0'; 
    loadUserDetails(deviceId); 
}

function closeDrawer() { 
    const drawer = document.getElementById('userDrawer');
    if(drawer) drawer.style.right = '-450px'; 
}

// الدالة الذكية لجلب وعرض بيانات المستخدم بالتفصيل في النافذة الجانبية
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
        let data = await api("get_user_details", { device_id: deviceId });
        
        let user = (data && data.user) || null;
        
        if (!user) {
            const allUsersRes = await api("get_all_users");
            const allUsers = (allUsersRes && (allUsersRes.data || allUsersRes)) || [];
            
            user = allUsers.find(u => (
                String(u.device_id) === String(deviceId) || 
                String(u.id) === String(deviceId) || 
                String(u.uuid) === String(deviceId) || 
                String(u.username) === String(deviceId)
            ));
        }

        if (!user) {
            content.innerHTML = `
                <div class="text-center py-10 text-red-400 font-bold">
                    ❌ لم يتم العثور على بيانات المستخدم لهذا المعرف: ${deviceId}
                </div>
            `;
            return;
        }

        const realDevId = user.device_id || user.id || user.uuid || deviceId;

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

        const vipRemaining = user.vip_until ? getRemainingTime(user.vip_until) : "—";

        content.innerHTML = `
            <div class="space-y-4">
                <!-- الحساب -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-purple-400 font-bold mb-3">👤 معلومات الحساب</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">اسم المستخدم</span>
                            <span class="text-white font-medium break-all">${esc(user.username || "Player")}</span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">📧 الإيميل</span>
                            <span class="text-blue-400 font-medium break-all">${esc(user.email || "غير متوفر")}</span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">Device ID</span>
                            <span class="text-white font-mono text-xs break-all">${esc(realDevId)}</span>
                        </div>
                    </div>
                </div>

                <!-- الرصيد -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-yellow-400 font-bold mb-3">💰 الرصيد</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-gray-400 text-xs">USD</div>
                            <div class="text-green-400 text-lg font-bold mt-1">$${esc(user.balance_usd || 0)}</div>
                        </div>
                        <div class="bg-black/20 rounded-lg p-3">
                            <div class="text-gray-400 text-xs">DZD</div>
                            <div class="text-green-400 text-lg font-bold mt-1">${esc(user.balance_dzd || 0)} DA</div>
                        </div>
                    </div>
                </div>

                <!-- VIP -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-purple-400 font-bold mb-3">⭐ معلومات VIP</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-gray-400">VIP</span><span>${yesNo(user.vip)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">نوع المدة</span><span class="text-white">${esc(user.duration_type)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">ينتهي في</span><span class="text-white text-xs">${dateValue(user.vip_until)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">المدة المتبقية</span><span class="text-yellow-400 font-medium">${esc(vipRemaining)}</span></div>
                    </div>
                </div>

                <!-- الجهاز -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-blue-400 font-bold mb-3">📱 معلومات الجهاز</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between gap-3"><span class="text-gray-400">الموديل</span><span class="text-white">${esc(user.model)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-gray-400">الشركة المصنعة</span><span class="text-white">${esc(user.manufacturer)}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-gray-400">Brand</span><span class="text-white">${esc(user.brand)}</span></div>
                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">Android</span>
                            <span class="text-white">${esc(user.android_version)}</span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">🔋 البطارية</span>
                            <span class="text-white font-bold">
                                ${user.battery != null ? esc(user.battery) + "%" : "—"}
                            </span>
                        </div>

                        <div class="flex justify-between gap-3">
                            <span class="text-gray-400">⚡ حالة الشحن</span>
                            <span class="${user.charging === true ? 'text-green-400 font-bold' : 'text-gray-400'}">
                                ${user.charging === true ? "⚡ يشحن الآن" : "غير متصل"}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- التحكم -->
                <div class="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 class="text-orange-400 font-bold mb-3">⚙️ التحكم</h3>
                    <div class="flex gap-2">
                        <button onclick="handleAction('vip','${esc(realDevId)}')" class="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold">
                            ${user.vip === true ? "إلغاء VIP" : "منح VIP"}
                        </button>
                        <button onclick="handleAction('ban','${esc(realDevId)}')" class="flex-1 px-3 py-2 rounded-lg ${user.banned === true ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white text-sm font-bold">
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
                <div class="text-red-400 font-bold mb-2">❌ فشل تحميل بيانات المستخدم</div>
                <div class="text-gray-500 text-xs break-all">${esc(error.message || error)}</div>
            </div>
        `;
    }
}

// دالة التحكم في الحظر ومنح الـ VIP أو الحذف
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

    // النبضة التلقائية لتحديث حالة الاتصال (Heartbeat Timer)
    if (!window.heartbeatTimer) {
        window.heartbeatTimer = setInterval(async () => {
            await api("update_online_status", { timestamp: Date.now() }).catch(() => {});
            refreshDashboard();
        }, 20000);
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

    if (!res || res.error) {
        console.error("get_settings error:", res);
        return;
    }

    let rawData = res.data ?? res;

    const data = Array.isArray(rawData)
        ? (rawData[0] || {})
        : (rawData || {});

    console.log("SETTINGS DATA:", data);

    const modEl = document.getElementById("mod_enabled");
    const vipEl = document.getElementById("vip_enabled");
    const forceEl = document.getElementById("force_update");
    const versionEl = document.getElementById("latest_version");
    const messageEl = document.getElementById("message");
    const maintenanceEl = document.getElementById("maintenance_message");
    const updateUrlEl = document.getElementById("update_url");
    const rateEl = document.getElementById("usd_to_dzd");

    if (modEl) {
        modEl.checked = data.mod_enabled === true;
    }

    if (vipEl) {
        vipEl.checked = data.vip_enabled === true;
    }

    if (forceEl) {
        forceEl.checked = data.force_update === true;
    }

    if (versionEl) {
        versionEl.value = data.latest_version ?? "";
    }

    if (messageEl) {
        messageEl.value = data.message ?? "";
    }

    if (maintenanceEl) {
        maintenanceEl.value = data.maintenance_message ?? "";
    }

    if (updateUrlEl) {
        updateUrlEl.value = data.update_url ?? "";
    }

    if (rateEl) {
        rateEl.value = data.usd_to_dzd ?? 300;
    }
}

document.getElementById("btnSaveSettings")?.addEventListener("click", async () => {

    const rateInput = document.getElementById("usd_to_dzd");

    const payload = {
        mod_enabled: !!document.getElementById("mod_enabled")?.checked,
        vip_enabled: !!document.getElementById("vip_enabled")?.checked,
        force_update: !!document.getElementById("force_update")?.checked,

        latest_version:
            document.getElementById("latest_version")?.value?.trim() || "",

        message:
            document.getElementById("message")?.value || "",

        maintenance_message:
            document.getElementById("maintenance_message")?.value || "",

        update_url:
            document.getElementById("update_url")?.value?.trim() || "",

        usd_to_dzd:
            rateInput && rateInput.value
                ? Number(rateInput.value)
                : 300
    };

    console.log("SAVING SETTINGS:", payload);

    const res = await api("update_settings", payload);

    if (!res || res.error) {
        console.error("update_settings error:", res);
        showToast("فشل حفظ الإعدادات");
        return;
    }

    showToast("تم حفظ الإعدادات بنجاح");

    await loadSettings();
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
