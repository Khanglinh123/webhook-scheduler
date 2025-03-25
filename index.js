import express from 'express';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const PAGES = [
  {
    id: '583129331554040',
    token: process.env.PAGE_ACCESS_TOKEN_1
  },
  {
    id: '263242860207661',
    token: process.env.PAGE_ACCESS_TOKEN_2
  },
  {
    id: '591609024032061',
    token: process.env.PAGE_ACCESS_TOKEN_3
  }
];

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const APP_ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN;
const USER_ACCESS_TOKEN = process.env.USER_ACCESS_TOKEN;

const app = express();  // Khởi tạo biến app
app.use(express.static('public')); // Serve static files from the 'public' directory

// Hàm để lấy thông tin trang dựa trên chỉ số trang
function getPageInfo(pageIndex) {
  const index = parseInt(pageIndex, 10);
  if (isNaN(index) || index < 1 || index > PAGES.length) {
    return null;
  }
  return PAGES[index - 1];
}

// Hàm để lấy token dựa trên loại token hoặc chỉ số trang
function getToken(tokenType) {
  if (tokenType === 'user') {
    return USER_ACCESS_TOKEN;
  } else if (tokenType === 'app') {
    return APP_ACCESS_TOKEN;
  } else if (tokenType.startsWith('page')) {
    const pageInfo = getPageInfo(tokenType.split(':')[1]);
    return pageInfo ? pageInfo.token : null;
  }
  return null;
}

// Route để kiểm tra trạng thái webhook
app.get('/check-webhook', async (req, res) => {
  const tokenType = req.query.tokenType || 'page:1';
  const pageInfo = getPageInfo(tokenType.split(':')[1]);
  const accessToken = pageInfo ? pageInfo.token : getToken(tokenType);

  if (!pageInfo) {
    return res.status(400).json({ error: 'Invalid token type' });
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v11.0/${pageInfo.id}/subscribed_apps`, {
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
  const tokenType = req.query.tokenType || 'page:1';
  const pageInfo = getPageInfo(tokenType.split(':')[1]);
  const accessToken = pageInfo ? pageInfo.token : getToken(tokenType);

  if (!pageInfo) {
    return res.status(400).json({ error: 'Invalid token type' });
  }

  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${pageInfo.id}/subscribed_apps`, {
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
  const tokenType = req.query.tokenType || 'page:1';
  const pageInfo = getPageInfo(tokenType.split(':')[1]);
  const accessToken = pageInfo ? pageInfo.token : getToken(tokenType);

  if (!pageInfo) {
    return res.status(400).json({ error: 'Invalid token type' });
  }

  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${pageInfo.id}/subscribed_apps`, null, {
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
async function disableWebhook(tokenType = 'page:1') {
  const pageInfo = getPageInfo(tokenType.split(':')[1]);
  const accessToken = pageInfo ? pageInfo.token : getToken(tokenType);

  if (!pageInfo) {
    console.log('Invalid token type');
    return;
  }

  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${pageInfo.id}/subscribed_apps`, {
      params: {
        access_token: accessToken
      }
    });
    console.log('Webhook disabled:', response.data);
  } catch (error) {
    console.log('Error while disabling webhook:', error.response ? error.response.data : error.message);
  }
}

// Hàm để kết nối lại webhook
async function enableWebhook(tokenType = 'page:1') {
  const pageInfo = getPageInfo(tokenType.split(':')[1]);
  const accessToken = pageInfo ? pageInfo.token : getToken(tokenType);

  if (!pageInfo) {
    console.log('Invalid token type');
    return;
  }

  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${pageInfo.id}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
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
  disableWebhook('app');
});

// Lên lịch kết nối lại webhook vào lúc 5:00 chiều mỗi ngày
cron.schedule('0 17 * * *', function() {
  console.log('Enabling webhook at 5:00 PM');
  enableWebhook('app');
});

app.listen(10000, () => {
  console.log('Server running on port 10000');
  console.log('Webhook scheduler setup complete!');
});
