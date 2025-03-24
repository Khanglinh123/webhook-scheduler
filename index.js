import fetch from 'node-fetch';
import cron from 'node-cron';
import express from 'express';

// Thông tin ứng dụng và Page
const PAGE_ID = '583129331554040';
const APP_ID = '231586060213120'; // ID ứng dụng của bạn từ ảnh
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887'; // Mã bí mật ứng dụng bạn đã chia sẻ trước đó
const PAGE_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD';

// Biến để theo dõi trạng thái
let isWebhookEnabled = true;
let lastApiCallSuccess = null;
let lastApiCallTime = null;
let lastApiCallResult = null;
let startupTime = new Date();

// Hàm lấy App Access Token
async function getAppAccessToken() {
  try {
    console.log('Getting App Access Token...');
    const response = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=client_credentials`
    );
    
    const data = await response.json();
    console.log('App Access Token obtained');
    return data.access_token;
  } catch (error) {
    console.error('Error getting App Access Token:', error);
    throw error;
  }
}

// Function để kiểm tra trạng thái webhook hiện tại
async function checkWebhookStatus() {
  try {
    console.log('Checking webhook status...');
    const appAccessToken = await getAppAccessToken();
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps?access_token=${appAccessToken}`
    );
    
    const result = await response.json();
    console.log(`Current webhook status: ${JSON.stringify(result)}`);
    
    // Cập nhật trạng thái dựa trên kết quả
    if (result.data && Array.isArray(result.data)) {
      isWebhookEnabled = result.data.length > 0;
      console.log(`Webhook is currently ${isWebhookEnabled ? 'ENABLED' : 'DISABLED'}`);
    } else if (result.error) {
      console.log(`Error checking webhook status: ${result.error.message}`);
    }
    
    lastApiCallTime = new Date();
    lastApiCallResult = result;
    
    return result;
  } catch (error) {
    console.log(`Error checking webhook status: ${error.message}`);
    lastApiCallTime = new Date();
    lastApiCallSuccess = false;
    lastApiCallResult = { error: error.message };
    return { error: error.message };
  }
}

