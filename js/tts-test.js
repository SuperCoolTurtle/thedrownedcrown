"use strict";


/* =========================================
   THE DROWNED CROWN
   NARRATOR LABORATORY 3.1

   CACHE IDENTITY FIX

   - Persistent IndexedDB audio cache
   - Deterministic cache identities
   - Stable user-speed cache values
   - Performance-profile identity
   - Detailed cache diagnostics
   - Rolling three-chunk buffer
   - Paragraph navigation architecture
   - Existing 2.3 performance preserved
========================================= */


import {
    KokoroTTS
} from
"https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";


import {

    NARRATOR_VERSION,

    NARRATOR_PROFILE,

    normalizeNarrationText,

    normalizeParagraph,

    applyNarratorPronunciations,

    getPerformanceForText,

    getPauseAfterChunk

} from "../data/narrator-director.js";


import {

    createNarrationCacheKey,

    getCachedNarration,

    saveNarrationToCache,

    getNarrationCacheStats

} from "./narrator-cache.js";


/* =========================================
   DOM
========================================= */


const loadModelButton =
    document.getElementById(
        "loadModelButton"
    );


const generateButton =
    document.getElementById(
        "generateButton"
    );


const playButton =
    document.getElementById(
        "playButton"
    );


const stopButton =
    document.getElementById(
        "stopButton"
    );


const voiceSelect =
    document.getElementById(
        "voiceSelect"
    );


const speedInput =
    document.getElementById(
        "speedInput"
    );


const speedOutput =
    document.getElementById(
        "speedOutput"
    );


const narrationText =
    document.getElementById(
        "narrationText"
    );


const engineStatus =
    document.getElementById(
        "engineStatus"
    );


const loadingBar =
    document.getElementById(
        "loadingBar"
    );


const loadingBarFill =
    document.getElementById(
        "loadingBarFill"
    );


const loadingDetail =
    document.getElementById(
        "loadingDetail"
    );


const generationStatus =
    document.getElementById(
        "generationStatus"
    );


const audioPlayer =
    document.getElementById(
        "audioPlayer"
    );


/* =========================================
   MODEL
========================================= */


const MODEL_ID =
    "onnx-community/Kokoro-82M-v1.0-ONNX";


/*
    Explicit model identity.

    If we eventually switch Kokoro model,
    quantization, or another setting that can
    change the generated audio, change this.
*/


const MODEL_CACHE_VERSION =
    "kokoro-82m-v1.0-onnx-fp32-webgpu";


const MODEL_OPTIONS = {

    device:
        "webgpu",

    dtype:
        "fp32"

};


const TARGET_BUFFER_SIZE =
    3;


/* =========================================
   CACHE IDENTITY VERSION

   This is separate from NARRATOR_VERSION.

   Increment only if the structure used to
   identify cached narration changes.
========================================= */


const CACHE_IDENTITY_VERSION =
    "cache-identity-1";


/* =========================================
   STATE
========================================= */


let tts =
    null;


let modelLoading =
    false;


let narrationSession =
    0;


let narrationChunks =
    [];


let playbackIndex =
    -1;


let generationIndex =
    0;


let generatedBuffer =
    new Map();


let generationInProgress =
    false;


let continuousPlayback =
    false;


let playbackStarted =
    false;


let currentAudio =
    null;


let currentAudioURL =
    null;


let pauseTimer =
    null;


/*
    IMPORTANT:

    Voice and speed are frozen at the beginning
    of a narration session.

    This prevents the cache identity from
    changing while narration is underway.
*/


let sessionVoice =
    "";


let sessionUserSpeed =
    1;


/* =========================================
   STATISTICS
========================================= */


let sessionStartedAt =
    0;


let firstAudioReadyAt =
    0;


let firstPlaybackAt =
    0;


let totalGenerationSeconds =
    0;


let totalGeneratedAudioSeconds =
    0;


let generatedChunkCount =
    0;


let cacheHitCount =
    0;


let cacheMissCount =
    0;


let completedChunkCount =
    0;


let bufferUnderruns =
    0;


let largestBuffer =
    0;


/* =========================================
   STATUS
========================================= */


function setEngineStatus(
    status,
    detail = ""
) {

    engineStatus.textContent =
        status;


    if (detail) {

        loadingDetail.textContent =
            detail;

    }

}


function setLoadingProgress(
    progress
) {

    const safe =
        Math.max(
            0,
            Math.min(
                100,
                progress
            )
        );


    loadingBarFill.style.width =
        `${safe}%`;

}


/* =========================================
   MODEL LOADING
========================================= */


