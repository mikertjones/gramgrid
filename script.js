class WordGridPuzzle {
    constructor() {
        this.targetRowSums = [35, 52, 41];
        this.targetColSums = [29, 49, 50];
        this.givenWords = ['SOFT', 'RIOT', 'WORN', 'NODS'];
        this.correctSolution = 'SNOWDRIFT';
        
        this.initializeGrid();
        this.attachEventListeners();
    }

    initializeGrid() {
        this.cells = [];
        for (let i = 0; i < 9; i++) {
            this.cells[i] = document.getElementById(`cell-${i}`);
        }
        this.updateAllSums();
    }

    attachEventListeners() {
        // Add event listeners to all cells
        this.cells.forEach((cell, index) => {
            cell.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
                this.updateAllSums();
                this.validateCornerWords();
            });
            
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.focusNextCell(index);
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

        // Popup functionality is now handled separately outside this class
    }

    getLetterValue(letter) {
        if (!letter || letter === '') return 0;
        return letter.charCodeAt(0) - 64; // A=1, B=2, etc.
    }

    focusNextCell(currentIndex) {
        const nextIndex = (currentIndex + 1) % 9;
        this.cells[nextIndex].focus();
    }

    calculateRowSum(rowIndex) {
        let sum = 0;
        for (let col = 0; col < 3; col++) {
            const cellIndex = rowIndex * 3 + col;
            const letter = this.cells[cellIndex].value;
            sum += this.getLetterValue(letter);
        }
        return sum;
    }

    calculateColSum(colIndex) {
        let sum = 0;
        for (let row = 0; row < 3; row++) {
            const cellIndex = row * 3 + colIndex;
            const letter = this.cells[cellIndex].value;
            sum += this.getLetterValue(letter);
        }
        return sum;
    }

    updateAllSums() {
        // Update row sums
        for (let row = 0; row < 3; row++) {
            const currentSum = this.calculateRowSum(row);
            const targetSum = this.targetRowSums[row];
            const display = document.getElementById(`row-${row}`);
            display.textContent = `${currentSum}/${targetSum}`;
            
            // Style based on correctness
            display.classList.remove('correct', 'incorrect');
            if (currentSum === targetSum) {
                display.classList.add('correct');
            } else if (currentSum > 0) {
                display.classList.add('incorrect');
            }
        }

        // Update column sums
        for (let col = 0; col < 3; col++) {
            const currentSum = this.calculateColSum(col);
            const targetSum = this.targetColSums[col];
            const display = document.getElementById(`col-${col}`);
            display.textContent = `${currentSum}/${targetSum}`;
            
            // Style based on correctness
            display.classList.remove('correct', 'incorrect');
            if (currentSum === targetSum) {
                display.classList.add('correct');
            } else if (currentSum > 0) {
                display.classList.add('incorrect');
            }
        }
    }

    getCornerLetters(corner) {
        // Get the 4 letters from each 2x2 corner
        switch (corner) {
            case 'TL': // Top-left: positions 0,1,3,4
                return [
                    this.cells[0].value,
                    this.cells[1].value,
                    this.cells[3].value,
                    this.cells[4].value
                ];
            case 'TR': // Top-right: positions 1,2,4,5
                return [
                    this.cells[1].value,
                    this.cells[2].value,
                    this.cells[4].value,
                    this.cells[5].value
                ];
            case 'BL': // Bottom-left: positions 3,4,6,7
                return [
                    this.cells[3].value,
                    this.cells[4].value,
                    this.cells[6].value,
                    this.cells[7].value
                ];
            case 'BR': // Bottom-right: positions 4,5,7,8
                return [
                    this.cells[4].value,
                    this.cells[5].value,
                    this.cells[7].value,
                    this.cells[8].value
                ];
        }
    }

    canFormWord(letters, word) {
        const letterCount = {};
        const wordCount = {};
        
        // Count letters available
        letters.forEach(letter => {
            if (letter && letter !== '') {
                letterCount[letter] = (letterCount[letter] || 0) + 1;
            }
        });
        
        // Count letters needed for word
        for (let char of word) {
            wordCount[char] = (wordCount[char] || 0) + 1;
        }
        
        // Check if we have enough of each letter
        for (let char in wordCount) {
            if ((letterCount[char] || 0) < wordCount[char]) {
                return false;
            }
        }
        
        return true;
    }

    validateCornerWords() {
        const corners = ['TL', 'TR', 'BL', 'BR'];
        let validCorners = 0;
        
        corners.forEach(corner => {
            const letters = this.getCornerLetters(corner);
            let foundValidWord = false;
            
            // Check if any of the given words can be formed
            this.givenWords.forEach(word => {
                if (this.canFormWord(letters, word)) {
                    foundValidWord = true;
                }
            });
            
            if (foundValidWord) validCorners++;
        });
        
        return validCorners === 4;
    }

    checkAllSumsCorrect() {
        // Check if all row and column sums are correct
        for (let i = 0; i < 3; i++) {
            if (this.calculateRowSum(i) !== this.targetRowSums[i]) return false;
            if (this.calculateColSum(i) !== this.targetColSums[i]) return false;
        }
        return true;
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
        
        // Check if sums are correct
        if (!this.checkAllSumsCorrect()) {
            feedback.textContent = 'Grid sums don\'t match the targets. Keep working on the arrangement!';
            feedback.classList.add('error');
            return;
        }
        
        // Check if corner words are valid
        if (!this.validateCornerWords()) {
            feedback.textContent = 'Not all corners contain valid words from the given set!';
            feedback.classList.add('error');
            return;
        }
        
        // Reveal the word
        finalWordInput.value = this.correctSolution;
        this.clearWordFeedback();
    }

    resetPuzzle() {
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
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the puzzle
    new WordGridPuzzle();
    
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