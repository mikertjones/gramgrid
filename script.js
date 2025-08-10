class WordGridPuzzle {
    constructor(puzzleData) {
        // Initialize puzzle data with defaults
        this.puzzleData = puzzleData;
        this.currentPuzzleIndex = 0;
        this.weeklyPuzzles = [];
        
        // Initialize with default values to prevent errors
        this.targetRowSums = [0, 0, 0];
        this.targetColSums = [0, 0, 0];
        this.givenWords = [];
        this.correctSolution = '';
        
        // Timer properties
        this.timerStarted = false;
        this.timerInterval = null;
        this.startTime = null;
        this.puzzleCompleted = false;
        
        // Initialize grid
        this.initializeGrid();
        this.attachEventListeners();
        
        // Load actual puzzle data (this will override the defaults)
        if (puzzleData) {
            this.loadPuzzleData(puzzleData);
        }
    }

    initializeGrid() {
        this.cells = [];
        for (let i = 0; i < 9; i++) {
            this.cells[i] = document.getElementById(`cell-${i}`);
        }
        this.updateAllSums();
        //this.resetPuzzle();
    }

    loadPuzzleData(puzzleData) {
        console.log('Loading puzzle data...');
        
        if (!puzzleData) {
            console.error('ERROR: puzzleData is null or undefined!');
            return;
        }
        
        // Check if this is the nested puzzle-data structure
        const actualPuzzle = puzzleData['puzzle-data'] || puzzleData;
        
        // Check if targets exist
        if (!actualPuzzle.targets) {
            console.error('ERROR: No targets found in puzzle data!');
            console.log('Available keys:', Object.keys(actualPuzzle));
            return;
        }
        
        // Set current puzzle data
        this.targetRowSums = actualPuzzle.targets.rows;
        this.targetColSums = actualPuzzle.targets.cols;
        this.givenWords = actualPuzzle.words.map(word => word.word);

        this.givenWordsAlpha = this.givenWords.map(word=>{
            return word.split('').sort().join('');
        })

        //console.log('given words alpha ', this.givenWordsAlpha);
        this.correctSolution = actualPuzzle.solution;
        
        console.log('Puzzle loaded successfully:', this.correctSolution);
        
        // Update the word display
        this.updateWordDisplay(actualPuzzle.words);
        
        // Update the grid targets
        this.updateAllSums();
        this.checkAllSumsCorrect();

    }

    updateWordDisplay(words) {
        const wordList = document.querySelector('.word-list');
        wordList.innerHTML = '';
        
        words.forEach(wordData => {
            const wordChip = document.createElement('div');
            wordChip.className = 'word-chip-detailed';
            
            const lettersDiv = document.createElement('div');
            lettersDiv.className = 'letters';
            lettersDiv.textContent = wordData.letters.join(' ');
            
            const valuesDiv = document.createElement('div');
            valuesDiv.className = 'values';
            valuesDiv.textContent = wordData.values.join(' ');
            
            wordChip.appendChild(lettersDiv);
            wordChip.appendChild(valuesDiv);
            wordList.appendChild(wordChip);
        });
    }

    setWeeklyPuzzles(puzzles) {
        this.weeklyPuzzles = puzzles;
        this.currentPuzzleIndex = 0; // Start with today's puzzle
        console.log(`Loaded ${puzzles.length} puzzles for navigation`);
        this.updateNavigationButtons();
    }

    navigateToPuzzle(direction) {
        const newIndex = this.currentPuzzleIndex + direction;
        if (newIndex >= 0 && newIndex < this.weeklyPuzzles.length) {
            this.currentPuzzleIndex = newIndex;
            
            // Extract puzzle data - could be .puzzle or ["puzzle-data"]
            const currentPuzzle = this.weeklyPuzzles[this.currentPuzzleIndex];
            const puzzleData = currentPuzzle.puzzle || currentPuzzle['puzzle-data'];
            
            this.loadPuzzleData(puzzleData);
            this.updateNavigationButtons();
            this.updatePuzzleTitle();
            this.resetPuzzle(); // Clear the grid when switching puzzles
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-day-btn');
        const nextBtn = document.getElementById('next-day-btn');
        
        // Show/hide previous day button (keep space but make invisible)
        if (this.currentPuzzleIndex < this.weeklyPuzzles.length - 1) {
            prevBtn.style.visibility = 'visible';
            prevBtn.style.pointerEvents = 'auto';
        } else {
            prevBtn.style.visibility = 'hidden';
            prevBtn.style.pointerEvents = 'none';
        }

        // Show/hide next day button (keep space but make invisible)
        if (this.currentPuzzleIndex > 0) {
            nextBtn.style.visibility = 'visible';
            nextBtn.style.pointerEvents = 'auto';
        } else {
            nextBtn.style.visibility = 'hidden';
            nextBtn.style.pointerEvents = 'none';
        }
    }

    updatePuzzleTitle() {
        const titleElement = document.getElementById('puzzle-title');
        const currentPuzzle = this.weeklyPuzzles[this.currentPuzzleIndex];

        if (this.currentPuzzleIndex === 0) {
            titleElement.textContent = "Today's puzzle";
        } else {
            const puzzleDate = new Date(currentPuzzle.date);
            const formattedDate = puzzleDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            titleElement.textContent = formattedDate;
        }
    }

    // Timer methods
    startTimer() {
        if (!this.timerStarted && !this.puzzleCompleted) {
            this.timerStarted = true;
            this.startTime = Date.now();
            
            this.timerInterval = setInterval(() => {
                this.updateTimerDisplay();
            }, 1000);
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetTimer() {
        this.stopTimer();
        this.timerStarted = false;
        this.startTime = null;
        this.puzzleCompleted = false;
        
        const timerText = document.getElementById('timer-text');
        const completionMessage = document.getElementById('completion-message');
        
        if (timerText) {
            timerText.textContent = '00:00';
        }
        
        if (completionMessage) {
            completionMessage.style.display = 'none';
        }
    }

    updateTimerDisplay() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerText = document.getElementById('timer-text');
        if (timerText) {
            timerText.textContent = formattedTime;
        }
    }

    completePuzzle() {
        if (!this.puzzleCompleted) {
            this.puzzleCompleted = true;
            this.stopTimer();
            
/*            const completionMessage = document.getElementById('completion-message');
            if (completionMessage) {
                completionMessage.style.display = 'inline';
            }
*/        }
    }

    attachEventListeners() {
        // Add event listeners to all cells
        this.cells.forEach((cell, index) => {
            cell.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
                
                // Start timer on first input (after value is set)
                if (e.target.value && !this.timerStarted && !this.puzzleCompleted) {
                    this.startTimer();
                }
                
                this.updateAllSums();
                this.validateCornerWords();
                this.checkAllSumsCorrect();

            });
            
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.focusNextCell(index);
                } else if (e.key === 'Backspace' && e.target.value === '') {
                    this.focusPreviousCell(index);
                }
            });
        });

        // Reset button
        document.getElementById('reset-button').addEventListener('click', () => {
            this.resetPuzzle();
        });

        // Reveal button
        document.getElementById('reveal-button').addEventListener('click', () => {
            this.revealWord();
        });

        // Final word input - auto-check when 9 letters entered
        document.getElementById('final-word').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            if (e.target.value.length === 9) {
                this.checkWordFeedback(e.target.value);
            } else {
                this.clearWordFeedback();
            }
        });

        // Navigation buttons
        document.getElementById('prev-day-btn').addEventListener('click', () => {
            this.navigateToPuzzle(1); // Go to previous day (older puzzle)
        });

        document.getElementById('next-day-btn').addEventListener('click', () => {
            this.navigateToPuzzle(-1); // Go to next day (newer puzzle)
        });
    }

    focusNextCell(currentIndex) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < 9) {
            this.cells[nextIndex].focus();
        }
    }

    focusPreviousCell(currentIndex) {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            this.cells[prevIndex].focus();
        }
    }

    updateAllSums() {
        this.updateRowSums();
        this.updateColSums();
    }

    updateRowSums() {
        for (let row = 0; row < 3; row++) {
            let sum = 0;
            for (let col = 0; col < 3; col++) {
                const cellIndex = row * 3 + col;
                const cellValue = this.cells[cellIndex].value;
                if (cellValue) {
                    sum += this.getLetterValue(cellValue);
                }
            }
            
            const sumDisplay = document.getElementById(`row-${row}`);
            const target = this.targetRowSums[row];
            sumDisplay.textContent = `${sum}/${target}`;
 
            // Style based on correctness
            sumDisplay.classList.remove('correct', 'incorrect');
            if (sum === target) {
                sumDisplay.classList.add('correct');
            } else if (sum > 0) {
                sumDisplay.classList.add('incorrect');
            }

            //sumDisplay.classList.toggle('correct', sum === target);
        }
        return true;
    }

    updateColSums() {
        for (let col = 0; col < 3; col++) {
            let sum = 0;
            for (let row = 0; row < 3; row++) {
                const cellIndex = row * 3 + col;
                const cellValue = this.cells[cellIndex].value;
                if (cellValue) {
                    sum += this.getLetterValue(cellValue);
                }
            }
            
            const sumDisplay = document.getElementById(`col-${col}`);
            const target = this.targetColSums[col];
            sumDisplay.textContent = `${sum}/${target}`;
           // Style based on correctness
            sumDisplay.classList.remove('correct', 'incorrect');
            if (sum === target) {
                sumDisplay.classList.add('correct');
            } else if (sum > 0) {
                sumDisplay.classList.add('incorrect');
            }

            //sumDisplay.classList.toggle('correct', sum === target);
        }
        return true;
    }

    getLetterValue(letter) {
        return letter.charCodeAt(0) - 64; // A=1, B=2, etc.
    }

    validateCornerWords() {
        const corners = [
            [0, 1, 3, 4], // Top-left
            [1, 2, 4, 5], // Top-right
            [3, 4, 6, 7], // Bottom-left
            [4, 5, 7, 8]  // Bottom-right
        ];

        corners.forEach(corner => {
            const word = corner.map(index => this.cells[index].value).join('');
            if (word.length === 4) {
                const isValid = this.givenWords.includes(word);
                corner.forEach(index => {
                    this.cells[index].classList.toggle('corner', isValid);
                });
            }
        });
    }


    checkAllSumsCorrect() {
        const rowSumsCorrect = this.targetRowSums.every((target, index) => {
            let sum = 0;
            for (let col = 0; col < 3; col++) {
                const cellIndex = index * 3 + col;
                const cellValue = this.cells[cellIndex].value;
                if (cellValue) {
                    sum += this.getLetterValue(cellValue);
                }
            }
            return sum === target;
        });

        const colSumsCorrect = this.targetColSums.every((target, index) => {
            let sum = 0;
            for (let row = 0; row < 3; row++) {
                const cellIndex = row * 3 + index;
                const cellValue = this.cells[cellIndex].value;
                if (cellValue) {
                    sum += this.getLetterValue(cellValue);
                }
            }
            return sum === target;
        });

        const gridComplete = rowSumsCorrect && colSumsCorrect;
        if(gridComplete) {
//            console.log('grid complete');
            this.stopTimer();
            const completionMessage = document.getElementById('completion-message');
            if (completionMessage) {
                completionMessage.style.display = 'inline';
            }
       }
 
        return gridComplete;
    }

    getCurrentGridWord() {
        // Get the current 9-letter word from the grid
        return this.cells.map(cell => cell.value).join('');
    }

    checkWordFeedback(word) {
        const wordFeedback = document.getElementById('word-feedback');
        
        if (word === this.correctSolution) {
            wordFeedback.textContent = 'Success';
            wordFeedback.className = 'word-feedback success';
            
            // Complete the puzzle and stop the timer
            this.completePuzzle();
        } else {
            wordFeedback.textContent = 'Sorry, incorrect';
            wordFeedback.className = 'word-feedback error';
        }
    }

    clearWordFeedback() {
        const wordFeedback = document.getElementById('word-feedback');
        wordFeedback.textContent = '';
        wordFeedback.className = 'word-feedback';
    }

    revealWord() {
        const finalWordInput = document.getElementById('final-word');
        const feedback = document.getElementById('feedback');
        //console.log('in reveal word');
        // Clear previous feedback
        feedback.className = 'feedback';
        
        // Check if grid is complete
        const gridWord = this.getCurrentGridWord();
        const hasEmptyCells = this.cells.some(cell => cell.value.trim() === '');
        if (gridWord.length !== 9 || hasEmptyCells) {
            feedback.textContent = 'Please fill in all grid cells first!';
            feedback.classList.add('error');
            return;
            }
            else{
                feedback.textContent = '';
                feedback.classList.remove('error');
                //return;
            }
        //}
        
        // Check if sums are correct
        if (!this.checkAllSumsCorrect()) {
            feedback.textContent = 'Grid sums don\'t match the targets. Keep working on the arrangement!';
            feedback.classList.add('warning');
            return;
        }
        
        // Check if all corners contain valid words
        const corners = [
            [0, 1, 3, 4], // Top-left
            [1, 2, 4, 5], // Top-right
            [3, 4, 6, 7], // Bottom-left
            [4, 5, 7, 8]  // Bottom-right
        ];
        
        //console.log('given words alpha',this.givenWordsAlpha);
        const allCornersValid = corners.every(corner => {
            const word = corner.map(index => this.cells[index].value).sort().join('');
            
            //console.log('word ',word)
            return this.givenWordsAlpha.includes(word);
        });
        
        if (!allCornersValid) {
            feedback.textContent = 'Not all corners contain valid words from the given set!';
            feedback.classList.add('error');
            return;
        }
        
        // Reveal the word
        finalWordInput.value = this.correctSolution;
        this.clearWordFeedback();
    }

    resetPuzzle() {
        // Reset timer
        this.resetTimer();
        
        // Clear all cells
        this.cells.forEach(cell => {
            cell.value = '';
        });
        
        // Clear final word input
        document.getElementById('final-word').value = '';
        
        // Clear feedback
        const feedback = document.getElementById('feedback');
        feedback.textContent = '';
        feedback.className = 'feedback';
        
        // Clear word feedback
        this.clearWordFeedback();
        
        // Update sums
        this.updateAllSums();
        
        // Focus first cell
        this.cells[0].focus();
    }

}

