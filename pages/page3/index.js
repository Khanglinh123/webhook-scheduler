import express from 'express';
import axios from 'axios';
import cron from 'node-cron';

const PAGE_ID = '591609024032061';
const APP_ID = '231586060213120';
const APP_SECRET = 'ecb35f0156838eb14f7cb747f3544887';
const PAGE_ACCESS_TOKEN = 'EAAg6Q1CKEwIBO2DHZCqZCTUQxxyrNm23c6Pe18ISmWYzfwDiOyyvmn8btah68Rkxgu4ayQ06LEtGf8AZCfEOX99YP8iqliNBPOAtUiuaeQ4gYIaLDL8sWvchx6zC2J5T1HU2kvRseE25wi4Sbl2yuFQ0RKov0fmZAT3SB3BOAEDKDGFDcLOq3ebLEpYB92ZCD83tTIyWRP11ZCF0EQcwZDZD';
const APP_ACCESS_TOKEN = '2315860602131202|1Odqilsh0sZGC_NXgT_uL7LL-x0';
const USER_ACCESS_TOKEN = 'EAAg6Q1CKEwIBOZB6CjjwZCAhUJGl2p0NrblmlbiF6D1E5ilrUwiIpG4IW7XskVWa7WNGoNiwiiQnsPrQCyFJcTWZBilAtN3gXLP8goSZAtJfwoN95RCmO2SDkTXCGJYz6ZBxxdXbLrZCXomvJhjmNQpBoxoFaHZAZCg7fwzesOceQC3hrzdbGG0ZAsmJS5hQ84x3K3w3olZBOea2eassgSxSZB74euMus58ixdcE0YD0vCVIeqe';

const app = express();
app.use(express.static('public')); // Serve static files from the 'public' directory

// Hàm để lấy token dựa trên loại token
function getToken(tokenType) {
  if (tokenType === 'user') {
    return USER_ACCESS_TOKEN;
  } else if (tokenType === 'app') {
    return APP_ACCESS_TOKEN;
  } else {
    return PAGE_ACCESS_TOKEN;
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
  const token
