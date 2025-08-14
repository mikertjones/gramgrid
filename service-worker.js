// service-worker.js
const CACHE_NAME = 'gramgrid-v1';
const API_CACHE_NAME = 'gramgrid-api-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/analytics.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-384x384.png',
  '/icons/icon-180x180.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  // Add your other assets
];

// API endpoints to cache
const API_URLS = [
  '/api/puzzles/week?level=CL'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);
  
  // Handle API requests differently
  if (requestURL.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }
  
  // Handle static assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle API requests with caching strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const requestURL = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for', requestURL.pathname);
    
    // Fall back to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache available, return offline message
    if (requestURL.pathname.includes('/api/puzzle/')) {
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'This puzzle is not available offline. Please check your internet connection.',
        cached: false
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Background sync for analytics when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Get queued analytics events from IndexedDB
  // This would sync any analytics events that were queued while offline
  console.log('Service Worker: Syncing analytics...');
}


/*
// Push notifications (optional)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New puzzle available!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data,
      actions: [
        {
          action: 'play',
          title: 'Play Now',
          icon: '/icons/play-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Later'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Daily Word Puzzle', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow('/?notification=true')
    );
  }
});

// Periodically cache today's puzzle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_TODAY_PUZZLE') {
    event.waitUntil(cacheTodaysPuzzle());
  }
});

async function cacheTodaysPuzzle() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = await fetch('/api/puzzle/today');
    if (response.ok) {
      await cache.put('/api/puzzle/today', response);
      console.log('Service Worker: Today\'s puzzle cached');
    }
  } catch (error) {
    console.error('Service Worker: Failed to cache today\'s puzzle:', error);
  }
}*/