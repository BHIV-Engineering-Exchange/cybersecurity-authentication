require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// Evidence upload test endpoint
app.post('/api/evidence/upload', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Evidence upload endpoint is working!',
    timestamp: new Date()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`✅ MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
  console.log(`✅ JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
});