// Function để vô hiệu hóa webhook
async function disableWebhook() {
  try {
    console.log('Attempting to disable webhook...');
    const appAccessToken = await getAppAccessToken();
    
    const unsubscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps?access_token=${appAccessToken}`,
      {
        method: 'DELETE'
      }
    );
    
    const responseText = await unsubscribeResponse.text();
    console.log(`Raw disable response: ${responseText}`);
    
    try {
      const result = JSON.parse(responseText);
      console.log(`Webhook disable result: ${JSON.stringify(result)}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = result.success === true;
      lastApiCallTime = new Date();
      lastApiCallResult = result;
      
      if (lastApiCallSuccess) {
        isWebhookEnabled = false;
        console.log('Webhook successfully DISABLED');
      } else {
        console.log('Failed to disable webhook');
      }
      
      return result;
    } catch (e) {
      console.log(`Could not parse disable response as JSON: ${e.message}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = false;
      lastApiCallTime = new Date();
      lastApiCallResult = { error: 'Parse error', raw: responseText };
      
      return { success: false, error: 'Parse error', raw: responseText };
    }
  } catch (error) {
    console.log(`Error disabling webhook: ${error.message}`);
    
    // Cập nhật trạng thái
    lastApiCallSuccess = false;
    lastApiCallTime = new Date();
    lastApiCallResult = { error: error.message };
    
    return { success: false, error: error.message };
  }
}

// Function để kích hoạt webhook
async function enableWebhook() {
  try {
    console.log('Attempting to enable webhook...');
    const appAccessToken = await getAppAccessToken();
    
    const subscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps?access_token=${appAccessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks,messaging_optins'
        })
      }
    );
    
    const responseText = await subscribeResponse.text();
    console.log(`Raw enable response: ${responseText}`);
    
    try {
      const result = JSON.parse(responseText);
      console.log(`Webhook enable result: ${JSON.stringify(result)}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = result.success === true;
      lastApiCallTime = new Date();
      lastApiCallResult = result;
      
      if (lastApiCallSuccess) {
        isWebhookEnabled = true;
        console.log('Webhook successfully ENABLED');
      } else {
        console.log('Failed to enable webhook');
      }
      
      return result;
    } catch (e) {
      console.log(`Could not parse enable response as JSON: ${e.message}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = false;
      lastApiCallTime = new Date();
      lastApiCallResult = { error: 'Parse error', raw: responseText };
      
      return { success: false, error: 'Parse error', raw: responseText };
    }
  } catch (error) {
    console.log(`Error enabling webhook: ${error.message}`);
    
    // Cập nhật trạng thái
    lastApiCallSuccess = false;
    lastApiCallTime = new Date();
    lastApiCallResult = { error: error.message };
    
    return { success: false, error: error.message };
  }
}

// Lên lịch hàng ngày
// Thứ 2-6: Tắt lúc 8:00 sáng, bật lúc 17:00 chiều
cron.schedule('0 8 * * 1-5', async () => {
  console.log('SCHEDULED TASK: Disabling webhook for weekday...');
  await disableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

cron.schedule('0 17 * * 1-5', async () => {
  console.log('SCHEDULED TASK: Enabling webhook for weekday evening...');
  await enableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Thứ 7: Tắt lúc 8:00 sáng, bật lúc 12:00 trưa
cron.schedule('0 8 * * 6', async () => {
  console.log('SCHEDULED TASK: Disabling webhook for Saturday morning...');
  await disableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

cron.schedule('0 12 * * 6', async () => {
  console.log('SCHEDULED TASK: Enabling webhook for Saturday afternoon...');
  await enableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Tạo server Express để hiển thị trạng thái và cung cấp điều khiển thủ công
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const statusHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Webhook Scheduler Status</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .header { background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; }
        .enabled { background-color: #4CAF50; }
        .disabled { background-color: #F44336; }
        .button { display: inline-block; padding: 10px 15px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
        .button:hover { background-color: #0b7dda; }
        .info { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        table, th, td { border: 1px solid #ddd; }
        th, td { padding: 10px; text-align: left; }
        th { background-color: #f2f2f2; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Webhook Scheduler Status</h1>
        
        <div class="card">
          <div class="header">
            <h2>Current Status</h2>
          </div>
          <p>Webhook is currently: 
            <span class="status ${isWebhookEnabled ? 'enabled' : 'disabled'}">
              ${isWebhookEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </p>
          <p>Current time in Vietnam: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (GMT+07:00)</p>
          <div class="actions">
            <a href="/disable" class="button">Disable Webhook</a>
            <a href="/enable" class="button">Enable Webhook</a>
            <a href="/check" class="button">Check Status</a>
          </div>
        </div>
        
        <div class="card">
          <div class="header">
            <h2>Schedule Information</h2>
          </div>
          <table>
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
        
        <div class="card">
          <div class="header">
            <h2>System Information</h2>
          </div>
          <div class="info">
            <strong>Service started at:</strong> ${startupTime.toISOString()}
          </div>
          <div class="info">
            <strong>Last API call:</strong> ${lastApiCallTime ? lastApiCallTime.toISOString() : 'None'}
          </div>
          <div class="info">
            <strong>Last API call success:</strong> ${lastApiCallSuccess !== null ? lastApiCallSuccess : 'N/A'}
          </div>
          <div class="info">
            <strong>Last API call result:</strong>
            <pre>${lastApiCallResult ? JSON.stringify(lastApiCallResult, null, 2) : 'None'}</pre>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  res.send(statusHtml);
});

// Endpoint để vô hiệu hóa webhook thủ công
app.get('/disable', async (req, res) => {
  await disableWebhook();
  res.redirect('/');
});

// Endpoint để kích hoạt webhook thủ công
app.get('/enable', async (req, res) => {
  await enableWebhook();
  res.redirect('/');
});

// Endpoint để kiểm tra trạng thái webhook
app.get('/check', async (req, res) => {
  await checkWebhookStatus();
  res.redirect('/');
});

// Kiểm tra trạng thái webhook khi khởi động
console.log('Webhook scheduler starting...');
checkWebhookStatus();

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log('Webhook scheduler setup complete!');
