import fetch from 'node-fetch';
import cron from 'node-cron';

// Function to disable webhook subscription
async function disableWebhook() {
  try {
    // Unsubscribe the page from webhook events
    const unsubscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/583129331554040/subscribed_apps?access_token=EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD`,
      {
        method: 'DELETE'
      }
    );
    
    const result = await unsubscribeResponse.json();
    console.log('Webhook disabled:', result);
    return result;
  } catch (error) {
    console.error('Error disabling webhook:', error);
  }
}

// Function to enable webhook subscription
async function enableWebhook() {
  try {
    // Subscribe the page to webhook events
    const subscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/583129331554040/subscribed_apps?access_token=EAAg6Q1CKEwIBOxillAuZAjLb2dHUbxgHsZAQQvXSkREWcoXFvpiRwR3Jbh7TIJy70PZBBgO1BGTfkUxVpiLIEwTLSZBKqS2mZCoVGv9NGCA1q59bEOWzoQhL1KTQCrmQ1BU3ZB4Pa16GZCoLQrWIlIv1Qk9Ra1ZC59bml3FPrHqLph2lcdsBF9GJNejNe5AUmJ4RwQZDZD`,
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
    
    const result = await subscribeResponse.json();
    console.log('Webhook enabled:', result);
    return result;
  } catch (error) {
    console.error('Error enabling webhook:', error);
  }
}

// Vietnam time is GMT+7
// Schedule for Monday-Friday: Disable at 8:00 AM, Enable at 5:00 PM
cron.schedule('0 8 * * 1-5', async () => {
  console.log('Disabling webhook for weekday...');
  await disableWebhook();
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

cron.schedule('0 17 * * 1-5', async () => {
  console.log('Enabling webhook for weekday evening...');
  await enableWebhook();
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Schedule for Saturday: Disable at 8:00 AM, Enable at 12:00 PM
cron.schedule('0 8 * * 6', async () => {
  console.log('Disabling webhook for Saturday morning...');
  await disableWebhook();
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

cron.schedule('0 12 * * 6', async () => {
  console.log('Enabling webhook for Saturday afternoon...');
  await enableWebhook();
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('Webhook scheduler is running...');
// Thử ngắt kết nối ngay lập tức
console.log('Trying immediate webhook disconnection...');
disableWebhook().then(result => {
  console.log('Immediate disconnection result:', result);
});
