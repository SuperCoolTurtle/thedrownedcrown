"use strict";


/* =========================================
   THE DROWNED CROWN
   GLOSSARY SYSTEM
========================================= */


/* =========================================
   ELEMENTS
========================================= */

const glossarySearch =
    document.getElementById(
        "glossarySearch"
    );

const categoryFilters =
    document.getElementById(
        "categoryFilters"
    );

const glossaryList =
    document.getElementById(
        "glossaryList"
    );

const resultsCount =
    document.getElementById(
        "resultsCount"
    );

const noResults =
    document.getElementById(
        "noResults"
    );

const spoilerButton =
    document.getElementById(
        "spoilerButton"
    );


/* ENTRY WINDOW */

const entryOverlay =
    document.getElementById(
        "entryOverlay"
    );

const closeEntry =
    document.getElementById(
        "closeEntry"
    );

const entryCategory =
    document.getElementById(
        "entryCategory"
    );

const entryTitle =
    document.getElementById(
        "entryTitle"
    );

const entryPronunciation =
    document.getElementById(
        "entryPronunciation"
    );

const pronunciationText =
    document.getElementById(
        "pronunciationText"
    );

const pronounceEntry =
    document.getElementById(
        "pronounceEntry"
    );

const entryDescription =
    document.getElementById(
        "entryDescription"
    );

const entryAliases =
    document.getElementById(
        "entryAliases"
    );


/* =========================================
   STATE
========================================= */

let selectedCategory =
    "All";

let currentEntry =
    null;


/*
    SPOILER MODE:

    "progress" =
        Only show information the reader
        has reached.

    "all" =
        Show all glossary entries.
*/

let spoilerMode =
    localStorage.getItem(
        "drownedCrownSpoilerMode"
    ) || "progress";


/* =========================================
   READER PROGRESS
========================================= */

function getReaderProgressLevel() {

    const lastChapter =
        localStorage.getItem(
            "drownedCrownLastChapter"
        );


    if (!lastChapter) {

        return 0;
    }


    const chapter =
        getChapterProgress(
            lastChapter
        );


    return chapter;
}


/* =========================================
   CHAPTER PROGRESS MAPPING
========================================= */

function getChapterProgress(
    chapterId
) {

    if (
        chapterId ===
        "prologue"
    ) {

        return 1;
    }


    if (
        chapterId ===
        "chapter-01"
    ) {

        return 2;
    }


    return 0;
}


/* =========================================
   LOCK STATUS
========================================= */

function isEntryLocked(entry) {

    if (
        spoilerMode ===
        "all"
    ) {

        return false;
    }


    const progress =
        getReaderProgressLevel();


    return (
        entry.spoilerLevel >
        progress
    );
}


/* =========================================
   CATEGORIES
========================================= */

function buildCategoryFilters() {

    const categories = [
        "All",
        ...getGlossaryCategories()
    ];


    categoryFilters.innerHTML =
        "";


    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "category-button";


            button.textContent =
                category;


            if (
                category ===
                selectedCategory
            ) {

                button.classList.add(
                    "active"
                );
            }


            button.addEventListener(
                "click",
                () => {

                    selectedCategory =
                        category;

                    buildCategoryFilters();

                    renderGlossary();

                }
            );


            categoryFilters.appendChild(
                button
            );

        }
    );
}


/* =========================================
   SEARCH
========================================= */

function entryMatchesSearch(
    entry,
    search
) {

    if (!search) {

        return true;
    }


    const aliases =
        entry.aliases
            .join(" ");


    const searchableText = `
        ${entry.term}
        ${entry.category}
        ${entry.short}
        ${entry.description}
        ${aliases}
    `.toLowerCase();


    return searchableText.includes(
        search.toLowerCase()
    );
}


/* =========================================
   FILTER
========================================= */

function getFilteredEntries() {

    const search =
        glossarySearch
            .value
            .trim();


    return GLOSSARY.filter(
        entry => {

            const matchesCategory =
                selectedCategory ===
                "All" ||
                entry.category ===
                selectedCategory;


            const matchesSearch =
                entryMatchesSearch(
                    entry,
                    search
                );


            return (
                matchesCategory &&
                matchesSearch
            );

        }
    ).sort(
        (a, b) =>
            a.term.localeCompare(
                b.term
            )
    );
}


/* =========================================
   RENDER
========================================= */

