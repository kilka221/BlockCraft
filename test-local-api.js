fetch('http://localhost:3000/api/health').then(r => r.json()).then(console.log).catch(console.error);
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: 'test@test.com', password: 'test', name: 'test'})
}).then(r => r.json()).then(console.log).catch(console.error);
