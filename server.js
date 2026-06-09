const express = require('express');
const app = express();

app.use(express.json());

// مسار التفعيل المتوافق مع رابط المود
app.post('/unban', (req, res) => {
    console.log("طلب تحقق قادم إلى سيرفر طارق!");
    
    // إرسال استجابة الموافقة الافتراضية
    res.json({
        status: "success",
        active: true,
        message: "Access Granted by Tarik"
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل على المنفذ ${PORT}`);
});
