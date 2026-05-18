/**
 * Game logic engine for the Map Quizlet application.
 * Manages game state, scoring, target selection, and answer verification.
 */
export class Game {
    constructor() {
        this.reset();
    }

    /**
     * Resets the game state variables.
     */
    reset() {
        this.remainingItems = [];
        this.currentTarget = null;
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.gameActive = false;
        this.itemStatuses = {}; // Stores 'correct' or 'wrong' mapped by lowercased item name
        this.incorrectItems = new Set(); // Tracks IDs of items to review
        this.isReviewMode = false;
        this.lastSelectionWasSearchbox = true;
    }

    /**
     * Starts a new game round.
     * @param {Object} quizConfig - The current quiz configuration.
     * @param {boolean} onlyReview - Whether to only play incorrect/review items.
     */
    start(quizConfig, onlyReview = false) {
        this.isReviewMode = onlyReview;
        this.gameActive = true;
        this.scoreCorrect = 0;
        this.scoreWrong = 0;
        this.itemStatuses = {};
        this.currentTarget = null;
        this.lastSelectionWasSearchbox = true;

        if (onlyReview) {
            this.remainingItems = quizConfig.items.filter(item => this.incorrectItems.has(item.id));
        } else {
            this.remainingItems = [...quizConfig.items];
            this.incorrectItems.clear();
        }
    }

    /**
     * Selects the next random target for the round.
     * @returns {Object|null} The next target item, or null if the game is complete.
     */
    nextRound() {
        if (this.remainingItems.length === 0) {
            this.gameActive = false;
            this.currentTarget = null;
            return null;
        }

        const randomIndex = Math.floor(Math.random() * this.remainingItems.length);
        this.currentTarget = this.remainingItems[randomIndex];
        this.remainingItems.splice(randomIndex, 1);
        return this.currentTarget;
    }

    /**
     * Checks the user's guess.
     * @param {string} userGuess - The name or ID guessed by the user.
     * @param {Object} quizConfig - The quiz configuration containing items.
     * @returns {Object} Object representing verification results.
     */
    checkAnswer(userGuess, quizConfig) {
        if (!this.currentTarget || !this.gameActive) {
            return { status: 'inactive' };
        }

        const cleanGuess = userGuess.trim().toLowerCase();
        const matchedItem = quizConfig.items.find(item => 
            item.name.toLowerCase() === cleanGuess || item.id.toLowerCase() === cleanGuess
        );

        // If guess matches nothing in config, it is invalid (input shake)
        if (!matchedItem) {
            return { status: 'invalid' };
        }

        const correctName = this.currentTarget.name.toLowerCase();
        const isCorrect = matchedItem.name.toLowerCase() === correctName;
        this.gameActive = false; // Temporarily pause rounds during feedback delay

        if (isCorrect) {
            this.scoreCorrect++;
            this.itemStatuses[correctName] = 'correct';

            if (this.isReviewMode && this.incorrectItems.has(this.currentTarget.id)) {
                this.incorrectItems.delete(this.currentTarget.id);
            }

            return {
                status: 'correct',
                currentTarget: this.currentTarget,
                matchedItem,
                scoreLeft: this.remainingItems.length
            };
        } else {
            this.scoreWrong++;
            this.itemStatuses[correctName] = 'wrong';

            // Add target and matched guess to learn list
            this.incorrectItems.add(this.currentTarget.id);
            this.incorrectItems.add(matchedItem.id);

            return {
                status: 'wrong',
                currentTarget: this.currentTarget,
                matchedItem,
                scoreLeft: this.remainingItems.length
            };
        }
    }

    /**
     * Checks if any items remain to be guessed.
     * @returns {number} The number of remaining items.
     */
    getRemainingCount() {
        return this.remainingItems.length + (this.currentTarget ? 1 : 0);
    }
}