// API Functions
async function fetchWeeklyPuzzles() {
    try {
        //const response = await fetch('http://localhost:3000/api/puzzles/week?level=CL');
        const response = await fetch('https://gramgrid-api-production.up.railway.app/api/puzzles/week?level=CL');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API returned puzzles:', data.puzzles.length);
        
        // Use fallback only if no puzzles returned
        if (data.puzzles.length === 0) {
            console.log('Using fallback due to no API data');
            return getDefaultPuzzle();
        }
        
        return data.puzzles;
    } catch (error) {
        console.error('Error fetching weekly puzzles:', error);
        return getDefaultPuzzle(); // Fallback to default puzzle
    }
}


function getDefaultPuzzle() {
    // Fallback puzzle data in case API is unavailable
    const today = new Date();
    const puzzles = [];
    
    // Create 4 test puzzles (today + 3 previous days) for testing navigation
    for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        puzzles.push({
            date: date.toISOString().split('T')[0],
            level: 'CL',
            puzzle: {
                words: [
                    { word: 'SOFT', letters: ['S', 'O', 'F', 'T'], values: [19, 15, 6, 20] },
                    { word: 'RIOT', letters: ['R', 'I', 'O', 'T'], values: [18, 9, 15, 20] },
                    { word: 'WORN', letters: ['W', 'O', 'R', 'N'], values: [23, 15, 18, 14] },
                    { word: 'NODS', letters: ['N', 'O', 'D', 'S'], values: [14, 15, 4, 19] }
                ],
                targets: {
                    rows: [35, 52, 41],
                    cols: [29, 49, 50]
                },
                solution: 'SNOWDRIFT'
            }
        });
    }
    
    console.log('Using fallback puzzles:', puzzles.map(p => p.date));
    return puzzles;
}

