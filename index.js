// Hàm để lấy token và ID dựa trên loại token
function getPageInfo(pageIndex) {
  const index = parseInt(pageIndex, 10);
  if (isNaN(index) || index < 1 || index > PAGES.length) {
    return null;
  }
  return PAGES[index - 1];
}

function getToken(tokenType) {
  if (tokenType === 'user') {
    return USER_ACCESS_TOKEN;
  } else if (tokenType === 'app') {
    return APP_ACCESS_TOKEN;
  } else {
    const pageInfo = getPageInfo(tokenType.split(':')[1]);
    return pageInfo ? pageInfo.token : null;
  }
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
