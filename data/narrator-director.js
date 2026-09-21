"use strict";


/* =========================================
   THE DROWNED CROWN
   NARRATION DIRECTOR 1.1

   Performance rules for the novel.

   IMPORTANT:
   NARRATOR_VERSION is also used by the
   persistent audio cache.

   Whenever narration processing changes in a
   way that should invalidate previously
   generated audio, increment this version.
========================================= */


/* =========================================
   VERSION
========================================= */


export const NARRATOR_VERSION =
    "director-1.1";


/* =========================================
   MASTER NARRATOR PROFILE
========================================= */


export const NARRATOR_PROFILE = {

    id:
        "drowned-crown-default",

    style: {

        tone:
            "restrained-dark-fantasy",

        intimacy:
            "close",

        theatricality:
            "low",

        narrationEnergy:
            "restrained",

        dialogueEnergy:
            "moderate",

        sentenceEndings:
            "settled"

    },


    /*
        Base synthesis speed.

        The speed selected by the user in the
        laboratory is multiplied by this and,
        where appropriate, by the character's
        subtle speed modifier.
    */

    baseSpeed:
        1.00,


    /*
        Adaptive chunking.

        startupTarget:
        The opening piece is kept short so the
        narrator can begin speaking quickly.

        normalTarget:
        Once narration is underway, larger
        pieces are more efficient.

        hardMaximum:
        Long sentences may exceed the normal
        target, but we try not to let synthesis
        requests exceed this value.
    */

    chunking: {

        startupTarget:
            105,

        normalTarget:
            220,

        hardMaximum:
            280,

        preserveSentences:
            true

    },


    /*
        Intentional silence between passages.

        All values are milliseconds.
    */

    pauses: {

        sameParagraph:
            55,

        sentence:
            0,

        paragraph:
            260,

        dialogueTransition:
            180,

        dramaticShortParagraph:
            430,

        sceneBreak:
            950

    },


    /*
        A standalone paragraph at or below this
        length can receive the more deliberate
        dramatic pause.

        Example:

        "The darkness took him again."
    */

    dramaticParagraphMaximum:
        75

};


/* =========================================
   CHARACTER PERFORMANCE PROFILES

   These are deliberately subtle.

   They describe how the Drowned Crown
   narration engine should interpret dialogue.

   They are NOT intended to imitate or clone
   any real narrator or actor.
========================================= */


export const CHARACTER_PROFILES = {

    narrator: {

        id:
            "narrator",

        label:
            "Narrator",

        speedMultiplier:
            1.00,

        delivery:
            "measured",

        energy:
            "restrained",

        warmth:
            "neutral"

    },


    polonius: {

        id:
            "polonius",

        label:
            "Polonius",

        speedMultiplier:
            0.97,

        delivery:
            "guarded",

        energy:
            "restrained",

        warmth:
            "low"

    },


    gustavo: {

        id:
            "gustavo",

        label:
            "Gustavo",

        speedMultiplier:
            1.03,

        delivery:
            "dry",

        energy:
            "light",

        warmth:
            "moderate"

    }

};


/* =========================================
   PRONUNCIATION OVERRIDES

   DO NOT add guessed pronunciations.

   We will add pronunciations only when their
   canonical spoken form has been established.
========================================= */


export const NARRATOR_PRONUNCIATIONS = [

    /*
        EXAMPLE FORMAT ONLY:

        {
            written: "Example",
            spoken: "Ex-am-pull"
        }
    */

];


/* =========================================
   TEXT NORMALIZATION
========================================= */


export function normalizeNarrationText(
    text
) {

    return String(
        text || ""
    )
        .replace(
            /\r\n/g,
            "\n"
        )
        .replace(
            /[ \t]+/g,
            " "
        )
        .replace(
            / *\n */g,
            "\n"
        )
        .trim();

}


/* =========================================
   PARAGRAPH NORMALIZATION
========================================= */


