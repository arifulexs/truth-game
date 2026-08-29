self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Truth', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Truth';
  const options = {
    body: data.body || '',
    tag: data.tag || 'truth-game',
    data: data.data || {},
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const roomCode = event.notification.data && event.notification.data.roomCode;
  const targetUrl = roomCode ? `/waiting/${roomCode}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
