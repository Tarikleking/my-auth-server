/* KINGDZ ADMIN PANEL - SUPABASE REALTIME & EDGE ENGINE */
const API_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co/functions/v1/admin-users";

let ADMIN_TOKEN = localStorage.getItem("admin_token");
let liveClock = null;

// 🔐 دالة الـ api الجديدة والمحدثة
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
        "Authorization": "Bearer " + currentToken
      },
      body: JSON.stringify({
        action,
        ...data
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
      } else if (targetSection === 'mediation-section') {  
        loadMediationDisputes();  
      } else if (targetSection === 'deals-section') {  
        loadAllMediationDeals();  
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
  tbody.innerHTML = keys.slice().reverse().map(k => `<tr class="hover:bg-white/[0.005]">   <td class="p-2 text-center"><input type="checkbox" class="key-checkbox accent-purple-600 rounded" data-id="${k.id}" data-key="${k.key}"></td>   <td class="p-2 pr-4 font-mono font-bold text-purple-400 text-[10px] select-all cursor-pointer">${k.key}</td>   <td class="p-2"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">${k.duration_type || 'STANDARD'}</span></td>   <td class="p-2 text-gray-400">${k.duration || 'غير محدد'}</td>   <td class="p-2 text-[10px] font-bold ${k.status === 'new' ? 'text-green-400' : 'text-gray-500'}">${k.status === 'new' ? 'جاهز' : 'مستعمل'}</td>   <td class="p-2 text-center pl-4"><button onclick="deleteKeyRow(${k.id})" class="p-1 text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td>   </tr>`).join('');
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
    return `<tr class="hover:bg-white/[0.005]">   <td class="p-2 pr-4 text-red-400 font-bold font-mono text-[10px]">${devId}</td>   <td class="p-2 text-gray-400">${b.model || '---'}</td>   <td class="p-2 text-center pl-4"><button onclick="liftUserBan('${devId}')" class="text-green-400 font-bold text-[9px]">فك الحظر</button></td>   </tr>`;
  }).join('');
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
// ALL MEDIATION DEALS — ADMIN HISTORY
// ============================================================

let allMediationDealsCache = [];

function mediationDealStatusLabel(status) {
  const s = String(status || "unknown").toLowerCase();
  const map = {
    completed: ["مكتملة", "bg-green-500/10", "text-green-400"],
    pending: ["معلقة", "bg-yellow-500/10", "text-yellow-400"],
    active: ["نشطة", "bg-blue-500/10", "text-blue-400"],
    dispute: ["قيد النزاع", "bg-orange-500/10", "text-orange-400"],
    canceled: ["ملغاة", "bg-red-500/10", "text-red-400"],
    expired: ["منتهية", "bg-gray-500/10", "text-gray-400"],
    resolved: ["تم الفصل", "bg-purple-500/10", "text-purple-400"]
  };
  const item = map[s] || [status || "غير معروف", "bg-white/5", "text-gray-300"];
  return `<span class="px-2 py-1 rounded-lg ${item[1]} ${item[2]} font-bold">${escapeHtml(String(item[0]))}</span>`;
}

function renderAllMediationDeals() {
  const table = document.getElementById("allDealsTable");
  if (!table) return;

  const statusFilter = String(document.getElementById("dealsStatusFilter")?.value || "all").toLowerCase();
  const query = String(document.getElementById("dealsSearchInput")?.value || "").trim().toLowerCase();

  const deals = allMediationDealsCache.filter((deal) => {
    const status = String(deal?.status || "").toLowerCase();
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (!query) return true;
    const haystack = [
      deal?.id, deal?.deal_id, deal?.code, deal?.deal_code,
      deal?.buyer_id, deal?.seller_id,
      deal?.buyer_username, deal?.seller_username
    ].map(v => String(v ?? "")).join(" ").toLowerCase();
    return haystack.includes(query);
  });

  if (!deals.length) {
    table.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-gray-500">لا توجد صفقات مطابقة.</td></tr>`;
    return;
  }

  table.innerHTML = deals.map((deal) => {
    const id = deal?.id ?? deal?.deal_id ?? "—";
    const code = deal?.code ?? deal?.deal_code ?? "—";
    const amount = Number(deal?.amount_usd ?? deal?.amount ?? 0);
    const total = Number(deal?.total_usd ?? amount);
    const buyer = deal?.buyer_username ? `${deal.buyer_id ?? "—"} · ${deal.buyer_username}` : (deal?.buyer_id ?? "—");
    const seller = deal?.seller_username ? `${deal.seller_id ?? "—"} · ${deal.seller_username}` : (deal?.seller_id ?? "—");
    const status = String(deal?.status || "unknown");
    const created = deal?.created_at || deal?.updated_at || "";
    const canOpenEvidence = ["dispute", "resolved"].includes(status.toLowerCase());

    return `<tr class="hover:bg-white/[0.02]">
      <td class="p-3 text-white font-mono">${escapeHtml(String(id))}</td>
      <td class="p-3 text-purple-400 font-mono">${escapeHtml(String(code))}</td>
      <td class="p-3 text-white">$${escapeHtml(amount.toFixed(2))}</td>
      <td class="p-3 text-cyan-300">$${escapeHtml(total.toFixed(2))}</td>
      <td class="p-3 text-gray-300">${escapeHtml(String(buyer))}</td>
      <td class="p-3 text-gray-300">${escapeHtml(String(seller))}</td>
      <td class="p-3">${mediationDealStatusLabel(status)}</td>
      <td class="p-3 text-gray-400">${formatMediationDate(created)}</td>
      <td class="p-3 text-center">
        ${canOpenEvidence ? `<button class="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 px-3 py-1.5 rounded-lg" data-all-deal-evidence-id="${escapeHtml(String(id))}">عرض الملف</button>` : `<span class="text-gray-600 text-[10px]">—</span>`}
      </td>
    </tr>`;
  }).join("");

  table.querySelectorAll("[data-all-deal-evidence-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.allDealEvidenceId);
      if (Number.isInteger(id) && id > 0) loadMediationEvidence(id);
    });
  });
}

