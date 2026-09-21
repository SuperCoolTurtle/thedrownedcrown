"use strict";


/* =========================================
   THE DROWNED CROWN
   AUDIOBOOK DATABASE

   This file tells the reader which chapters
   have finished audiobook narration.

   Paragraph timings will later synchronize
   the MP3 with the visible manuscript.
========================================= */


const NARRATION = {

    /* =====================================
       PROLOGUE
    ====================================== */

    "prologue": {

        audiobook: {

            available: false,

            file: "audio/prologue.mp3",

            /*
                Once the finished narration
                exists, these timings will
                correspond to the narration
                paragraphs in the chapter.

                Example:

                {
                    paragraph: 0,
                    start: 0.0,
                    end: 8.4
                }
            */

            paragraphs: []

        }

    },


    /* =====================================
       CHAPTER ONE
    ====================================== */

    "chapter-01": {

        audiobook: {

            available: true,

            file: "audio/chapter-01.mp3",

            paragraphs: []

        }

    }

};


/* =========================================
   HELPERS
========================================= */


function getNarrationByChapterId(
    chapterId
) {

    return (
        NARRATION[chapterId] ||
        null
    );
}


function chapterHasAudiobook(
    chapterId
) {

    const narration =
        getNarrationByChapterId(
            chapterId
        );


    return Boolean(
        narration &&
        narration.audiobook &&
        narration.audiobook.available &&
        narration.audiobook.file
    );
}


function getAudiobookData(
    chapterId
) {

    const narration =
        getNarrationByChapterId(
            chapterId
        );


    if (
        !narration ||
        !narration.audiobook
    ) {

        return null;
    }


    return narration.audiobook;
}