// puzzleProgressManager.js
class PuzzleProgressManager {
  constructor() {
    this.sessionProgress = new Map(); // date -> puzzle state
    this.persistedCompletions = new Set(); // completed puzzle dates
    this.completedPuzzleStates = new Map(); // date -> full completed puzzle state
    this.dbName = 'gramgrid-progress';
    this.dbVersion = 2; // Increment version for new schema
    this.init();
  }

  async init() {
    await this.loadPersistedCompletions();
    await this.loadCompletedPuzzleStates();
  }

  // Save puzzle state during play (letters placed, partial solutions)
  saveSessionState(date, puzzleState) {
    this.sessionProgress.set(date, {
      ...puzzleState,
      timestamp: Date.now()
    });
  }

  // Mark puzzle as completed and persist it
  async markCompleted(date, completionData) {
    const completedState = {
      completed: true,
      completionTime: Date.now(),
      date: date,
      ...completionData
    };

    // Save to session
    this.sessionProgress.set(date, completedState);

    // Save full completed state for restoration
    this.completedPuzzleStates.set(date, completedState);

    // Add to persistent completions
    this.persistedCompletions.add(date);
    
    // Persist both completion list and full states
    await Promise.all([
      this.savePersistedCompletions(),
      this.saveCompletedPuzzleStates()
    ]);
  }

  // Get puzzle state (session state or completion status)
  getPuzzleState(date) {
    // Check session first (current work or completed this session)
    if (this.sessionProgress.has(date)) {
      return this.sessionProgress.get(date);
    }

    // Check if previously completed and get full state
    if (this.completedPuzzleStates.has(date)) {
      return {
        ...this.completedPuzzleStates.get(date),
        previouslyCompleted: true
      };
    }

    // Fallback: check basic completion status
    if (this.persistedCompletions.has(date)) {
      return { 
        completed: true, 
        previouslyCompleted: true,
        completedDate: date 
      };
    }

    return null; // Fresh puzzle
  }

  // Get completed puzzle state for restoration
  getCompletedPuzzleState(date) {
    return this.completedPuzzleStates.get(date) || null;
  }

  // Check if puzzle was completed (any session)
  isCompleted(date) {
    const sessionState = this.sessionProgress.get(date);
    return (sessionState?.completed) || this.persistedCompletions.has(date);
  }

  // Clear session data but keep completions
  clearSession() {
    this.sessionProgress.clear();
  }

  // IndexedDB operations for persistent storage
  async savePersistedCompletions() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['completions'], 'readwrite');
      const store = transaction.objectStore('completions');
      
      const request = store.put({
        id: 'completed_puzzles',
        dates: Array.from(this.persistedCompletions),
        lastUpdated: Date.now()
      });
      
      await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.warn('Could not save completions:', error);
    }
  }

  async loadPersistedCompletions() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['completions'], 'readonly');
      const store = transaction.objectStore('completions');
      
      const request = store.get('completed_puzzles');
      const result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result?.dates) {
        this.persistedCompletions = new Set(result.dates);
      }
    } catch (error) {
      console.warn('Could not load completions:', error);
      // Continue without saved completions
    }
  }

  // Save completed puzzle states to IndexedDB
  async saveCompletedPuzzleStates() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['puzzleStates'], 'readwrite');
      const store = transaction.objectStore('puzzleStates');
      
      // Convert Map to array of objects for storage
      const statesArray = Array.from(this.completedPuzzleStates.entries()).map(([date, state]) => ({
        date,
        ...state
      }));
      
      const request = store.put({
        id: 'completed_puzzle_states',
        states: statesArray,
        lastUpdated: Date.now()
      });
      
      await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.warn('Could not save puzzle states:', error);
    }
  }

  // Load completed puzzle states from IndexedDB
  async loadCompletedPuzzleStates() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['puzzleStates'], 'readonly');
      const store = transaction.objectStore('puzzleStates');
      
      const request = store.get('completed_puzzle_states');
      const result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result?.states) {
        // Convert array back to Map
        this.completedPuzzleStates = new Map(
          result.states.map(state => [state.date, state])
        );
      }
    } catch (error) {
      console.warn('Could not load puzzle states:', error);
      // Continue without saved states
    }
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('completions')) {
          db.createObjectStore('completions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('puzzleStates')) {
          db.createObjectStore('puzzleStates', { keyPath: 'id' });
        }
      };
    });
  }

  // Utility methods
  getCompletedDates() {
    return Array.from(this.persistedCompletions);
  }

  hasSessionWork(date) {
    const state = this.sessionProgress.get(date);
    return state && !state.completed;
  }

  // Clean up old session data (optional - call periodically)
  cleanupOldSessions() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [date, state] of this.sessionProgress.entries()) {
      if (state.timestamp < oneDayAgo && !state.completed) {
        this.sessionProgress.delete(date);
      }
    }
  }
}

// Helper function to get puzzle date from weeklyPuzzles array
function getPuzzleDate(puzzles, index) {
  return puzzles[index]?.date || new Date().toISOString().split('T')[0];
}

// Make PuzzleProgressManager available globally
window.PuzzleProgressManager = PuzzleProgressManager;