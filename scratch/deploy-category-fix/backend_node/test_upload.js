const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const loginRes = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.token;
    
    // Create valid 1x1 GIF
    const gifBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    fs.writeFileSync('dummy.gif', Buffer.from(gifBase64, 'base64'));

    const form = new FormData();
    form.append('file', fs.createReadStream('dummy.gif'));

    const uploadRes = await axios.post('http://localhost:8000/api/v1/upload/image', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("Success:", JSON.stringify(uploadRes.data, null, 2));
  } catch (err) {
    console.error("Failed:", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}
testUpload();
