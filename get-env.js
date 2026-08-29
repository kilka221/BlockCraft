const fetch = require('node-fetch');
fetch('https://schemator.ru/api/health').then(r => r.json()).then(console.log);
