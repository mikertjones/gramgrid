
// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered successfully:', registration);
            
            // Cache today's puzzle immediately
            if (registration.active) {
                registration.active.postMessage({
                    type: 'CACHE_TODAY_PUZZLE'
                });
            }
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// PWA Install Prompt
let deferredPrompt;
const installBanner = document.getElementById('install-banner');
const installButton = document.getElementById('install-button');
const dismissButton = document.getElementById('dismiss-install');

// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install banner if not already dismissed
    if (!localStorage.getItem('install-dismissed')) {
        installBanner.style.display = 'block';
    }
});

// Handle install button click
installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted PWA install');
        } else {
            console.log('User dismissed PWA install');
        }
        
        deferredPrompt = null;
        installBanner.style.display = 'none';
    }
});

// Handle dismiss button
dismissButton.addEventListener('click', () => {
    installBanner.style.display = 'none';
    localStorage.setItem('install-dismissed', 'true');
});

// Track PWA install
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed successfully');
    installBanner.style.display = 'none';
    
    // Track with analytics if available
    if (typeof gtag !== 'undefined') {
        gtag('event', 'pwa_installed');
    }
    if (window.puzzleAnalytics) {
        window.puzzleAnalytics.track('pwa_installed');
    }
});

// Online/Offline Detection
const offlineIndicator = document.getElementById('offline-indicator');

function updateOnlineStatus() {
    if (navigator.onLine) {
        offlineIndicator.style.display = 'none';
        document.body.classList.remove('offline');
    } else {
        offlineIndicator.style.display = 'block';
        document.body.classList.add('offline');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // Check initial status

// Check if running as PWA
function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

if (isPWA()) {
    document.body.classList.add('pwa-mode');
    console.log('Running as PWA');
}
