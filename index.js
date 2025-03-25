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

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory

// Hàm để lấy token dựa trên loại token
function getToken(tokenType) {
  if (tokenType === 'user') {
    return USER_ACCESS_TOKEN;
  } else if (tokenType === 'app') {
    return APP_ACCESS_TOKEN;
  } else {
    // Lấy token của page theo tokenType
    const page = PAGES.find(page => page.token === tokenType);
    return page ? page.token : null;
  }
}

// Route để xử lý yêu cầu GET đến đường dẫn gốc "/"
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); // Serve the index.html file
});

// Route để kiểm tra trạng thái webhook
app.get('/check-webhook', async (req, res) => {
  const tokenType = req.query.tokenType || 'page';
  const accessToken = getToken(tokenType);

  try {
    const response = await axios.get(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, {
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
  const accessToken = getToken(tokenType);

  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, {
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
  const accessToken = getToken(tokenType);

  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, null, {
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
async function disableWebhook(tokenType = 'page') {
  const accessToken = getToken(tokenType);

  try {
    const response = await axios.delete(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, {
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
async function enableWebhook(tokenType = 'page') {
  const accessToken = getToken(tokenType);

  try {
    const response = await axios.post(`https://graph.facebook.com/v11.0/${PAGE_ID}/subscribed_apps`, null, {
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
