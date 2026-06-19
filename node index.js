const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

// إعداد سيرفر وهمي لضمان بقاء Render يعمل
const app = express();
app.get('/', (req, res) => res.send('البوت يعمل بنجاح!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`سيرفر الويب يعمل على البورت ${PORT}`));

// إعداد البوت
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // ضروري ليعمل على Render
    }
});

// قائمة الكلمات الممنوعة (يمكنك إضافة ما تريد هنا)
const forbiddenWords = ['كلمة_سيئة1', 'كلمة_سيئة2'];
// نظام تتبع التحذيرات
const warnings = {};

client.on('qr', (qr) => {
    // سيتم طباعة كود QR في موجه الأوامر (Logs) لتقوم بمسحه
    qrcode.generate(qr, { small: true });
    console.log('قم بمسح كود QR لتسجيل الدخول');
});

client.on('ready', () => {
    console.log('البوت جاهز ويعمل الآن!');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    
    // التأكد أن الرسالة في مجموعة
    if (!chat.isGroup) return;

    const authorId = msg.author;
    
    // التحقق مما إذا كان المرسل مشرفاً
    const isGroupAdmins = chat.participants.filter(p => p.isAdmin || p.isSuperAdmin).map(p => p.id._serialized);
    const isAdmin = isGroupAdmins.includes(authorId);

    // إذا كان المرسل مشرفاً، يتجاهل البوت الرسالة (لا يحذفها)
    if (isAdmin) return;

    // دالة لإدارة التحذيرات والطرد
    const handleWarning = async (reason) => {
        if (!warnings[authorId]) warnings[authorId] = 0;
        warnings[authorId]++;
        
        if (warnings[authorId] >= 3) {
            await chat.removeParticipants([authorId]);
            delete warnings[authorId]; // تصفير العداد بعد الطرد
        } else {
            await msg.reply(`*تحذير (${warnings[authorId]}/3):*\n${reason}\nفي التحذير الثالث سيتم إخراجك من المجموعة.`);
        }
    };

    // 1. حذف الروابط والطرد المباشر لأي شخص غير مشرف
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (msg.body.match(urlRegex)) {
        await msg.delete(true);
        await chat.removeParticipants([authorId]);
        return;
    }

    // 2. منع الرسائل الصوتية (تحذير ثم طرد)
    if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
        await msg.delete(true);
        await handleWarning('يمنع إرسال الرسائل الصوتية في هذا المتجر.');
        return;
    }

    // 3. حذف الرسائل التي تحتوي على كلمات ممنوعة (تحذير ثم طرد)
    const containsForbidden = forbiddenWords.some(word => msg.body.includes(word));
    if (containsForbidden) {
        await msg.delete(true);
        await handleWarning('استخدام كلمات أو منشورات غير مسموح بها.');
        return;
    }

    // 4. التنبيه عند ذكر كلمة نصاب أو حرامي
    if (msg.body.includes('نصاب') || msg.body.includes('حرامي')) {
        await msg.reply('الرجاء الحذر والتعامل بالوسيط لضمان حقوقك.');
    }

    // 5. ترشيح وسيط
    if (msg.body.includes('وسيط')) {
        await msg.reply('نرشح لك *هيما* كوسيط مضمون للتعامل في الجروب.');
    }
});

client.initialize();
