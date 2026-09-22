"use strict";

/* =========================================================
   THE DROWNED CROWN
   MOBILE NARRATOR 1.0

   Lightweight mobile neural narration using Piper TTS.

   This module is only loaded when reader.js detects a
   phone/tablet and Drowned Crown narration needs an
   uncached chunk.
========================================================= */

export const MOBILE_PIPER_VOICE =
    "en_US-hfc_male-medium";

export const MOBILE_PIPER_VOICE_LABEL =
    "Drowned Crown — Mobile";


const PIPER_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm";


let piperModule = null;

let piperLoadingPromise = null;

let voiceReadyPromise = null;


/* =========================================================
   LOAD PIPER MODULE
========================================================= */

async function loadPiperModule() {

    if (piperModule) {
        return piperModule;
    }


    if (piperLoadingPromise) {
        return piperLoadingPromise;
    }


    piperLoadingPromise =
        import(PIPER_MODULE_URL)
            .then(
                module => {

                    piperModule =
                        module;


                    return module;
                }
            )
            .finally(
                () => {

                    piperLoadingPromise =
                        null;
                }
            );


    return piperLoadingPromise;
}


/* =========================================================
   PREPARE MOBILE VOICE
========================================================= */

export async function ensureMobileNarrator(
    {
        onProgress = null
    } = {}
) {

    const piper =
        await loadPiperModule();


    if (voiceReadyPromise) {
        return voiceReadyPromise;
    }


    voiceReadyPromise =
        (
            async () => {

                let alreadyStored =
                    false;


                try {

                    const stored =
                        await piper.stored();


                    alreadyStored =
                        Array.isArray(stored) &&
                        stored.includes(
                            MOBILE_PIPER_VOICE
                        );

                } catch (error) {

                    console.warn(
                        "Could not inspect Piper voice cache:",
                        error
                    );
                }


                if (!alreadyStored) {

                    await piper.download(
                        MOBILE_PIPER_VOICE,

                        progress => {

                            if (
                                typeof onProgress !==
                                "function"
                            ) {
                                return;
                            }


                            const loaded =
                                Number(
                                    progress?.loaded
                                ) || 0;


                            const total =
                                Number(
                                    progress?.total
                                ) || 0;


                            const percent =
                                total > 0
                                    ? Math.max(
                                        0,
                                        Math.min(
                                            100,
                                            Math.round(
                                                loaded /
                                                total *
                                                100
                                            )
                                        )
                                    )
                                    : null;


                            onProgress({
                                loaded,
                                total,
                                percent,

                                url:
                                    progress?.url ||
                                    ""
                            });
                        }
                    );
                }


                return piper;
            }
        )()
        .catch(
            error => {

                voiceReadyPromise =
                    null;


                throw error;
            }
        );


    return voiceReadyPromise;
}


/* =========================================================
   GENERATE MOBILE NARRATION
========================================================= */

export async function generateMobileNarration(
    text
) {

    const cleanText =
        String(
            text || ""
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


    const wav =
        await piper.predict({
            text:
                cleanText,

            voiceId:
                MOBILE_PIPER_VOICE
        });


    if (!(wav instanceof Blob)) {

        throw new Error(
            "Piper did not return a valid audio Blob."
        );
    }


    return wav;
}