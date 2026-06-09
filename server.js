const express = require('express');
const app = express();

app.use(express.json());

// التعديل الجديد: استقبال طلب التفعيل مباشرة على المسار الرئيسي ( / ) لتوفير عدد الأحرف
app.post('/', (req, res) => {
    console.log("تم استقبال طلب تحقق جديد على سيرفر طارق المباشر!");
    console.log("البيانات القادمة من المود:", req.body);
    
    // إرسال استجابة الموافقة الافتراضية لتخطي الحظر وتفعيل المود
    res.json({
        status: "success",
        active: true,
        message: "Access Granted by Tarik"
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`السيرفر المعدل يعمل بنجاح على المنفذ ${PORT}`);
});