function updateAllMediationDealStats(deals) {
  const count = (status) => deals.filter(d => String(d?.status || "").toLowerCase() === status).length;
  const cards = [
    ["dealsStatTotal", "إجمالي الصفقات", deals.length, "text-white"],
    ["dealsStatCompleted", "مكتملة", count("completed"), "text-green-400"],
    ["dealsStatPending", "معلقة", count("pending") + count("active"), "text-yellow-400"],
    ["dealsStatDispute", "قيد النزاع", count("dispute"), "text-orange-400"],
    ["dealsStatCanceled", "ملغاة", count("canceled") + count("expired"), "text-red-400"]
  ];
  cards.forEach(([id, label, value, tone]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="text-[10px] text-gray-500">${label}</div><div class="text-xl font-black ${tone} mt-1">${value}</div>`;
  });
}

async function loadAllMediationDeals() {
  const table = document.getElementById("allDealsTable");
  if (!table) return;
  table.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-gray-500">جاري تحميل جميع الصفقات...</td></tr>`;

  const res = await api("get_all_mediation_deals");
  if (!res || res.error) {
    table.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-red-400">تعذر تحميل سجل الصفقات: ${escapeHtml(String(res?.error || "خطأ غير معروف"))}</td></tr>`;
    return;
  }

  const deals = Array.isArray(res?.data) ? res.data : Array.isArray(res?.deals) ? res.deals : Array.isArray(res) ? res : [];
  allMediationDealsCache = deals;
  updateAllMediationDealStats(deals);
  renderAllMediationDeals();
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
              <td colspan="9" class="p-6 text-center text-red-400">  
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
              <td colspan="9" class="p-6 text-center text-gray-500">  
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
              <td class="p-3 text-center">
                  <button
                      class="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 px-3 py-1.5 rounded-lg"
                      data-mediation-analyze-deal-id="${escapeHtml(String(dealId))}">
                      تحليل النزاع
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

  table.querySelectorAll("[data-mediation-analyze-deal-id]").forEach(button => {
      button.addEventListener("click", () => {
          const dealId = Number(button.dataset.mediationAnalyzeDealId);
          if (Number.isInteger(dealId) && dealId > 0) {
              loadMediationAnalysis(dealId);
          }
      });
  });
}

function mediationAnalysisStat(label, value, tone = "text-white") {
    return `
        <div class="bg-black/20 rounded-xl p-3 border border-white/5">
            <div class="text-gray-500 text-[10px]">${escapeHtml(String(label))}</div>
            <div class="${tone} font-black text-lg mt-1">${escapeHtml(String(value))}</div>
        </div>
    `;
}

function mediationPartyValue(value, fallback = "غير متاح") {
    if (value === null || value === undefined || String(value).trim() === "") {
        return fallback;
    }
    return String(value);
}

function mediationPartyCard(profile, inference, tone = "blue") {
    const isSeller = profile?.side === "seller";
    const border = isSeller ? "border-purple-500/20" : "border-blue-500/20";
    const badge = isSeller
        ? "text-purple-300 bg-purple-500/10 border-purple-500/20"
        : "text-blue-300 bg-blue-500/10 border-blue-500/20";
    const scoreTone = isSeller ? "text-purple-300" : "text-blue-300";
    const email = mediationPartyValue(profile?.email);
    const emailDomain = mediationPartyValue(profile?.email_domain);
    const username = mediationPartyValue(profile?.username);
    const platform = mediationPartyValue(profile?.platform);
    const accountUrl = mediationPartyValue(profile?.account_url);
    const userId = mediationPartyValue(profile?.user_id);
    const fingerprint = profile?.fingerprint_available ? "متاحة" : "غير متاحة";
    const identityCompleteness = Number(profile?.identity_completeness ?? 0);
    const accountCreated = profile?.account_created_at
        ? new Date(profile.account_created_at).toLocaleString("ar-DZ")
        : "غير متاح";
    const lastOnline = profile?.last_online
        ? new Date(profile.last_online).toLocaleString("ar-DZ")
        : "غير متاح";
    const device = mediationPartyValue(
        [profile?.manufacturer, profile?.brand, profile?.device_model].filter(Boolean).join(" / ")
    );

    return `
        <div class="bg-black/20 border ${border} rounded-2xl p-5">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h5 class="text-white font-black text-sm">${escapeHtml(profile?.label || (isSeller ? "البائع" : "المشتري"))}</h5>
                    <p class="text-gray-500 text-[10px] mt-1">بيانات الحساب + مؤشرات مساعدة للمقارنة</p>
                </div>
                <span class="px-2.5 py-1 rounded-lg border text-[10px] font-bold ${badge}">
                    ${escapeHtml(profile?.side || "—")}
                </span>
            </div>

            <div class="grid grid-cols-1 gap-2 text-[11px]">
                <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-gray-500 text-[9px]">معرّف المستخدم</div>
                    <div class="text-white font-bold mt-1 break-all">${escapeHtml(userId)}</div>
                </div>
                <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-gray-500 text-[9px]">البريد الإلكتروني</div>
                    <div class="text-white font-bold mt-1 break-all">${escapeHtml(email)}</div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">نطاق البريد</div>
                        <div class="text-gray-200 mt-1 break-all">${escapeHtml(emailDomain)}</div>
                    </div>
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">اسم الحساب</div>
                        <div class="text-gray-200 mt-1 break-all">${escapeHtml(username)}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">المنصة</div>
                        <div class="text-gray-200 mt-1 break-all">${escapeHtml(platform)}</div>
                    </div>
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">بصمة الجهاز</div>
                        <div class="text-gray-200 mt-1">${escapeHtml(fingerprint)}</div>
                    </div>
                </div>
                <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-gray-500 text-[9px]">رابط الحساب</div>
                    <div class="text-gray-300 mt-1 break-all">${escapeHtml(accountUrl)}</div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">اكتمال بيانات الهوية</div>
                        <div class="${scoreTone} font-bold mt-1">${escapeHtml(String(identityCompleteness))}%</div>
                    </div>
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">الجهاز</div>
                        <div class="text-gray-200 mt-1 break-all">${escapeHtml(device)}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">إنشاء الحساب</div>
                        <div class="text-gray-200 mt-1">${escapeHtml(accountCreated)}</div>
                    </div>
                    <div class="bg-white/[0.03] rounded-xl p-3">
                        <div class="text-gray-500 text-[9px]">آخر نشاط</div>
                        <div class="text-gray-200 mt-1">${escapeHtml(lastOnline)}</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-3">
                <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-gray-500 text-[9px]">الإشارات الاتجاهية</div>
                    <div class="${scoreTone} font-black text-lg mt-1">${escapeHtml(String(profile?.directional_findings_count ?? 0))}</div>
                </div>
                <div class="bg-white/[0.03] rounded-xl p-3">
                    <div class="text-gray-500 text-[9px]">مجموع النقاط</div>
                    <div class="${scoreTone} font-black text-lg mt-1">${escapeHtml(String(profile?.directional_score ?? 0))}</div>
                </div>
            </div>

            <div class="mt-3 rounded-xl p-4 bg-cyan-500/5 border border-cyan-500/10">
                <div class="text-cyan-300 text-[10px] font-bold mb-1">استنتاج مساعد — غير حاسم</div>
                <div class="text-gray-300 text-[11px] leading-6">${escapeHtml(inference?.interpretation || "لا يوجد استنتاج آلي إضافي.")}</div>
            </div>
        </div>
    `;
}

function mediationAnalysisFinding(finding) {
    const side = finding?.side || "neutral";
    const sideText = side === "buyer" ? "المشتري" : side === "seller" ? "البائع" : "محايد";
    const sideClass = side === "buyer"
        ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
        : side === "seller"
            ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
            : "text-gray-400 bg-gray-500/10 border-gray-500/20";

    return `
        <div class="bg-black/20 rounded-xl p-4 border border-white/5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-white font-bold text-xs">${escapeHtml(finding?.title || "دليل")}</div>
                    <div class="text-gray-500 text-[10px] mt-1">${escapeHtml(finding?.category || "—")} · ${escapeHtml(finding?.code || "—")}</div>
                </div>
                <div class="shrink-0 px-2 py-1 rounded-lg border text-[10px] ${sideClass}">
                    ${escapeHtml(sideText)}${Number(finding?.weight || 0) > 0 ? ` · +${escapeHtml(String(finding.weight))}` : ""}
                </div>
            </div>
            <p class="text-gray-300 text-[11px] leading-6 mt-3">${escapeHtml(finding?.detail || finding?.explanation || "—")}</p>
            <div class="flex gap-2 mt-3 text-[10px] text-gray-500">
                <span>القوة: ${escapeHtml(finding?.strength || "—")}</span>
                <span>الموثوقية: ${escapeHtml(finding?.reliability || "—")}</span>
            </div>
        </div>
    `;
}

async function loadMediationAnalysis(dealId) {
    const panel = document.getElementById("mediationAnalysisPanel");
    const content = document.getElementById("mediationAnalysisContent");
    const dealLabel = document.getElementById("mediationAnalysisDeal");

    if (!panel || !content) return;

    panel.classList.remove("hidden");
    if (dealLabel) dealLabel.textContent = `تحليل أدلة الصفقة #${dealId}`;

    content.innerHTML = `
        <div class="flex items-center justify-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
    `;

    const res = await api("analyze_mediation_dispute", { deal_id: dealId });

    if (!res || res.error) {
        content.innerHTML = `
            <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center">
                <div class="text-red-400 font-bold mb-1">❌ تعذر تحليل النزاع</div>
                <div class="text-gray-500 text-xs">${escapeHtml(res?.error || `الصفقة #${dealId}`)}</div>
            </div>
        `;
        return;
    }

    const analysis = res.analysis || res.assessment || {};

    const findings = Array.isArray(analysis.findings)
        ? analysis.findings
        : [];

    const limitations = Array.isArray(analysis.limitations)
        ? analysis.limitations
        : [];

    const contradictions = Array.isArray(analysis.contradictions)
        ? analysis.contradictions
        : [];

    const evidenceCoverage =
        analysis.evidence_coverage ||
        analysis.evidence_summary ||
        {};

    const adminReview = analysis.admin_review || {};

    const buyerScore = Number(analysis.buyer_score || 0);
    const sellerScore = Number(analysis.seller_score || 0);

    const buyerPercent = Number(
        analysis.buyer_percentage ?? 50
    );

    const sellerPercent = Number(
        analysis.seller_percentage ?? 50
    );

    const confidence = Number(
        analysis.confidence_percentage || 0
    );

    const scorecard = analysis.scorecard || {};

    // ============================================================
    // PARTY COMPARISON
    // ============================================================
    // Prefer analysis.party_comparison when available.
    // Otherwise safely fall back to the original evidence profiles.
    const partyComparison =
        analysis.party_comparison ||
        {};

    const evidence = res.evidence || {};

    const roleResolution =
        analysis.role_resolution ||
        evidence.role_resolution ||
        {};

    const rawBuyer =
        partyComparison.buyer ||
        evidence.buyer ||
        {};

    const rawSeller =
        partyComparison.seller ||
        evidence.seller ||
        {};

    // Normalize buyer identity and force the correct role.
    const buyerProfile = {
        ...rawBuyer,
        side: "buyer",
        label:
            rawBuyer.label ||
            rawBuyer.display_name ||
            "المشتري",
        user_id:
            rawBuyer.user_id ||
            rawBuyer.id ||
            roleResolution.buyer_id ||
            evidence?.deal?.buyer_id ||
            "غير متاح"
    };

    // Normalize seller identity and force the correct role.
    const sellerProfile = {
        ...rawSeller,
        side: "seller",
        label:
            rawSeller.label ||
            rawSeller.display_name ||
            "البائع",
        user_id:
            rawSeller.user_id ||
            rawSeller.id ||
            roleResolution.seller_id ||
            evidence?.deal?.seller_id ||
            "غير متاح"
    };

    const buyerInference =
        partyComparison.inferences?.buyer ||
        {};

    const sellerInference =
        partyComparison.inferences?.seller ||
        {};

    const directionalFindings = findings.filter(f => f?.side === "buyer" || f?.side === "seller");
    const neutralFindings = findings.filter(f => f?.side === "neutral");

    const priorityText = adminReview.priority || "مراجعة عادية";
    const statusText = analysis.status || "غير محدد";

    content.innerHTML = `
        <div class="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h5 class="text-white font-black text-sm">⚖️ نتيجة التحليل الآلي</h5>
                    <p class="text-gray-500 text-[10px] mt-1">تحليل مساعد للأدلة فقط — القرار النهائي يبقى للأدمن.</p>
                </div>
                <span class="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                    ${escapeHtml(statusText)}
                </span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${mediationAnalysisStat("درجة المشتري", buyerScore, "text-blue-400")}
                ${mediationAnalysisStat("درجة البائع", sellerScore, "text-purple-400")}
                ${mediationAnalysisStat("ثقة جودة الأدلة", `${confidence}%`, "text-cyan-400")}
                ${mediationAnalysisStat("الأولوية", priorityText, "text-yellow-400")}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
                <div class="flex justify-between text-xs mb-2"><span class="text-gray-300">المشتري</span><span class="text-blue-400 font-bold">${buyerPercent}%</span></div>
                <div class="h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-blue-500/70" style="width:${Math.max(0, Math.min(100, buyerPercent))}%"></div></div>
            </div>
            <div class="bg-purple-500/5 border border-purple-500/15 rounded-2xl p-5">
                <div class="flex justify-between text-xs mb-2"><span class="text-gray-300">البائع</span><span class="text-purple-400 font-bold">${sellerPercent}%</span></div>
                <div class="h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-purple-500/70" style="width:${Math.max(0, Math.min(100, sellerPercent))}%"></div></div>
            </div>
        </div>

        <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h5 class="text-white font-black text-sm mb-4">📊 تغطية الأدلة</h5>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${mediationAnalysisStat("تغطية المصادر", `${Number(evidenceCoverage.source_coverage_percentage ?? scorecard.source_coverage_percentage ?? 0)}%`)}
                ${mediationAnalysisStat("التغطية الاتجاهية", `${Number(evidenceCoverage.directional_evidence_coverage ?? scorecard.directional_evidence_coverage ?? 0)}%`)}
                ${mediationAnalysisStat("قيود", limitations.length)}
                ${mediationAnalysisStat("تناقضات", contradictions.length, contradictions.length ? "text-orange-400" : "text-green-400")}
            </div>
        </div>

        <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h5 class="text-white font-black text-sm mb-4">🔎 الأدلة الاتجاهية</h5>
            <div class="space-y-3">
                ${directionalFindings.length ? directionalFindings.map(mediationAnalysisFinding).join("") : `<div class="text-gray-500 text-xs text-center py-5">لا توجد أدلة اتجاهية آلية كافية.</div>`}
            </div>
        </div>

        <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h5 class="text-white font-black text-sm mb-4">🧾 القيود والتناقضات</h5>
            <div class="space-y-3">
                ${contradictions.length ? contradictions.map(item => `<div class="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4 text-xs text-orange-200">${escapeHtml(item?.detail || item?.explanation || item?.title || JSON.stringify(item))}</div>`).join("") : `<div class="text-green-400 text-xs">لا توجد تناقضات آلية مسجلة.</div>`}
                ${limitations.length ? limitations.map(item => `<div class="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4 text-xs text-gray-300">⚠️ ${escapeHtml(item)}</div>`).join("") : `<div class="text-gray-500 text-xs">لا توجد قيود إضافية مسجلة.</div>`}
            </div>
        </div>

        <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h5 class="text-white font-black text-sm mb-4">👮 مراجعة الإدمن</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                <div class="bg-black/20 rounded-xl p-4"><span class="text-gray-500">الأولوية</span><div class="text-yellow-400 font-bold mt-1">${escapeHtml(priorityText)}</div></div>
                <div class="bg-black/20 rounded-xl p-4"><span class="text-gray-500">القرار</span><div class="text-white font-bold mt-1">مطلوب من الإدمن</div></div>
                <div class="md:col-span-2 bg-black/20 rounded-xl p-4"><span class="text-gray-500">الخلاصة</span><div class="text-gray-300 leading-6 mt-1">${escapeHtml(analysis.summary || "لا توجد خلاصة إضافية.")}</div></div>
            </div>
        </div>

        <div class="bg-black/20 border border-white/5 rounded-xl p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-gray-400 text-[10px]">${escapeHtml(analysis.methodology || scorecard.version || "evidence_scorecard_v2")}</span>
                <span class="text-green-400 text-[10px] font-bold">READ-ONLY · القرار النهائي للأدمن</span>
            </div>
        </div>

        <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h5 class="text-white font-black text-sm">👥 أصحاب الصفقة — مقارنة منفصلة</h5>
                    <p class="text-gray-500 text-[10px] mt-1">بيانات تعريفية ومؤشرات استنتاجية مساعدة لتمييز طرفي الصفقة. لا تعتبر حكماً نهائياً.</p>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 text-[10px] font-bold">مراجعة بشرية مطلوبة</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${mediationPartyCard(buyerProfile, buyerInference, "blue")}
                ${mediationPartyCard(sellerProfile, sellerInference, "purple")}
            </div>
            <div class="mt-4 bg-black/20 border border-white/5 rounded-xl p-4 text-[10px] text-gray-400 leading-6">
                <span class="text-cyan-300 font-bold">ملاحظة:</span> ${escapeHtml(partyComparison.note || "المؤشرات مبنية على البيانات المتاحة فقط ولا تستبدل مراجعة الأدلة الأصلية.")}
            </div>
        </div>

        <details class="bg-black/20 border border-white/5 rounded-xl">
            <summary class="cursor-pointer p-4 text-gray-400 text-xs font-bold">⚙️ تفاصيل التحليل الخام</summary>
            <div class="p-4"><pre class="bg-[#080b12] rounded-xl p-4 text-[10px] text-gray-400 overflow-auto max-h-[500px] whitespace-pre-wrap">${escapeHtml(JSON.stringify(analysis, null, 2))}</pre></div>
        </details>
    `;
}

function mediationEvidenceStat(label, value) {
  return `
      <div class="bg-black/20 rounded-xl p-3 border border-white/5">
          <div class="text-gray-500 text-[10px]">${escapeHtml(String(label))}</div>
          <div class="text-white font-bold text-sm mt-1 truncate">${escapeHtml(String(value))}</div>
      </div>
  `;
}

async function loadMediationEvidence(dealId) {
    const panel = document.getElementById("mediationEvidencePanel");
    const content = document.getElementById("mediationEvidenceContent");
    const dealLabel = document.getElementById("mediationEvidenceDeal");

    if (!panel || !content) return;

    panel.classList.remove("hidden");

    if (dealLabel) {
        dealLabel.textContent = `ملف أدلة الصفقة #${dealId}`;
    }

    content.innerHTML = `
        <div class="flex items-center justify-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
    `;

    const res = await api("get_mediation_dispute_evidence", {
        deal_id: dealId
    });

    if (!res || res.error || !res.evidence) {
        content.innerHTML = `
            <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center">
                <div class="text-red-400 font-bold mb-1">❌ تعذر جلب ملف أدلة الصفقة</div>
                <div class="text-gray-500 text-xs">الصفقة #${escapeHtml(String(dealId))}</div>
            </div>
        `;
        return;
    }

    const evidence = res.evidence || {};
    const deal = evidence.deal || {};
    const dispute = evidence.dispute || {};
    const certificate = evidence.certificate || {};
    const snapshot = evidence.snapshot || {};
    const summary = evidence.summary || {};
    const checks = evidence.checks || {};
    const conflicts = Array.isArray(evidence.conflicts) ? evidence.conflicts : [];
    const missingEvidence = Array.isArray(evidence.missing_evidence) ? evidence.missing_evidence : [];
    const events = Array.isArray(evidence.events)
        ? evidence.events
        : Array.isArray(evidence.timeline)
            ? evidence.timeline
            : [];

    const buyer = evidence.buyer || {};
    const seller = evidence.seller || {};
    const account = evidence.account || {};
    const verification = evidence.verification || {};
    const attachments = Array.isArray(evidence.attachments) ? evidence.attachments : [];
    const productDetails = evidence.product_details || evidence.product || {};
    const roleResolution = evidence.role_resolution || {};
    const messages = evidence.messages || {};

    // The Evidence RPC returns the canonical full conversation under
    // messages.timeline. Keep compatibility with the admin-side fallback
    // items/data/messages/chat_logs as well, but prefer timeline when present.
    const rawMessageItems = Array.isArray(messages.timeline)
        ? messages.timeline
        : Array.isArray(messages.items)
            ? messages.items
            : Array.isArray(messages.data)
                ? messages.data
                : Array.isArray(messages.messages)
                    ? messages.messages
                    : Array.isArray(evidence.chat_logs)
                        ? evidence.chat_logs
                        : Array.isArray(messages)
                            ? messages
                            : [];

    const messageItems = [...rawMessageItems].sort((a, b) => {
        const av = new Date(a?.created_at || a?.sent_at || a?.timestamp || a?.createdAt || 0).getTime();
        const bv = new Date(b?.created_at || b?.sent_at || b?.timestamp || b?.createdAt || 0).getTime();
        return (Number.isFinite(av) ? av : 0) - (Number.isFinite(bv) ? bv : 0);
    });

    const messageCount = Number(messages.count ?? messageItems.length ?? 0);
    const messageParticipants = Array.isArray(messages.participants)
        ? messages.participants.filter(Boolean)
        : [];

    const statusBadge = (status) => {
        const value = String(status || "").toUpperCase();
        const map = {
            PASS: { text: "سليم", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
            PASSED: { text: "سليم", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
            OK: { text: "سليم", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
            FAIL: { text: "فشل", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
            FAILED: { text: "فشل", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
            MISSING: { text: "مفقود", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
            CONFLICT: { text: "تعارض", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
            NOT_APPLICABLE: { text: "غير مطلوب", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
            UNKNOWN: { text: "غير معروف", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" }
        };
        const item = map[value] || {
            text: status || "غير معروف",
            cls: "bg-gray-500/10 text-gray-400 border-gray-500/20"
        };
        return `<span class="inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-bold ${item.cls}">${escapeHtml(String(item.text))}</span>`;
    };

    const valueOrDash = (value) => {
        if (value === null || value === undefined || value === "") return "—";
        if (typeof value === "object") return escapeHtml(JSON.stringify(value));
        return escapeHtml(String(value));
    };

    const labelForKey = (key) => {
        const map = {
            id: "المعرف",
            deal_id: "رقم الصفقة",
            dispute_id: "رقم النزاع",
            buyer_id: "معرف المشتري",
            seller_id: "معرف البائع",
            sender_id: "معرف المرسل",
            actor_user_id: "معرف المنفذ",
            user_id: "معرف المستخدم",
            auth_id: "Auth ID",
            created_at: "تاريخ الإنشاء",
            updated_at: "آخر تحديث",
            opened_at: "تاريخ الفتح",
            escalated_at: "تاريخ التصعيد",
            captured_at: "وقت الالتقاط",
            sent_at: "وقت الإرسال",
            message: "الرسالة",
            message_type: "نوع الرسالة",
            status: "الحالة",
            code: "الكود",
            reason: "السبب",
            description: "الوصف",
            metadata: "البيانات الإضافية",
            evidence_refs: "مراجع الدليل",
            source: "المصدر",
            source_type: "نوع المصدر",
            amount_usd: "المبلغ بالدولار",
            platform: "المنصة",
            account_url: "رابط الحساب",
            username: "اسم المستخدم",
            account_username: "اسم الحساب",
            fingerprint: "البصمة",
            sha256: "SHA-256",
            snapshot_sha256: "بصمة Snapshot"
        };
        return map[key] || String(key).replaceAll("_", " ");
    };

    const renderPrimitive = (value, key = "") => {
        if (value === null || value === undefined || value === "") return "—";
        if (typeof value === "boolean") return value ? "نعم" : "لا";
        if (typeof value === "number") return escapeHtml(String(value));
        if (typeof value === "string") {
            const lower = key.toLowerCase();
            if (lower.includes("_at") || lower.endsWith("time") || lower === "timestamp") {
                const d = new Date(value);
                if (!Number.isNaN(d.getTime())) return formatMediationDate(value);
            }
            return escapeHtml(value);
        }
        return escapeHtml(JSON.stringify(value));
    };

    const renderObjectFields = (obj, options = {}) => {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "";
        const entries = Object.entries(obj).filter(([key]) => !options.skip?.includes(key));
        if (!entries.length) return `<div class="text-gray-500 text-xs text-center py-4">لا توجد بيانات</div>`;
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">${entries.map(([key, value]) => `
            <div class="bg-black/20 rounded-xl p-3 border border-white/5 ${typeof value === "object" ? "md:col-span-2" : ""}">
                <div class="text-gray-500 text-[10px] mb-1">${escapeHtml(labelForKey(key))}</div>
                <div class="text-gray-200 text-[11px] break-words whitespace-pre-wrap">${renderPrimitive(value, key)}</div>
            </div>
        `).join("")}</div>`;
    };

    const section = (icon, title, subtitle, body) => `
        <section class="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <div class="mb-4">
                <h5 class="text-white font-black text-sm">${icon} ${escapeHtml(title)}</h5>
                ${subtitle ? `<p class="text-gray-500 text-[10px] mt-1">${escapeHtml(subtitle)}</p>` : ""}
            </div>
            ${body}
        </section>
    `;

    const partyCard = (role, profile) => {
        const side = role === "buyer" ? "المشتري" : "البائع";
        const roleClass = role === "buyer"
            ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
            : "text-purple-400 bg-purple-500/10 border-purple-500/20";
        const p = {
            ...(profile || {}),
            ...((profile && (profile.user_profile || profile.profile)) || {})
        };
        return `
            <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <div class="text-white font-black text-xs">${role === "buyer" ? "🛒" : "👨‍💼"} ${side}</div>
                    <span class="px-2 py-1 rounded-lg border text-[10px] ${roleClass}">${side}</span>
                </div>
                ${renderObjectFields(p)}
            </div>
        `;
    };

    const checkRows = Object.entries(checks).map(([key, item]) => {
        const obj = item && typeof item === "object" ? item : { status: item };
        const status = obj.status || obj.result || obj.state;
        const evidenceRefs = obj.evidence_refs || obj.evidenceRefs || obj.refs;
        return `
            <details class="bg-black/20 rounded-xl border border-white/5 p-3">
                <summary class="cursor-pointer flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <div class="text-white text-xs font-bold break-words">${escapeHtml(String(key))}</div>
                        ${obj.description || obj.reason || obj.message ? `<div class="text-gray-500 text-[10px] mt-1">${escapeHtml(String(obj.description || obj.reason || obj.message))}</div>` : ""}
                    </div>
                    <div class="shrink-0">${statusBadge(status)}</div>
                </summary>
                <div class="mt-3">${renderObjectFields(obj, {skip:["status","result","state"]})}</div>
                ${evidenceRefs ? `<div class="mt-3 bg-[#080b12] rounded-xl p-3"><div class="text-gray-500 text-[10px] mb-2">مراجع الأدلة</div><pre class="text-[10px] text-gray-400 whitespace-pre-wrap overflow-auto">${escapeHtml(JSON.stringify(evidenceRefs, null, 2))}</pre></div>` : ""}
            </details>
        `;
    }).join("");

    const renderList = (items, emptyText, renderer) => items.length
        ? `<div class="space-y-2">${items.map(renderer).join("")}</div>`
        : `<div class="text-gray-500 text-xs text-center py-5">${escapeHtml(emptyText)}</div>`;

    const eventRows = events.length
        ? events.map((event, index) => {
            const eventType = event.event_type || event.type || event.action || "EVENT";
            const time = event.created_at || event.occurred_at || event.timestamp || event.time;
            const actor = event.actor_user_id ?? event.user_id ?? event.actor_id;
            return `
                <details class="relative bg-black/20 border border-white/5 rounded-xl p-4">
                    <summary class="cursor-pointer list-none">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="text-purple-400 font-bold text-xs">${escapeHtml(String(eventType))}</span>
                            <span class="text-gray-500 text-[10px]">${formatMediationDate(time)}</span>
                        </div>
                        <div class="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-500">
                            ${actor !== undefined && actor !== null ? `<span>👤 ${escapeHtml(String(actor))}</span>` : ""}
                            ${event.amount_usd !== undefined && event.amount_usd !== null ? `<span>💰 $${escapeHtml(Number(event.amount_usd).toFixed(2))}</span>` : ""}
                        </div>
                    </summary>
                    <div class="mt-3">${renderObjectFields(event)}</div>
                </details>
            `;
        }).join("")
        : `<div class="text-gray-500 text-xs text-center py-5">لا توجد أحداث مسجلة</div>`;

    const messageRows = messageItems.length
        ? messageItems.map((message, index) => {
            const senderId = message.sender_id ?? message.sender_user_id ?? message.user_id ?? message.actor_user_id;
            const buyerId = Number(deal.buyer_id ?? roleResolution.buyer_id);
            const sellerId = Number(deal.seller_id ?? roleResolution.seller_id);
            const numericSender = Number(senderId);
            const rawRole = String(message.sender_role || message.role || "").toLowerCase();
            const role = rawRole === "buyer" || numericSender === buyerId
                ? "المشتري"
                : rawRole === "seller" || numericSender === sellerId
                    ? "البائع"
                    : "طرف غير محدد";
            const type = message.message_type || message.type || "text";
            const time = message.created_at || message.sent_at || message.timestamp || message.createdAt;
            const body = message.message ?? message.text ?? message.content ?? "";
            return `
                <details class="bg-black/20 border border-white/5 rounded-xl p-4" ${index === messageItems.length - 1 ? "open" : ""}>
                    <summary class="cursor-pointer list-none">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-white font-bold text-xs">${escapeHtml(role)}</span>
                                <span class="text-gray-500 text-[10px]">User #${escapeHtml(String(senderId ?? "—"))}</span>
                                <span class="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[10px]">${escapeHtml(String(type))}</span>
                            </div>
                            <span class="text-gray-500 text-[10px]">${formatMediationDate(time)}</span>
                        </div>
                        <div class="text-gray-200 text-[11px] leading-6 mt-3 whitespace-pre-wrap break-words">${escapeHtml(String(body || "—"))}</div>
                    </summary>
                    <div class="mt-3">${renderObjectFields(message, {skip:["message","text","content"]})}</div>
                </details>
            `;
        }).join("")
        : `<div class="text-gray-500 text-xs text-center py-5">لا توجد رسائل كاملة داخل الاستجابة الحالية</div>`;

    const participantRows = messageParticipants.length
        ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">${messageParticipants.map((participant) => `
            <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                <div class="text-gray-500 text-[10px]">${escapeHtml(String(participant.role || "طرف"))}</div>
                <div class="text-white text-xs font-bold mt-1">User #${escapeHtml(String(participant.user_id ?? "—"))}</div>
                <div class="text-gray-400 text-[10px] mt-1">عدد الرسائل: ${escapeHtml(String(participant.message_count ?? "—"))}</div>
            </div>
        `).join("")}</div>`
        : "";

    const temporal = messages.temporal_context || evidence.temporal_context || evidence.temporal || {};
    const temporalBody = typeof temporal === "object" ? renderObjectFields(temporal) : `<div class="text-gray-300 text-xs">${valueOrDash(temporal)}</div>`;

    const partySection = (buyer && Object.keys(buyer).length) || (seller && Object.keys(seller).length)
        ? section("👥", "مقارنة أطراف الصفقة", "الهوية والبيانات المرتبطة بالمشتري والبائع كما وصلت من محرك الأدلة.", `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${partyCard("buyer", buyer)}${partyCard("seller", seller)}</div>`)
        : "";

    const certificateBody = certificate && Object.keys(certificate).length
        ? renderObjectFields(certificate)
        : `<div class="text-gray-500 text-xs">لا توجد شهادة محفوظة في هذه الاستجابة.</div>`;

    const snapshotBody = snapshot && Object.keys(snapshot).length
        ? renderObjectFields(snapshot)
        : `<div class="text-gray-500 text-xs">لا يوجد Snapshot في هذه الاستجابة.</div>`;

    const conflictBody = renderList(conflicts, "لا توجد تعارضات مسجلة", (item, i) => `
        <div class="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
            <div class="text-orange-300 font-bold text-xs mb-2">تعارض ${i + 1}</div>
            ${typeof item === "object" ? renderObjectFields(item) : `<div class="text-gray-300 text-[11px] whitespace-pre-wrap">${escapeHtml(String(item))}</div>`}
        </div>
    `);

    const missingBody = renderList(missingEvidence, "لا توجد أدلة مفقودة مسجلة", (item, i) => `
        <div class="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
            <div class="text-yellow-300 font-bold text-xs mb-2">دليل مفقود ${i + 1}</div>
            ${typeof item === "object" ? renderObjectFields(item) : `<div class="text-gray-300 text-[11px] whitespace-pre-wrap">${escapeHtml(String(item))}</div>`}
        </div>
    `);

    const attachmentBody = renderList(attachments, "لا توجد مرفقات مسجلة", (item, i) => `
        <div class="bg-black/20 rounded-xl p-4 border border-white/5">
            <div class="text-white text-xs font-bold mb-2">مرفق ${i + 1}</div>
            ${typeof item === "object" ? renderObjectFields(item) : `<div class="text-gray-300 text-[11px] break-words">${escapeHtml(String(item))}</div>`}
        </div>
    `);

    const genericSources = [
        ["بيانات الحساب", account],
        ["التحقق", verification],
        ["تفاصيل المنتج/الحساب", productDetails]
    ].filter(([, obj]) => obj && typeof obj === "object" && Object.keys(obj).length);

    const decisionStatus = String(deal.status || dispute.status || "").toLowerCase();
    const decisionEvents = Array.isArray(events)
        ? events.filter((event) => ["MEDIATION_DECISION_BUYER", "MEDIATION_DECISION_SELLER"].includes(String(event?.event_type || "").toUpperCase()))
        : [];
    const latestDecisionEvent = decisionEvents.length ? decisionEvents[decisionEvents.length - 1] : null;
    const decisionMeta = latestDecisionEvent?.metadata && typeof latestDecisionEvent.metadata === "object"
        ? latestDecisionEvent.metadata
        : {};
    const finalDecision = String(decisionMeta.decision || "").toLowerCase();
    const finalDecisionMade = decisionEvents.length > 0
        || String(dispute.status || "").toLowerCase() === "resolved";
    const finalDecisionLabel = finalDecision === "buyer"
        ? "🟢 تم الفصل لصالح المشتري"
        : finalDecision === "seller"
            ? "🟣 تم الفصل لصالح البائع"
            : (finalDecisionMade ? "⚖️ تم الفصل في النزاع" : "");

    const decisionSection = `
        <div class="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h5 class="text-white font-black text-sm">⚖️ القرار النهائي للأدمن</h5>
                    <p class="text-gray-500 text-[10px] mt-1">
                        هذا القسم لا يعتمد على نتيجة التحليل الآلي. الضغط على أحد الزرين ينفذ قرارًا ماليًا نهائيًا للصفقة.
                    </p>
                </div>
                <span class="px-3 py-1.5 rounded-lg ${finalDecisionMade ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"} text-[10px] font-bold">
                    ${finalDecisionMade ? "تم اتخاذ قرار نهائي" : "بانتظار قرار الأدمن"}
                </span>
            </div>

            ${finalDecisionMade ? `
                <div class="bg-black/20 rounded-xl p-4 border border-white/5 text-center">
                    <div class="text-gray-400 text-xs">النتيجة النهائية</div>
                    <div class="text-white font-black text-lg mt-1">${escapeHtml(finalDecisionLabel || "⚖️ تم الفصل في النزاع")}</div>
                    <div class="text-gray-400 text-[11px] mt-2">حالة الصفقة: <span class="text-emerald-300 font-bold">${escapeHtml(deal.status || dispute.status || "—")}</span></div>
                    ${decisionMeta.refund_usd ? `<div class="text-gray-500 text-[10px] mt-1">المبلغ المرتجع للمشتري: $${escapeHtml(Number(decisionMeta.refund_usd).toFixed(2))}</div>` : ""}
                    ${decisionMeta.released_usd ? `<div class="text-gray-500 text-[10px] mt-1">المبلغ المحرر للبائع: $${escapeHtml(Number(decisionMeta.released_usd).toFixed(2))}</div>` : ""}
                    <div class="text-gray-500 text-[10px] mt-2">لا يمكن تنفيذ قرار مالي آخر على هذه الصفقة.</div>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        data-mediation-decision="buyer"
                        data-mediation-decision-deal-id="${escapeHtml(String(dealId))}"
                        class="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 px-4 py-5 text-right transition">
                        <div class="text-emerald-300 font-black text-sm">🟢 القرار للمشتري</div>
                        <div class="text-gray-300 text-xs mt-2 leading-6">إرجاع إجمالي المبلغ المحجوز للمشتري وتسجيل النزاع كقرار نهائي لصالحه.</div>
                        <div class="text-gray-500 text-[10px] mt-2">المبلغ المتوقع للإرجاع: $${escapeHtml(Number(deal.total_usd ?? deal.amount_usd ?? 0).toFixed(2))}</div>
                    </button>

                    <button
                        type="button"
                        data-mediation-decision="seller"
                        data-mediation-decision-deal-id="${escapeHtml(String(dealId))}"
                        class="w-full rounded-2xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/15 px-4 py-5 text-right transition">
                        <div class="text-purple-300 font-black text-sm">🟣 القرار للبائع</div>
                        <div class="text-gray-300 text-xs mt-2 leading-6">تحرير قيمة البيع للبائع وتسجيل الصفقة كمكتملة بقرار الأدمن.</div>
                        <div class="text-gray-500 text-[10px] mt-2">المبلغ المتوقع للبائع: $${escapeHtml(Number(deal.amount_usd ?? 0).toFixed(2))}</div>
                    </button>
                </div>
                <div class="mt-3 text-yellow-400/80 text-[10px] leading-5">
                    ⚠️ القرار نهائي ماليًا ولا يجب الضغط إلا بعد مراجعة الأدلة والمحادثة والـ Snapshot والشهادة.
                </div>
            `}
        </div>
    `;

    const technical = JSON.stringify(evidence, null, 2);

    content.innerHTML = `
        <div class="space-y-5">
            ${section("🧾", "الملخص التنفيذي", "المعلومات الأساسية لملف الأدلة بدون إخفاء التفاصيل الأصلية.", `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${mediationEvidenceStat("رقم الصفقة", `#${deal.id ?? dealId}`)}
                    ${mediationEvidenceStat("الكود", deal.code ?? "—")}
                    ${mediationEvidenceStat("المبلغ", `$${Number(deal.amount_usd || deal.amount || 0).toFixed(2)}`)}
                    ${mediationEvidenceStat("الحالة", deal.status ?? dispute.status ?? "—")}
                    ${mediationEvidenceStat("الأحداث", events.length)}
                    ${mediationEvidenceStat("الرسائل", messageCount)}
                    ${mediationEvidenceStat("التعارضات", conflicts.length)}
                    ${mediationEvidenceStat("أدلة مفقودة", missingEvidence.length)}
                </div>
                <div class="mt-4">${renderObjectFields(summary)}</div>
            `)}

            ${decisionSection}

            ${partySection}

            ${section("⚖️", "معلومات الصفقة والنزاع", "تفاصيل الصفقة والنزاع كما هي في ملف الأدلة.", `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div class="text-gray-300 font-bold text-xs mb-3">الصفقة</div>
                        ${renderObjectFields(deal)}
                    </div>
                    <div class="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div class="text-gray-300 font-bold text-xs mb-3">النزاع</div>
                        ${renderObjectFields(dispute)}
                    </div>
                </div>
            `)}

            ${section("📜", "الشهادة و Snapshot", "عرض الحقول الكاملة بدل الاقتصار على ID والحالة.", `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div class="flex items-center justify-between mb-3"><span class="text-gray-300 font-bold text-xs">الشهادة</span>${statusBadge(Object.keys(certificate).length ? "PASS" : "MISSING")}</div>
                        ${certificateBody}
                    </div>
                    <div class="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div class="flex items-center justify-between mb-3"><span class="text-gray-300 font-bold text-xs">Snapshot</span>${statusBadge(Object.keys(snapshot).length ? "PASS" : "MISSING")}</div>
                        ${snapshotBody}
                    </div>
                </div>
            `)}

            ${genericSources.length ? section("🧩", "المصادر التقنية", "الحساب والتحقق وتفاصيل المنتج/الحساب المتاحة في ملف الأدلة.", genericSources.map(([title, obj]) => `
                <details class="bg-black/20 rounded-xl border border-white/5 p-4 mb-2 last:mb-0">
                    <summary class="cursor-pointer text-white text-xs font-bold">${escapeHtml(title)}</summary>
                    <div class="mt-3">${renderObjectFields(obj)}</div>
                </details>
            `).join("")) : ""}

            ${section("🔍", "فحوصات الأدلة بالتفصيل", "كل فحص مع حالته والرسالة والمصدر ومراجع الأدلة والحقول الإضافية.", checkRows || `<div class="text-gray-500 text-xs text-center py-5">لا توجد فحوصات</div>`)}

            ${section("⚠️", "التعارضات", "أي إشارات متعارضة يجب أن تبقى مرئية للأدمن.", conflictBody)}

            ${section("🕳️", "الأدلة المفقودة", "العناصر التي ذكرها محرك الأدلة كبيانات غير متاحة.", missingBody)}

            ${section("🕒", "الخط الزمني الكامل", "كل حدث مع البيانات الوصفية الأصلية عند توفرها.", `<div class="space-y-2">${eventRows}</div>`)}

            ${section("💬", "محادثة الصفقة — جميع الرسائل", `${messageCount} رسالة مسجلة. يتم عرض الرسائل الفعلية من messages.timeline، مع المرسل والدور والنوع والوقت والنص والحقول الإضافية.`, `
                <div class="grid grid-cols-2 gap-2 mb-3">
                    ${mediationEvidenceStat("عدد الرسائل", messageCount)}
                    ${mediationEvidenceStat("أول رسالة", messages.first_message_at || messages.first || "—")}
                    ${mediationEvidenceStat("آخر رسالة", messages.last_message_at || messages.last || "—")}
                    ${mediationEvidenceStat("المشاركون", messageParticipants.length || "—")}
                </div>
                ${participantRows}
                ${messageItems.length ? `<div class="space-y-2 max-h-[1200px] overflow-auto pr-1">${messageRows}</div>` : messageRows}
            `)}

            ${section("⏱️", "السياق الزمني", "السياق الزمني المرتبط بالرسائل أو الأدلة عند توفره.", temporalBody)}

            ${section("📎", "المرفقات", "أي مرفقات أو مراجع ملفات وصلت مع ملف الأدلة.", attachmentBody)}

            <details class="bg-black/20 border border-white/5 rounded-xl">
                <summary class="cursor-pointer p-4 text-gray-400 text-xs font-bold">⚙️ التفاصيل التقنية الخام — كامل ملف الأدلة</summary>
                <div class="p-4">
                    <pre class="bg-[#080b12] rounded-xl p-4 text-[10px] text-gray-400 overflow-auto max-h-[800px] whitespace-pre-wrap">${escapeHtml(technical)}</pre>
                </div>
            </details>
        </div>
    `;
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

async function submitMediationDecision(dealId, decision) {
    const decisionText = decision === "buyer" ? "المشتري" : "البائع";
    const actionText = decision === "buyer"
        ? "سيتم إرجاع إجمالي المبلغ للمشتري."
        : "سيتم تحرير قيمة البيع للبائع وإكمال الصفقة.";

    const confirmed = window.confirm(
        `⚠️ تأكيد القرار النهائي\n\nالصفقة #${dealId}\nالقرار: ${decisionText}\n\n${actionText}\n\nهذا القرار مالي ونهائي. هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    const buttons = document.querySelectorAll(`[data-mediation-decision-deal-id="${String(dealId)}"]`);
    buttons.forEach((button) => {
        button.disabled = true;
        button.classList.add("opacity-50", "cursor-not-allowed");
    });

    const res = await api("resolve_mediation_dispute", {
        deal_id: dealId,
        decision,
    });

    if (!res || res.error) {
        buttons.forEach((button) => {
            button.disabled = false;
            button.classList.remove("opacity-50", "cursor-not-allowed");
        });

        alert(`❌ تعذر تنفيذ القرار\n\n${res?.error || "خطأ غير معروف"}`);
        return;
    }

    showToast?.(`تم تنفيذ القرار النهائي لصالح ${decisionText}`);

    await loadMediationEvidence(dealId);
    await loadMediationDisputes();
}

document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-mediation-decision]");
    if (!button) return;

    const dealId = Number(button.dataset.mediationDecisionDealId);
    const decision = button.dataset.mediationDecision;

    if (Number.isInteger(dealId) && dealId > 0 && (decision === "buyer" || decision === "seller")) {
        submitMediationDecision(dealId, decision);
    }
});

document.getElementById("btnRefreshDeals")?.addEventListener("click", loadAllMediationDeals);
document.getElementById("dealsStatusFilter")?.addEventListener("change", renderAllMediationDeals);
document.getElementById("dealsSearchInput")?.addEventListener("input", renderAllMediationDeals);

document.getElementById("btnRefreshMediation")?.addEventListener(
  "click",
  loadMediationDisputes
);

document.getElementById("btnCloseMediationEvidence")?.addEventListener(
  "click",
  () => {
    document.getElementById("mediationEvidencePanel")?.classList.add("hidden");
  }
);

document.getElementById("btnCloseMediationAnalysis")?.addEventListener(
  "click",
  () => {
    document.getElementById("mediationAnalysisPanel")?.classList.add("hidden");
  }
);

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
