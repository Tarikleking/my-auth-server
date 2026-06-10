const express = require('express');
const app = express();

// لتفعيل قراءة البيانات المرسلة من المود
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// جاسوس لطباعة كل شيء يصل للسيرفر
app.use((req, res, next) => {
    console.log(`[جاسوس] تم استلام طلب!`);
    console.log(`[المسار]: ${req.url}`);
    console.log(`[البيانات (Body)]:`, JSON.stringify(req.body));
    console.log(`[رأس الطلب (Headers)]:`, req.headers);
    console.log("------------------------------------");
    next();
});

// الرد الافتراضي الذي يجعل المود يظن أن كل شيء تمام
app.all('*', (req, res) => {
    res.status(200).json({
        "status": "success",
        "message": "Connected",
        "active": true
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("السيرفر يعمل الآن وجاهز للتجسس على المود...");
});
