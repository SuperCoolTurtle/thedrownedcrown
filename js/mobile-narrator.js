"use strict";

/* =========================================================
   THE DROWNED CROWN
   MOBILE NARRATOR 1.1

   Piper neural TTS for mobile devices.

   Piper handles:
   - model download
   - browser storage
   - WASM inference
   - WAV creation
========================================================= */


/* =========================================================
   VOICE
========================================================= */

export const MOBILE_PIPER_VOICE =
    "en_US-hfc_male-medium";


export const MOBILE_PIPER_VOICE_LABEL =
    "Drowned Crown — Mobile";


/* =========================================================
   PIPER
========================================================= */

const PIPER_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm";


let piperModule =
    null;


let piperLoadingPromise =
    null;


/* =========================================================
   LOAD PIPER
========================================================= */

async function loadPiperModule() {

    if (piperModule) {

        return piperModule;
    }


    if (piperLoadingPromise) {

        return piperLoadingPromise;
    }


    console.log(
        "Loading Drowned Crown mobile Piper engine…"
    );


    piperLoadingPromise =
        import(
            PIPER_MODULE_URL
        )
        .then(
            module => {

                piperModule =
                    module;


                console.log(
                    "Drowned Crown mobile Piper module loaded."
                );


                return module;
            }
        )
        .catch(
            error => {

                console.error(
                    "Could not import Piper:",
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
   ENSURE MOBILE NARRATOR

   We deliberately do NOT download the model here.

   Piper's predict() function automatically downloads the
   selected voice when it is not already stored.

   This avoids relying on OPFS before Piper actually needs
   the model.
========================================================= */

export async function ensureMobileNarrator() {

    const piper =
        await loadPiperModule();


    if (
        !piper ||
        typeof piper.predict !==
            "function"
    ) {

        throw new Error(
            "Piper loaded, but predict() is unavailable."
        );
    }


    console.log(
        "Drowned Crown mobile narrator ready."
    );


    return piper;
}


/* =========================================================
   GENERATE MOBILE NARRATION
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


    const piper =
        await ensureMobileNarrator();


    console.log(
        "Piper generating mobile narration:",
        {
            voice:
                MOBILE_PIPER_VOICE,

            characters:
                cleanText.length
        }
    );


    /*
       Piper automatically downloads the voice the first
       time it is required.

       The second argument receives download progress.
    */

    const wav =
        await piper.predict(
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
                        Math.round(
                            (
                                loaded /
                                total
                            ) *
                            100
                        );


                    console.log(
                        `Piper voice download: ${percent}%`
                    );
                }
            }
        );


    if (
        !(wav instanceof Blob)
    ) {

        console.error(
            "Unexpected Piper result:",
            wav
        );


        throw new Error(
            "Piper did not return a valid audio Blob."
        );
    }


    console.log(
        "Piper mobile narration generated:",
        {
            bytes:
                wav.size,

            type:
                wav.type
        }
    );


    return wav;
}