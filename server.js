const express = require('express');
const app = express();

app.use(express.json());

// مسار التحقق من الاشتراك (هذا أهم مسار لتفعيل المود)
app.all('/api/check', (req, res) => {
    console.log("المود يحاول التحقق من الاشتراك (Check API)");
    res.json({
        status: "success",
        is_vip: true,
        auth: "valid",
        message: "Welcome back, Admin"
    });
});

// مسار السجلات (لكي لا تظهر أخطاء في المود)
app.all('/api/log', (req, res) => {
    console.log("استلام سجلات من المود (Log API)");
    res.json({ status: "ok" });
});

// مسار افتراضي لأي شيء آخر
app.all('*', (req, res) => {
    console.log(`طلب غير معروف: ${req.url}`);
    res.json({ status: "success", active: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن وجاهز لمحاكاة سيرفر المطور على المنفذ ${PORT}`);
});
