import express from 'express';
import axios from 'axios';
import cron from 'node-cron';

// App credentials
const APP_ID = '231586060213120';
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887';
const APP_ACCESS_TOKEN = '2315860602131202|1Odqilsh0sZGC_NXgT_uL7LL-x0';

// Danh sách các trang
const pages = [
  {
    page_id: '583129331554040',
    name: 'Trợ Lý Khang Mạch Linh',
    page_access_token: 'EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD'
  },
  // Thêm các trang khác nếu cần
  {
    page_id: '263242860207661',
    name: 'Khang Thống Linh - Giảm các triệu chứng Gout hiệu quả',
    page_access_token: 'EAAg6Q1CKEwIBO2dZA39x8RsojOMmYrpGZCUvPWm3lwzFheZBIGQLAVVOUK57MPLr5q7m9tATWYXIL5GlTAczlj9UQcqOFn7BDPZCpx4FQi6UVSezIrLxkzZBGLnRUmnwkgevAek5Vh7nPnO6ZBOf7A8VmCZBzZBqfJEUAqxTrZBsdVgwY4RuQQzPnCGeaBgZB4JxWbTemu9I46eNPv4rPK'
  },
  {
    page_id: '591609024032061',
    name: 'Trợ Lý Khang Thống Linh',
    page_access_token: 'EAAg6Q1CKEwIBO0iJgMjMhOAWHux9kIjFS9rIm4SqZBv1TiUB7rZBu3eh3deyL7GZCp8YjmSGpQE4tasZBiZCC3HB2tS1MhmZBN3mRdjA3C6lIo7NnqF2YdB7hVbHO10XJpfl8ZCZCMySUPZC03bzz3Rv343h1ZBUsPQqkAgGZA1AZCqCd81FrN84zW0ryrQsrUdeLQCZBbCLwxBI2uMaKlpfJdQZDZD'
  },
];

const app = express();
app.use(express.static('public'));

// Hàm để lấy token dựa trên loại token
function getToken(tokenType, pageId) {
  if (tokenType === 'app') {
    return APP_ACCESS_TOKEN;
  } else {
    // Tìm page access token cho trang cụ thể
    const page = pages.find(p => p.page_id === pageId);
    return page ? page.page_access_token : null;
  }
}

// Route để xử lý yêu cầu GET đến đường dẫn gốc "/"
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Webhook Manager</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .page { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          button { margin-right: 10px; padding: 8px 12px; cursor: pointer; }
          .status { margin-top: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Facebook Webhook Manager</h1>
        <div id="pages-container"></div>
        <div id="status" class="status" style="display: none;"></div>
        
        <script>
          // Hiển thị danh sách các trang
          const pages = ${JSON.stringify(pages)};
          const container = document.getElementById('pages-container');
          
          pages.forEach(page => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.innerHTML = \`
              <h2>\${page.name || 'Page ' + page.page_id}</h2>
              <p>Page ID: \${page.page_id}</p>
              <div>
                <button onclick="checkStatus('\${page.page_id}')">Kiểm tra trạng thái</button>
                <button onclick="disableWebhook('\${page.page_id}')">Ngắt kết nối</button>
                <button onclick="enableWebhook('\${page.page_id}')">Kết nối</button>
              </div>
              <div id="status-\${page.page_id}" class="status" style="display: none;"></div>
            \`;
            container.appendChild(pageDiv);
          });
          
          // Hàm kiểm tra trạng thái
          function checkStatus(pageId) {
            fetch(\`/check-webhook?pageId=\${pageId}\`)
              .then(response => response.json())
              .then(data => {
                showStatus(pageId, data);
              })
              .catch(error => {
                showStatus(pageId, { error: error.message });
              });
          }
          
          // Hàm ngắt kết nối
          function disableWebhook(pageId) {
            fetch(\`/disable-webhook?pageId=\${pageId}\`, { method: 'POST' })
              .then(response => response.text())
              .then(data => {
                showStatus(pageId, { message: data });
              })
              .catch(error => {
                showStatus(pageId, { error: error.message });
              });
          }
          
          // Hàm kết nối
          function enableWebhook(pageId) {
            fetch(\`/enable-webhook?pageId=\${pageId}\`, { method: 'POST' })
              .then(response => response.text())
              .then(data => {
                showStatus(pageId, { message: data });
              })
              .catch(error => {
                showStatus(pageId, { error: error.message });
              });
          }
          
          // Hiển thị trạng thái
          function showStatus(pageId, data) {
            const statusDiv = document.getElementById(\`status-\${pageId}\`);
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          }
        </script>
      </body>
    </html>
  `);
});

