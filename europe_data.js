export const quizConfig = {
    title: "Europe Countries Quiz",
    flag: "🇪🇺",
    map: {
        viewBox: "0 0 600 600",
        labelField: "id",
        zoomSettings: {
            smallThreshold: 50,
            largeThreshold: 150,
            smallScale: 3.0,
            mediumScale: 2.0,
            largeScale: 1.2
        }
    },
    texts: {
        noGuessesPlaceholder: "No countries guessed yet",
        itemsToLearn: "Countries to Learn",
        noReviewPlaceholder: "No countries to review yet",
        selectItem: "Select Country",
        inputPlaceholder: "Type country name here...",
        playAgain: "Play Again (All Countries)",
        reviewWrong: "Review Wrong Countries",
        scoreCorrectLabel: "Correct",
        scoreWrongLabel: "Incorrect",
        scoreLeftLabel: "Remaining",
        gameOverTitle: "Europe Quiz Complete!",
        gameOverDescription: "Fantastic! You successfully identified {correct} countries with {wrong} errors."
    },
    items: [
        { id: "FR", name: "France", d: "M 100 100 L 300 100 L 300 300 L 100 300 Z" },
        { id: "DE", name: "Germany", d: "M 320 100 L 520 100 L 520 300 L 320 300 Z" },
        { id: "IT", name: "Italy", d: "M 210 320 L 310 320 L 310 520 L 210 520 Z" }
    ]
};
