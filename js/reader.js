import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

import {
    MOBILE_PIPER_VOICE,
    MOBILE_PIPER_VOICE_LABEL,
    ensureMobileNarrator,
    generateMobileNarration
} from "./mobile-narrator.js";

import {
    NARRATOR_VERSION,
    NARRATOR_PROFILE,
    normalizeParagraph,
    applyNarratorPronunciations,
    getPerformanceForText,
    getPauseAfterChunk
} from "../data/narrator-director.js";

import {
    createNarrationCacheKey,
    getCachedNarration,
    saveNarrationToCache
} from "./narrator-cache.js";

"use strict";


/* =========================================================
   THE DROWNED CROWN
   READER + NARRATION 3.5

   DESKTOP:
   Kokoro-82M
   WebGPU + FP32

   MOBILE:
   Piper
   WASM
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const chapterLabel =
    document.getElementById(
        "chapterLabel"
    );

const chapterPOV =
    document.getElementById(
        "chapterPOV"
    );

const chapterLocation =
    document.getElementById(
        "chapterLocation"
    );

const chapterText =
    document.getElementById(
        "chapterText"
    );

const headerChapterTitle =
    document.getElementById(
        "headerChapterTitle"
    );


const previousChapter =
    document.getElementById(
        "previousChapter"
    );

const previousChapterName =
    document.getElementById(
        "previousChapterName"
    );

const nextChapter =
    document.getElementById(
        "nextChapter"
    );

const nextChapterName =
    document.getElementById(
        "nextChapterName"
    );


const settingsButton =
    document.getElementById(
        "settingsButton"
    );

const settingsPanel =
    document.getElementById(
        "settingsPanel"
    );

const closeSettings =
    document.getElementById(
        "closeSettings"
    );


const listenButton =
    document.getElementById(
        "listenButton"
    );

const narrationPlayer =
    document.getElementById(
        "narrationPlayer"
    );

const narrationChapter =
    document.getElementById(
        "narrationChapter"
    );

const narrationPosition =
    document.getElementById(
        "narrationPosition"
    );

const narrationSeek =
    document.getElementById(
        "narrationSeek"
    );

const narrationSeekFill =
    document.getElementById(
        "narrationSeekFill"
    );


const previousParagraph =
    document.getElementById(
        "previousParagraph"
    );

const playPause =
    document.getElementById(
        "playPause"
    );

const nextParagraph =
    document.getElementById(
        "nextParagraph"
    );

const stopNarration =
    document.getElementById(
        "stopNarration"
    );

const closeNarration =
    document.getElementById(
        "closeNarration"
    );


const voiceSelect =
    document.getElementById(
        "voiceSelect"
    );

const speedSelect =
    document.getElementById(
        "speedSelect"
    );

const narrationSource =
    document.getElementById(
        "narrationSource"
    );

const voiceSelectGroup =
    document.getElementById(
        "voiceSelectGroup"
    );


const readingProgressBar =
    document.getElementById(
        "readingProgressBar"
    );

const readingPercentage =
    document.getElementById(
        "readingPercentage"
    );


/* =========================================================
   READER STATE
========================================================= */

let currentChapter =
    null;

let narrationParagraphs =
    [];

let currentParagraphIndex =
    0;

let currentUtterance =
    null;


let isNarrating =
    false;

let isPaused =
    false;

let narrationSession =
    0;


let voices =
    [];


/* =========================================================
   URL
========================================================= */

function getRequestedChapterId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return (
        params.get(
            "chapter"
        ) ||
        "prologue"
    );
}


/* =========================================================
   CHAPTER PROGRESS
========================================================= */

function getChapterProgressLevel(
    chapterId
) {

    const chapterIndex =
        CHAPTERS.findIndex(
            chapter =>
                chapter.id ===
                chapterId
        );


    if (
        chapterIndex ===
        -1
    ) {
        return 0;
    }


    return (
        chapterIndex +
        1
    );
}


function saveFurthestProgress(
    chapterId
) {

    const newLevel =
        getChapterProgressLevel(
            chapterId
        );


    const oldLevel =
        Number(
            localStorage.getItem(
                "drownedCrownFurthestChapter"
            )
        ) || 0;


    if (
        newLevel >
        oldLevel
    ) {

        localStorage.setItem(
            "drownedCrownFurthestChapter",
            String(
                newLevel
            )
        );
    }
}


/* =========================================================
   LOAD CHAPTER
========================================================= */

async function loadChapter() {

    const requestedId =
        getRequestedChapterId();


    const chapter =
        getChapterById(
            requestedId
        );


    if (!chapter) {

        showChapterError(
            "This chapter could not be found."
        );


        return;
    }


    currentChapter =
        chapter;


    document.title =
        `${chapter.label} | The Drowned Crown`;


    chapterLabel.textContent =
        chapter.label;

    chapterPOV.textContent =
        chapter.pov;

    chapterLocation.textContent =
        chapter.location;

    headerChapterTitle.textContent =
        chapter.label;


    narrationChapter.textContent =
        `${chapter.label} — ${chapter.pov}`;


    try {

        const response =
            await fetch(
                chapter.file
            );


        if (!response.ok) {

            throw new Error(
                `Chapter request failed: ${response.status}`
            );
        }


        const html =
            await response.text();


        chapterText.innerHTML =
            html;


        prepareChapterText();

        buildChapterNavigation();

        saveChapterProgress();

        restoreNarrationPosition();

        updateNarrationDisplay();

        updateReadingProgress();

    } catch (error) {

        console.error(
            error
        );


        showChapterError(
            "The chapter could not be loaded. Make sure the site is being opened through Live Server."
        );
    }
}


/* =========================================================
   ERROR
========================================================= */

function showChapterError(
    message
) {

    chapterText.innerHTML =
        `
            <p class="loading-message">
                ${message}
            </p>
        `;
}


/* =========================================================
   PREPARE CHAPTER
========================================================= */

function prepareChapterText() {

    narrationParagraphs =
        Array.from(
            chapterText.querySelectorAll(
                "p"
            )
        )
        .filter(
            paragraph =>
                paragraph
                    .textContent
                    .trim()
                    .length >
                0
        );


    narrationParagraphs.forEach(
        (
            paragraph,
            index
        ) => {

            paragraph.dataset.narrationIndex =
                String(
                    index
                );
        }
    );


    buildDrownedCrownChunks();
}


/* =========================================================
   CHAPTER NAVIGATION
========================================================= */

function buildChapterNavigation() {

    if (!currentChapter) {
        return;
    }


    const currentIndex =
        CHAPTERS.findIndex(
            chapter =>
                chapter.id ===
                currentChapter.id
        );


    const previous =
        currentIndex > 0
            ? CHAPTERS[
                currentIndex -
                1
            ]
            : null;


    const next =
        currentIndex >= 0 &&
        currentIndex <
            CHAPTERS.length -
            1
            ? CHAPTERS[
                currentIndex +
                1
            ]
            : null;


    if (previous) {

        previousChapter.href =
            `reader.html?chapter=${encodeURIComponent(
                previous.id
            )}`;


        previousChapterName.textContent =
            previous.label;


        previousChapter.classList.remove(
            "disabled"
        );


        previousChapter.removeAttribute(
            "aria-disabled"
        );

    } else {

        previousChapter.href =
            "#";


        previousChapterName.textContent =
            "Beginning";


        previousChapter.classList.add(
            "disabled"
        );


        previousChapter.setAttribute(
            "aria-disabled",
            "true"
        );
    }


    if (next) {

        nextChapter.href =
            `reader.html?chapter=${encodeURIComponent(
                next.id
            )}`;


        nextChapterName.textContent =
            next.label;


        nextChapter.classList.remove(
            "disabled"
        );


        nextChapter.removeAttribute(
            "aria-disabled"
        );

    } else {

        nextChapter.href =
            "#";


        nextChapterName.textContent =
            "End";


        nextChapter.classList.add(
            "disabled"
        );


        nextChapter.setAttribute(
            "aria-disabled",
            "true"
        );
    }
}


