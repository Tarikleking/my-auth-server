const express = require('express');
const app = express();

// هذا الكود يضمن الرد على المود بأي طريقة اتصال (GET أو POST)
app.all('*', (req, res) => {
    console.log("تم استلام طلب من المود، جاري إرسال صلاحيات الأدمن...");
    
    // إرسال رد JSON ليخدع المود ويظهر القائمة
    res.status(200).json({
        "status": "success",
        "isAdmin": true,
        "is_admin": true,
        "authorized": true,
        "rank": 999,
        "message": "Admin Access Granted"
    });
});

// تشغيل السيرفر على البورت الذي تحدده المنصة
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`السيرفر يعمل الآن ويرد بصلاحيات الأدمين...`);
});
