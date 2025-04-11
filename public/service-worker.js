const CACHE_NAME = 'quiz-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets, die im Cache gespeichert werden sollen
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/images/logo.svg',
  '/assets/images/offline.svg'
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Service Worker Aktivierung
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Response klonen und im Cache speichern
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Offline-Fallback
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return caches.match(event.request);
      })
  );
});

// Background Sync für Offline-Änderungen
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-answers') {
    event.waitUntil(syncAnswers());
  }
});

// Queue für Offline-Änderungen
const offlineQueue = [];

// Funktion zum Synchronisieren der Antworten
async function syncAnswers() {
  const db = await openDatabase();
  const answers = await db.getAll('answers');
  
  for (const answer of answers) {
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answer),
      });
      await db.delete('answers', answer.id);
    } catch (error) {
      console.error('Fehler beim Synchronisieren:', error);
    }
  }
}

// IndexedDB für Offline-Daten
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('quiz-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('answers')) {
        db.createObjectStore('answers', { keyPath: 'id' });
      }
    };
  });
} 