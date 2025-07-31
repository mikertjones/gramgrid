// analytics.js - Add this to your PWA
class PuzzleAnalytics {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.sessionStart = Date.now();
    this.puzzleStartTime = null;
    this.init();
  }
  
  init() {
    // Track initial page view
    this.track('page_view', null, {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      screen: `${screen.width}x${screen.height}`,
      userAgent: navigator.userAgent
    });
    
    // Track PWA-specific events
    this.trackPWAEvents();
    
    // Track session end
    window.addEventListener('beforeunload', () => {
      this.track('session_end', null, {
        duration: Date.now() - this.sessionStart
      });
    });
    
    // Track visibility changes (user switching tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('tab_hidden');
      } else {
        this.track('tab_visible');
      }
    });
  }
  
  async track(eventType, puzzleDate = null, metadata = {}) {
    try {
      // Add timestamp and basic info to all events
      const eventData = {
        eventType,
        puzzleDate,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        }
      };
      
      // Use sendBeacon for page unload events (more reliable)
      if (eventType === 'session_end' && navigator.sendBeacon) {
        navigator.sendBeacon(
          `${this.apiUrl}/api/analytics/event`,
          JSON.stringify(eventData)
        );
      } else {
        await fetch(`${this.apiUrl}/api/analytics/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        });
      }
    } catch (error) {
      // Fail silently - don't break user experience
      console.warn('Analytics tracking failed:', error);
    }
  }
  
  trackPWAEvents() {
    // PWA install prompt shown
    window.addEventListener('beforeinstallprompt', (e) => {
      this.track('pwa_install_prompt_shown');
    });
    
    // PWA actually installed
    window.addEventListener('appinstalled', () => {
      this.track('pwa_installed');
    });
    
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.track('pwa_launched');
    }
    
    // Network status
    window.addEventListener('online', () => {
      this.track('connection_restored');
    });
    
    window.addEventListener('offline', () => {
      this.track('went_offline');
    });
    
    // Service Worker events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.track('service_worker_updated');
      });
    }
  }
  
  // Puzzle-specific tracking methods
  trackPuzzleStart(puzzleDate, difficulty = null) {
    this.puzzleStartTime = Date.now();
    this.track('puzzle_started', puzzleDate, {
      difficulty,
      startTime: this.puzzleStartTime
    });
  }
  
  trackPuzzleComplete(puzzleDate, hintsUsed = 0, difficulty = null) {
    if (!this.puzzleStartTime) {
      console.warn('Puzzle completion tracked without start time');
      return;
    }
    
    const completionTime = Date.now() - this.puzzleStartTime;
    this.track('puzzle_completed', puzzleDate, {
      completionTimeMs: completionTime,
      completionTimeSeconds: Math.round(completionTime / 1000),
      hintsUsed,
      difficulty,
      successful: true
    });
    
    this.puzzleStartTime = null; // Reset for next puzzle
  }
  
  trackPuzzleAbandoned(puzzleDate, reason = 'unknown') {
    if (!this.puzzleStartTime) return;
    
    const timeSpent = Date.now() - this.puzzleStartTime;
    this.track('puzzle_abandoned', puzzleDate, {
      timeSpentMs: timeSpent,
      timeSpentSeconds: Math.round(timeSpent / 1000),
      reason
    });
    
    this.puzzleStartTime = null;
  }
  
  trackHintUsed(puzzleDate, hintNumber, hintText = null) {
    this.track('hint_used', puzzleDate, {
      hintNumber,
      hintText,
      timeSinceStart: this.puzzleStartTime ? Date.now() - this.puzzleStartTime : null
    });
  }
  
  trackError(errorType, errorMessage, puzzleDate = null) {
    this.track('error_occurred', puzzleDate, {
      errorType,
      errorMessage,
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }
  
  trackShareAttempt(puzzleDate, shareMethod = 'unknown') {
    this.track('puzzle_shared', puzzleDate, {
      shareMethod
    });
  }
  
  trackFeatureUsed(featureName, puzzleDate = null, additionalData = {}) {
    this.track('feature_used', puzzleDate, {
      featureName,
      ...additionalData
    });
  }
}

// Initialize analytics (replace with your Railway URL)
const analytics = new PuzzleAnalytics('https://gramgrid-api-production.up.railway.app');

// Enhanced fetch wrapper to auto-track API errors
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    
    // Track API errors
    if (!response.ok) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      analytics.trackError('api_error', `${response.status} ${response.statusText}`, null);
    }
    
    return response;
  } catch (error) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    analytics.trackError('network_error', error.message);
    throw error;
  }
};

// Make analytics available globally
window.puzzleAnalytics = analytics;