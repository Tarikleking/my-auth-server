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
