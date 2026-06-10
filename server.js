const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// هذا الجزء هو الذي سيرد على المود بموافقة الصلاحيات
app.all('*', (req, res) => {
    console.log("تم استلام طلب من المود، جاري إرسال صلاحيات الأدمن...");
    res.status(200).json({
        "status": "success",
        "isAdmin": true,
        "admin": true,
        "authorized": true,
        "rank": 99
    });
});

app.listen(port, () => {
    console.log(`السيرفر يعمل الآن على البورت ${port} ويرد بالصلاحيات`);
});
