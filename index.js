import fetch from 'node-fetch';
import cron from 'node-cron';
import express from 'express';
import { format, utcToZonedTime } from 'date-fns-tz';

// Thông tin Page
const PAGE_ID = '583129331554040';
const PAGE_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD';
const TIMEZONE = 'Asia/Ho_Chi_Minh';

// Biến để theo dõi trạng thái
let isWebhookEnabled = true;
let lastApiCallSuccess = null;
let lastApiCallTime = null;
let lastApiCallResult = null;
let startupTime = new Date();

// Hàm lấy thời gian hiện tại theo múi giờ Việt Nam
function getCurrentTimeVN() {
  const now = new Date();
  const vnTime = utcToZonedTime(now, TIMEZONE);
  return format(vnTime, 'yyyy-MM-dd HH:mm:ss (OOOO)', { timeZone: TIMEZONE });
}

// Hàm ghi log với timestamp
function logWithTime(message) {
  console.log(`[${getCurrentTimeVN()}] ${message}`);
}

// Function để kiểm tra trạng thái webhook hiện tại
async function checkWebhookStatus() {
  try {
    logWithTime('Checking webhook status...');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps?access_token=${PAGE_ACCESS_TOKEN}`
    );
    
    const result = await response.json();
    logWithTime(`Current webhook status: ${JSON.stringify(result)}`);
    
    // Cập nhật trạng thái dựa trên kết quả
    if (result.data && Array.isArray(result.data)) {
      isWebhookEnabled = result.data.length > 0;
      logWithTime(`Webhook is currently ${isWebhookEnabled ? 'ENABLED' : 'DISABLED'}`);
    } else if (result.error) {
      logWithTime(`Error checking webhook status: ${result.error.message}`);
    }
    
    return result;
  } catch (error) {
    logWithTime(`Error checking webhook status: ${error.message}`);
    return { error: error.message };
  }
}

// Function để vô hiệu hóa webhook
async function disableWebhook() {
  try {
    logWithTime('Attempting to disable webhook...');
    const unsubscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: 'DELETE'
      }
    );
    
    const responseText = await unsubscribeResponse.text();
    logWithTime(`Raw disable response: ${responseText}`);
    
    try {
      const result = JSON.parse(responseText);
      logWithTime(`Webhook disable result: ${JSON.stringify(result)}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = result.success === true;
      lastApiCallTime = new Date();
      lastApiCallResult = result;
      
      if (lastApiCallSuccess) {
        isWebhookEnabled = false;
        logWithTime('Webhook successfully DISABLED');
      } else {
        logWithTime('Failed to disable webhook');
      }
      
      return result;
    } catch (e) {
      logWithTime(`Could not parse disable response as JSON: ${e.message}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = false;
      lastApiCallTime = new Date();
      lastApiCallResult = { error: 'Parse error', raw: responseText };
      
      return { success: false, error: 'Parse error', raw: responseText };
    }
  } catch (error) {
    logWithTime(`Error disabling webhook: ${error.message}`);
    
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
    logWithTime('Attempting to enable webhook...');
    const subscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PAGE_ID}/subscribed_apps?access_token=${PAGE_ACCESS_TOKEN}`,
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
    logWithTime(`Raw enable response: ${responseText}`);
    
    try {
      const result = JSON.parse(responseText);
      logWithTime(`Webhook enable result: ${JSON.stringify(result)}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = result.success === true;
      lastApiCallTime = new Date();
      lastApiCallResult = result;
      
      if (lastApiCallSuccess) {
        isWebhookEnabled = true;
        logWithTime('Webhook successfully ENABLED');
      } else {
        logWithTime('Failed to enable webhook');
      }
      
      return result;
    } catch (e) {
      logWithTime(`Could not parse enable response as JSON: ${e.message}`);
      
      // Cập nhật trạng thái
      lastApiCallSuccess = false;
      lastApiCallTime = new Date();
      lastApiCallResult = { error: 'Parse error', raw: responseText };
      
      return { success: false, error: 'Parse error', raw: responseText };
    }
  } catch (error) {
    logWithTime(`Error enabling webhook: ${error.message}`);
    
    // Cập nhật trạng thái
    lastApiCallSuccess = false;
    lastApiCallTime = new Date();
    lastApiCallResult = { error: error.message };
    
    return { success: false, error: error.message };
  }
}

// Kiểm tra trạng thái webhook khi khởi động
logWithTime('Webhook scheduler starting...');
logWithTime(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
logWithTime(`Target timezone: ${TIMEZONE}`);
logWithTime(`Current time in server timezone: ${new Date().toString()}`);
logWithTime(`Current time in Vietnam: ${getCurrentTimeVN()}`);

// Kiểm tra trạng thái webhook hiện tại
checkWebhookStatus();

// Lên lịch hàng ngày
// Thứ 2-6: Tắt lúc 8:00 sáng, bật lúc 17:00 chiều
cron.schedule('0 8 * * 1-5', async () => {
  logWithTime('SCHEDULED TASK: Disabling webhook for weekday...');
  await disableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: TIMEZONE
});

cron.schedule('0 17 * * 1-5', async () => {
  logWithTime('SCHEDULED TASK: Enabling webhook for weekday evening...');
  await enableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: TIMEZONE
});

// Thứ 7: Tắt lúc 8:00 sáng, bật lúc 12:00 trưa
cron.schedule('0 8 * * 6', async () => {
  logWithTime('SCHEDULED TASK: Disabling webhook for Saturday morning...');
  await disableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: TIMEZONE
});

cron.schedule('0 12 * * 6', async () => {
  logWithTime('SCHEDULED TASK: Enabling webhook for Saturday afternoon...');
  await enableWebhook();
  
  // Kiểm tra lại sau 1 phút
  setTimeout(checkWebhookStatus, 60000);
}, {
  timezone: TIMEZONE
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
          <p>Current time in Vietnam: ${getCurrentTimeVN()}</p>
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

// Khởi động server
app.listen(PORT, () => {
  logWithTime(`Server running on port ${PORT}`);
});

// Thử ngắt kết nối ngay lập tức (bỏ comment dòng dưới để kích hoạt)
// disableWebhook();

logWithTime('Webhook scheduler setup complete!');
