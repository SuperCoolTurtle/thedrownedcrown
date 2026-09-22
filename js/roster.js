"use strict";


/* =========================================
   THE DROWNED CROWN
   CHARACTER ROSTER SYSTEM
========================================= */


/* =========================================
   ELEMENTS
========================================= */


const characterSearch =
    document.getElementById(
        "characterSearch"
    );


const povCharacters =
    document.getElementById(
        "povCharacters"
    );


const supportingCharacters =
    document.getElementById(
        "supportingCharacters"
    );


const povSection =
    document.getElementById(
        "povSection"
    );


const supportingSection =
    document.getElementById(
        "supportingSection"
    );


const rosterCount =
    document.getElementById(
        "rosterCount"
    );


const spoilerButton =
    document.getElementById(
        "spoilerButton"
    );


const noResults =
    document.getElementById(
        "noResults"
    );


/* =========================================
   SPOILER MODE
========================================= */


let spoilerMode =
    localStorage.getItem(
        "drownedCrownRosterSpoilerMode"
    ) || "progress";


/* =========================================
   CHAPTER LEVELS
========================================= */


/*
    IMPORTANT:

    This will eventually be replaced by
    automatic chapter numbering.

    For now:

    0 = Has not started
    1 = Prologue
    2 = Chapter One
*/


