"use strict";


/* =========================================
   THE DROWNED CROWN
   VEYRA GLOSSARY DATABASE
========================================= */

/*
    SPOILER LEVELS

    0 = Safe before beginning the book.
    1 = Safe after the Prologue.
    2 = Safe after Chapter One.

    Later chapters can simply continue:

    3 = Chapter Two
    4 = Chapter Three
    etc.

    This allows the glossary to eventually
    reveal information as the reader progresses.
*/


const GLOSSARY = [

    /* =====================================
       WORLD
    ====================================== */

    {
        id: "veyra",
        term: "Veyra",
        category: "World",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The known world in which The Drowned Crown takes place.",

        description:
            "Veyra is the greater world encompassing the Mourning Sea and the lands surrounding it.",

        aliases: []
    },


    {
        id: "mourning-sea",
        term: "Mourning Sea",
        category: "Geography",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The great sea at the heart of Veyra.",

        description:
            "The Mourning Sea lies at the center of much of Veyra's trade, travel, whaling and maritime culture. Its waters connect many otherwise distant peoples and kingdoms.",

        aliases: []
    },


    /* =====================================
       KINGDOMS & REGIONS
    ====================================== */

    {
        id: "central-crown",
        term: "Central Crown",
        category: "Realm",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "A great federal realm centered upon Averra.",

        description:
            "The Central Crown comprises Benwick, Weststan, Valenne, Morholt, the Salt Marches and the capital territory of Averra.",

        aliases: [
            "The Crown"
        ]
    },


    {
        id: "dentora",
        term: "Dentora",
        category: "Realm",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "An independent northern kingdom ruled through its Great Clans.",

        description:
            "Dentora is an independent kingdom north of the Central Crown. Its society is organized around eight Great Clans and their sworn families. Its kingship is not hereditary; a king is chosen by a council of clan heads.",

        aliases: []
    },


    {
        id: "skovos",
        term: "Skovos",
        category: "Realm",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "An independent pirate island in the Mourning Sea.",

        description:
            "Skovos is a jungle island whose people recognize no foreign crown. Piracy is deeply embedded within its culture, economy and reputation.",

        aliases: []
    },


    {
        id: "tarkott",
        term: "Tarkott",
        category: "Region",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "Lawless southern badlands beyond the authority of any king.",

        description:
            "Tarkott is a harsh southern region of desert and badlands. No king rules it, and the region is notorious for lawlessness, disease and isolated cannibal tribes.",

        aliases: []
    },


    /* =====================================
       CENTRAL CROWN
    ====================================== */

    {
        id: "averra",
        term: "Averra",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The capital territory of the Central Crown.",

        description:
            "Averra serves as the political heart and capital territory of the Central Crown.",

        aliases: []
    },


    {
        id: "benwick",
        term: "Benwick",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "One of the constituent realms of the Central Crown.",

        description:
            "Benwick is one of the six territories that together constitute the Central Crown.",

        aliases: []
    },


    {
        id: "weststan",
        term: "Weststan",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "One of the constituent realms of the Central Crown.",

        description:
            "Weststan is one of the territories united beneath the Central Crown.",

        aliases: []
    },


    {
        id: "valenne",
        term: "Valenne",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "One of the constituent realms of the Central Crown.",

        description:
            "Valenne is one of the territories belonging to the Central Crown.",

        aliases: []
    },


    {
        id: "morholt",
        term: "Morholt",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "A maritime realm of the Central Crown with a powerful whaling tradition.",

        description:
            "Morholt is one of the territories of the Central Crown. Its people possess a strong maritime identity, and whaling has shaped much of its economy, folklore and religious tradition.",

        aliases: []
    },


    {
        id: "salt-marches",
        term: "Salt Marches",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "One of the constituent territories of the Central Crown.",

        description:
            "The Salt Marches form one of the territories united beneath the Central Crown.",

        aliases: []
    },


    /* =====================================
       DENTORA
    ====================================== */

    {
        id: "antambra",
        term: "Antambra",
        category: "Place",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The royal seat of Dentora.",

        description:
            "Antambra is Dentora's largest castle and settlement and serves as the royal seat of the reigning king. It is not permanently held by any one Great Clan.",

        aliases: []
    },


    {
        id: "old-word",
        term: "Old Word",
        category: "Language",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The traditional language of Dentora.",

        description:
            "Old Word is the traditional Dentoran tongue. The name Old Word is commonly used by foreigners, while the language remains particularly important among educated and traditional Dentoran families.",

        aliases: [
            "Dentoran tongue"
        ]
    },


    {
        id: "first",
        term: "First",
        category: "Title",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The head of a Dentoran Great Clan.",

        description:
            "First is the title used for the ruling head of one of Dentora's eight Great Clans.",

        aliases: []
    },


    {
        id: "clan-torren",
        term: "Great Clan Torren",
        category: "Faction",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "One of the eight Great Clans of Dentora.",

        description:
            "Great Clan Torren is one of the eight principal clans around which Dentoran political and familial life is organized.",

        aliases: [
            "Clan Torren",
            "Torren"
        ]
    },


    /* =====================================
       BLACKWATER
    ====================================== */

    {
        id: "blackwater",
        term: "Blackwater",
        category: "City",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "A vast independent city upon the River Black.",

        description:
            "Blackwater is an independent city connected to the Mourning Sea through the River Black. It belongs to neither Dentora nor the Central Crown.",

        aliases: []
    },


    {
        id: "river-black",
        term: "River Black",
        category: "Geography",
        pronunciation: "",
        spoilerLevel: 0,

        short:
            "The river from which Blackwater takes its name.",

        description:
            "The River Black runs through Blackwater and connects the independent city with the Mourning Sea.",

        aliases: []
    },


    /* =====================================
       RELIGION & MYSTICISM
    ====================================== */

    {
        id: "drowned-man",
        term: "Drowned Man",
        category: "Religion",
        pronunciation: "",
        spoilerLevel: 1,

        short:
            "A whalebone religious figure found aboard the Mercy Bell.",

        description:
            "A faceless whalebone figure associated with old maritime belief. The bone priests call it the Drowned Man.",

        aliases: []
    },


    {
        id: "drowned-god",
        term: "Drowned God",
        category: "Religion",
        pronunciation: "",
        spoilerLevel: 1,

        short:
            "A figure associated with old maritime belief.",

        description:
            "The Drowned God appears in the religious language and superstitions of sailors upon the Mourning Sea.",

        aliases: []
    },


    /* =====================================
       CREATURES
    ====================================== */

    {
        id: "leviathan",
        term: "Leviathan",
        category: "Creature",
        pronunciation: "",
        spoilerLevel: 1,

        short:
            "An immense species inhabiting the Mourning Sea.",

        description:
            "Leviathans are enormous marine creatures hunted for oil, bone and other valuable materials. Their size, age and behavior distinguish them sharply from ordinary whales.",

        aliases: [
            "Leviathans"
        ]
    },


    /* =====================================
       SHIPS
    ====================================== */

    {
        id: "mercy-bell",
        term: "Mercy Bell",
        category: "Ship",
        pronunciation: "",
        spoilerLevel: 1,

        short:
            "A Morholter whaling vessel.",

        description:
            "The Mercy Bell is the whaling vessel aboard which Harl Veyr serves during the Prologue.",

        aliases: []
    },


    {
        id: "pottermore",
        term: "Pottermore",
        category: "Ship",
        pronunciation: "",
        spoilerLevel: 2,

        short:
            "The vessel aboard which Polonius awakens.",

        description:
            "The Pottermore carries Polonius across the Mourning Sea toward Blackwater following the injuries that left him without his memories.",

        aliases: []
    },

    {
    id: "blackharbor",

    term: "Blackharbor",

    category: "City",

    pronunciation: "",

    spoilerLevel: 1,

    short:
        "A Morholter harbor city closely associated with whaling.",

    description:
        "The largest Morholt Harbor.",

    aliases: []
},

];


/* =========================================
   FIND GLOSSARY ENTRY
========================================= */

function getGlossaryEntry(id) {

    return GLOSSARY.find(
        entry =>
            entry.id === id
    ) || null;
}


/* =========================================
   GET ALL CATEGORIES
========================================= */

function getGlossaryCategories() {

    return [
        ...new Set(
            GLOSSARY.map(
                entry =>
                    entry.category
            )
        )
    ].sort();
}