async function loadNarrator() {

    if (
        modelLoading ||
        tts
    ) {

        return;

    }


    modelLoading =
        true;


    loadModelButton.disabled =
        true;


    loadingBar.hidden =
        false;


    setLoadingProgress(
        0
    );


    setEngineStatus(
        "Loading",
        "Preparing local narrator..."
    );


    try {

        tts =
            await KokoroTTS.from_pretrained(
                MODEL_ID,
                {

                    ...MODEL_OPTIONS,

                    progress_callback:
                        handleModelProgress

                }
            );


        populateVoices();


        setLoadingProgress(
            100
        );


        generateButton.disabled =
            false;


        loadModelButton.textContent =
            "NARRATOR READY";


        setEngineStatus(
            "Ready",
            "Narrator 3.1 — deterministic cache enabled."
        );


        const stats =
            await getNarrationCacheStats();


        console.log(
            "Drowned Crown narration cache",
            {

                entries:
                    stats.entries,

                megabytes:
                    stats.megabytes
                        .toFixed(2),

                narratorVersion:
                    NARRATOR_VERSION,

                cacheIdentityVersion:
                    CACHE_IDENTITY_VERSION,

                modelCacheVersion:
                    MODEL_CACHE_VERSION

            }
        );


    } catch (error) {

        console.error(
            "Narrator load error:",
            error
        );


        tts =
            null;


        loadModelButton.disabled =
            false;


        loadModelButton.textContent =
            "TRY AGAIN";


        setEngineStatus(
            "Load failed",
            "Check F12 → Console."
        );


    } finally {

        modelLoading =
            false;

    }

}


function handleModelProgress(
    progress
) {

    if (
        typeof progress?.progress ===
        "number"
    ) {

        setLoadingProgress(
            progress.progress
        );

    }


    if (
        progress?.file
    ) {

        loadingDetail.textContent =
            `Loading ${progress.file}`;

    }

}


/* =========================================
   VOICES
========================================= */


function populateVoices() {

    let voices =
        [];


    const result =
        tts.list_voices();


    if (
        Array.isArray(result)
    ) {

        voices =
            result.map(
                voice =>
                    typeof voice === "string"
                        ? voice
                        : (
                            voice?.id ||
                            voice?.voice ||
                            voice?.name ||
                            ""
                        )
            );

    } else if (
        result &&
        typeof result === "object"
    ) {

        voices =
            Object.keys(result);

    }


    voices =
        voices.filter(Boolean);


    if (!voices.length) {

        voices = [

            "am_michael",
            "am_adam",
            "am_onyx",
            "am_eric",
            "am_fenrir",
            "am_liam",

            "bm_george",
            "bm_fable",
            "bm_lewis",
            "bm_daniel",

            "af_heart",
            "af_bella",
            "af_nicole",
            "af_sarah",

            "bf_emma",
            "bf_isabella",
            "bf_alice",
            "bf_lily"

        ];

    }


    const english =
        voices.filter(
            voice =>
                /^(am|af|bm|bf)_/
                    .test(voice)
        );


    const display =
        english.length
            ? english
            : voices;


    voiceSelect.innerHTML =
        "";


    display.forEach(
        voice => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                voice;


            option.textContent =
                formatVoiceName(
                    voice
                );


            voiceSelect.appendChild(
                option
            );

        }
    );


    const preferred = [

        "am_michael",
        "bm_george",
        "am_onyx",
        "bm_fable"

    ].find(
        voice =>
            display.includes(
                voice
            )
    );


    if (preferred) {

        voiceSelect.value =
            preferred;

    }


    voiceSelect.disabled =
        false;

}


function formatVoiceName(
    voice
) {

    const parts =
        voice.split("_");


    if (
        parts.length < 2
    ) {

        return voice;

    }


    const labels = {

        am:
            "American Male",

        af:
            "American Female",

        bm:
            "British Male",

        bf:
            "British Female"

    };


    const name =
        parts
            .slice(1)
            .join(" ")
            .replace(
                /\b\w/g,
                letter =>
                    letter.toUpperCase()
            );


    return (
        `${name} — ` +
        `${labels[parts[0]] || parts[0]}`
    );

}


/* =========================================
   PREPARE CHAPTER
========================================= */


function prepareNarrationChunks(
    source
) {

    const normalized =
        normalizeNarrationText(
            source
        );


    const paragraphs =
        normalized
            .split(/\n\s*\n+/)
            .map(
                normalizeParagraph
            )
            .filter(Boolean);


    const chunks =
        [];


    let previous =
        "";


    paragraphs.forEach(
        (
            paragraph,
            paragraphIndex
        ) => {

            const performance =
                getPerformanceForText(
                    paragraph,
                    previous
                );


            const pieces =
                splitParagraph(
                    paragraph,
                    paragraphIndex
                );


            pieces.forEach(
                (
                    text,
                    partIndex
                ) => {

                    chunks.push({

                        chunkIndex:
                            chunks.length,

                        paragraphIndex,

                        partIndex,

                        text,

                        speechText:
                            applyNarratorPronunciations(
                                text
                            ),

                        performance:
                            {
                                ...performance
                            },

                        sceneBreak:
                            false

                    });

                }
            );


            previous =
                paragraph;

        }
    );


    return chunks;

}


/* =========================================
   CHUNKING
========================================= */