function getChapterLevel(
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
   FURTHEST READER PROGRESS
========================================= */


function getReaderProgress() {

    const furthest =
        Number(
            localStorage.getItem(
                "drownedCrownFurthestChapter"
            )
        );


    if (
        Number.isFinite(
            furthest
        ) &&
        furthest >= 0
    ) {

        return furthest;
    }


    /*
        Compatibility with the reader
        system we already created.
    */

    const lastChapter =
        localStorage.getItem(
            "drownedCrownLastChapter"
        );


    return getChapterLevel(
        lastChapter
    );
}


/* =========================================
   CHARACTER VISIBILITY
========================================= */


function isCharacterRevealed(
    character
) {

    if (
        spoilerMode ===
        "all"
    ) {

        return true;
    }


    return (
        character.revealLevel <=
        getReaderProgress()
    );
}


/* =========================================
   SEARCH
========================================= */


function characterMatchesSearch(
    character,
    search
) {

    if (!search) {

        return true;
    }


    const searchableText = [

        character.name,

        character.country,

        character.home,

        character.clan,

        character.affiliation,

        character.occupation,

        ...character.family

    ]
        .join(" ")
        .toLowerCase();


    return searchableText.includes(
        search.toLowerCase()
    );
}


/* =========================================
   BUILD LOCATION
========================================= */


function getCharacterLocation(
    character
) {

    if (
        character.home &&
        character.country
    ) {

        return (
            character.home +
            " · " +
            character.country
        );
    }


    if (
        character.home
    ) {

        return character.home;
    }


    if (
        character.country
    ) {

        return character.country;
    }


    return "";
}


/* =========================================
   CREATE DETAIL ROW
========================================= */


function createDetail(
    label,
    value
) {

    if (!value) {

        return "";
    }


    return `
        <div class="character-detail">

            <span class="detail-label">
                ${label}
            </span>

            <span class="detail-value">
                ${value}
            </span>

        </div>
    `;
}


/* =========================================
   CREATE PORTRAIT
========================================= */


function createPortrait(
    character
) {

    if (
        character.image
    ) {

        return `
            <div class="character-portrait">

                <img
                    src="${character.image}"
                    alt="${character.name}"
                >

            </div>
        `;
    }


    return `
        <div
            class="character-portrait"
            aria-hidden="true"
        >

            <div class="portrait-placeholder">
                ◆
            </div>

        </div>
    `;
}


/* =========================================
   CREATE CHARACTER CARD
========================================= */


function createCharacterCard(
    character
) {

    const revealed =
        isCharacterRevealed(
            character
        );


    const article =
        document.createElement(
            "article"
        );


    article.className =
        "character-card";


    if (!revealed) {

        article.classList.add(
            "locked"
        );


        article.innerHTML = `

            <div class="character-identity">

                <span class="character-type">
                    Undiscovered
                </span>

                <h3 class="character-name">
                    Unknown
                </h3>

                <p class="locked-message">
                    Continue reading to reveal
                    this character.
                </p>

            </div>

            <div></div>

            <div
                class="character-portrait"
                aria-hidden="true"
            >

                <div class="portrait-placeholder">
                    ?
                </div>

            </div>

        `;


        return article;
    }


    const typeLabel =
        character.type === "pov"
            ? "POV Character"
            : "Supporting Character";


    const location =
        getCharacterLocation(
            character
        );


    const family =
        character.family.length
            ? character.family.join("<br>")
            : "";


    article.innerHTML = `

        <div class="character-identity">

            <span class="character-type">
                ${typeLabel}
            </span>

            <h3 class="character-name">
                ${character.name}
            </h3>

            ${
                location
                    ? `
                        <p class="character-location">
                            ${location}
                        </p>
                    `
                    : ""
            }

        </div>


        <div class="character-information">

            ${createDetail(
                "Country",
                character.country
            )}

            ${createDetail(
                "Home",
                character.home
            )}

            ${createDetail(
                "Clan",
                character.clan
            )}

            ${createDetail(
                "Family",
                family
            )}

            ${createDetail(
                "Affiliation",
                character.affiliation
            )}

            ${createDetail(
                "Occupation",
                character.occupation
            )}

        </div>


        ${createPortrait(
            character
        )}

    `;


    return article;
}


/* =========================================
   GET FILTERED CHARACTERS
========================================= */


function getFilteredCharacters() {

    const search =
        characterSearch
            .value
            .trim();


    return CHARACTERS.filter(
        character => {

            /*
                Do not allow search to expose
                the names of locked characters.
            */

            if (
                !isCharacterRevealed(
                    character
                )
            ) {

                return (
                    search.length === 0
                );
            }


            return characterMatchesSearch(
                character,
                search
            );

        }
    );
}


/* =========================================
   RENDER ROSTER
========================================= */


function renderRoster() {

    const characters =
        getFilteredCharacters();


    const pov =
        characters.filter(
            character =>
                character.type ===
                "pov"
        );


    const supporting =
        characters.filter(
            character =>
                character.type ===
                "supporting"
        );


    povCharacters.innerHTML =
        "";


    supportingCharacters.innerHTML =
        "";


    pov.forEach(
        character => {

            povCharacters.appendChild(
                createCharacterCard(
                    character
                )
            );

        }
    );


    supporting.forEach(
        character => {

            supportingCharacters.appendChild(
                createCharacterCard(
                    character
                )
            );

        }
    );


    povSection.hidden =
        pov.length === 0;


    supportingSection.hidden =
        supporting.length === 0;


    const revealedCount =
        characters.filter(
            character =>
                isCharacterRevealed(
                    character
                )
        ).length;


    const totalVisible =
        characters.length;


    if (
        spoilerMode ===
        "all"
    ) {

        rosterCount.textContent =
            `${totalVisible} ${
                totalVisible === 1
                    ? "character"
                    : "characters"
            }`;

    } else {

        rosterCount.textContent =
            `${revealedCount} ${
                revealedCount === 1
                    ? "character revealed"
                    : "characters revealed"
            }`;
    }


    const nothingFound =
        characters.length === 0;


    noResults.hidden =
        !nothingFound;

}


/* =========================================
   SEARCH EVENT
========================================= */


characterSearch.addEventListener(
    "input",
    renderRoster
);


/* =========================================
   SPOILER BUTTON
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

        spoilerMode =
            spoilerMode ===
            "progress"
                ? "all"
                : "progress";


        localStorage.setItem(
            "drownedCrownRosterSpoilerMode",
            spoilerMode
        );


        updateSpoilerButton();

        renderRoster();

    }
);


/* =========================================
   START
========================================= */


function startRoster() {

    updateSpoilerButton();

    renderRoster();
}


startRoster();