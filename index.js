import express from 'express';
import axios from 'axios';
import cron from 'node-cron';

const APP_ID = '231586060213120';
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887';
const USER_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOZB6CjjwZCAhUJGl2p0NrblmlbiF6D1E5ilrUwiIpG4IW7XskVWa7WNGoNiwiiQnsPrQCyFJcTWZBilAtN3gXLP8goSZAtJfwoN95RCmO2SDkTXCGJYz6ZBxxdXbLrZCXomvJhjmNQpBoxoFaHZAZCg7fwzesOceQC3hrzdbGG0ZAsmJS5hQ84x3K3w3olZBOea2eassgSxSZB74euMus58ixdcE0YD0vCVIeqe';

const pages = [
  {
    page_id: '583129331554040',
    page_access_token: 'EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD'
  },
  {
    page_id: '263242860207661',
    page_access_token: 'EAAg6Q1CKEwIBO3q7SSBQVSwxRqs0De3m4NygUsMLVtDW8q6znhprpXDRlig52mgISi19zZCyeZAm39ZCdAKrQ5sjNlOs2Bxo5p7KPoO8HYbzS6KsD8S0OVZBqYZA7ZCRpmoxKXGjueWZCXwzYYgc2rEmoRvZAHi9kJIjVBV7ZCGgInbqOK0txZA3GZBwyW74cQ3HhaBsauUTSIwa2OMy1Jf'
  },
  {
    page_id: '591609024032061',
    page_access_token: 'EAAg6Q1CKEwIBO2DHZCqZCTUQxxyrNm23c6Pe18ISmWYzfwDiOyyvmn8btah68Rkxgu4ayQ06LEtGf8AZCfEOX99YP8iqliNBPOAtUiuaeQ4gYIaLDL8sWvchx6zC2J5T1HU2kvRseE25wi4Sbl2yuFQ0RKov0fmZAT3SB3BOAEDKDGFDcLOq3ebLEpYB92ZCD83tTIyWRP11ZCF0EQcwZDZD'
  }
];

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory

// Hàm để lấy token dựa trên loại token và page_id
function getToken(tokenType, pageId) {
  const page = pages.find(p => p.page_id === pageId);
  if (!page) {
    throw new Error(`Page with ID ${pageId} not found`);
  }
  if (tokenType === 'user') {
    return USER_ACCESS_TOKEN;
  } else {
    return page.page_access_token;
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
  const tokenType = req.query.tokenType || 'page';
  const pageId = req.query.pageId;
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
  const tokenType = req.query.tokenType || 'page';
  const pageId = req.query.pageId;
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
  const tokenType = req.query.tokenType || 'page';
  const pageId = req.query.pageId;
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
  pages.forEach(page => {
    disableWebhook('page', page.page_id);
  });
});

// Lên lịch kết nối lại webhook vào lúc 5:00 chiều mỗi ngày cho tất cả các trang
cron.schedule('0 17 * * *', function() {
  console.log('Enabling webhooks at 5:00 PM');
  pages.forEach(page => {
    enableWebhook('page', page.page_id);
  });
});

app.listen(10000, () => {
  console.log('Server running on port 10000');
  console.log('Webhook scheduler setup complete!');
});