/* =========================================================
   SAVE CHAPTER PROGRESS
========================================================= */

function saveChapterProgress() {

    if (!currentChapter) {
        return;
    }


    localStorage.setItem(
        "drownedCrownLastChapter",
        currentChapter.id
    );


    saveFurthestProgress(
        currentChapter.id
    );
}


/* =========================================================
   READER SETTINGS
========================================================= */

function loadReaderSettings() {

    const savedTheme =
        localStorage.getItem(
            "drownedCrownReaderTheme"
        ) ||
        "ivory";


    const savedFont =
        localStorage.getItem(
            "drownedCrownReaderFont"
        ) ||
        "medium";


    applyTheme(
        savedTheme,
        false
    );


    applyFontSize(
        savedFont,
        false
    );
}


function applyTheme(
    theme,
    save = true
) {

    document.body.classList.remove(
        "theme-ivory",
        "theme-paper",
        "theme-night"
    );


    document.body.classList.add(
        `theme-${theme}`
    );


    document
        .querySelectorAll(
            "[data-theme]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.theme ===
                        theme
                );
            }
        );


    if (save) {

        localStorage.setItem(
            "drownedCrownReaderTheme",
            theme
        );
    }
}


function applyFontSize(
    size,
    save = true
) {

    document.body.classList.remove(
        "font-small",
        "font-medium",
        "font-large"
    );


    document.body.classList.add(
        `font-${size}`
    );


    document
        .querySelectorAll(
            "[data-font-size]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.fontSize ===
                        size
                );
            }
        );


    if (save) {

        localStorage.setItem(
            "drownedCrownReaderFont",
            size
        );
    }
}


/* =========================================================
   SETTINGS EVENTS
========================================================= */

settingsButton.addEventListener(
    "click",
    () => {

        settingsPanel.hidden =
            !settingsPanel.hidden;
    }
);


closeSettings.addEventListener(
    "click",
    () => {

        settingsPanel.hidden =
            true;
    }
);


document
    .querySelectorAll(
        "[data-theme]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    applyTheme(
                        button.dataset.theme
                    );
                }
            );
        }
    );


document
    .querySelectorAll(
        "[data-font-size]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    applyFontSize(
                        button.dataset.fontSize
                    );
                }
            );
        }
    );


/* =========================================================
   READING PROGRESS
========================================================= */

function updateReadingProgress() {

    const documentHeight =
        document.documentElement.scrollHeight -
        window.innerHeight;


    if (
        documentHeight <=
        0
    ) {

        readingProgressBar.style.width =
            "0%";


        readingPercentage.textContent =
            "0%";


        return;
    }


    const progress =
        Math.min(
            1,
            Math.max(
                0,
                window.scrollY /
                    documentHeight
            )
        );


    const percent =
        Math.round(
            progress *
            100
        );


    readingProgressBar.style.width =
        `${percent}%`;


    readingPercentage.textContent =
        `${percent}%`;
}


window.addEventListener(
    "scroll",
    updateReadingProgress,
    {
        passive:
            true
    }
);


/* =========================================================
   NARRATION POSITION STORAGE
========================================================= */

function getNarrationStorageKey() {

    if (!currentChapter) {
        return null;
    }


    return (
        "drownedCrownNarrationPosition_" +
        currentChapter.id
    );
}


function saveNarrationPosition() {

    const key =
        getNarrationStorageKey();


    if (!key) {
        return;
    }


    localStorage.setItem(
        key,
        String(
            currentParagraphIndex
        )
    );
}


function restoreNarrationPosition() {

    const key =
        getNarrationStorageKey();


    if (!key) {

        currentParagraphIndex =
            0;


        return;
    }


    const saved =
        Number(
            localStorage.getItem(
                key
            )
        );


    if (
        Number.isInteger(
            saved
        ) &&
        saved >= 0 &&
        saved <
            narrationParagraphs.length
    ) {

        currentParagraphIndex =
            saved;

    } else {

        currentParagraphIndex =
            0;
    }
}


/* =========================================================
   NARRATION 3.5
========================================================= */

const MODEL_ID =
    "onnx-community/Kokoro-82M-v1.0-ONNX";


const CACHE_IDENTITY_VERSION =
    "cache-identity-1";


/* =========================================================
   MOBILE DETECTION
========================================================= */

function detectMobileNarrationDevice() {

    const ua =
        navigator.userAgent ||
        "";


    const platform =
        navigator.platform ||
        "";


    const touchPoints =
        navigator.maxTouchPoints ||
        0;


    const obviousMobile =
        /Android|iPhone|iPod|Mobile|IEMobile|Opera Mini/i
            .test(
                ua
            );


    const obviousIPad =
        /iPad/i.test(
            ua
        );


    const disguisedIPad =
        /Macintosh/i.test(
            ua
        ) &&
        /Mac/i.test(
            platform
        ) &&
        touchPoints >
            1;


    return (
        obviousMobile ||
        obviousIPad ||
        disguisedIPad
    );
}


const DROWNED_CROWN_IS_MOBILE =
    detectMobileNarrationDevice();


/* =========================================================
   RUNTIME CONFIGURATION
========================================================= */

const DROWNED_CROWN_RUNTIME =
    DROWNED_CROWN_IS_MOBILE

        ? {

            mode:
                "mobile-piper",

            device:
                "wasm",

            dtype:
                "piper-medium",

            bufferSize:
                2,

            startupTarget:
                95,

            normalTarget:
                175,

            hardMaximum:
                220,

            modelCacheVersion:
                "piper-en-us-hfc-male-medium-v1"
        }

        : {

            mode:
                "desktop",

            device:
                "webgpu",

            dtype:
                "fp32",

            bufferSize:
                3,

            startupTarget:
                NARRATOR_PROFILE
                    .chunking
                    .startupTarget,

            normalTarget:
                NARRATOR_PROFILE
                    .chunking
                    .normalTarget,

            hardMaximum:
                NARRATOR_PROFILE
                    .chunking
                    .hardMaximum,

            modelCacheVersion:
                "kokoro-82m-v1.0-onnx-fp32-webgpu"
        };


const MODEL_CACHE_VERSION =
    DROWNED_CROWN_RUNTIME
        .modelCacheVersion;


const TARGET_BUFFER_SIZE =
    DROWNED_CROWN_RUNTIME
        .bufferSize;


console.log(
    "Drowned Crown narrator runtime:",
    {

        mobile:
            DROWNED_CROWN_IS_MOBILE,

        mode:
            DROWNED_CROWN_RUNTIME.mode,

        device:
            DROWNED_CROWN_RUNTIME.device,

        dtype:
            DROWNED_CROWN_RUNTIME.dtype,

        bufferSize:
            DROWNED_CROWN_RUNTIME.bufferSize,

        modelCacheVersion:
            MODEL_CACHE_VERSION
    }
);