export function normalizeParagraph(
    text
) {

    return String(
        text || ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


/* =========================================
   DIALOGUE DETECTION
========================================= */


export function containsDialogue(
    text
) {

    const value =
        String(
            text || ""
        );


    return (

        /["“][^"”]+["”]/.test(
            value
        )

        ||

        /['‘][^'’]+['’]/.test(
            value
        )

    );

}


/* =========================================
   DIALOGUE START DETECTION
========================================= */


export function beginsWithDialogue(
    text
) {

    const cleaned =
        String(
            text || ""
        )
            .trim();


    return (

        cleaned.startsWith(
            "\""
        )

        ||

        cleaned.startsWith(
            "“"
        )

        ||

        cleaned.startsWith(
            "'"
        )

        ||

        cleaned.startsWith(
            "‘"
        )

    );

}


/* =========================================
   DRAMATIC SHORT PARAGRAPH
========================================= */


export function isDramaticShortParagraph(
    text
) {

    const cleaned =
        normalizeParagraph(
            text
        );


    return (

        cleaned.length > 0

        &&

        cleaned.length <=
            NARRATOR_PROFILE
                .dramaticParagraphMaximum

    );

}


/* =========================================
   PRONUNCIATION PROCESSING
========================================= */


export function applyNarratorPronunciations(
    text
) {

    let result =
        String(
            text || ""
        );


    /*
        Longer terms are processed first so a
        shorter pronunciation entry cannot
        accidentally alter part of a longer one.
    */

    const entries =
        [
            ...NARRATOR_PRONUNCIATIONS
        ]
            .sort(
                (
                    a,
                    b
                ) => {

                    return (
                        b.written.length -
                        a.written.length
                    );

                }
            );


    entries.forEach(
        entry => {

            if (
                !entry ||
                !entry.written ||
                !entry.spoken
            ) {

                return;

            }


            const escaped =
                entry.written.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


            const expression =
                new RegExp(
                    `\\b${escaped}\\b`,
                    "gi"
                );


            result =
                result.replace(
                    expression,
                    entry.spoken
                );

        }
    );


    return result;

}


/* =========================================
   SPEAKER DETECTION

   This remains deliberately conservative.

   The final reader will eventually be able to
   supply explicit speaker metadata, which is
   considerably more reliable than attempting
   to infer every speaker from prose.

   For now this gives the laboratory enough
   information to test character direction.
========================================= */


export function detectSpeaker(
    text,
    previousText = ""
) {

    /*
        Pure narration stays narrator.
    */

    if (
        !containsDialogue(
            text
        )
    ) {

        return "narrator";

    }


    const current =
        String(
            text || ""
        )
            .toLowerCase();


    const previous =
        String(
            previousText || ""
        )
            .toLowerCase();


    /*
        Prefer an attribution inside the
        CURRENT paragraph.
    */

    if (
        /\bgustavo\b/.test(
            current
        )
    ) {

        return "gustavo";

    }


    if (
        /\bpolonius\b/.test(
            current
        )
    ) {

        return "polonius";

    }


    /*
        Previous-paragraph context is only a
        fallback for the laboratory.
    */

    if (
        /\bgustavo\b/.test(
            previous
        )
    ) {

        return "gustavo";

    }


    if (
        /\bpolonius\b/.test(
            previous
        )
    ) {

        return "polonius";

    }


    return "narrator";

}


/* =========================================
   PERFORMANCE DIRECTION
========================================= */


export function getPerformanceForText(
    text,
    previousText = ""
) {

    const speaker =
        detectSpeaker(
            text,
            previousText
        );


    const profile =
        CHARACTER_PROFILES[
            speaker
        ]
        ||
        CHARACTER_PROFILES
            .narrator;


    return {

        speaker,

        dialogue:
            containsDialogue(
                text
            ),

        dramatic:
            isDramaticShortParagraph(
                text
            ),

        speed:
            (
                NARRATOR_PROFILE
                    .baseSpeed

                *

                profile
                    .speedMultiplier
            ),

        delivery:
            profile.delivery,

        energy:
            profile.energy,

        warmth:
            profile.warmth

    };

}


/* =========================================
   PAUSE DIRECTION
========================================= */


export function getPauseAfterChunk(
    chunk,
    nextChunk = null
) {

    if (!chunk) {

        return 0;

    }


    /*
        Two chunks belonging to the SAME prose
        paragraph should flow together closely.
    */

    if (
        nextChunk

        &&

        nextChunk.paragraphIndex ===
            chunk.paragraphIndex
    ) {

        return (
            NARRATOR_PROFILE
                .pauses
                .sameParagraph
        );

    }


    /*
        Scene breaks receive the longest
        deliberate silence.
    */

    if (
        chunk.sceneBreak
    ) {

        return (
            NARRATOR_PROFILE
                .pauses
                .sceneBreak
        );

    }


    /*
        Short standalone dramatic prose gets
        additional breathing room.
    */

    if (
        chunk.performance
            ?.dramatic
    ) {

        return (
            NARRATOR_PROFILE
                .pauses
                .dramaticShortParagraph
        );

    }


    /*
        Moving into or out of dialogue receives
        a slightly different transition.
    */

    if (
        nextChunk

        &&

        (
            chunk.performance
                ?.dialogue

            ||

            nextChunk.performance
                ?.dialogue
        )
    ) {

        return (
            NARRATOR_PROFILE
                .pauses
                .dialogueTransition
        );

    }


    /*
        Ordinary paragraph transition.
    */

    return (
        NARRATOR_PROFILE
            .pauses
            .paragraph
    );

}