async function loadTodaysPuzzle() {
    try {
        const puzzles = await fetchWeeklyPuzzles();
        return puzzles;
    } catch (error) {
        console.error('Error loading puzzle:', error);
        return getDefaultPuzzle();
    }
}

// Popup functionality - standalone functions
function showHowToPlayPopup() {
    const popup = document.getElementById('how-to-play-popup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

function hideHowToPlayPopup() {
    const popup = document.getElementById('how-to-play-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Load weekly puzzles and initialize the puzzle
    const weeklyPuzzles = await loadTodaysPuzzle();
    
    if (weeklyPuzzles.length > 0) {
        // Extract the puzzle data - could be .puzzle or ["puzzle-data"]
        const puzzleData = weeklyPuzzles[0].puzzle || weeklyPuzzles[0]['puzzle-data'];
        
        const puzzle = new WordGridPuzzle(puzzleData);
        
        // Set the weekly puzzles for navigation
        puzzle.setWeeklyPuzzles(weeklyPuzzles);
        puzzle.updatePuzzleTitle();
    }
    
    // Setup popup functionality
    const howToPlayLink = document.getElementById('how-to-play-link');
    const closeButton = document.getElementById('close-popup');
    const popup = document.getElementById('how-to-play-popup');
    
    // Open popup when link is clicked
    if (howToPlayLink) {
        howToPlayLink.addEventListener('click', function(e) {
            e.preventDefault();
            showHowToPlayPopup();
        });
    }
    
    // Close popup when close button is clicked
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            hideHowToPlayPopup();
        });
    }
    
    // Close popup when clicking outside
    if (popup) {
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                hideHowToPlayPopup();
            }
        });
    }
    
    // Close popup with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideHowToPlayPopup();
        }
    });
});