function renderGlossary() {

    const entries =
        getFilteredEntries();


    glossaryList.innerHTML =
        "";


    resultsCount.textContent =
        `${entries.length} ${
            entries.length === 1
                ? "entry"
                : "entries"
        }`;


    if (
        entries.length === 0
    ) {

        glossaryList.hidden =
            true;

        noResults.hidden =
            false;

        return;
    }


    glossaryList.hidden =
        false;

    noResults.hidden =
        true;


    entries.forEach(
        entry => {

            const locked =
                isEntryLocked(
                    entry
                );


            const card =
                document.createElement(
                    "button"
                );


            card.className =
                "glossary-card";


            if (locked) {

                card.classList.add(
                    "locked"
                );
            }


            if (locked) {

                card.innerHTML = `
                    <span class="card-category">
                        ${entry.category}
                    </span>

                    <h2>
                        Hidden
                    </h2>

                    <p>
                        Continue reading to
                        discover this entry.
                    </p>

                    <span class="card-arrow">
                        ◆
                    </span>
                `;

            } else {

                card.innerHTML = `
                    <span class="card-category">
                        ${entry.category}
                    </span>

                    <h2>
                        ${entry.term}
                    </h2>

                    <p>
                        ${entry.short}
                    </p>

                    <span class="card-arrow">
                        →
                    </span>
                `;

            }


            card.addEventListener(
                "click",
                () => {

                    if (locked) {

                        return;
                    }


                    openGlossaryEntry(
                        entry
                    );

                }
            );


            glossaryList.appendChild(
                card
            );

        }
    );
}


/* =========================================
   OPEN ENTRY
========================================= */

function openGlossaryEntry(
    entry
) {

    currentEntry =
        entry;


    entryCategory.textContent =
        entry.category;


    entryTitle.textContent =
        entry.term;


    entryDescription.textContent =
        entry.description;


    const pronunciation =
        getPronunciation(
            entry.term
        );


    if (pronunciation) {

        pronunciationText.textContent =
            pronunciation.speech;

        entryPronunciation.hidden =
            false;

    } else if (
        entry.pronunciation
    ) {

        pronunciationText.textContent =
            entry.pronunciation;

        entryPronunciation.hidden =
            false;

    } else {

        pronunciationText.textContent =
            "Pronunciation not yet recorded";

        entryPronunciation.hidden =
            false;

    }


    if (
        entry.aliases.length
    ) {

        entryAliases.innerHTML = `
            <strong>
                Also known as:
            </strong>
            ${entry.aliases.join(", ")}
        `;

        entryAliases.hidden =
            false;

    } else {

        entryAliases.hidden =
            true;
    }


    entryOverlay.classList.add(
        "open"
    );


    entryOverlay.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================
   CLOSE ENTRY
========================================= */

function closeGlossaryEntry() {

    entryOverlay.classList.remove(
        "open"
    );


    entryOverlay.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();
    }


    currentEntry =
        null;
}


closeEntry.addEventListener(
    "click",
    closeGlossaryEntry
);


entryOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            entryOverlay
        ) {

            closeGlossaryEntry();
        }

    }
);


/* =========================================
   PRONOUNCE ENTRY
========================================= */

pronounceEntry.addEventListener(
    "click",
    () => {

        if (!currentEntry) {

            return;
        }


        if (
            !(
                "speechSynthesis"
                in window
            )
        ) {

            return;
        }


        window.speechSynthesis.cancel();


        const pronunciation =
            getPronunciation(
                currentEntry.term
            );


        const speechText =
            pronunciation
                ? pronunciation.speech
                : (
                    currentEntry
                        .pronunciation ||
                    currentEntry.term
                );


        const utterance =
            new SpeechSynthesisUtterance(
                speechText
            );


        /*
            Reuse the reader's saved voice
            whenever possible.
        */

        const savedVoice =
            localStorage.getItem(
                "drownedCrownVoice"
            );


        const voices =
            window.speechSynthesis
                .getVoices();


        const matchingVoice =
            voices.find(
                voice =>
                    voice.name ===
                    savedVoice
            );


        if (matchingVoice) {

            utterance.voice =
                matchingVoice;
        }


        utterance.rate =
            Number(
                localStorage.getItem(
                    "drownedCrownSpeechRate"
                )
            ) || 1;


        window.speechSynthesis.speak(
            utterance
        );

    }
);


/* =========================================
   SPOILER MODE
========================================= */

function updateSpoilerButton() {

    if (
        spoilerMode ===
        "progress"
    ) {

        spoilerButton.textContent =
            "Spoilers: Reader Progress";

    } else {

        spoilerButton.textContent =
            "Spoilers: Show All";
    }
}


spoilerButton.addEventListener(
    "click",
    () => {

        if (
            spoilerMode ===
            "progress"
        ) {

            spoilerMode =
                "all";

        } else {

            spoilerMode =
                "progress";
        }


        localStorage.setItem(
            "drownedCrownSpoilerMode",
            spoilerMode
        );


        updateSpoilerButton();

        renderGlossary();

    }
);


/* =========================================
   SEARCH EVENT
========================================= */

glossarySearch.addEventListener(
    "input",
    renderGlossary
);


/* =========================================
   KEYBOARD
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeGlossaryEntry();
        }

    }
);


/* =========================================
   START
========================================= */

function startGlossary() {

    buildCategoryFilters();

    updateSpoilerButton();

    renderGlossary();
}


startGlossary();