"use strict";

/* =========================================================
   THE DROWNED CROWN
   MOBILE NARRATOR 2.0

   Piper mobile neural narrator.

   MOBILE ARCHITECTURE:

   Piper voice model
        ↓
   automatically downloaded / cached by Piper

   Piper phonemizer
        ↓
   self-hosted by The Drowned Crown

   ONNX Runtime WASM
        ↓
   self-hosted by The Drowned Crown

   This avoids relying on remote CDN runtime assets during
   mobile inference while still allowing Piper to manage
   voice-model downloading and browser storage.

   Desktop Kokoro narration is NOT handled by this file.
========================================================= */


/* =========================================================
   VOICE
========================================================= */

export const MOBILE_PIPER_VOICE =
    "en_US-hfc_male-medium";


export const MOBILE_PIPER_VOICE_LABEL =
    "Drowned Crown — Mobile";


/* =========================================================
   PIPER MODULE
========================================================= */

/*
   The JavaScript library itself is small enough to load
   through jsDelivr.

   The important runtime pieces that previously failed on
   iOS — ONNX WASM and the Piper phonemizer — are pointed
   at our own website below.
*/

const PIPER_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@realtimex/piper-tts-web@1.1.1/+esm";


/* =========================================================
   LOCAL RUNTIME PATHS

   import.meta.url makes these paths work both:

   - locally through Live Server
   - on GitHub Pages at /thedrownedcrown/

   We therefore do NOT hard-code the GitHub Pages path.
========================================================= */

const ONNX_RUNTIME_PATH =
    new URL(
        "../tts/piper/runtime/onnx/",
        import.meta.url
    ).href;


const PIPER_DATA_PATH =
    new URL(
        "../tts/piper/runtime/phonemizer/piper_phonemize.data",
        import.meta.url
    ).href;


const PIPER_WASM_PATH =
    new URL(
        "../tts/piper/runtime/phonemizer/piper_phonemize.wasm",
        import.meta.url
    ).href;


/* =========================================================
   STATE
========================================================= */

let piperModule =
    null;


let piperLoadingPromise =
    null;


let piperSession =
    null;


let piperSessionPromise =
    null;


/* =========================================================
   DOWNLOAD PROGRESS
========================================================= */

function reportProgress(
    progress
) {

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
            `Mobile narrator loading: ${percent}%`
        );


        return;
    }


    if (
        progress?.url
    ) {

        console.log(
            "Mobile narrator loading:",
            progress.url
        );
    }
}


/* =========================================================
   LOAD PIPER MODULE
========================================================= */

