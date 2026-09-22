"use strict";

/* =========================================================
   THE DROWNED CROWN
   MOBILE NARRATOR 1.2

   Piper / VITS mobile neural narrator.

   IMPORTANT:
   This version deliberately uses @diffusionstudio/vits-web
   instead of @mintplex-labs/piper-tts-web.

   Reason:
   The Mintplex package's ONNX runtime assets can fail when
   loaded through a CDN on iOS with:

   "no available backend found"
   "Importing a module script failed"

   The VITS browser package avoids that particular loading
   arrangement while still providing Piper-compatible
   neural voices.
========================================================= */


/* =========================================================
   VOICE
========================================================= */

export const MOBILE_PIPER_VOICE =
    "en_US-hfc_male-medium";


export const MOBILE_PIPER_VOICE_LABEL =
    "Drowned Crown — Mobile";


/* =========================================================
   MODULE
========================================================= */

const PIPER_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web/+esm";


let piperModule =
    null;


let piperLoadingPromise =
    null;


/* =========================================================
   LOAD MODULE
========================================================= */

async function loadPiperModule() {

    if (piperModule) {

        return piperModule;
    }


    if (piperLoadingPromise) {

        return piperLoadingPromise;
    }


    console.log(
        "Loading Drowned Crown mobile narrator…"
    );


    piperLoadingPromise =
        import(
            PIPER_MODULE_URL
        )
        .then(
            module => {

                if (
                    !module ||
                    typeof module.predict !==
                        "function"
                ) {

                    console.error(
                        "Unexpected VITS module:",
                        module
                    );


                    throw new Error(
                        "Mobile narrator loaded without predict()."
                    );
                }


                piperModule =
                    module;


                console.log(
                    "Drowned Crown mobile narrator module loaded."
                );


                return piperModule;
            }
        )
        .catch(
            error => {

                console.error(
                    "Could not load mobile narrator module:",
                    error
                );


                piperLoadingPromise =
                    null;


                throw error;
            }
        );


    return piperLoadingPromise;
}


/* =========================================================
   ENSURE NARRATOR
========================================================= */

export async function ensureMobileNarrator() {

    const narrator =
        await loadPiperModule();


    console.log(
        "Drowned Crown mobile narrator ready.",
        {
            voice:
                MOBILE_PIPER_VOICE
        }
    );


    return narrator;
}


/* =========================================================
   GENERATE
========================================================= */

export async function generateMobileNarration(
    text
) {

    const cleanText =
        String(
            text ||
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();


    if (!cleanText) {

        throw new Error(
            "Cannot generate empty mobile narration."
        );
    }


    const narrator =
        await ensureMobileNarrator();


    console.log(
        "Mobile narrator generating:",
        {
            voice:
                MOBILE_PIPER_VOICE,

            characters:
                cleanText.length
        }
    );


    /*
       predict() automatically downloads the Piper voice
       model when necessary and returns a WAV Blob.
    */

    const wav =
        await narrator.predict(
            {
                text:
                    cleanText,

                voiceId:
                    MOBILE_PIPER_VOICE
            },
            progress => {

                const loaded =
                    Number(
                        progress?.loaded
                    ) ||
                    0;


                const total =
                    Number(
                        progress?.total
                    ) ||
                    0;


                if (
                    total >
                    0
                ) {

                    const percent =
                        Math.max(
                            0,
                            Math.min(
                                100,
                                Math.round(
                                    (
                                        loaded /
                                        total
                                    ) *
                                    100
                                )
                            )
                        );


                    console.log(
                        `Mobile voice download: ${percent}%`
                    );
                }
            }
        );


    /*
       Different browser builds can expose the resulting
       audio slightly differently. Normalize the common
       possibilities into the Blob reader.js expects.
    */

    if (
        wav instanceof Blob
    ) {

        console.log(
            "Mobile narration generated.",
            {
                bytes:
                    wav.size,

                type:
                    wav.type
            }
        );


        return wav;
    }


    if (
        wav?.blob instanceof Blob
    ) {

        console.log(
            "Mobile narration generated.",
            {
                bytes:
                    wav.blob.size,

                type:
                    wav.blob.type
            }
        );


        return wav.blob;
    }


    if (
        wav instanceof ArrayBuffer
    ) {

        const blob =
            new Blob(
                [
                    wav
                ],
                {
                    type:
                        "audio/wav"
                }
            );


        console.log(
            "Mobile narration generated from ArrayBuffer.",
            {
                bytes:
                    blob.size
            }
        );


        return blob;
    }


    if (
        ArrayBuffer.isView(
            wav
        )
    ) {

        const blob =
            new Blob(
                [
                    wav.buffer
                ],
                {
                    type:
                        "audio/wav"
                }
            );


        console.log(
            "Mobile narration generated from typed array.",
            {
                bytes:
                    blob.size
            }
        );


        return blob;
    }


    console.error(
        "Unexpected mobile narrator output:",
        wav
    );


    throw new Error(
        "Mobile narrator did not return valid audio."
    );
}