function splitParagraph(
    paragraph,
    paragraphIndex
) {

    const target =
        paragraphIndex === 0
            ? NARRATOR_PROFILE
                .chunking
                .startupTarget
            : NARRATOR_PROFILE
                .chunking
                .normalTarget;


    const maximum =
        NARRATOR_PROFILE
            .chunking
            .hardMaximum;


    if (
        paragraph.length <= target
    ) {

        return [
            paragraph
        ];

    }


    const sentences =
        splitIntoSentences(
            paragraph
        );


    const pieces =
        [];


    let working =
        "";


    sentences.forEach(
        sentence => {

            const candidate =
                working
                    ? `${working} ${sentence}`
                    : sentence;


            if (
                candidate.length <= target
            ) {

                working =
                    candidate;


                return;

            }


            if (working) {

                pieces.push(
                    working
                );


                working =
                    "";

            }


            if (
                sentence.length > maximum
            ) {

                pieces.push(
                    ...splitLongSentence(
                        sentence,
                        target,
                        maximum
                    )
                );

            } else {

                working =
                    sentence;

            }

        }
    );


    if (working) {

        pieces.push(
            working
        );

    }


    return pieces;

}


function splitIntoSentences(
    text
) {

    return (
        text.match(
            /[^.!?—]+(?:[.!?]+["'”’]?|—)|[^.!?—]+$/g
        )
        ||
        [text]
    )
        .map(
            sentence =>
                sentence.trim()
        )
        .filter(Boolean);

}


function splitLongSentence(
    sentence,
    target,
    maximum
) {

    const clauses =
        sentence
            .split(
                /(?<=[,;:])\s+/
            )
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);


    if (
        clauses.length <= 1
    ) {

        return hardSplit(
            sentence,
            maximum
        );

    }


    const pieces =
        [];


    let working =
        "";


    clauses.forEach(
        clause => {

            const candidate =
                working
                    ? `${working} ${clause}`
                    : clause;


            if (
                candidate.length <= target
            ) {

                working =
                    candidate;


                return;

            }


            if (working) {

                pieces.push(
                    working
                );

            }


            if (
                clause.length > maximum
            ) {

                pieces.push(
                    ...hardSplit(
                        clause,
                        maximum
                    )
                );


                working =
                    "";

            } else {

                working =
                    clause;

            }

        }
    );


    if (working) {

        pieces.push(
            working
        );

    }


    return pieces;

}


function hardSplit(
    text,
    maximum
) {

    const words =
        text.split(/\s+/);


    const pieces =
        [];


    let working =
        "";


    words.forEach(
        word => {

            const candidate =
                working
                    ? `${working} ${word}`
                    : word;


            if (
                candidate.length > maximum &&
                working
            ) {

                pieces.push(
                    working
                );


                working =
                    word;

            } else {

                working =
                    candidate;

            }

        }
    );


    if (working) {

        pieces.push(
            working
        );

    }


    return pieces;

}


/* =========================================
   WAV
========================================= */


function createWavBlob(
    generatedAudio
) {

    const samples =
        generatedAudio.audio;


    const sampleRate =
        generatedAudio.sampling_rate;


    const buffer =
        new ArrayBuffer(
            44 +
            samples.length * 2
        );


    const view =
        new DataView(
            buffer
        );


    function writeString(
        offset,
        value
    ) {

        for (
            let i = 0;
            i < value.length;
            i += 1
        ) {

            view.setUint8(
                offset + i,
                value.charCodeAt(i)
            );

        }

    }


    writeString(
        0,
        "RIFF"
    );


    view.setUint32(
        4,
        36 + samples.length * 2,
        true
    );


    writeString(
        8,
        "WAVE"
    );


    writeString(
        12,
        "fmt "
    );


    view.setUint32(
        16,
        16,
        true
    );


    view.setUint16(
        20,
        1,
        true
    );


    view.setUint16(
        22,
        1,
        true
    );


    view.setUint32(
        24,
        sampleRate,
        true
    );


    view.setUint32(
        28,
        sampleRate * 2,
        true
    );


    view.setUint16(
        32,
        2,
        true
    );


    view.setUint16(
        34,
        16,
        true
    );


    writeString(
        36,
        "data"
    );


    view.setUint32(
        40,
        samples.length * 2,
        true
    );


    let offset =
        44;


    for (
        let i = 0;
        i < samples.length;
        i += 1
    ) {

        const sample =
            Math.max(
                -1,
                Math.min(
                    1,
                    samples[i]
                )
            );


        const value =
            sample < 0
                ? sample * 0x8000
                : sample * 0x7fff;


        view.setInt16(
            offset,
            value,
            true
        );


        offset +=
            2;

    }


    return new Blob(
        [buffer],
        {
            type:
                "audio/wav"
        }
    );

}


/* =========================================
   CACHE IDENTITY

   This is the important 3.1 correction.

   Every component is converted into a stable
   primitive value BEFORE the SHA-256 key is
   created.
========================================= */


function getStableCacheIdentity(
    chunk
) {

    const userSpeed =
        Number(
            sessionUserSpeed
        );


    const performanceSpeed =
        Number(
            chunk.performance?.speed ??
            1
        );


    const directedSpeed =
        userSpeed *
        performanceSpeed;


    /*
        Stable fixed precision prevents tiny
        floating-point differences from
        creating different cache identities.
    */


    const stableUserSpeed =
        userSpeed.toFixed(4);


    const stablePerformanceSpeed =
        performanceSpeed.toFixed(4);


    const stableDirectedSpeed =
        directedSpeed.toFixed(4);


    const speaker =
        String(
            chunk.performance?.speaker ||
            "narrator"
        );


    const delivery =
        String(
            chunk.performance?.delivery ||
            ""
        );


    const energy =
        String(
            chunk.performance?.energy ||
            ""
        );


    const warmth =
        String(
            chunk.performance?.warmth ||
            ""
        );


    const dialogue =
        Boolean(
            chunk.performance?.dialogue
        );


    const dramatic =
        Boolean(
            chunk.performance?.dramatic
        );


    /*
        The identity text is deliberately
        explicit and ordered.

        createNarrationCacheKey() will hash this
        stable identity.
    */


    const identityText = [

        `cache=${CACHE_IDENTITY_VERSION}`,

        `director=${NARRATOR_VERSION}`,

        `model=${MODEL_CACHE_VERSION}`,

        `voice=${sessionVoice}`,

        `userSpeed=${stableUserSpeed}`,

        `performanceSpeed=${stablePerformanceSpeed}`,

        `directedSpeed=${stableDirectedSpeed}`,

        `speaker=${speaker}`,

        `delivery=${delivery}`,

        `energy=${energy}`,

        `warmth=${warmth}`,

        `dialogue=${dialogue}`,

        `dramatic=${dramatic}`,

        `text=${chunk.speechText}`

    ].join("\n");


    return {

        identityText,

        userSpeed:
            stableUserSpeed,

        performanceSpeed:
            stablePerformanceSpeed,

        directedSpeed:
            stableDirectedSpeed,

        speaker,

        delivery,

        energy,

        warmth,

        dialogue,

        dramatic

    };

}


/* =========================================
   CREATE STABLE CACHE KEY
========================================= */


async function getCacheKeyForChunk(
    chunk
) {

    const identity =
        getStableCacheIdentity(
            chunk
        );


    /*
        narrator-cache.js already hashes its
        input.

        We deliberately pass our complete
        identity through the text field and use
        fixed constants for the remaining
        fields.

        That guarantees the exact same identity
        produces the exact same SHA-256 key.
    */


    const key =
        await createNarrationCacheKey({

            text:
                identity.identityText,

            voice:
                sessionVoice,

            speed:
                1,

            model:
                MODEL_CACHE_VERSION,

            narratorVersion:
                (
                    `${NARRATOR_VERSION}|` +
                    `${CACHE_IDENTITY_VERSION}`
                )

        });


    return {

        key,

        identity

    };

}


/* =========================================
   START SESSION
========================================= */


function startNarration() {

    if (!tts) {

        return;

    }


    const text =
        narrationText.value
            .trim();


    if (!text) {

        generationStatus.textContent =
            "Enter a passage first.";


        return;

    }


    if (
        !voiceSelect.value
    ) {

        generationStatus.textContent =
            "Choose a narrator voice.";


        return;

    }


    /*
        Stop the previous session FIRST.
    */


    stopNarration();


    /*
        Freeze the synthesis settings.

        From this point onward, every chunk in
        this session uses exactly these values.
    */


    sessionVoice =
        String(
            voiceSelect.value
        );


    sessionUserSpeed =
        Number(
            speedInput.value
        ) || 1;


    narrationSession +=
        1;


    narrationChunks =
        prepareNarrationChunks(
            text
        );


    if (
        narrationChunks.length === 0
    ) {

        generationStatus.textContent =
            "No readable text found.";


        return;

    }


    resetSessionState();


    continuousPlayback =
        true;


    generateButton.disabled =
        true;


    stopButton.disabled =
        false;


    playButton.disabled =
        true;


    console.log(
        "Drowned Crown Narrator 3.1 session",
        {

            chunks:
                narrationChunks.length,

            voice:
                sessionVoice,

            userSpeed:
                sessionUserSpeed.toFixed(4),

            narratorVersion:
                NARRATOR_VERSION,

            cacheIdentityVersion:
                CACHE_IDENTITY_VERSION,

            modelCacheVersion:
                MODEL_CACHE_VERSION

        }
    );


    maintainBuffer(
        narrationSession
    );

}


/* =========================================
   RESET SESSION STATE
========================================= */


function resetSessionState() {

    playbackIndex =
        -1;


    generationIndex =
        0;


    generatedBuffer =
        new Map();


    generationInProgress =
        false;


    playbackStarted =
        false;


    sessionStartedAt =
        performance.now();


    firstAudioReadyAt =
        0;


    firstPlaybackAt =
        0;


    totalGenerationSeconds =
        0;


    totalGeneratedAudioSeconds =
        0;


    generatedChunkCount =
        0;


    cacheHitCount =
        0;


    cacheMissCount =
        0;


    completedChunkCount =
        0;


    bufferUnderruns =
        0;


    largestBuffer =
        0;

}


/* =========================================
   MAINTAIN ROLLING BUFFER
========================================= */


async function maintainBuffer(
    session
) {

    if (
        generationInProgress ||
        session !== narrationSession
    ) {

        return;

    }


    generationInProgress =
        true;


    try {

        while (
            session === narrationSession &&
            generationIndex <
                narrationChunks.length &&
            getAheadBufferCount() <
                TARGET_BUFFER_SIZE
        ) {

            const index =
                generationIndex;


            generationIndex +=
                1;


            await obtainChunkAudio(
                index,
                session
            );


            if (
                session !==
                narrationSession
            ) {

                return;

            }


            if (
                continuousPlayback &&
                !currentAudio &&
                !pauseTimer
            ) {

                attemptPlayback();

            }

        }


    } catch (error) {

        console.error(
            "Narration buffer error:",
            error
        );


        generationStatus.textContent =
            "Narration error. Check Console.";


    } finally {

        generationInProgress =
            false;


        if (
            session === narrationSession &&
            generationIndex <
                narrationChunks.length &&
            getAheadBufferCount() <
                TARGET_BUFFER_SIZE
        ) {

            setTimeout(
                () => {

                    maintainBuffer(
                        session
                    );

                },
                0
            );

        }


        updateStatus();

    }

}


/* =========================================
   OBTAIN AUDIO

   CACHE FIRST.
   KOKORO SECOND.
========================================= */


async function obtainChunkAudio(
    index,
    session
) {

    const chunk =
        narrationChunks[index];


    if (!chunk) {

        return;

    }


    const {
        key,
        identity
    } =
        await getCacheKeyForChunk(
            chunk
        );


    if (
        session !== narrationSession
    ) {

        return;

    }


    /*
        Show a shortened key in the console.

        This makes it very easy to verify that
        the same passage gets the same key after
        refreshing.
    */


    const shortKey =
        key.slice(
            0,
            16
        );


    let cached =
        null;


    try {

        cached =
            await getCachedNarration(
                key
            );

    } catch (error) {

        console.warn(
            "Cache lookup failed:",
            error
        );

    }


    if (
        session !== narrationSession
    ) {

        return;

    }


    /* =====================================
       CACHE HIT
    ===================================== */


    if (
        cached &&
        cached.blob instanceof Blob
    ) {

        cacheHitCount +=
            1;


        const url =
            URL.createObjectURL(
                cached.blob
            );


        generatedBuffer.set(
            index,
            {

                ...chunk,

                url,

                audioSeconds:
                    Number(
                        cached.audioSeconds
                    ) || 0,

                fromCache:
                    true,

                cacheKey:
                    key

            }
        );


        largestBuffer =
            Math.max(
                largestBuffer,
                generatedBuffer.size
            );


        if (
            !firstAudioReadyAt
        ) {

            firstAudioReadyAt =
                performance.now();

        }


        console.log(
            `CACHE HIT — chunk ${index + 1}/${narrationChunks.length}`,
            {

                key:
                    shortKey,

                paragraph:
                    chunk.paragraphIndex,

                part:
                    chunk.partIndex,

                voice:
                    sessionVoice,

                userSpeed:
                    identity.userSpeed,

                directedSpeed:
                    identity.directedSpeed,

                speaker:
                    identity.speaker,

                audioSeconds:
                    Number(
                        cached.audioSeconds || 0
                    ).toFixed(2),

                text:
                    chunk.text

            }
        );


        return;

    }


    /* =====================================
       CACHE MISS
    ===================================== */


    cacheMissCount +=
        1;


    console.log(
        `CACHE MISS — chunk ${index + 1}/${narrationChunks.length}`,
        {

            key:
                shortKey,

            paragraph:
                chunk.paragraphIndex,

            part:
                chunk.partIndex,

            voice:
                sessionVoice,

            userSpeed:
                identity.userSpeed,

            performanceSpeed:
                identity.performanceSpeed,

            directedSpeed:
                identity.directedSpeed,

            speaker:
                identity.speaker,

            reason:
                "No matching persistent audio record",

            text:
                chunk.text

        }
    );


    /*
        Convert our stable directed-speed string
        back to a number only at the moment it is
        passed to Kokoro.
    */


    const synthesisSpeed =
        Number(
            identity.directedSpeed
        );


    const started =
        performance.now();


    const generatedAudio =
        await tts.generate(
            chunk.speechText,
            {

                voice:
                    sessionVoice,

                speed:
                    synthesisSpeed

            }
        );


    if (
        session !== narrationSession
    ) {

        return;

    }


    const generationSeconds =
        (
            performance.now() -
            started
        ) /
        1000;


    const audioSeconds =
        generatedAudio.audio.length /
        generatedAudio.sampling_rate;


    const blob =
        createWavBlob(
            generatedAudio
        );


    /* =====================================
       SAVE PERSISTENTLY
    ===================================== */


    try {

        await saveNarrationToCache({

            key,

            blob,

            audioSeconds,

            metadata: {

                cacheIdentityVersion:
                    CACHE_IDENTITY_VERSION,

                narratorVersion:
                    NARRATOR_VERSION,

                model:
                    MODEL_CACHE_VERSION,

                voice:
                    sessionVoice,

                userSpeed:
                    identity.userSpeed,

                performanceSpeed:
                    identity.performanceSpeed,

                directedSpeed:
                    identity.directedSpeed,

                speaker:
                    identity.speaker,

                delivery:
                    identity.delivery,

                energy:
                    identity.energy,

                warmth:
                    identity.warmth,

                dialogue:
                    identity.dialogue,

                dramatic:
                    identity.dramatic,

                paragraphIndex:
                    chunk.paragraphIndex,

                partIndex:
                    chunk.partIndex,

                text:
                    chunk.speechText

            }

        });


        console.log(
            `CACHE SAVED — chunk ${index + 1}`,
            {

                key:
                    shortKey,

                megabytes:
                    (
                        blob.size /
                        1024 /
                        1024
                    ).toFixed(3)

            }
        );


    } catch (error) {

        /*
            Narration itself should continue if
            persistent storage fails.
        */


        console.warn(
            "Cache save failed:",
            error
        );

    }


    if (
        session !== narrationSession
    ) {

        return;

    }


    const url =
        URL.createObjectURL(
            blob
        );


    generatedBuffer.set(
        index,
        {

            ...chunk,

            url,

            audioSeconds,

            generationSeconds,

            fromCache:
                false,

            cacheKey:
                key

        }
    );


    generatedChunkCount +=
        1;


    totalGenerationSeconds +=
        generationSeconds;


    totalGeneratedAudioSeconds +=
        audioSeconds;


    largestBuffer =
        Math.max(
            largestBuffer,
            generatedBuffer.size
        );


    if (
        !firstAudioReadyAt
    ) {

        firstAudioReadyAt =
            performance.now();

    }


    console.log(
        `GENERATED — chunk ${index + 1}/${narrationChunks.length}`,
        {

            key:
                shortKey,

            generationSeconds:
                generationSeconds.toFixed(2),

            audioSeconds:
                audioSeconds.toFixed(2),

            realtimeFactor:
                audioSeconds > 0
                    ? (
                        generationSeconds /
                        audioSeconds
                    ).toFixed(2)
                    : "0.00",

            buffer:
                generatedBuffer.size

        }
    );

}


/* =========================================
   BUFFER COUNT
========================================= */


function getAheadBufferCount() {

    let count =
        0;


    generatedBuffer.forEach(
        (
            item,
            index
        ) => {

            if (
                index > playbackIndex
            ) {

                count +=
                    1;

            }

        }
    );


    return count;

}


/* =========================================
   PLAYBACK
========================================= */


function attemptPlayback() {

    if (
        !continuousPlayback ||
        currentAudio ||
        pauseTimer
    ) {

        return;

    }


    const nextIndex =
        playbackIndex + 1;


    if (
        nextIndex >=
        narrationChunks.length
    ) {

        finishNarration();


        return;

    }


    if (
        !generatedBuffer.has(
            nextIndex
        )
    ) {

        if (
            playbackStarted
        ) {

            bufferUnderruns +=
                1;


            console.warn(
                `Buffer underrun before chunk ${nextIndex + 1}`
            );

        }


        maintainBuffer(
            narrationSession
        );


        return;

    }


    playGeneratedChunk(
        nextIndex
    );

}


function playGeneratedChunk(
    index
) {

    const item =
        generatedBuffer.get(
            index
        );


    if (!item) {

        return;

    }


    generatedBuffer.delete(
        index
    );


    playbackIndex =
        index;


    currentAudioURL =
        item.url;


    currentAudio =
        new Audio(
            currentAudioURL
        );


    currentAudio.preload =
        "auto";


    currentAudio.addEventListener(
        "ended",
        handleAudioEnded,
        {
            once:
                true
        }
    );


    currentAudio.addEventListener(
        "error",
        handleAudioError,
        {
            once:
                true
        }
    );


    currentAudio
        .play()
        .then(
            () => {

                if (
                    !playbackStarted
                ) {

                    playbackStarted =
                        true;


                    firstPlaybackAt =
                        performance.now();


                    const startup =
                        (
                            firstPlaybackAt -
                            sessionStartedAt
                        ) /
                        1000;


                    console.log(
                        "Drowned Crown playback started",
                        {

                            seconds:
                                startup.toFixed(2),

                            firstChunkCached:
                                item.fromCache,

                            key:
                                item.cacheKey
                                    ?.slice(
                                        0,
                                        16
                                    )

                        }
                    );

                }

            }
        )
        .catch(
            error => {

                if (
                    error.name !==
                    "AbortError"
                ) {

                    console.error(
                        "Playback error:",
                        error
                    );

                }

            }
        );


    maintainBuffer(
        narrationSession
    );


    updateStatus();

}


/* =========================================
   AUDIO ENDED
========================================= */


function handleAudioEnded() {

    completedChunkCount +=
        1;


    const finishedIndex =
        playbackIndex;


    cleanupCurrentAudio();


    const chunk =
        narrationChunks[
            finishedIndex
        ];


    const next =
        narrationChunks[
            finishedIndex + 1
        ] || null;


    const pause =
        getPauseAfterChunk(
            chunk,
            next
        );


    maintainBuffer(
        narrationSession
    );


    if (
        pause > 0 &&
        continuousPlayback
    ) {

        pauseTimer =
            setTimeout(
                () => {

                    pauseTimer =
                        null;


                    attemptPlayback();

                },
                pause
            );

    } else {

        attemptPlayback();

    }


    updateStatus();

}


function handleAudioError(
    event
) {

    console.error(
        "Narration audio error:",
        event
    );


    cleanupCurrentAudio();


    attemptPlayback();

}


/* =========================================
   NAVIGATION
========================================= */


function findFirstChunkForParagraph(
    paragraphIndex
) {

    return narrationChunks.findIndex(
        chunk =>
            chunk.paragraphIndex ===
            paragraphIndex
    );

}


function getCurrentParagraphIndex() {

    if (
        playbackIndex < 0
    ) {

        return 0;

    }


    return (
        narrationChunks[
            playbackIndex
        ]?.paragraphIndex ??
        0
    );

}


function jumpToChunk(
    targetIndex
) {

    if (
        !narrationChunks.length
    ) {

        return;

    }


    const safeIndex =
        Math.max(
            0,
            Math.min(
                narrationChunks.length - 1,
                Number(targetIndex) || 0
            )
        );


    narrationSession +=
        1;


    clearPauseTimer();


    cleanupCurrentAudio();


    releaseBufferedAudio();


    playbackIndex =
        safeIndex - 1;


    generationIndex =
        safeIndex;


    generationInProgress =
        false;


    continuousPlayback =
        true;


    console.log(
        "Narrator jump",
        {

            chunk:
                safeIndex,

            paragraph:
                narrationChunks[
                    safeIndex
                ].paragraphIndex

        }
    );


    maintainBuffer(
        narrationSession
    );

}


function jumpToParagraph(
    paragraphIndex
) {

    const target =
        findFirstChunkForParagraph(
            Number(paragraphIndex)
        );


    if (
        target === -1
    ) {

        console.warn(
            "Paragraph not found:",
            paragraphIndex
        );


        return;

    }


    jumpToChunk(
        target
    );

}


function previousParagraph() {

    const current =
        getCurrentParagraphIndex();


    jumpToParagraph(
        Math.max(
            0,
            current - 1
        )
    );

}


function nextParagraph() {

    const current =
        getCurrentParagraphIndex();


    const lastParagraph =
        narrationChunks.reduce(
            (
                highest,
                chunk
            ) => {

                return Math.max(
                    highest,
                    chunk.paragraphIndex
                );

            },
            0
        );


    jumpToParagraph(
        Math.min(
            lastParagraph,
            current + 1
        )
    );

}


/* =========================================
   CONSOLE TEST API
========================================= */


window.DrownedCrownNarrator = {

    nextParagraph,

    previousParagraph,

    jumpToParagraph,


    getCurrentParagraphIndex,


    getState() {

        return {

            playbackIndex,

            generationIndex,

            currentParagraph:
                getCurrentParagraphIndex(),

            chunks:
                narrationChunks.length,

            buffer:
                generatedBuffer.size,

            cacheHits:
                cacheHitCount,

            cacheMisses:
                cacheMissCount,

            voice:
                sessionVoice,

            userSpeed:
                sessionUserSpeed,

            narratorVersion:
                NARRATOR_VERSION,

            cacheIdentityVersion:
                CACHE_IDENTITY_VERSION

        };

    },


    async inspectCache() {

        const stats =
            await getNarrationCacheStats();


        console.log(
            "Drowned Crown persistent cache",
            {

                entries:
                    stats.entries,

                megabytes:
                    stats.megabytes
                        .toFixed(2)

            }
        );


        return stats;

    },


    async inspectCurrentChunkKey() {

        if (
            !narrationChunks.length
        ) {

            console.warn(
                "No narration session prepared."
            );


            return null;

        }


        const index =
            Math.max(
                0,
                playbackIndex
            );


        const chunk =
            narrationChunks[
                index
            ];


        const result =
            await getCacheKeyForChunk(
                chunk
            );


        console.log(
            "Current chunk cache identity",
            {

                chunk:
                    index,

                key:
                    result.key,

                identity:
                    result.identity

            }
        );


        return result;

    }

};


/* =========================================
   PLAY / PAUSE
========================================= */


async function playNarration() {

    continuousPlayback =
        true;


    if (
        currentAudio
    ) {

        try {

            await currentAudio.play();

        } catch (error) {

            if (
                error.name !==
                "AbortError"
            ) {

                console.error(
                    "Resume error:",
                    error
                );

            }

        }


        return;

    }


    attemptPlayback();


    maintainBuffer(
        narrationSession
    );

}


function pauseNarration() {

    continuousPlayback =
        false;


    clearPauseTimer();


    if (
        currentAudio &&
        !currentAudio.paused
    ) {

        currentAudio.pause();

    }


    updateStatus();

}


/* =========================================
   CLEANUP
========================================= */


function clearPauseTimer() {

    if (
        pauseTimer
    ) {

        clearTimeout(
            pauseTimer
        );


        pauseTimer =
            null;

    }

}


function cleanupCurrentAudio() {

    const audio =
        currentAudio;


    const url =
        currentAudioURL;


    currentAudio =
        null;


    currentAudioURL =
        null;


    if (audio) {

        try {

            audio.pause();

        } catch (error) {

            console.warn(
                "Audio cleanup warning:",
                error
            );

        }


        audio.removeAttribute(
            "src"
        );

    }


    if (url) {

        URL.revokeObjectURL(
            url
        );

    }

}


function releaseBufferedAudio() {

    generatedBuffer.forEach(
        item => {

            if (
                item.url
            ) {

                URL.revokeObjectURL(
                    item.url
                );

            }

        }
    );


    generatedBuffer.clear();

}


/* =========================================
   FINISH
========================================= */


async function finishNarration() {

    continuousPlayback =
        false;


    generateButton.disabled =
        false;


    playButton.disabled =
        true;


    stopButton.disabled =
        true;


    const startup =
        firstPlaybackAt
            ? (
                (
                    firstPlaybackAt -
                    sessionStartedAt
                ) /
                1000
            )
            : 0;


    let cacheStats =
        {
            entries:
                0,

            megabytes:
                0
        };


    try {

        cacheStats =
            await getNarrationCacheStats();

    } catch (error) {

        console.warn(
            "Could not read final cache stats:",
            error
        );

    }


    generationStatus.textContent =
        (
            `Finished — ` +
            `${cacheHitCount} cached, ` +
            `${cacheMissCount} generated.`
        );


    console.log(
        "DROWNED CROWN NARRATOR 3.1 RESULTS",
        {

            chunks:
                narrationChunks.length,

            played:
                completedChunkCount,

            startupSeconds:
                startup.toFixed(2),

            cacheHits:
                cacheHitCount,

            cacheMisses:
                cacheMissCount,

            newlyGeneratedChunks:
                generatedChunkCount,

            totalGenerationSeconds:
                totalGenerationSeconds
                    .toFixed(2),

            totalGeneratedAudioSeconds:
                totalGeneratedAudioSeconds
                    .toFixed(2),

            bufferUnderruns,

            largestBuffer,

            persistentCacheEntries:
                cacheStats.entries,

            persistentCacheMB:
                Number(
                    cacheStats.megabytes
                ).toFixed(2),

            narratorVersion:
                NARRATOR_VERSION,

            cacheIdentityVersion:
                CACHE_IDENTITY_VERSION

        }
    );

}


/* =========================================
   STOP
========================================= */


function stopNarration() {

    narrationSession +=
        1;


    continuousPlayback =
        false;


    generationInProgress =
        false;


    clearPauseTimer();


    cleanupCurrentAudio();


    releaseBufferedAudio();


    if (
        audioPlayer
    ) {

        audioPlayer.pause();


        audioPlayer.removeAttribute(
            "src"
        );


        audioPlayer.hidden =
            true;

    }


    playButton.disabled =
        true;


    stopButton.disabled =
        true;


    if (
        tts
    ) {

        generateButton.disabled =
            false;

    }

}


/* =========================================
   STATUS
========================================= */


function updateStatus() {

    if (
        !narrationChunks.length
    ) {

        return;

    }


    const paragraph =
        getCurrentParagraphIndex();


    if (
        currentAudio
    ) {

        generationStatus.textContent =
            (
                `Paragraph ${paragraph + 1} — ` +
                `buffer ${generatedBuffer.size} — ` +
                `${cacheHitCount} cached / ` +
                `${cacheMissCount} generated`
            );


        return;

    }


    if (
        pauseTimer
    ) {

        generationStatus.textContent =
            (
                `Narrative pause — ` +
                `buffer ${generatedBuffer.size}`
            );


        return;

    }


    generationStatus.textContent =
        (
            `Preparing paragraph ` +
            `${paragraph + 1} — ` +
            `${cacheHitCount} cached / ` +
            `${cacheMissCount} generated`
        );

}


/* =========================================
   SPEED DISPLAY
========================================= */


function updateSpeedDisplay() {

    speedOutput.textContent =
        (
            `${Number(
                speedInput.value
            ).toFixed(2)}×`
        );

}


/* =========================================
   EVENTS
========================================= */


loadModelButton.addEventListener(
    "click",
    loadNarrator
);


generateButton.addEventListener(
    "click",
    startNarration
);


playButton.addEventListener(
    "click",
    () => {

        if (
            currentAudio &&
            !currentAudio.paused
        ) {

            pauseNarration();

        } else {

            playNarration();

        }

    }
);


stopButton.addEventListener(
    "click",
    stopNarration
);


speedInput.addEventListener(
    "input",
    updateSpeedDisplay
);


window.addEventListener(
    "beforeunload",
    stopNarration
);


updateSpeedDisplay();