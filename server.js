const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// هذا الكود سيمسح أي تعقيدات سابقة ويرد برد واحد ناجح على أي طلب
app.all('*', (req, res) => {
    console.log(`تم استلام طلب على المسار: ${req.url}`);
    res.json({
        status: "success",
        active: true,
        vip: true,
        message: "Access Granted"
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على المنفذ ${PORT}`);
});
