"use strict";


/* =========================================
   THE DROWNED CROWN
   PRONUNCIATION DICTIONARY
========================================= */

/*
    IMPORTANT:

    The pronunciations below are PLACEHOLDERS.

    Replace the "speech" value with how YOU
    actually pronounce each word.

    Do not change the "term" unless the actual
    spelling of the name changes.

    Example:

    term: "Dentora"
    speech: "den-TOR-ah"

    The reader still sees:

        Dentora

    But the narration engine receives:

        den-TOR-ah
*/


const PRONUNCIATIONS = [

    /* =====================================
       WORLD
    ====================================== */

    {
        term: "Veyra",
        speech: "VAY-rah",
        category: "World"
    },


    /* =====================================
       DENTORA
    ====================================== */

    {
        term: "Dentora",
        speech: "den-TOR-ah",
        category: "Kingdom"
    },

    {
        term: "Antambra",
        speech: "an-TAM-brah",
        category: "Place"
    },


    /* =====================================
       CENTRAL CROWN
    ====================================== */

    {
        term: "Averra",
        speech: "ah-VAIR-ah",
        category: "Place"
    },

    {
        term: "Valenne",
        speech: "vah-LENN",
        category: "Place"
    },

    {
        term: "Morholt",
        speech: "MOR-holt",
        category: "Place"
    },

    {
        term: "Benwick",
        speech: "BEN-wick",
        category: "Place"
    },

    {
        term: "Weststan",
        speech: "WEST-stan",
        category: "Place"
    },


    /* =====================================
       OTHER REGIONS
    ====================================== */

    {
        term: "Skovos",
        speech: "SKOH-voss",
        category: "Island"
    },

    {
        term: "Tarkott",
        speech: "TAR-kot",
        category: "Region"
    },


    /* =====================================
       CHARACTERS
    ====================================== */

    {
        term: "Polonius",
        speech: "poh-LOH-nee-us",
        category: "Character"
    },

    {
        term: "Gustavo",
        speech: "goo-STAH-voh",
        category: "Character"
    },

    {
        term: "Rava",
        speech: "RAH-vah",
        category: "Character"
    },

    {
        term: "Vardren",
        speech: "VAR-dren",
        category: "Character"
    },


    /* =====================================
       SHIPS
    ====================================== */

    {
        term: "Pottermore",
        speech: "POT-er-more",
        category: "Ship"
    }

];


/* =========================================
   ESCAPE REGEX CHARACTERS
========================================= */

function escapePronunciationRegex(text) {

    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


/* =========================================
   APPLY PRONUNCIATIONS
========================================= */

function applyPronunciations(text) {

    let speechText = text;


    /*
        Sort longest terms first.

        This prevents shorter entries from
        accidentally changing part of a
        longer name.
    */

    const sortedPronunciations =
        [...PRONUNCIATIONS].sort(
            (a, b) =>
                b.term.length -
                a.term.length
        );


    sortedPronunciations.forEach(
        entry => {

            const escapedTerm =
                escapePronunciationRegex(
                    entry.term
                );


            const pattern =
                new RegExp(
                    `\\b${escapedTerm}\\b`,
                    "gi"
                );


            speechText =
                speechText.replace(
                    pattern,
                    entry.speech
                );

        }
    );


    return speechText;
}


/* =========================================
   FIND A TERM
========================================= */

function getPronunciation(term) {

    return PRONUNCIATIONS.find(
        entry =>
            entry.term.toLowerCase() ===
            term.toLowerCase()
    ) || null;
}