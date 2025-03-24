import express from 'express';
import axios from 'axios';
import cron from 'node-cron';

const PAGE_ID = '583129331554040';
const APP_ID = '231586060213120';
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887';
const PAGE_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD';
const APP_ACCESS_TOKEN = '2315860602131202|1Odqilsh0sZGC_NXgT_uL7LL-x0';
const USER_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOZB6CjjwZCAhUJGl2p0NrblmlbiF6D1E5ilrUwiIpG4IW7XskVWa7WNGoNiwiiQnsPrQCyFJcTWZBilAtN3gXLP8goSZAtJfwoN95RCmO2SDkTXCGJYz6ZBxxdXbLrZCXomvJhjmNQpBoxoFaHZAZCg7fwzesOceQC3hrzdbGG0ZAsmJS5hQ84x3K3w3olZBOea2eassgSxSZB74euMus58ixdcE0YD0vCVIeqe';

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory

// Route để xử lý yêu cầu GET đến đường dẫn gốc "/"
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); // Serve the index.html file
});

// Route để kiểm tra trạng thái webhook
app.get('/check-webhook', async (req, res) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, {
      params: {
        access_token: USER_ACCESS_TOKEN
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

// Route để ngắt kết nối webhook thủ công
app.post('/disable-webhook', async (req, res) => {
  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, {
      params: {
        access_token: USER_ACCESS_TOKEN
      }
    });
    res.send('Webhook disabled manually.');
  } catch (error) {
    res.status(500).send('Error disabling webhook: ' + (error.response ? error.response.data : error.message));
  }
});

// Route để kích hoạt lại webhook thủ công
app.post('/enable-webhook', async (req, res) => {
  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, null, {
      params: {
        access_token: USER_ACCESS_TOKEN,
        subscribed_fields: 'messages'
      }
    });
    res.send('Webhook enabled manually.');
  } catch (error) {
    res.status(500).send('Error enabling webhook: ' + (error.response ? error.response.data : error.message));
  }
});

// Hàm để ngắt kết nối webhook
async function disableWebhook() {
  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, {
      params: {
        access_token: USER_ACCESS_TOKEN
      }
    });
    console.log('Webhook disabled:', response.data);
  } catch (error) {
    console.log('Error while disabling webhook:', error.response ? error.response.data : error.message);
  }
}

// Hàm để kết nối lại webhook
async function enableWebhook() {
  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, null, {
      params: {
        access_token: USER_ACCESS_TOKEN,
        subscribed_fields: 'messages'
      }
    });
    console.log('Webhook enabled:', response.data);
  } catch (error) {
    console.log('Error while enabling webhook:', error.response ? error.response.data : error.message);
  }
}

// Lên lịch ngắt kết nối webhook vào lúc 8:00 sáng mỗi ngày
cron.schedule('0 8 * * *', function() {
  console.log('Disabling webhook at 8:00 AM');
  disableWebhook();
});

// Lên lịch kết nối lại webhook vào lúc 5:00 chiều mỗi ngày
cron.schedule('0 17 * * *', function() {
  console.log('Enabling webhook at 5:00 PM');
  enableWebhook();
});

app.listen(10000, () => {
  console.log('Server running on port 10000');
  console.log('Webhook scheduler setup complete!');
});
