const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', err => resolve({ status: 500, error: err.message }));
  });
}

async function main() {
  console.log('=== TESTING CLIENT & ADMIN HTML RESPONSES ===');
  
  const clientRes = await fetchUrl('http://localhost:3001/Seller-Registration-Form');
  console.log('Client Page Status:', clientRes.status);
  console.log('Client Page Length:', clientRes.body.length);
  console.log('Contains "Seller Register Form":', clientRes.body.includes('Seller Register Form'));
  console.log('Contains "BUSINESS INFORMATION":', clientRes.body.includes('BUSINESS INFORMATION'));
  console.log('Contains "CONTACT &amp; LOCATION" or "CONTACT":', clientRes.body.includes('CONTACT'));
  console.log('Contains "Submit":', clientRes.body.includes('Submit'));
  console.log('Contains "View List":', clientRes.body.includes('View List'));

  const adminRes = await fetchUrl('http://localhost:3000');
  console.log('\nAdmin Page Status:', adminRes.status);
  console.log('Admin Page Length:', adminRes.body.length);
  console.log('Contains root div:', adminRes.body.includes('<div id="root">'));
}

main();
