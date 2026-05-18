/**
 * Autocomplete dropdown manager module for the Map Quizlet application.
 * Handles query matching, character bolding, keyboard enter selection, and click-away close states.
 */
export class Autocomplete {
    /**
     * @param {HTMLInputElement} inputEl - The text guess input element.
     * @param {HTMLElement} dropdownEl - The suggestion list container element.
     * @param {Function} getMatchesCallback - Callback to query valid matching configuration items.
     * @param {Function} onSelectCallback - Callback when a specific target item is clicked/chosen.
     * @param {Function} onSubmitCallback - Callback when Enter is hit to run answer check submissions.
     */
    constructor(inputEl, dropdownEl, getMatchesCallback, onSelectCallback, onSubmitCallback) {
        this.inputEl = inputEl;
        this.dropdownEl = dropdownEl;
        this.getMatchesCallback = getMatchesCallback;
        this.onSelectCallback = onSelectCallback;
        this.onSubmitCallback = onSubmitCallback;

        this.bindEvents();
    }

    /**
     * Renders matched suggestions inside the dropdown wrapper.
     * Bolds character ranges that match the user's prefix query.
     * @param {Array} matches - Matching list of configuration items.
     * @param {string} query - The active input search string.
     */
    render(matches, query) {
        this.close();
        if (matches.length === 0) return;

        this.dropdownEl.classList.remove('hidden');
        
        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-100 cursor-pointer text-slate-700";
            
            // Character bold formatting helpers
            let nameHtml;
            if (item.name.toLowerCase().startsWith(query.toLowerCase())) {
                nameHtml = `<strong>${item.name.substr(0, query.length)}</strong>${item.name.substr(query.length)}`;
            } else {
                nameHtml = item.name;
            }

            let idBadgeHtml;
            if (item.id.toLowerCase().startsWith(query.toLowerCase())) {
                idBadgeHtml = `<strong>${item.id.substr(0, query.length)}</strong>${item.id.substr(query.length)}`;
            } else {
                idBadgeHtml = item.id;
            }

            div.innerHTML = `
                <span>${nameHtml}</span>
                <span class="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase tracking-wider">${idBadgeHtml}</span>`;

            div.dataset.value = item.name;
            div.dataset.id = item.id;

            div.addEventListener('click', () => {
                this.inputEl.value = item.name;
                this.close();
                this.inputEl.focus();
                if (this.onSelectCallback) {
                    this.onSelectCallback(item);
                }
            });

            this.dropdownEl.appendChild(div);
        });
    }

    /**
     * Clears dropdown HTML and hides container wrapper.
     */
    close() {
        this.dropdownEl.innerHTML = '';
        this.dropdownEl.classList.add('hidden');
    }

    /**
     * Binds typing key hooks, enter keystroke captures, and click-away hides.
     */
    bindEvents() {
        this.inputEl.addEventListener('input', () => {
            const val = this.inputEl.value;
            this.close();
            if (!val) return;

            const matches = this.getMatchesCallback(val);
            this.render(matches, val);
        });

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstItem = this.dropdownEl.querySelector('div');
                const isListVisible = !this.dropdownEl.classList.contains('hidden');

                if (isListVisible && firstItem && !firstItem.hasAttribute('data-disabled')) {
                    e.preventDefault();
                    const suggestion = firstItem.dataset.value;
                    const suggestionId = firstItem.dataset.id;
                    const currentVal = this.inputEl.value.trim().toLowerCase();

                    if (currentVal === suggestion.toLowerCase() || currentVal === suggestionId.toLowerCase()) {
                        this.inputEl.value = suggestion;
                        this.close();
                        if (this.onSubmitCallback) this.onSubmitCallback();
                    } else {
                        this.inputEl.value = suggestion;
                        this.close();
                    }
                } else {
                    if (this.onSubmitCallback) this.onSubmitCallback();
                }
            }
        });

        // Close if clicking outside of input or dropdown fields
        document.addEventListener('click', (e) => {
            if (e.target !== this.inputEl && e.target !== this.dropdownEl) {
                this.close();
            }
        });
    }
}
