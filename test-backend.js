// Quick test script to check if backend is running
// Run this with: node test-backend.js

const http = require('http');

const testBackend = async () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Backend is running!');
          console.log('Response:', data);
          resolve(true);
        } else {
          console.log('❌ Backend responded with status:', res.statusCode);
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Backend is NOT running!');
      console.log('Error:', error.message);
      console.log('\n💡 To start the backend:');
      console.log('   cd backend');
      console.log('   npm start');
      reject(error);
    });

    req.end();
  });
};

testBackend().catch(() => process.exit(1));