/* =========================================================
   KOKORO VOICES
========================================================= */

const DROWNED_CROWN_FALLBACK_VOICES = [

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


let browserVoices =
    [];


let kokoro =
    null;


let kokoroLoadingPromise =
    null;


let drownedCrownVoices = [
    ...DROWNED_CROWN_FALLBACK_VOICES
];


let drownedCrownChunks =
    [];


let drownedCrownBuffer =
    new Map();


let drownedCrownGenerationIndex =
    0;


let drownedCrownPlaybackChunkIndex =
    -1;


let drownedCrownGenerationRunning =
    false;


let drownedCrownAudio =
    null;


let drownedCrownAudioURL =
    null;


let drownedCrownPauseTimer =
    null;


/*
   On mobile we reuse the same Audio element.

   This is important on iOS because audio playback is much
   more reliable when the element is unlocked directly by
   the user's Play tap.
*/

let mobilePersistentAudio =
    null;


let drownedCrownSessionVoice =
    "";


let drownedCrownSessionSpeed =
    1;


/* =========================================================
   SOURCE
========================================================= */

function getNarrationSource() {

    return (
        narrationSource?.value ||
        "drowned-crown"
    );
}


function loadNarrationSettings() {

    const savedRate =
        localStorage.getItem(
            "drownedCrownSpeechRate"
        );


    if (
        savedRate &&
        Array.from(
            speedSelect.options
        )
        .some(
            option =>
                option.value ===
                savedRate
        )
    ) {

        speedSelect.value =
            savedRate;
    }


    const savedSource =
        localStorage.getItem(
            "drownedCrownNarrationSource"
        );


    if (
        narrationSource &&
        savedSource &&
        Array.from(
            narrationSource.options
        )
        .some(
            option =>
                option.value ===
                savedSource
        )
    ) {

        narrationSource.value =
            savedSource;
    }


    refreshVoiceSelector();
}


/* =========================================================
   DEVICE VOICES
========================================================= */

function loadBrowserVoices() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        browserVoices =
            [];


        return;
    }


    browserVoices =
        window
            .speechSynthesis
            .getVoices();


    if (
        getNarrationSource() ===
        "device"
    ) {

        refreshVoiceSelector();
    }
}


if (
    "speechSynthesis"
    in window
) {

    loadBrowserVoices();


    window
        .speechSynthesis
        .onvoiceschanged =
            loadBrowserVoices;
}


/* =========================================================
   VOICE SELECTOR
========================================================= */

function refreshVoiceSelector() {

    if (!voiceSelect) {
        return;
    }


    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        populateDrownedCrownVoiceSelector();


        return;
    }


    populateDeviceVoiceSelector();
}


function populateDeviceVoiceSelector() {

    voiceSelect.innerHTML =
        "";


    const englishVoices =
        browserVoices.filter(
            voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith(
                        "en"
                    )
        );


    const usableVoices =
        englishVoices.length
            ? englishVoices
            : browserVoices;


    usableVoices.forEach(
        voice => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                voice.name;


            option.textContent =
                `${voice.name} (${voice.lang})`;


            voiceSelect.appendChild(
                option
            );
        }
    );


    if (
        !usableVoices.length
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";


        option.textContent =
            "No device voices available";


        voiceSelect.appendChild(
            option
        );


        voiceSelect.disabled =
            true;


        return;
    }


    voiceSelect.disabled =
        false;


    const savedVoice =
        localStorage.getItem(
            "drownedCrownVoice"
        );


    if (
        savedVoice &&
        usableVoices.some(
            voice =>
                voice.name ===
                savedVoice
        )
    ) {

        voiceSelect.value =
            savedVoice;

    } else {

        voiceSelect.value =
            usableVoices[0]
                .name;
    }
}


function populateDrownedCrownVoiceSelector() {

    voiceSelect.innerHTML =
        "";


    /*
       Mobile Piper has its own voice.

       Kokoro voice IDs such as am_michael do not correspond
       to Piper voice models, so mobile deliberately exposes
       the Drowned Crown mobile voice as one selection.
    */

    if (
        DROWNED_CROWN_IS_MOBILE
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            MOBILE_PIPER_VOICE;


        option.textContent =
            MOBILE_PIPER_VOICE_LABEL;


        voiceSelect.appendChild(
            option
        );


        voiceSelect.value =
            MOBILE_PIPER_VOICE;


        voiceSelect.disabled =
            true;


        return;
    }


    const usableVoices =
        drownedCrownVoices.length
            ? drownedCrownVoices
            : DROWNED_CROWN_FALLBACK_VOICES;


    usableVoices.forEach(
        voice => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                voice;


            option.textContent =
                formatDrownedCrownVoiceName(
                    voice
                );


            voiceSelect.appendChild(
                option
            );
        }
    );


    voiceSelect.disabled =
        false;


    const saved =
        localStorage.getItem(
            "drownedCrownNeuralVoice"
        );


    const preferred = [

        saved,

        "am_michael",

        "bm_george",

        "am_onyx",

        "bm_fable"

    ].find(
        voice =>
            voice &&
            usableVoices.includes(
                voice
            )
    );


    if (preferred) {

        voiceSelect.value =
            preferred;

    } else {

        voiceSelect.value =
            usableVoices[0];
    }
}


