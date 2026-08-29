fetch('http://localhost:3000/api/auth/yandex/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: 'yandex@yandex.ru', displayName: 'Yandex User'})
}).then(r => r.json()).then(console.log).catch(console.error);