async function loadPiperModule() {

    if (
        piperModule
    ) {

        return piperModule;
    }


    if (
        piperLoadingPromise
    ) {

        return piperLoadingPromise;
    }


    console.log(
        "Loading Drowned Crown Piper module…"
    );


    piperLoadingPromise =
        import(
            PIPER_MODULE_URL
        )
        .then(
            module => {

                if (
                    !module
                ) {

                    throw new Error(
                        "Piper module returned no exports."
                    );
                }


                if (
                    typeof module.TtsSession !==
                    "function"
                ) {

                    console.error(
                        "Unexpected Piper module:",
                        module
                    );


                    throw new Error(
                        "Piper loaded without TtsSession."
                    );
                }


                piperModule =
                    module;


                console.log(
                    "Drowned Crown Piper module loaded.",
                    {
                        hasTtsSession:
                            true,

                        voice:
                            MOBILE_PIPER_VOICE
                    }
                );


                return piperModule;
            }
        )
        .catch(
            error => {

                console.error(
                    "Could not load Piper module:",
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
   CREATE PIPER SESSION
========================================================= */

async function createPiperSession() {

    if (
        piperSession
    ) {

        return piperSession;
    }


    if (
        piperSessionPromise
    ) {

        return piperSessionPromise;
    }


    piperSessionPromise =
        (
            async () => {

                const module =
                    await loadPiperModule();


                console.log(
                    "Creating Drowned Crown mobile Piper session.",
                    {
                        voice:
                            MOBILE_PIPER_VOICE,

                        onnx:
                            ONNX_RUNTIME_PATH,

                        piperData:
                            PIPER_DATA_PATH,

                        piperWasm:
                            PIPER_WASM_PATH
                    }
                );


                /*
                   IMPORTANT:

                   fallbackStrategy is deliberately "local".

                   The previous iPhone failure occurred while
                   attempting to load ONNX/WASM runtime pieces
                   through a remote CDN.

                   We have now self-hosted those runtime files,
                   so there is no reason to try the CDN runtime
                   first.
                */

                const session =
                    new module.TtsSession(
                        {
                            voiceId:
                                MOBILE_PIPER_VOICE,

                            allowLocalModels:
                                true,

                            fallbackStrategy:
                                "local",

                            wasmPaths:
                                {
                                    onnxWasm:
                                        ONNX_RUNTIME_PATH,

                                    piperData:
                                        PIPER_DATA_PATH,

                                    piperWasm:
                                        PIPER_WASM_PATH
                                },

                            progress:
                                reportProgress,

                            logger:
                                message => {

                                    console.log(
                                        "Piper:",
                                        message
                                    );
                                }
                        }
                    );


                piperSession =
                    session;


                console.log(
                    "Drowned Crown mobile Piper session created."
                );


                return piperSession;
            }
        )()
        .catch(
            error => {

                console.error(
                    "Could not create Piper session:",
                    error
                );


                piperSession =
                    null;


                piperSessionPromise =
                    null;


                throw error;
            }
        );


    return piperSessionPromise;
}


/* =========================================================
   ENSURE MOBILE NARRATOR
========================================================= */

export async function ensureMobileNarrator() {

    const session =
        await createPiperSession();


    console.log(
        "Drowned Crown mobile narrator ready.",
        {
            engine:
                "Piper",

            voice:
                MOBILE_PIPER_VOICE,

            runtime:
                "local-wasm"
        }
    );


    return session;
}


/* =========================================================
   NORMALIZE GENERATED AUDIO
========================================================= */

function normalizeAudioBlob(
    wav
) {

    if (
        wav instanceof Blob
    ) {

        return wav;
    }


    if (
        wav?.blob instanceof Blob
    ) {

        return wav.blob;
    }


    if (
        wav instanceof ArrayBuffer
    ) {

        return new Blob(
            [
                wav
            ],
            {
                type:
                    "audio/wav"
            }
        );
    }


    if (
        ArrayBuffer.isView(
            wav
        )
    ) {

        /*
           Slice the exact byte range represented by the view
           instead of blindly using the entire backing buffer.
        */

        const start =
            wav.byteOffset;


        const end =
            wav.byteOffset +
            wav.byteLength;


        const buffer =
            wav.buffer.slice(
                start,
                end
            );


        return new Blob(
            [
                buffer
            ],
            {
                type:
                    "audio/wav"
            }
        );
    }


    return null;
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


    if (
        !cleanText
    ) {

        throw new Error(
            "Cannot generate empty mobile narration."
        );
    }


    const narrator =
        await ensureMobileNarrator();


    console.log(
        "Mobile Piper generating:",
        {
            voice:
                MOBILE_PIPER_VOICE,

            characters:
                cleanText.length
        }
    );


    let wav;


    try {

        /*
           TtsSession.predict() receives the text directly.

           On first use Piper can obtain the selected voice
           model and store it in browser storage.

           Later requests can reuse that stored model.
        */

        wav =
            await narrator.predict(
                cleanText
            );

    }
    catch (
        error
    ) {

        console.error(
            "Piper generation failed:",
            error
        );


        throw error;
    }


    const blob =
        normalizeAudioBlob(
            wav
        );


    if (
        !blob
    ) {

        console.error(
            "Unexpected Piper output:",
            wav
        );


        throw new Error(
            "Mobile narrator did not return valid audio."
        );
    }


    if (
        blob.size <=
        0
    ) {

        throw new Error(
            "Mobile narrator returned an empty audio file."
        );
    }


    console.log(
        "Mobile narration generated.",
        {
            bytes:
                blob.size,

            type:
                blob.type ||
                "audio/wav"
        }
    );


    return blob;
}


/* =========================================================
   DIAGNOSTICS
========================================================= */

export function getMobileNarratorDiagnostics() {

    return {
        engine:
            "Piper",

        package:
            "@realtimex/piper-tts-web@1.1.1",

        voice:
            MOBILE_PIPER_VOICE,

        localRuntime:
            true,

        fallbackStrategy:
            "local",

        paths:
            {
                onnx:
                    ONNX_RUNTIME_PATH,

                piperData:
                    PIPER_DATA_PATH,

                piperWasm:
                    PIPER_WASM_PATH
            },

        moduleLoaded:
            Boolean(
                piperModule
            ),

        sessionCreated:
            Boolean(
                piperSession
            )
    };
}