function formatDrownedCrownVoiceName(
    voice
) {

    const parts =
        voice.split(
            "_"
        );


    if (
        parts.length <
        2
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
            .slice(
                1
            )
            .join(
                " "
            )
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


function getSelectedBrowserVoice() {

    return (
        browserVoices.find(
            voice =>
                voice.name ===
                voiceSelect.value
        ) ||
        null
    );
}


/* =========================================================
   NARRATOR INITIALIZATION
========================================================= */

async function ensureDrownedCrownNarrator(
    {
        silent = false
    } = {}
) {

    /*
       MOBILE
       ------

       Mobile does not load Kokoro anymore.

       It loads Piper instead.
    */

    if (
        DROWNED_CROWN_IS_MOBILE
    ) {

        const oldText =
            narrationPosition
                .textContent;


        if (!silent) {

            narrationPosition.textContent =
                "Loading mobile narrator…";


            playPause.disabled =
                true;
        }


        try {

            await ensureMobileNarrator({

                onProgress:
                    progress => {

                        if (
                            !silent &&
                            progress?.percent !=
                                null
                        ) {

                            narrationPosition.textContent =
                                `Loading mobile narrator… ${progress.percent}%`;
                        }
                    }
            });


            return true;

        } catch (error) {

            console.error(
                "Mobile Piper narrator failed to load:",
                error
            );


            if (!silent) {

                narrationPosition.textContent =
                    "Mobile narrator failed to load";
            }


            throw error;

        } finally {

            if (!silent) {

                playPause.disabled =
                    false;


                if (
                    narrationPosition
                        .textContent
                        .startsWith(
                            "Loading mobile narrator…"
                        )
                ) {

                    narrationPosition.textContent =
                        oldText;
                }
            }
        }
    }


    /*
       DESKTOP
       -------

       Existing Kokoro implementation remains unchanged.
    */

    if (kokoro) {
        return kokoro;
    }


    if (
        kokoroLoadingPromise
    ) {

        return kokoroLoadingPromise;
    }


    const oldText =
        narrationPosition
            .textContent;


    if (!silent) {

        narrationPosition.textContent =
            "Loading Drowned Crown narrator…";


        playPause.disabled =
            true;
    }


    console.log(
        silent
            ? "Drowned Crown narrator loading in background…"
            : "Drowned Crown narrator loading…",

        {

            mode:
                DROWNED_CROWN_RUNTIME.mode,

            device:
                DROWNED_CROWN_RUNTIME.device,

            dtype:
                DROWNED_CROWN_RUNTIME.dtype
        }
    );


    kokoroLoadingPromise =
        KokoroTTS.from_pretrained(
            MODEL_ID,
            {

                device:
                    DROWNED_CROWN_RUNTIME.device,

                dtype:
                    DROWNED_CROWN_RUNTIME.dtype
            }
        )
        .then(
            instance => {

                kokoro =
                    instance;


                loadDrownedCrownVoices();


                console.log(
                    "Drowned Crown narrator ready.",
                    {

                        mode:
                            DROWNED_CROWN_RUNTIME.mode,

                        device:
                            DROWNED_CROWN_RUNTIME.device,

                        dtype:
                            DROWNED_CROWN_RUNTIME.dtype
                    }
                );


                return kokoro;
            }
        )
        .catch(
            error => {

                console.error(
                    "Drowned Crown narrator failed to load:",
                    error
                );


                if (!silent) {

                    narrationPosition.textContent =
                        "Local narrator failed to load";
                }


                throw error;
            }
        )
        .finally(
            () => {

                kokoroLoadingPromise =
                    null;


                if (!silent) {

                    playPause.disabled =
                        false;


                    if (kokoro) {

                        updateNarrationDisplay();

                    } else if (
                        narrationPosition.textContent ===
                        "Loading Drowned Crown narrator…"
                    ) {

                        narrationPosition.textContent =
                            oldText;
                    }
                }
            }
        );


    return kokoroLoadingPromise;
}


/* =========================================================
   LOAD KOKORO VOICES
========================================================= */

function loadDrownedCrownVoices() {

    let result =
        kokoro.list_voices();


    let list =
        [];


    if (
        Array.isArray(
            result
        )
    ) {

        list =
            result.map(
                voice =>
                    typeof voice ===
                    "string"

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
        typeof result ===
            "object"
    ) {

        list =
            Object.keys(
                result
            );
    }


    list =
        list.filter(
            Boolean
        );


    if (!list.length) {

        list = [
            ...DROWNED_CROWN_FALLBACK_VOICES
        ];
    }


    const english =
        list.filter(
            voice =>
                /^(am|af|bm|bf)_/
                    .test(
                        voice
                    )
        );


    drownedCrownVoices =
        english.length
            ? english
            : list;


    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        const current =
            drownedCrownSessionVoice ||
            voiceSelect.value;


        populateDrownedCrownVoiceSelector();


        if (
            current &&
            drownedCrownVoices.includes(
                current
            )
        ) {

            voiceSelect.value =
                current;
        }
    }
}


/* =========================================================
   TEXT PREPARATION
========================================================= */

function prepareDeviceSpeechText(
    paragraph
) {

    let text =
        paragraph
            .textContent
            .replace(
                /\s+/g,
                " "
            )
            .replace(
                /[◆◇❖]/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    if (
        typeof applyPronunciations ===
        "function"
    ) {

        text =
            applyPronunciations(
                text
            );
    }


    return text;
}


function getRawParagraphText(
    paragraph
) {

    return normalizeParagraph(
        paragraph
            .textContent
            .replace(
                /[◆◇❖]/g,
                " "
            )
    );
}


/* =========================================================
   DROWNED CROWN CHUNK MAP
========================================================= */

function buildDrownedCrownChunks() {

    drownedCrownChunks =
        [];


    let previousText =
        "";


    narrationParagraphs.forEach(
        (
            paragraph,
            paragraphIndex
        ) => {

            const text =
                getRawParagraphText(
                    paragraph
                );


            const performance =
                getPerformanceForText(
                    text,
                    previousText
                );


            const pieces =
                splitDrownedCrownParagraph(
                    text,
                    paragraphIndex
                );


            pieces.forEach(
                (
                    piece,
                    partIndex
                ) => {

                    drownedCrownChunks.push({

                        chunkIndex:
                            drownedCrownChunks.length,

                        paragraphIndex,

                        partIndex,

                        text:
                            piece,

                        speechText:
                            applyNarratorPronunciations(
                                piece
                            ),

                        performance: {
                            ...performance
                        },

                        sceneBreak:
                            false
                    });
                }
            );


            previousText =
                text;
        }
    );
}


/* =========================================================
   CHUNK SPLITTING
========================================================= */

function splitDrownedCrownParagraph(
    paragraph,
    paragraphIndex
) {

    const target =
        paragraphIndex ===
        0

            ? DROWNED_CROWN_RUNTIME
                .startupTarget

            : DROWNED_CROWN_RUNTIME
                .normalTarget;


    const maximum =
        DROWNED_CROWN_RUNTIME
            .hardMaximum;


    if (
        paragraph.length <=
        target
    ) {

        return [
            paragraph
        ];
    }


    const sentences =
        splitDrownedCrownSentences(
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
                candidate.length <=
                target
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
                sentence.length >
                maximum
            ) {

                pieces.push(
                    ...splitDrownedCrownLongSentence(
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


function splitDrownedCrownSentences(
    text
) {

    return (
        text.match(
            /[^.!?—]+(?:[.!?]+["'”’]?|—)|[^.!?—]+$/g
        ) ||
        [
            text
        ]
    )
    .map(
        sentence =>
            sentence.trim()
    )
    .filter(
        Boolean
    );
}


function splitDrownedCrownLongSentence(
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
            .filter(
                Boolean
            );


    if (
        clauses.length <=
        1
    ) {

        return hardSplitDrownedCrownText(
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
                candidate.length <=
                target
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
                clause.length >
                maximum
            ) {

                pieces.push(
                    ...hardSplitDrownedCrownText(
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


function hardSplitDrownedCrownText(
    text,
    maximum
) {

    const words =
        text.split(
            /\s+/
        );


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
                candidate.length >
                    maximum &&
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


function findFirstChunkForParagraph(
    paragraphIndex
) {

    return drownedCrownChunks
        .findIndex(
            chunk =>
                chunk.paragraphIndex ===
                paragraphIndex
        );
}


/* =========================================================
   CACHE IDENTITY
========================================================= */

function getDrownedCrownCacheIdentity(
    chunk
) {

    const userSpeed =
        Number(
            drownedCrownSessionSpeed
        );


    const performanceSpeed =
        Number(
            chunk.performance?.speed ??
            1
        );


    const directedSpeed =
        userSpeed *
        performanceSpeed;


    const stableUserSpeed =
        userSpeed.toFixed(
            4
        );


    const stablePerformanceSpeed =
        performanceSpeed.toFixed(
            4
        );


    const stableDirectedSpeed =
        directedSpeed.toFixed(
            4
        );


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


    const identityText = [

        `cache=${CACHE_IDENTITY_VERSION}`,

        `director=${NARRATOR_VERSION}`,

        `model=${MODEL_CACHE_VERSION}`,

        `voice=${drownedCrownSessionVoice}`,

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

    ].join(
        "\n"
    );


    return {

        identityText,

        directedSpeed:
            stableDirectedSpeed,

        speaker
    };
}


async function getDrownedCrownCacheKey(
    chunk
) {

    const identity =
        getDrownedCrownCacheIdentity(
            chunk
        );


    const key =
        await createNarrationCacheKey({

            text:
                identity.identityText,

            voice:
                drownedCrownSessionVoice,

            speed:
                1,

            model:
                MODEL_CACHE_VERSION,

            narratorVersion:
                `${NARRATOR_VERSION}|${CACHE_IDENTITY_VERSION}`
        });


    return {
        key,
        identity
    };
}


/* =========================================================
   KOKORO WAV CREATION
========================================================= */

function createDrownedCrownWavBlob(
    generatedAudio
) {

    const samples =
        generatedAudio.audio;


    const sampleRate =
        generatedAudio
            .sampling_rate;


    const buffer =
        new ArrayBuffer(
            44 +
            samples.length *
            2
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
                offset +
                i,

                value.charCodeAt(
                    i
                )
            );
        }
    }


    writeString(
        0,
        "RIFF"
    );


    view.setUint32(
        4,

        36 +
        samples.length *
        2,

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
        sampleRate *
        2,
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
        samples.length *
        2,
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

                ? sample *
                    0x8000

                : sample *
                    0x7fff;


        view.setInt16(
            offset,
            value,
            true
        );


        offset +=
            2;
    }


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


/* =========================================================
   DEVICE ENGINE
========================================================= */

function speakDeviceParagraph(
    index
) {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        alert(
            "Narration is not supported by this browser."
        );


        return;
    }


    if (
        !narrationParagraphs.length
    ) {
        return;
    }


    index =
        Math.max(
            0,

            Math.min(
                index,

                narrationParagraphs.length -
                1
            )
        );


    narrationSession +=
        1;


    const session =
        narrationSession;


    stopDrownedCrownEngine(
        false
    );


    window
        .speechSynthesis
        .cancel();


    currentParagraphIndex =
        index;


    isPaused =
        false;


    isNarrating =
        true;


    const paragraph =
        narrationParagraphs[
            currentParagraphIndex
        ];


    const narrationText =
        prepareDeviceSpeechText(
            paragraph
        );


    if (!narrationText) {

        moveToNextParagraph();


        return;
    }


    showCurrentNarrationParagraph();


    currentUtterance =
        new SpeechSynthesisUtterance(
            narrationText
        );


    const selectedVoice =
        getSelectedBrowserVoice();


    if (selectedVoice) {

        currentUtterance.voice =
            selectedVoice;
    }


    currentUtterance.rate =
        Number(
            speedSelect.value
        ) ||
        1;


    currentUtterance.pitch =
        1;


    currentUtterance.volume =
        1;


    currentUtterance.onend =
        () => {

            if (
                session !==
                    narrationSession ||
                !isNarrating
            ) {

                return;
            }


            if (
                currentParagraphIndex <
                narrationParagraphs.length -
                1
            ) {

                currentParagraphIndex +=
                    1;


                saveNarrationPosition();


                speakDeviceParagraph(
                    currentParagraphIndex
                );

            } else {

                finishNarration();
            }
        };


    currentUtterance.onerror =
        event => {

            if (
                event.error ===
                    "canceled" ||
                event.error ===
                    "interrupted"
            ) {

                return;
            }


            console.error(
                "Device narration error:",
                event.error
            );


            isNarrating =
                false;


            isPaused =
                false;


            updatePlayButton();
        };


    window
        .speechSynthesis
        .speak(
            currentUtterance
        );


    updatePlayButton();
}


/* =========================================================
   DROWNED CROWN SESSION
========================================================= */

async function startDrownedCrownNarration(
    paragraphIndex =
        currentParagraphIndex
) {

    if (
        !narrationParagraphs.length
    ) {
        return;
    }


    /*
       CACHE FIRST.

       Do not initialize either neural model here.

       If the requested audio is already in IndexedDB it can
       start without loading Kokoro or Piper.
    */

    if (
        !drownedCrownChunks.length
    ) {

        buildDrownedCrownChunks();
    }


    const targetChunk =
        findFirstChunkForParagraph(
            paragraphIndex
        );


    if (
        targetChunk <
        0
    ) {
        return;
    }


    stopDeviceEngine(
        false
    );


    stopDrownedCrownEngine(
        false
    );


    narrationSession +=
        1;


    drownedCrownSessionVoice =
        DROWNED_CROWN_IS_MOBILE

            ? MOBILE_PIPER_VOICE

            : (
                voiceSelect.value ||

                localStorage.getItem(
                    "drownedCrownNeuralVoice"
                ) ||

                drownedCrownVoices[0] ||

                "am_michael"
            );


    drownedCrownSessionSpeed =
        Number(
            speedSelect.value
        ) ||
        1;


    localStorage.setItem(
        "drownedCrownNeuralVoice",
        drownedCrownSessionVoice
    );


    currentParagraphIndex =
        paragraphIndex;


    drownedCrownPlaybackChunkIndex =
        targetChunk -
        1;


    drownedCrownGenerationIndex =
        targetChunk;


    isNarrating =
        true;


    isPaused =
        false;


    showCurrentNarrationParagraph();


    updatePlayButton();


    maintainDrownedCrownBuffer(
        narrationSession
    );
}


/* =========================================================
   BUFFER
========================================================= */

function getDrownedCrownAheadBufferCount() {

    let count =
        0;


    drownedCrownBuffer.forEach(
        (
            item,
            index
        ) => {

            if (
                index >
                drownedCrownPlaybackChunkIndex
            ) {

                count +=
                    1;
            }
        }
    );


    return count;
}


async function maintainDrownedCrownBuffer(
    session
) {

    if (
        drownedCrownGenerationRunning ||
        session !==
            narrationSession ||
        getNarrationSource() !==
            "drowned-crown"
    ) {

        return;
    }


    drownedCrownGenerationRunning =
        true;


    try {

        while (
            session ===
                narrationSession &&

            isNarrating &&

            drownedCrownGenerationIndex <
                drownedCrownChunks.length &&

            getDrownedCrownAheadBufferCount() <
                TARGET_BUFFER_SIZE
        ) {

            const index =
                drownedCrownGenerationIndex;


            drownedCrownGenerationIndex +=
                1;


            await obtainDrownedCrownChunk(
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
                isNarrating &&
                !isPaused &&
                !drownedCrownAudio &&
                !drownedCrownPauseTimer
            ) {

                attemptDrownedCrownPlayback();
            }
        }

    } catch (error) {

        console.error(
            "Drowned Crown narration buffer error:",
            error
        );


        if (
            session ===
            narrationSession
        ) {

            isNarrating =
                false;


            isPaused =
                false;


            updatePlayButton();


            if (
                DROWNED_CROWN_IS_MOBILE
            ) {

                narrationPosition.textContent =
                    "Narrator unavailable on this device";
            }
        }

    } finally {

        drownedCrownGenerationRunning =
            false;


        if (
            session ===
                narrationSession &&

            isNarrating &&

            drownedCrownGenerationIndex <
                drownedCrownChunks.length &&

            getDrownedCrownAheadBufferCount() <
                TARGET_BUFFER_SIZE
        ) {

            setTimeout(
                () => {

                    maintainDrownedCrownBuffer(
                        session
                    );
                },
                0
            );
        }
    }
}


/* =========================================================
   CACHE-FIRST CHUNK ACQUISITION
========================================================= */

async function obtainDrownedCrownChunk(
    index,
    session
) {

    const chunk =
        drownedCrownChunks[
            index
        ];


    if (!chunk) {
        return;
    }


    const {
        key,
        identity
    } =
        await getDrownedCrownCacheKey(
            chunk
        );


    if (
        session !==
        narrationSession
    ) {
        return;
    }


    let cached =
        null;


    try {

        cached =
            await getCachedNarration(
                key
            );

    } catch (error) {

        console.warn(
            "Narration cache lookup failed:",
            error
        );
    }


    if (
        session !==
        narrationSession
    ) {
        return;
    }


    /* =====================================================
       CACHE HIT
    ===================================================== */

    if (
        cached &&
        cached.blob instanceof
            Blob
    ) {

        drownedCrownBuffer.set(
            index,
            {

                ...chunk,

                url:
                    URL.createObjectURL(
                        cached.blob
                    ),

                audioSeconds:
                    Number(
                        cached.audioSeconds
                    ) ||
                    0,

                fromCache:
                    true,

                cacheKey:
                    key,

                directedSpeed:
                    identity.directedSpeed
            }
        );


        console.log(
            `Drowned Crown CACHE HIT — chunk ${index + 1}/${drownedCrownChunks.length}`,
            {

                runtime:
                    DROWNED_CROWN_RUNTIME.mode
            }
        );


        return;
    }


    /* =====================================================
       CACHE MISS
    ===================================================== */

    console.log(
        `Drowned Crown CACHE MISS — chunk ${index + 1}/${drownedCrownChunks.length}`,
        {

            runtime:
                DROWNED_CROWN_RUNTIME.mode,

            device:
                DROWNED_CROWN_RUNTIME.device,

            dtype:
                DROWNED_CROWN_RUNTIME.dtype
        }
    );


    const shouldLoadSilently =
        Boolean(
            drownedCrownAudio
        ) ||
        drownedCrownPlaybackChunkIndex >=
            0;


    await ensureDrownedCrownNarrator({
        silent:
            shouldLoadSilently
    });


    if (
        session !==
        narrationSession
    ) {
        return;
    }


    const started =
        performance.now();


    let blob;


    let audioSeconds =
        0;


    /*
       MOBILE = PIPER
    */

    if (
        DROWNED_CROWN_IS_MOBILE
    ) {

        blob =
            await generateMobileNarration(
                chunk.speechText
            );

    } else {

        /*
           DESKTOP = KOKORO
        */

        const generatedAudio =
            await kokoro.generate(
                chunk.speechText,
                {

                    voice:
                        drownedCrownSessionVoice,

                    speed:
                        Number(
                            identity.directedSpeed
                        )
                }
            );


        audioSeconds =
            generatedAudio.audio.length /
            generatedAudio.sampling_rate;


        blob =
            createDrownedCrownWavBlob(
                generatedAudio
            );
    }


    if (
        session !==
        narrationSession
    ) {
        return;
    }


    const generationSeconds =
        (
            performance.now() -
            started
        ) /
        1000;


    /*
       Save both Kokoro and Piper output to the existing
       IndexedDB narration cache.
    */

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

                runtime:
                    DROWNED_CROWN_RUNTIME.mode,

                device:
                    DROWNED_CROWN_RUNTIME.device,

                dtype:
                    DROWNED_CROWN_RUNTIME.dtype,

                voice:
                    drownedCrownSessionVoice,

                userSpeed:
                    drownedCrownSessionSpeed
                        .toFixed(
                            4
                        ),

                directedSpeed:
                    identity.directedSpeed,

                speaker:
                    identity.speaker,

                paragraphIndex:
                    chunk.paragraphIndex,

                partIndex:
                    chunk.partIndex,

                text:
                    chunk.speechText
            }
        });

    } catch (error) {

        console.warn(
            "Narration cache save failed:",
            error
        );
    }


    if (
        session !==
        narrationSession
    ) {
        return;
    }


    drownedCrownBuffer.set(
        index,
        {

            ...chunk,

            url:
                URL.createObjectURL(
                    blob
                ),

            audioSeconds,

            generationSeconds,

            fromCache:
                false,

            cacheKey:
                key,

            directedSpeed:
                identity.directedSpeed
        }
    );


    console.log(
        `Drowned Crown GENERATED — chunk ${index + 1}/${drownedCrownChunks.length}`,
        {

            runtime:
                DROWNED_CROWN_RUNTIME.mode,

            generationSeconds:
                generationSeconds
                    .toFixed(
                        2
                    ),

            audioSeconds:
                audioSeconds
                    .toFixed(
                        2
                    ),

            realtimeFactor:
                audioSeconds >
                0

                    ? (
                        generationSeconds /
                        audioSeconds
                    ).toFixed(
                        2
                    )

                    : "0.00"
        }
    );
}


/* =========================================================
   MOBILE AUDIO UNLOCK
========================================================= */

function primeMobileDrownedCrownAudio() {

    if (
        !DROWNED_CROWN_IS_MOBILE ||
        mobilePersistentAudio
    ) {

        return;
    }


    mobilePersistentAudio =
        new Audio();


    mobilePersistentAudio.preload =
        "auto";


    /*
       Tiny silent WAV.

       Calling play() during the user's actual Play-button
       interaction helps unlock this Audio element on iOS.
    */

    mobilePersistentAudio.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";


    const unlockPromise =
        mobilePersistentAudio.play();


    if (
        unlockPromise &&
        typeof unlockPromise.catch ===
            "function"
    ) {

        unlockPromise.catch(
            () => {

                /*
                   No action required.

                   The real narration chunk will retry on
                   this same Audio element.
                */
            }
        );
    }
}


/* =========================================================
   PLAYBACK
========================================================= */

function attemptDrownedCrownPlayback() {

    if (
        !isNarrating ||
        isPaused ||
        drownedCrownAudio ||
        drownedCrownPauseTimer
    ) {

        return;
    }


    const nextIndex =
        drownedCrownPlaybackChunkIndex +
        1;


    if (
        nextIndex >=
        drownedCrownChunks.length
    ) {

        finishNarration();


        return;
    }


    if (
        !drownedCrownBuffer.has(
            nextIndex
        )
    ) {

        maintainDrownedCrownBuffer(
            narrationSession
        );


        return;
    }


    playDrownedCrownChunk(
        nextIndex
    );
}


function playDrownedCrownChunk(
    index
) {

    const item =
        drownedCrownBuffer.get(
            index
        );


    if (!item) {
        return;
    }


    drownedCrownBuffer.delete(
        index
    );


    drownedCrownPlaybackChunkIndex =
        index;


    if (
        currentParagraphIndex !==
        item.paragraphIndex
    ) {

        currentParagraphIndex =
            item.paragraphIndex;
    }


    showCurrentNarrationParagraph();


    drownedCrownAudioURL =
        item.url;


    /*
       Reuse the unlocked mobile Audio element.

       Desktop continues creating an Audio object per chunk
       exactly as before.
    */

    if (
        DROWNED_CROWN_IS_MOBILE &&
        mobilePersistentAudio
    ) {

        drownedCrownAudio =
            mobilePersistentAudio;


        drownedCrownAudio.src =
            drownedCrownAudioURL;

    } else {

        drownedCrownAudio =
            new Audio(
                drownedCrownAudioURL
            );
    }


    drownedCrownAudio.preload =
        "auto";


    /*
       Kokoro generates the requested speed directly.

       Piper currently generates at its native voice speed,
       so mobile applies the director/user speed through
       playbackRate while preserving pitch.
    */

    if (
        DROWNED_CROWN_IS_MOBILE
    ) {

        drownedCrownAudio.playbackRate =
            Math.max(
                0.75,

                Math.min(
                    1.5,

                    Number(
                        item.directedSpeed
                    ) ||
                    1
                )
            );


        drownedCrownAudio.preservesPitch =
            true;
    }


    drownedCrownAudio.onended =
        handleDrownedCrownAudioEnded;


    drownedCrownAudio.onerror =
        handleDrownedCrownAudioError;


    drownedCrownAudio
        .play()
        .catch(
            error => {

                if (
                    error.name !==
                    "AbortError"
                ) {

                    console.error(
                        "Drowned Crown playback error:",
                        error
                    );
                }
            }
        );


    maintainDrownedCrownBuffer(
        narrationSession
    );
}


/* =========================================================
   CHUNK ENDED
========================================================= */

function handleDrownedCrownAudioEnded() {

    const finishedIndex =
        drownedCrownPlaybackChunkIndex;


    cleanupDrownedCrownAudio();


    const chunk =
        drownedCrownChunks[
            finishedIndex
        ];


    const nextChunk =
        drownedCrownChunks[
            finishedIndex +
            1
        ] ||
        null;


    if (!nextChunk) {

        finishNarration();


        return;
    }


    const pause =
        getPauseAfterChunk(
            chunk,
            nextChunk
        );


    maintainDrownedCrownBuffer(
        narrationSession
    );


    if (
        pause >
        0
    ) {

        drownedCrownPauseTimer =
            setTimeout(
                () => {

                    drownedCrownPauseTimer =
                        null;


                    attemptDrownedCrownPlayback();
                },
                pause
            );

    } else {

        attemptDrownedCrownPlayback();
    }
}


function handleDrownedCrownAudioError(
    event
) {

    console.error(
        "Drowned Crown audio error:",
        event
    );


    cleanupDrownedCrownAudio();


    attemptDrownedCrownPlayback();
}


/* =========================================================
   PLAY / PAUSE / RESUME
========================================================= */

function toggleNarration() {

    /*
       This occurs immediately inside the user click event.
    */

    primeMobileDrownedCrownAudio();


    if (
        !narrationParagraphs.length
    ) {
        return;
    }


    if (isPaused) {

        resumeNarration();


        return;
    }


    if (isNarrating) {

        pauseNarration();


        return;
    }


    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        startDrownedCrownNarration(
            currentParagraphIndex
        );

    } else {

        speakDeviceParagraph(
            currentParagraphIndex
        );
    }
}


function pauseNarration() {

    if (
        !isNarrating ||
        isPaused
    ) {
        return;
    }


    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        if (
            drownedCrownAudio
        ) {

            drownedCrownAudio.pause();
        }


        if (
            drownedCrownPauseTimer
        ) {

            clearTimeout(
                drownedCrownPauseTimer
            );


            drownedCrownPauseTimer =
                null;
        }

    } else if (
        "speechSynthesis"
        in window
    ) {

        window
            .speechSynthesis
            .pause();
    }


    isPaused =
        true;


    updatePlayButton();
}


function resumeNarration() {

    if (!isPaused) {
        return;
    }


    isPaused =
        false;


    isNarrating =
        true;


    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        if (
            drownedCrownAudio
        ) {

            drownedCrownAudio
                .play()
                .catch(
                    console.error
                );

        } else {

            attemptDrownedCrownPlayback();


            maintainDrownedCrownBuffer(
                narrationSession
            );
        }

    } else if (
        "speechSynthesis"
        in window
    ) {

        window
            .speechSynthesis
            .resume();
    }


    updatePlayButton();
}


function updatePlayButton() {

    if (
        isNarrating &&
        !isPaused
    ) {

        playPause.textContent =
            "❚❚";


        playPause.setAttribute(
            "aria-label",
            "Pause narration"
        );

    } else {

        playPause.textContent =
            "▶";


        playPause.setAttribute(
            "aria-label",
            "Play narration"
        );
    }
}


/* =========================================================
   PARAGRAPH MOVEMENT
========================================================= */

function moveToPreviousParagraph() {

    currentParagraphIndex =
        Math.max(
            0,

            currentParagraphIndex -
            1
        );


    saveNarrationPosition();


    if (
        isNarrating ||
        isPaused
    ) {

        restartNarrationAtCurrentParagraph();

    } else {

        showCurrentNarrationParagraph();
    }
}


function moveToNextParagraph() {

    currentParagraphIndex =
        Math.min(
            narrationParagraphs.length -
                1,

            currentParagraphIndex +
                1
        );


    saveNarrationPosition();


    if (
        isNarrating ||
        isPaused
    ) {

        restartNarrationAtCurrentParagraph();

    } else {

        showCurrentNarrationParagraph();
    }
}


function restartNarrationAtCurrentParagraph() {

    const shouldRemainPaused =
        isPaused;


    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        startDrownedCrownNarration(
            currentParagraphIndex
        )
        .then(
            () => {

                if (
                    shouldRemainPaused &&
                    isNarrating
                ) {

                    pauseNarration();
                }
            }
        );

    } else {

        speakDeviceParagraph(
            currentParagraphIndex
        );


        if (
            shouldRemainPaused
        ) {

            setTimeout(
                () => {

                    pauseNarration();
                },
                0
            );
        }
    }
}


/* =========================================================
   ENGINE STOPPING
========================================================= */

function stopDeviceEngine(
    incrementSession =
        true
) {

    if (
        incrementSession
    ) {

        narrationSession +=
            1;
    }


    if (
        "speechSynthesis"
        in window
    ) {

        window
            .speechSynthesis
            .cancel();
    }


    currentUtterance =
        null;
}


/* =========================================================
   AUDIO CLEANUP
========================================================= */

function cleanupDrownedCrownAudio() {

    if (
        drownedCrownAudio
    ) {

        try {

            drownedCrownAudio.pause();

        } catch (error) {

            console.warn(
                "Could not pause narration audio:",
                error
            );
        }


        drownedCrownAudio.onended =
            null;


        drownedCrownAudio.onerror =
            null;


        drownedCrownAudio.src =
            "";


        drownedCrownAudio =
            null;
    }


    if (
        drownedCrownAudioURL
    ) {

        try {

            URL.revokeObjectURL(
                drownedCrownAudioURL
            );

        } catch (error) {

            console.warn(
                "Could not revoke narration URL:",
                error
            );
        }


        drownedCrownAudioURL =
            null;
    }
}


function clearDrownedCrownBuffer() {

    drownedCrownBuffer.forEach(
        item => {

            if (
                item?.url
            ) {

                try {

                    URL.revokeObjectURL(
                        item.url
                    );

                } catch (error) {

                    console.warn(
                        "Could not revoke buffered narration URL:",
                        error
                    );
                }
            }
        }
    );


    drownedCrownBuffer.clear();
}


function stopDrownedCrownEngine(
    incrementSession =
        true
) {

    if (
        incrementSession
    ) {

        narrationSession +=
            1;
    }


    if (
        drownedCrownPauseTimer
    ) {

        clearTimeout(
            drownedCrownPauseTimer
        );


        drownedCrownPauseTimer =
            null;
    }


    cleanupDrownedCrownAudio();


    clearDrownedCrownBuffer();


    drownedCrownGenerationIndex =
        0;


    drownedCrownPlaybackChunkIndex =
        -1;


    /*
       Do NOT destroy the neural engine.

       Desktop:
       Kokoro remains loaded for this page session.

       Mobile:
       Piper's downloaded model remains available through
       browser storage rather than downloading repeatedly.
    */
}


/* =========================================================
   STOP NARRATION
========================================================= */

function stopAllNarration(
    resetParagraph =
        false
) {

    narrationSession +=
        1;


    stopDeviceEngine(
        false
    );


    stopDrownedCrownEngine(
        false
    );


    isNarrating =
        false;


    isPaused =
        false;


    if (
        resetParagraph
    ) {

        currentParagraphIndex =
            0;


        saveNarrationPosition();
    }


    clearNarrationHighlight();


    updatePlayButton();


    updateNarrationDisplay();
}


function finishNarration() {

    narrationSession +=
        1;


    stopDeviceEngine(
        false
    );


    stopDrownedCrownEngine(
        false
    );


    isNarrating =
        false;


    isPaused =
        false;


    clearNarrationHighlight();


    updatePlayButton();


    updateNarrationDisplay();
}


/* =========================================================
   HIGHLIGHT
========================================================= */

function clearNarrationHighlight() {

    narrationParagraphs.forEach(
        paragraph => {

            paragraph.classList.remove(
                "narrating"
            );


            paragraph.classList.remove(
                "narration-active"
            );
        }
    );
}


function showCurrentNarrationParagraph() {

    clearNarrationHighlight();


    const paragraph =
        narrationParagraphs[
            currentParagraphIndex
        ];


    if (!paragraph) {

        updateNarrationDisplay();


        return;
    }


    paragraph.classList.add(
        "narrating"
    );


    paragraph.classList.add(
        "narration-active"
    );


    saveNarrationPosition();


    updateNarrationDisplay();
}


/* =========================================================
   NARRATION DISPLAY
========================================================= */

function updateNarrationDisplay() {

    const total =
        narrationParagraphs.length;


    const position =
        total

            ? currentParagraphIndex +
                1

            : 0;


    if (
        narrationPosition
    ) {

        narrationPosition.textContent =
            total

                ? `Paragraph ${position} of ${total}`

                : "Ready";
    }


    if (
        narrationSeek
    ) {

        narrationSeek.min =
            "0";


        narrationSeek.max =
            String(
                Math.max(
                    0,

                    total -
                    1
                )
            );


        narrationSeek.value =
            String(
                Math.max(
                    0,

                    currentParagraphIndex
                )
            );
    }


    if (
        narrationSeekFill
    ) {

        const percentage =
            total >
            1

                ? (
                    currentParagraphIndex /
                    (
                        total -
                        1
                    )
                ) *
                100

                : 0;


        narrationSeekFill.style.width =
            `${percentage}%`;
    }


    if (
        previousParagraph
    ) {

        previousParagraph.disabled =
            currentParagraphIndex <=
            0;
    }


    if (
        nextParagraph
    ) {

        nextParagraph.disabled =
            !total ||
            currentParagraphIndex >=
                total -
                1;
    }
}


/* =========================================================
   SEEK
========================================================= */

function seekNarrationParagraph(
    value
) {

    if (
        !narrationParagraphs.length
    ) {
        return;
    }


    const requested =
        Number(
            value
        );


    if (
        !Number.isFinite(
            requested
        )
    ) {
        return;
    }


    currentParagraphIndex =
        Math.max(
            0,

            Math.min(
                Math.round(
                    requested
                ),

                narrationParagraphs.length -
                1
            )
        );


    saveNarrationPosition();


    if (
        isNarrating ||
        isPaused
    ) {

        restartNarrationAtCurrentParagraph();

    } else {

        showCurrentNarrationParagraph();
    }
}


/* =========================================================
   NARRATION PANEL
========================================================= */

function openNarrationPlayer() {

    narrationPlayer.hidden =
        false;


    updateNarrationDisplay();
}


function closeNarrationPlayer() {

    narrationPlayer.hidden =
        true;
}


/* =========================================================
   NARRATION SOURCE CHANGE
========================================================= */

function handleNarrationSourceChange() {

    const wasActive =
        isNarrating ||
        isPaused;


    stopAllNarration(
        false
    );


    localStorage.setItem(
        "drownedCrownNarrationSource",
        getNarrationSource()
    );


    refreshVoiceSelector();


    if (
        voiceSelectGroup
    ) {

        voiceSelectGroup.hidden =
            false;
    }


    if (
        wasActive
    ) {

        showCurrentNarrationParagraph();
    }
}


/* =========================================================
   VOICE CHANGE
========================================================= */

function handleVoiceChange() {

    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        localStorage.setItem(
            "drownedCrownNeuralVoice",
            voiceSelect.value
        );

    } else {

        localStorage.setItem(
            "drownedCrownVoice",
            voiceSelect.value
        );
    }


    if (
        isNarrating ||
        isPaused
    ) {

        restartNarrationAtCurrentParagraph();
    }
}


/* =========================================================
   SPEED CHANGE
========================================================= */

function handleSpeedChange() {

    localStorage.setItem(
        "drownedCrownSpeechRate",
        speedSelect.value
    );


    if (
        isNarrating ||
        isPaused
    ) {

        restartNarrationAtCurrentParagraph();
    }
}


/* =========================================================
   NARRATION EVENTS
========================================================= */

listenButton.addEventListener(
    "click",
    () => {

        openNarrationPlayer();
    }
);


playPause.addEventListener(
    "click",
    toggleNarration
);


previousParagraph.addEventListener(
    "click",
    moveToPreviousParagraph
);


nextParagraph.addEventListener(
    "click",
    moveToNextParagraph
);


stopNarration.addEventListener(
    "click",
    () => {

        stopAllNarration(
            false
        );
    }
);


closeNarration.addEventListener(
    "click",
    () => {

        stopAllNarration(
            false
        );


        closeNarrationPlayer();
    }
);


if (
    narrationSeek
) {

    narrationSeek.addEventListener(
        "input",
        event => {

            seekNarrationParagraph(
                event.target.value
            );
        }
    );
}


if (
    narrationSource
) {

    narrationSource.addEventListener(
        "change",
        handleNarrationSourceChange
    );
}


if (
    voiceSelect
) {

    voiceSelect.addEventListener(
        "change",
        handleVoiceChange
    );
}


if (
    speedSelect
) {

    speedSelect.addEventListener(
        "change",
        handleSpeedChange
    );
}


/* =========================================================
   CHAPTER NAVIGATION SAFETY
========================================================= */

previousChapter.addEventListener(
    "click",
    event => {

        if (
            previousChapter
                .classList
                .contains(
                    "disabled"
                )
        ) {

            event.preventDefault();
        }
    }
);


nextChapter.addEventListener(
    "click",
    event => {

        if (
            nextChapter
                .classList
                .contains(
                    "disabled"
                )
        ) {

            event.preventDefault();
        }
    }
);


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        stopDeviceEngine(
            false
        );


        stopDrownedCrownEngine(
            false
        );
    }
);


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeReader() {

    loadReaderSettings();


    loadNarrationSettings();


    updatePlayButton();


    loadChapter();
}


initializeReader();