const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// هذه الدالة ستحاكي النجاح لأي طلب يصل للسيرفر
app.all('*', (req, res) => {
    console.log(`تم استلام طلب على المسار: ${req.url}`);
    res.json({
        status: "success",
        success: true,
        active: true,
        vip: true,
        is_admin: true,
        role: "admin",
        message: "Access Granted by Tarik"
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن ويستقبل كل شيء على المنفذ ${PORT}`);
});
