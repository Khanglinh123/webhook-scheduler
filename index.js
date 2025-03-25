import express from 'express';
import axios from 'axios';
import cron from 'node-cron';

// Danh sách các fanpage với ID và token
const FANPAGES = [
    { id: '583129331554040', token: 'EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD' },
    { id: '263242860207661', token: 'EAAg6Q1CKEwIBO1wpoGD2cnAhQCsa66LGKLZCAaJA35PTevDJBcQT7g8QZB7ZAMTF3ls1fYnnZCzno1YG7z4jSmfEXpdgq37AJlrzTTmnRIeQnpXK1YAvZBenC1i7aP4FPklNwrQtiTlYPhltPoiPK0sFZBOWac5pPmbjoUjOzyZCvAZATLZAc1wRFmTB66R9vypm5WoIIsv4usiIHOd8i' },
    { id: '591609024032061', token: 'EAAg6Q1CKEwIBO1sltOrAcUoPx3Vf6Lcmw6yZBZBUufpdiAhTJxUsYtWjhiO6ZAdOLCRe2JBu2BfGbTfisfFXefMtSXammmaRgdQXJlofoEEm8JFwCjP0rQ1adJf30ZA45wletmNOddj6flhR6wKQeWweR2fYiysVX6ZBzATN7RUIOySxEUO8RjsSUdbCJfsfUweyj8pxDT3RyKcIa3AZDZD' }
];

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory

// Route để xử lý yêu cầu GET đến đường dẫn gốc "/"
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Serve the index.html file
});

// Hàm ngắt kết nối webhook cho tất cả fanpage
async function disableWebhook() {
    for (const page of FANPAGES) {
        try {
            const response = await axios.delete(
                `https://graph.facebook.com/v11.0/${page.id}/subscribed_apps`,
                { params: { access_token: page.token } }
            );
            console.log(`Webhook disabled for page ${page.id}:`, response.data);
        } catch (error) {
            console.error(`Error disabling webhook for page ${page.id}:`, error.response ? error.response.data : error.message);
        }
    }
}

// Hàm kết nối lại webhook cho tất cả fanpage
async function enableWebhook() {
    for (const page of FANPAGES) {
        try {
            const response = await axios.post(
                `https://graph.facebook.com/v11.0/${page.id}/subscribed_apps`,
                null,
                { params: { access_token: page.token, subscribed_fields: 'messages' }
                }
            );
            console.log(`Webhook enabled for page ${page.id}:`, response.data);
        } catch (error) {
            console.error(`Error enabling webhook for page ${page.id}:`, error.response ? error.response.data : error.message);
        }
    }
}

// Route để ngắt kết nối webhook thủ công qua API
app.post('/disable-webhook', async (req, res) => {
    try {
        await disableWebhook();
        res.send('Webhook disabled for all fanpages.');
    } catch (error) {
        res.status(500).send('Error disabling webhook: ' + error.message);
    }
});

// Route để kích hoạt lại webhook thủ công qua API
app.post('/enable-webhook', async (req, res) => {
    try {
        await enableWebhook();
        res.send('Webhook enabled for all fanpages.');
    } catch (error) {
        res.status(500).send('Error enabling webhook: ' + error.message);
    }
});

// Lên lịch ngắt kết nối webhook lúc 8:00 sáng
cron.schedule('0 8 * * *', function() {
    console.log('Disabling webhooks for all pages at 8:00 AM');
    disableWebhook();
});

// Lên lịch kích hoạt lại webhook lúc 5:00 chiều
cron.schedule('0 17 * * *', function() {
    console.log('Enabling webhooks for all pages at 5:00 PM');
    enableWebhook();
});

app.listen(10000, () => {
    console.log('Server running on port 10000');
    console.log('Webhook scheduler setup complete!');
});