// Route để kiểm tra trạng thái webhook
app.get('/check-webhook', async (req, res) => {
  const pageId = req.query.pageId;
  const tokenType = req.query.tokenType || 'app';
  const accessToken = getToken(tokenType, pageId);

  if (!accessToken) {
    return res.status(400).json({ error: 'Invalid page ID' });
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
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
  const pageId = req.query.pageId;
  const tokenType = req.query.tokenType || 'app';
  const accessToken = getToken(tokenType, pageId);

  if (!accessToken) {
    return res.status(400).send('Invalid page ID');
  }

  try {
    const response = await axios.delete(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: accessToken
      }
    });
    res.send(`Webhook disabled for page ${pageId}`);
  } catch (error) {
    console.error('Error disabling webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error disabling webhook: ' + JSON.stringify(error.response ? error.response.data : error.message));
  }
});

// Route để kích hoạt lại webhook thủ công
app.post('/enable-webhook', async (req, res) => {
  const pageId = req.query.pageId;
  const tokenType = req.query.tokenType || 'app';
  const accessToken = getToken(tokenType, pageId);

  if (!accessToken) {
    return res.status(400).send('Invalid page ID');
  }

  try {
    const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
        subscribed_fields: 'messages,messaging_postbacks,messaging_optins'
      }
    });
    res.send(`Webhook enabled for page ${pageId}`);
  } catch (error) {
    console.error('Error enabling webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error enabling webhook: ' + JSON.stringify(error.response ? error.response.data : error.message));
  }
});

// Hàm để ngắt kết nối webhook cho một trang
async function disableWebhook(pageId, tokenType = 'app') {
  const accessToken = getToken(tokenType, pageId);

  if (!accessToken) {
    console.error(`Invalid page ID: ${pageId}`);
    return;
  }

  try {
    const response = await axios.delete(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: accessToken
      }
    });
    console.log(`Webhook disabled for page ${pageId}:`, response.data);
  } catch (error) {
    console.error(`Error while disabling webhook for page ${pageId}:`, error.response ? error.response.data : error.message);
  }
}

// Hàm để kết nối lại webhook cho một trang
async function enableWebhook(pageId, tokenType = 'app') {
  const accessToken = getToken(tokenType, pageId);

  if (!accessToken) {
    console.error(`Invalid page ID: ${pageId}`);
    return;
  }

  try {
    const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
        subscribed_fields: 'messages,messaging_postbacks,messaging_optins'
      }
    });
    console.log(`Webhook enabled for page ${pageId}:`, response.data);
  } catch (error) {
    console.error(`Error while enabling webhook for page ${pageId}:`, error.response ? error.response.data : error.message);
  }
}

// Lên lịch ngắt kết nối webhook vào lúc 8:00 sáng mỗi ngày
cron.schedule('0 8 * * *', function() {
  console.log('Disabling webhooks at 8:00 AM');
  pages.forEach(page => {
    disableWebhook(page.page_id, 'app');
  });
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Lên lịch kết nối lại webhook vào lúc 5:00 chiều mỗi ngày
cron.schedule('0 17 * * *', function() {
  console.log('Enabling webhooks at 5:00 PM');
  pages.forEach(page => {
    enableWebhook(page.page_id, 'app');
  });
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Kiểm tra trạng thái webhook khi khởi động
async function checkAllWebhooks() {
  console.log('Checking all webhooks on startup...');
  for (const page of pages) {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${page.page_id}/subscribed_apps`, {
        params: {
          access_token: APP_ACCESS_TOKEN
        }
      });
      console.log(`Webhook status for page ${page.page_id}:`, response.data);
    } catch (error) {
      console.error(`Error checking webhook for page ${page.page_id}:`, error.response ? error.response.data : error.message);
    }
  }
}

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Webhook scheduler setup complete!');
  
  // Kiểm tra trạng thái webhook khi khởi động
  checkAllWebhooks();
});
