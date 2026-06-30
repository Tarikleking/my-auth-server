// ===========================
// KingDZ Admin Panel
// Part 1
// ===========================

const SUPABASE_URL = "https://rnxcmkdivuhwkfaqnnlz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// عناصر تسجيل الدخول
const loginPage = document.getElementById("loginPage");
const dashboard = document.getElementById("dashboard");
const loading = document.getElementById("loading");

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");

const logoutBtn = document.getElementById("logout");

// صفحات اللوحة
const pages = {
    home: document.getElementById("homePage"),
    keys: document.getElementById("keysPage"),
    users: document.getElementById("usersPage"),
    settings: document.getElementById("settingsPage")
};

// عناصر القائمة
document.querySelectorAll(".sidebar li[data-page]").forEach(item => {

    item.onclick = () => {

        document
            .querySelectorAll(".sidebar li")
            .forEach(x => x.classList.remove("active"));

        item.classList.add("active");

        Object.values(pages).forEach(p => {
            p.classList.remove("active");
        });

        pages[item.dataset.page].classList.add("active");

    };

});

// إخفاء شاشة التحميل
function hideLoading(){

    loading.style.display = "none";

}

// فتح اللوحة
function openDashboard(user){

    loginPage.style.display = "none";

    dashboard.style.display = "flex";

    adminEmail.textContent = user.email;

    adminName.textContent = "Administrator";

}

// فتح صفحة تسجيل الدخول
function openLogin(){

    dashboard.style.display = "none";

    loginPage.style.display = "flex";

}

// التحقق من الجلسة
async function checkSession(){

    const { data } = await client.auth.getSession();

    hideLoading();

    if(data.session){

        openDashboard(data.session.user);

    }else{

        openLogin();

    }

}

// تسجيل الدخول
loginBtn.onclick = async ()=>{

    loginError.textContent = "";

    const { error } = await client.auth.signInWithPassword({

        email: email.value.trim(),

        password: password.value

    });

    if(error){

        loginError.textContent = error.message;

        return;

    }

    checkSession();

};

// تسجيل الخروج
logoutBtn.onclick = async ()=>{

    await client.auth.signOut();

    openLogin();

};

// تشغيل التطبيق
checkSession();
// ===========================
// Part 2 : Dashboard Stats
// ===========================

const usersCount = document.getElementById("usersCount");
const keysCount = document.getElementById("keysCount");
const vipCount = document.getElementById("vipCount");
const bannedCount = document.getElementById("bannedCount");

// تحميل الإحصائيات
async function loadDashboard() {

    try {

        // عدد المستخدمين
        const { count: users } = await client
            .from("users")
            .select("*", { count: "exact", head: true });

        // عدد المفاتيح
        const { count: keys } = await client
            .from("keys")
            .select("*", { count: "exact", head: true });

        // عدد VIP
        const { count: vip } = await client
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("vip", true);

        // عدد المحظورين
        const { count: banned } = await client
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("banned", true);

        usersCount.textContent = users || 0;
        keysCount.textContent = keys || 0;
        vipCount.textContent = vip || 0;
        bannedCount.textContent = banned || 0;

    } catch (e) {

        console.error("Dashboard Error:", e);

    }

}

// تحديث الرسم البياني
let statsChart = null;

function drawChart(users, keys, vip, banned){

    const ctx = document
        .getElementById("statsChart")
        .getContext("2d");

    if(statsChart){

        statsChart.destroy();

    }

    statsChart = new Chart(ctx,{

        type:"bar",

        data:{

            labels:[
                "Users",
                "Keys",
                "VIP",
                "Banned"
            ],

            datasets:[{

                data:[
                    users,
                    keys,
                    vip,
                    banned
                ]

            }]

        },

        options:{

            responsive:true,

            plugins:{
                legend:{
                    display:false
                }
            }

        }

    });

}

// تحميل البيانات مع الرسم
async function refreshDashboard(){

    const { count: users } = await client
        .from("users")
        .select("*",{count:"exact",head:true});

    const { count: keys } = await client
        .from("keys")
        .select("*",{count:"exact",head:true});

    const { count: vip } = await client
        .from("users")
        .select("*",{count:"exact",head:true})
        .eq("vip",true);

    const { count: banned } = await client
        .from("users")
        .select("*",{count:"exact",head:true})
        .eq("banned",true);

    usersCount.textContent = users || 0;
    keysCount.textContent = keys || 0;
    vipCount.textContent = vip || 0;
    bannedCount.textContent = banned || 0;

    drawChart(
        users || 0,
        keys || 0,
        vip || 0,
        banned || 0
    );

}

// بعد تسجيل الدخول
async function afterLogin(user){

    openDashboard(user);

    await refreshDashboard();

}
