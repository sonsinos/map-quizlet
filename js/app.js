import { Game } from './game.js';
import { MapManager } from './map.js';
import { Autocomplete } from './autocomplete.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Dynamic load of Quiz configuration depending on URL query strings
    const urlParams = new URLSearchParams(window.location.search);
    const quizName = urlParams.get('quiz') || 'us';
    const modulePath = `../${quizName}_data.js`;

    let quizConfig;
    try {
        const module = await import(modulePath);
        quizConfig = module.quizConfig;
    } catch (e) {
        console.error("Failed to dynamically load quiz configuration, showing error fallback.", e);
        alert(`Failed to load quiz "${quizName}". Falling back to default quiz.`);
        const module = await import("../us_data.js");
        quizConfig = module.quizConfig;
    }

    // DOM Elements Selection Caching
    const elements = {
        mapSvg: document.getElementById('map-svg'),
        mapContent: document.getElementById('map-content'),
        mapContainer: document.getElementById('map-container'),
        inputEl: document.getElementById('guess-input'),
        submitBtn: document.getElementById('submit-btn'),
        feedbackContainer: document.getElementById('feedback-container'),
        feedbackTitle: document.getElementById('feedback-title'),
        feedbackMsg: document.getElementById('feedback-message'),
        scoreCorrect: document.getElementById('score-correct'),
        scoreWrong: document.getElementById('score-wrong'),
        scoreLeft: document.getElementById('score-left'),
        inputArea: document.getElementById('input-area'),
        gameOverArea: document.getElementById('game-over-area'),
        finalScore: document.getElementById('final-score'),
        listRemaining: document.getElementById('list-remaining'),
        listCompleted: document.getElementById('list-completed'),
        autocompleteList: document.getElementById('autocomplete-list'),
        historyPanel: document.getElementById('history-panel'),
        scoreToggle: document.getElementById('score-toggle'),
        historyPlaceholder: document.getElementById('history-placeholder'),
        learnSectionHeader: document.getElementById('learn-section-header'),
        incorrectPlaceholder: document.getElementById('incorrect-placeholder'),
        listIncorrect: document.getElementById('list-incorrect'),
        sidebarHeader: document.getElementById('sidebar-header'),
        gameOverTitle: document.getElementById('game-over-title'),
        btnPlayAgain: document.getElementById('btn-play-again'),
        btnReviewGame: document.getElementById('btn-review-game'),
        headerTitle: document.getElementById('header-title'),
        favicon: document.getElementById('favicon')
    };

    // Instantiate specialized managers
    const game = new Game();
    const mapManager = new MapManager(elements.mapSvg, elements.mapContent, elements.mapContainer);
    
    // Autocomplete setup callback logic
    const getMatches = (val) => {
        return quizConfig.items.filter(item => 
            (item.name.toLowerCase().startsWith(val.toLowerCase()) ||
            item.id.toLowerCase().startsWith(val.toLowerCase())) &&
            !game.itemStatuses[item.name.toLowerCase()]
        ).sort((a, b) => a.name.localeCompare(b.name));
    };

    const autocomplete = new Autocomplete(
        elements.inputEl,
        elements.autocompleteList,
        getMatches,
        (item) => {
            game.lastSelectionWasSearchbox = false;
        },
        () => {
            checkGuess();
        }
    );

    let feedbackTimeout;

    // Dynamic SEO & Favicon UI mapping
    function applyUIConfig() {
        document.title = quizConfig.title;
        elements.headerTitle.innerHTML = `${quizConfig.flag} <span class="hidden sm:inline"> ${quizConfig.title}</span>`;
        elements.historyPlaceholder.textContent = quizConfig.texts.noGuessesPlaceholder;
        elements.learnSectionHeader.textContent = quizConfig.texts.itemsToLearn;
        elements.incorrectPlaceholder.textContent = quizConfig.texts.noReviewPlaceholder;
        elements.sidebarHeader.textContent = quizConfig.texts.selectItem;
        elements.inputEl.placeholder = quizConfig.texts.inputPlaceholder;
        elements.gameOverTitle.textContent = quizConfig.texts.gameOverTitle || "Quiz Complete!";
        elements.btnPlayAgain.textContent = quizConfig.texts.playAgain;
        
        document.getElementById('score-correct-label').textContent = quizConfig.texts.scoreCorrectLabel || "Correct";
        document.getElementById('score-wrong-label').textContent = quizConfig.texts.scoreWrongLabel || "Faulty";
        document.getElementById('score-left-label').textContent = quizConfig.texts.scoreLeftLabel || "To Go";

        if (elements.favicon) {
            elements.favicon.setAttribute('href', quizConfig.favicon || 'favicon.png');
        }
    }

    // Scoreboards updates mapping
    function updateScoreboard() {
        elements.scoreCorrect.textContent = game.scoreCorrect;
        elements.scoreWrong.textContent = game.scoreWrong;
        elements.scoreLeft.textContent = game.getRemainingCount();
    }

    // Initialize list item columns
    function initList() {
        elements.listRemaining.innerHTML = '';
        elements.listCompleted.innerHTML = '';
        elements.listCompleted.appendChild(elements.historyPlaceholder);
        elements.historyPlaceholder.classList.remove('hidden');
        
        const sortedItems = [...game.remainingItems].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedItems.forEach(item => {
            const btn = document.createElement('button');
            btn.id = `btn-${item.id}`;
            btn.className = "w-full px-4 py-2 hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-0 text-slate-700 font-medium text-sm flex justify-between items-center";
            btn.innerHTML = `
                <span>${item.name}</span>
                <span class="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase tracking-wider">${item.id}</span>`;
            btn.onclick = () => {
                if (game.gameActive) {
                    checkGuess(item.name);
                }
            };
            elements.listRemaining.appendChild(btn);
        });
    }

    // Relocating items from remaining to guess completed columns
    function moveItemToCompleted(item, isCorrect) {
        elements.historyPlaceholder.classList.add('hidden');

        const btn = document.getElementById(`btn-${item.id}`);
        if (btn) btn.remove();

        const completedItem = document.createElement('div');
        let classes = "px-3 py-2 rounded border text-sm font-bold flex justify-between items-center";
        
        if (isCorrect) {
            classes += " bg-green-50 border-green-200 text-green-700";
            completedItem.innerHTML = `
                <span>${item.name}</span>
                <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded border border-green-200 uppercase tracking-wider">${item.id}</span>
                    <span class="text-xs uppercase">✓</span>
                </div>`;
        } else {
            classes += " bg-red-50 border-red-200 text-red-700";
            completedItem.innerHTML = `
                <span>${item.name}</span>
                <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded border border-red-200 uppercase tracking-wider">${item.id}</span>
                    <span class="text-xs uppercase">✗</span>
                </div>`;
        }
        completedItem.className = classes;

        const existingItems = Array.from(elements.listCompleted.children).filter(el => el.id !== 'history-placeholder');
        const nextItem = existingItems.find(el => el.textContent.trim().split(' ')[0].localeCompare(item.name) > 0);
        
        if (nextItem) {
            elements.listCompleted.insertBefore(completedItem, nextItem);
        } else {
            elements.listCompleted.appendChild(completedItem);
        }
    }

    // Dynamic learning lists mapping
    function addItemToLearn(item) {
        const card = document.getElementById(`learn-${item.id}`);
        if (card) return; // Avoid duplicates

        elements.incorrectPlaceholder.classList.add('hidden');

        const learnItem = document.createElement('div');
        learnItem.id = `learn-${item.id}`;
        learnItem.className = "px-3 py-2 rounded border border-slate-200 bg-white text-slate-700 text-xs font-bold flex justify-between items-center shadow-sm hover:border-red-200 transition-colors";
        learnItem.innerHTML = `
            <span>${item.name}</span>
            <span class="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase tracking-wider">${item.id}</span>`;

        const container = elements.listIncorrect;
        const existingItems = Array.from(container.children).filter(el => el.id !== 'incorrect-placeholder');
        const nextItem = existingItems.find(el => el.querySelector('span').textContent.localeCompare(item.name) > 0);

        if (nextItem) {
            container.insertBefore(learnItem, nextItem);
        } else {
            container.appendChild(learnItem);
        }
    }

    // Triggers banner animations during check results
    function showFeedback(isCorrect, name) {
        elements.feedbackContainer.classList.remove('hidden');
        if (feedbackTimeout) clearTimeout(feedbackTimeout);

        if (isCorrect) {
            elements.feedbackContainer.classList.remove('border-red-200', 'bg-red-50');
            elements.feedbackContainer.classList.add('border-green-200', 'bg-green-50');
            elements.feedbackTitle.textContent = "Correct!";
            elements.feedbackTitle.className = "text-lg font-bold text-green-700";
            elements.feedbackMsg.textContent = `${name} is correct.`;
        } else {
            elements.feedbackContainer.classList.remove('border-green-200', 'bg-green-50');
            elements.feedbackContainer.classList.add('border-red-200', 'bg-red-50');
            elements.feedbackTitle.textContent = "Wrong!";
            elements.feedbackTitle.className = "text-lg font-bold text-red-700";
            elements.feedbackMsg.textContent = `That was ${name}.`;
        }

        feedbackTimeout = setTimeout(() => {
            elements.feedbackContainer.classList.add('hidden');
        }, 3000);
    }

    // Orchestrate new round selects
    function nextRound() {
        const currentTarget = game.nextRound();
        if (!currentTarget) {
            endGame();
            return;
        }

        mapManager.highlight(currentTarget.id);
        updateScoreboard();
        mapManager.autoZoomToItem(currentTarget, quizConfig);
        
        elements.inputEl.value = '';
        if (game.lastSelectionWasSearchbox) {
            elements.inputEl.focus();
        }
    }

    // Check guess submit triggers
    function checkGuess(manualGuess = null) {
        autocomplete.close();
        game.lastSelectionWasSearchbox = !manualGuess;

        const guessVal = manualGuess || elements.inputEl.value;
        const result = game.checkAnswer(guessVal, quizConfig);

        if (result.status === 'invalid') {
            elements.inputEl.classList.add('shake');
            setTimeout(() => elements.inputEl.classList.remove('shake'), 500);
            return;
        }

        if (result.status === 'inactive') {
            return;
        }

        elements.feedbackContainer.classList.add('hidden');
        if (feedbackTimeout) clearTimeout(feedbackTimeout);

        const isCorrect = result.status === 'correct';
        mapManager.markResult(result.currentTarget.id, isCorrect);
        mapManager.addLabel(result.currentTarget, quizConfig);
        moveItemToCompleted(result.currentTarget, isCorrect);

        if (isCorrect) {
            if (game.isReviewMode) {
                const card = document.getElementById(`learn-${result.currentTarget.id}`);
                if (card) card.remove();
                if (game.incorrectItems.size === 0) {
                    elements.incorrectPlaceholder.classList.remove('hidden');
                }
            }
            showFeedback(true, result.currentTarget.name);
            setTimeout(nextRound, 1000);
        } else {
            addItemToLearn(result.currentTarget);
            if (result.matchedItem) {
                addItemToLearn(result.matchedItem);
            }

            if (!manualGuess) {
                elements.inputEl.classList.add('shake');
                setTimeout(() => elements.inputEl.classList.remove('shake'), 500);
            }

            showFeedback(false, result.currentTarget.name);
            setTimeout(nextRound, 2500);
        }
    }

    // End game overlay triggers
    function endGame() {
        updateScoreboard();
        elements.inputArea.classList.add('hidden');
        elements.gameOverArea.classList.remove('hidden');
        
        let gameOverDesc = quizConfig.texts.gameOverDescription
            .replace('{correct}', game.scoreCorrect)
            .replace('{wrong}', game.scoreWrong);
        elements.finalScore.textContent = gameOverDesc;
        elements.feedbackContainer.classList.add('hidden');

        if (elements.btnReviewGame) {
            if (game.incorrectItems.size > 0) {
                elements.btnReviewGame.classList.remove('hidden');
                elements.btnReviewGame.textContent = `${quizConfig.texts.reviewWrong} (${game.incorrectItems.size})`;
            } else {
                elements.btnReviewGame.classList.add('hidden');
            }
        }
    }

    // Start/Reset game orchestrator
    function startGame(onlyReview = false) {
        game.start(quizConfig, onlyReview);
        
        if (!onlyReview) {
            elements.listIncorrect.innerHTML = `<div class="text-center text-slate-400 italic text-xs py-2" id="incorrect-placeholder">${quizConfig.texts.noReviewPlaceholder}</div>`;
            elements.incorrectPlaceholder = document.getElementById('incorrect-placeholder');
        }

        updateScoreboard();
        elements.inputArea.classList.remove('hidden');
        elements.gameOverArea.classList.add('hidden');
        elements.feedbackContainer.classList.add('hidden');
        elements.historyPanel.classList.add('hidden');
        elements.scoreToggle.classList.remove('expanded');
        elements.inputEl.value = '';
        elements.inputEl.focus();

        mapManager.clear();
        initList();
        nextRound();
    }

    // Modern JS dynamic Event Listeners mappings
    elements.scoreToggle.addEventListener('click', () => {
        elements.historyPanel.classList.toggle('hidden');
        elements.scoreToggle.classList.toggle('expanded');
    });

    document.getElementById('header-restart-btn').addEventListener('click', () => startGame(false));
    elements.submitBtn.addEventListener('click', () => checkGuess());
    elements.btnPlayAgain.addEventListener('click', () => startGame(false));
    elements.btnReviewGame.addEventListener('click', () => startGame(true));

    // Viewport Zoom Dock click mappings
    document.getElementById('zoom-in').addEventListener('click', () => mapManager.zoom(1.5));
    document.getElementById('zoom-reset').addEventListener('click', () => mapManager.resetZoom());
    document.getElementById('zoom-out').addEventListener('click', () => mapManager.zoom(0.66));

    // Bootstrapping
    applyUIConfig();
    mapManager.drawPaths(quizConfig);
    startGame(false);
});
