import express from 'express';
import axios from 'axios';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thông tin ứng dụng và Page
const APP_ID = '231586060213120';
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887';

// Danh sách các trang và mã truy cập của chúng
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

// Biến để theo dõi trạng thái
const pageStatus = {};
pages.forEach(page => {
  pageStatus[page.page_id] = { enabled: true, lastCheck: null };
});

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(express.json());

// Tạo thư mục public nếu chưa tồn tại
import fs from 'fs';
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

// Tạo file index.html nếu chưa tồn tại
const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webhook Manager</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .header { background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
    .status { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; }
    .enabled { background-color: #4CAF50; }
    .disabled { background-color: #F44336; }
    .button { display: inline-block; padding: 8px 12px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; cursor: pointer; border: none; }
    .button.red { background-color: #F44336; }
    .button:hover { opacity: 0.9; }
    .page-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .schedule-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .schedule-table th, .schedule-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .schedule-table th { background-color: #f2f2f2; }
    #status-container { margin-top: 20px; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Facebook Webhook Manager</h1>
    
    <div class="card">
      <div class="header">
        <h2>Pages</h2>
      </div>
      <div id="pages-container">
        <!-- Pages will be loaded here -->
      </div>
    </div>

    <div class="card">
      <div class="header">
        <h2>Schedule Information</h2>
      </div>
      <table class="schedule-table">
        <tr>
          <th>Day</th>
          <th>Disable Time</th>
          <th>Enable Time</th>
        </tr>
        <tr>
          <td>Monday - Friday</td>
          <td>8:00 AM</td>
          <td>5:00 PM</td>
        </tr>
        <tr>
          <td>Saturday</td>
          <td>8:00 AM</td>
          <td>12:00 PM</td>
        </tr>
        <tr>
          <td>Sunday</td>
          <td>Always enabled</td>
          <td>Always enabled</td>
        </tr>
      </table>
    </div>

    <div id="status-container" class="hidden">
      <div class="card">
        <div class="header">
          <h2>API Response</h2>
        </div>
        <pre id="status-output"></pre>
      </div>
    </div>
  </div>

  <script>
    // Load pages when the page loads
    document.addEventListener('DOMContentLoaded', loadPages);

    function loadPages() {
      fetch('/api/pages')
        .then(response => response.json())
        .then(pages => {
          const container = document.getElementById('pages-container');
          container.innerHTML = '';
          
          pages.forEach(page => {
            const pageCard = document.createElement('div');
            pageCard.className = 'page-card';
            
            const statusClass = page.status.enabled ? 'enabled' : 'disabled';
            const statusText = page.status.enabled ? 'ENABLED' : 'DISABLED';
            
            pageCard.innerHTML = \`
              <h3>\${page.name || 'Page ' + page.page_id}</h3>
              <p>ID: \${page.page_id}</p>
              <p>Status: <span class="status \${statusClass}">\${statusText}</span></p>
              <p>Last checked: \${page.status.lastCheck ? new Date(page.status.lastCheck).toLocaleString() : 'Never'}</p>
              <div>
                <button class="button" onclick="checkWebhook('\${page.page_id}')">Check Status</button>
                <button class="button red" onclick="disableWebhook('\${page.page_id}')">Disable Webhook</button>
                <button class="button" onclick="enableWebhook('\${page.page_id}')">Enable Webhook</button>
              </div>
            \`;
            
            container.appendChild(pageCard);
          });
        })
        .catch(error => {
          console.error('Error loading pages:', error);
        });
    }

    function checkWebhook(pageId) {
      fetch(\`/api/check-webhook?pageId=\${pageId}\`)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(text);
            });
          }
          return response.json();
        })
        .then(data => {
          showStatus(data);
          loadPages(); // Reload pages to update status
        })
        .catch(error => {
          console.error('Error checking webhook:', error);
          showStatus({ error: error.toString() });
        });
    }

    function disableWebhook(pageId) {
      fetch(\`/api/disable-webhook?pageId=\${pageId}\`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text);
          });
        }
        return response.text();
      })
      .then(data => {
        showStatus({ message: data });
        loadPages(); // Reload pages to update status
      })
      .catch(error => {
        console.error('Error disabling webhook:', error);
        showStatus({ error: error.toString() });
      });
    }

    function enableWebhook(pageId) {
      fetch(\`/api/enable-webhook?pageId=\${pageId}\`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text);
          });
        }
        return response.text();
      })
      .then(data => {
        showStatus({ message: data });
        loadPages(); // Reload pages to update status
      })
      .catch(error => {
        console.error('Error enabling webhook:', error);
        showStatus({ error: error.toString() });
      });
    }

    function showStatus(data) {
      const container = document.getElementById('status-container');
      const output = document.getElementById('status-output');
      container.classList.remove('hidden');
      output.textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>
`;

fs.writeFileSync('./public/index.html', indexHtml);

// Hàm để lấy App Access Token
async function getAppAccessToken() {
  try {
    console.log('Getting App Access Token...');
    const response = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
      params: {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        grant_type: 'client_credentials'
      }
    });
    console.log('App Access Token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting App Access Token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// API để lấy danh sách trang
app.get('/api/pages', (req, res) => {
  const pagesWithStatus = pages.map(page => ({
    ...page,
    status: pageStatus[page.page_id] || { enabled: true, lastCheck: null }
  }));
  res.json(pagesWithStatus);
});

// API để kiểm tra trạng thái webhook
app.get('/api/check-webhook', async (req, res) => {
  const { pageId } = req.query;
  
  try {
    // Sử dụng App Access Token để kiểm tra webhook
    const appAccessToken = await getAppAccessToken();
    
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: appAccessToken
      }
    });
    
    // Cập nhật trạng thái
    if (response.data && response.data.data) {
      pageStatus[pageId] = { 
        enabled: response.data.data.length > 0, 
        lastCheck: new Date().toISOString() 
      };
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('Error checking webhook:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

// API để ngắt kết nối webhook
app.all('/api/disable-webhook', async (req, res) => {
  const { pageId } = req.query;
  
  try {
    // Sử dụng App Access Token để vô hiệu hóa webhook
    const appAccessToken = await getAppAccessToken();
    
    const response = await axios.delete(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: appAccessToken
      }
    });
    
    // Cập nhật trạng thái
    pageStatus[pageId] = { enabled: false, lastCheck: new Date().toISOString() };
    
    res.send(`Webhook disabled for page ${pageId}`);
  } catch (error) {
    console.error('Error disabling webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error disabling webhook: ' + JSON.stringify(error.response ? error.response.data : error.message));
  }
});

// API để kích hoạt webhook
app.all('/api/enable-webhook', async (req, res) => {
  const { pageId } = req.query;
  
  try {
    // Sử dụng App Access Token để kích hoạt webhook
    const appAccessToken = await getAppAccessToken();
    
    const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: appAccessToken,
        subscribed_fields: 'messages,messaging_postbacks,messaging_optins'
      }
    });
    
    // Cập nhật trạng thái
    pageStatus[pageId] = { enabled: true, lastCheck: new Date().toISOString() };
    
    res.send(`Webhook enabled for page ${pageId}`);
  } catch (error) {
    console.error('Error enabling webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error enabling webhook: ' + JSON.stringify(error.response ? error.response.data : error.message));
  }
});

// Route để xử lý yêu cầu GET đến đường dẫn gốc "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Hàm để ngắt kết nối webhook
async function disableWebhook(pageId) {
  try {
    // Sử dụng App Access Token để vô hiệu hóa webhook
    const appAccessToken = await getAppAccessToken();
    
    const response = await axios.delete(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, {
      params: {
        access_token: appAccessToken
      }
    });
    
    // Cập nhật trạng thái
    pageStatus[pageId] = { enabled: false, lastCheck: new Date().toISOString() };
    
    console.log(`Webhook disabled for page ${pageId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error while disabling webhook for page ${pageId}:`, error.response ? error.response.data : error.message);
    return { error: error.response ? error.response.data : error.message };
  }
}

// Hàm để kích hoạt webhook
async function enableWebhook(pageId) {
  try {
    // Sử dụng App Access Token để kích hoạt webhook
    const appAccessToken = await getAppAccessToken();
    
    const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: appAccessToken,
        subscribed_fields: 'messages,messaging_postbacks,messaging_optins'
      }
    });
    
    // Cập nhật trạng thái
    pageStatus[pageId] = { enabled: true, lastCheck: new Date().toISOString() };
    
    console.log(`Webhook enabled for page ${pageId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error while enabling webhook for page ${pageId}:`, error.response ? error.response.data : error.message);
    return { error: error.response ? error.response.data : error.message };
  }
}

// Lên lịch ngắt kết nối webhook vào lúc 8:00 sáng từ thứ 2 đến thứ 7
cron.schedule('0 8 * * 1-6', function() {
  const now = new Date();
  const day = now.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  
  console.log(`Disabling webhooks at 8:00 AM on day ${day}`);
  
  pages.forEach(page => {
    disableWebhook(page.page_id);
  });
});

// Lên lịch kết nối lại webhook vào lúc 17:00 chiều từ thứ 2 đến thứ 6
cron.schedule('0 17 * * 1-5', function() {
  console.log('Enabling webhooks at 5:00 PM on weekdays');
  pages.forEach(page => {
    enableWebhook(page.page_id);
  });
});

// Lên lịch kết nối lại webhook vào lúc 12:00 trưa thứ 7
cron.schedule('0 12 * * 6', function() {
  console.log('Enabling webhooks at 12:00 PM on Saturday');
  pages.forEach(page => {
    enableWebhook(page.page_id);
  });
});

// Kiểm tra trạng thái webhook khi khởi động
async function checkAllWebhooks() {
  console.log('Checking all webhooks on startup...');
  for (const page of pages) {
    try {
      const appAccessToken = await getAppAccessToken();
      const response = await axios.get(`https://graph.facebook.com/v18.0/${page.page_id}/subscribed_apps`, {
        params: {
          access_token: appAccessToken
        }
      });
      
      if (response.data && response.data.data) {
        pageStatus[page.page_id] = { 
          enabled: response.data.data.length > 0, 
          lastCheck: new Date().toISOString() 
        };
      }
      
      console.log(`Webhook status for page ${page.page_id}:`, pageStatus[page.page_id]);
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
