import express from 'express';
import axios from 'axios';
import cron from 'node-cron';
import fs from 'fs';

// Đọc thông tin từ tệp config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const APP_ID = '231586060213120';
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887';
let USER_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOZB6CjjwZCAhUJGl2p0NrblmlbiF6D1E5ilrUwiIpG4IW7XskVWa7WNGoNiwiiQnsPrQCyFJcTWZBilAtN3gXLP8goSZAtJfwoN95RCmO2SDkTXCGJYz6ZBxxdXbLrZCXomvJhjmNQpBoxoFaHZAZCg7fwzesOceQC3hrzdbGG0ZAsmJS5hQ84x3K3w3olZBOea2eassgSxSZB74euMus58ixdcE0YD0vCVIeqe';

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory

// Hàm để lấy token dựa trên loại token
function getToken(tokenType, pageId) {
  const page = config.pages.find(p => p.page_id === pageId);
  if (tokenType === 'user') {
    return USER_ACCESS_TOKEN;
  } else if (page) {
    return page.page_access_token;
  } else {
    throw new Error(`Page with ID ${pageId} not found`);
  }
}

// Hàm để làm mới mã truy cập người dùng
async function refreshUserAccessToken() {
  try {
    const response = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: USER_ACCESS_TOKEN
      }
    });
    USER_ACCESS_TOKEN = response.data.access_token;
    console.log('User access token refreshed:', USER_ACCESS_TOKEN);
  } catch (error) {
    console.error('Error refreshing user access token:', error.response ? error.response.data : error.message);
  }
}

// Làm mới mã truy cập sau mỗi 55 ngày
setInterval(refreshUserAccessToken, 55 * 24 * 60 * 60 * 1000); // 55 days in milliseconds

// Route để xử lý yêu cầu GET đến đường dẫn gốc "/"
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); // Serve the index.html file
});

// Route để kiểm tra trạng thái webhook
app.get('/check-webhook', async (req, res) => {
  const { tokenType, pageId } = req.query;
  const accessToken = getToken(tokenType, pageId);

  try {
    const response = await axios.get(`https://graph.facebook.com/v11.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: accessToken
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

// Route để ngắt kết nối webhook thủ công
app.post('/disable-webhook', async (req, res) => {
  const { tokenType, pageId } = req.query;
  const accessToken = getToken(tokenType, pageId);

  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: accessToken
      }
    });
    res.send('Webhook disabled manually.');
  } catch (error) {
    console.error('Error disabling webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error disabling webhook: ' + JSON.stringify(error.response ? error.response.data : error.message));
  }
});

// Route để kích hoạt lại webhook thủ công
app.post('/enable-webhook', async (req, res) => {
  const { tokenType, pageId } = req.query;
  const accessToken = getToken(tokenType, pageId);

  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
        subscribed_fields: 'messages'
      }
    });
    res.send('Webhook enabled manually.');
  } catch (error) {
    console.error('Error enabling webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error enabling webhook: ' + JSON.stringify(error.response ? error.response.data : error.message));
  }
});

// Hàm để ngắt kết nối webhook
async function disableWebhook(tokenType = 'page', pageId) {
  const accessToken = getToken(tokenType, pageId);

  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: accessToken
      }
    });
    console.log(`Webhook disabled for page ${pageId}:`, response.data);
  } catch (error) {
    console.log(`Error while disabling webhook for page ${pageId}:`, error.response ? error.response.data : error.message);
  }
}

// Hàm để kết nối lại webhook
async function enableWebhook(tokenType = 'page', pageId) {
  const accessToken = getToken(tokenType, pageId);

  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
        subscribed_fields: 'messages'
      }
    });
    console.log(`Webhook enabled for page ${pageId}:`, response.data);
  } catch (error) {
    console.log(`Error while enabling webhook for page ${pageId}:`, error.response ? error.response.data : error.message);
  }
}

// Lên lịch ngắt kết nối webhook vào lúc 8:00 sáng mỗi ngày cho tất cả các trang
cron.schedule('0 8 * * *', function() {
  console.log('Disabling webhooks at 8:00 AM');
  config.pages.forEach(page => {
    disableWebhook('page', page.page_id);
  });
});

// Lên lịch kết nối lại webhook vào lúc 5:00 chiều mỗi ngày cho tất cả các trang
cron.schedule('0 17 * * *', function() {
  console.log('Enabling webhooks at 5:00 PM');
  config.pages.forEach(page => {
    enableWebhook('page', page.page_id);
  });
});

app.listen(10000, () => {
  console.log('Server running on port 10000');
  console.log('Webhook scheduler setup complete!');
});
