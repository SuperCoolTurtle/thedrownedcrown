"use strict";


/* =========================================
   THE DROWNED CROWN
   CHARACTER ROSTER DATABASE
========================================= */

/*
    CHARACTER TYPES

    pov
        Point-of-view characters.

    supporting
        Supporting characters.


    REVEAL LEVELS

    0 = Known before reading
    1 = Revealed by the Prologue
    2 = Revealed by Chapter One

    Later:

    3 = Chapter Two
    4 = Chapter Three
    etc.


    IMPORTANT:

    The roster is a READER REFERENCE.

    Do not put secret backstory, future
    revelations, hidden allegiances, or
    world-bible information here unless
    the book has actually revealed it.
*/


const CHARACTERS = [


    /* =====================================
       POV CHARACTERS
    ====================================== */


    {
        id: "harl-veyr",

        name: "Harl Veyr",

        type: "pov",

        revealLevel: 1,

        country: "Central Crown",

        home: "Blackharbor, Morholt",

        clan: "",

        family: [
            "Mother",
            "Sister"
        ],

        affiliation: "Mercy Bell",

        occupation: "Whaler",

        image: ""
    },


    {
        id: "polonius-fritz",

        name: "Polonius Fritz",

        type: "pov",

        revealLevel: 2,

        country: "",

        home: "Blackwater",

        clan: "",

        family: [
            "Polynices — Brother"
        ],

        affiliation: "",

        occupation: "",

        image: ""
    },


    /* =====================================
       SUPPORTING CHARACTERS
       PROLOGUE
    ====================================== */


    {
        id: "bren",

        name: "Bren",

        type: "supporting",

        revealLevel: 1,

        country: "Central Crown",

        home: "Morholt",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Whaler",

        image: ""
    },


    {
        id: "sennet",

        name: "Sennet",

        type: "supporting",

        revealLevel: 1,

        country: "Central Crown",

        home: "Morholt",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Whaler",

        image: ""
    },


    {
        id: "captain-marrik",

        name: "Captain Marrik",

        type: "supporting",

        revealLevel: 1,

        country: "Central Crown",

        home: "Morholt",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Captain",

        image: ""
    },


    {
        id: "old-farro",

        name: "Old Farro",

        type: "supporting",

        revealLevel: 1,

        country: "",

        home: "",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Harpooner",

        image: ""
    },


    {
        id: "pate",

        name: "Pate",

        type: "supporting",

        revealLevel: 1,

        country: "",

        home: "",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Sailor",

        image: ""
    },


    {
        id: "pell",

        name: "Pell",

        type: "supporting",

        revealLevel: 1,

        country: "",

        home: "",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Sailor",

        image: ""
    },


    {
        id: "jorren",

        name: "Jorren",

        type: "supporting",

        revealLevel: 1,

        country: "",

        home: "",

        clan: "",

        family: [],

        affiliation: "Mercy Bell",

        occupation: "Whaler",

        image: ""
    },


    /* =====================================
       SUPPORTING CHARACTERS
       CHAPTER ONE
    ====================================== */


    {
        id: "gustavo-kirstein",

        name: "Gustavo Kirstein",

        type: "supporting",

        revealLevel: 2,

        country: "",

        home: "",

        clan: "",

        family: [],

        affiliation: "Pottermore",

        occupation: "Physicker",

        image: ""
    },


    {
        id: "merren-vask",

        name: "Merren Vask",

        type: "supporting",

        revealLevel: 2,

        country: "Central Crown",

        home: "Morholt",

        clan: "",

        family: [],

        affiliation: "Pottermore",

        occupation: "Sailor",

        image: ""
    },


    {
        id: "edder",

        name: "Edder",

        type: "supporting",

        revealLevel: 2,

        country: "",

        home: "Blackwater",

        clan: "",

        family: [],

        affiliation: "Pottermore",

        occupation: "Sailor",

        image: ""
    },


    {
        id: "toman",

        name: "Toman",

        type: "supporting",

        revealLevel: 2,

        country: "Central Crown",

        home: "Salt Marches",

        clan: "",

        family: [],

        affiliation: "Pottermore",

        occupation: "Sailor",

        image: ""
    },


    {
        id: "vivienne",

        name: "Vivienne",

        type: "supporting",

        revealLevel: 2,

        country: "",

        home: "Blackwater",

        clan: "",

        family: [],

        affiliation: "",

        occupation: "",

        image: ""
    },


    {
        id: "polynices",

        name: "Polynices",

        type: "supporting",

        revealLevel: 2,

        country: "",

        home: "Blackwater",

        clan: "",

        family: [
            "Polonius Fritz"
        ],

        affiliation: "",

        occupation: "",

        image: ""
    }

];


/* =========================================
   CHARACTER HELPERS
========================================= */


function getCharacterById(id) {

    return CHARACTERS.find(
        character =>
            character.id === id
    ) || null;
}


function getPOVCharacters() {

    return CHARACTERS.filter(
        character =>
            character.type === "pov"
    );
}


function getSupportingCharacters() {

    return CHARACTERS.filter(
        character =>
            character.type === "supporting"
    );
}