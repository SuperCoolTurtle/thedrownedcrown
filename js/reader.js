import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

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


/* =========================================
   THE DROWNED CROWN
   READER + NARRATION 3.3
========================================= */


/* =========================================
   ELEMENTS
========================================= */


const chapterLabel =
    document.getElementById("chapterLabel");

const chapterPOV =
    document.getElementById("chapterPOV");

const chapterLocation =
    document.getElementById("chapterLocation");

const chapterText =
    document.getElementById("chapterText");

const headerChapterTitle =
    document.getElementById("headerChapterTitle");


const previousChapter =
    document.getElementById("previousChapter");

const previousChapterName =
    document.getElementById("previousChapterName");

const nextChapter =
    document.getElementById("nextChapter");

const nextChapterName =
    document.getElementById("nextChapterName");


const settingsButton =
    document.getElementById("settingsButton");

const settingsPanel =
    document.getElementById("settingsPanel");

const closeSettings =
    document.getElementById("closeSettings");


const listenButton =
    document.getElementById("listenButton");

const narrationPlayer =
    document.getElementById("narrationPlayer");

const narrationChapter =
    document.getElementById("narrationChapter");

const narrationPosition =
    document.getElementById("narrationPosition");

const narrationSeek =
    document.getElementById("narrationSeek");

const narrationSeekFill =
    document.getElementById("narrationSeekFill");


const previousParagraph =
    document.getElementById("previousParagraph");

const playPause =
    document.getElementById("playPause");

const nextParagraph =
    document.getElementById("nextParagraph");

const stopNarration =
    document.getElementById("stopNarration");

const closeNarration =
    document.getElementById("closeNarration");


const voiceSelect =
    document.getElementById("voiceSelect");

const speedSelect =
    document.getElementById("speedSelect");

const narrationSource =
    document.getElementById("narrationSource");

const voiceSelectGroup =
    document.getElementById("voiceSelectGroup");


const readingProgressBar =
    document.getElementById("readingProgressBar");

const readingPercentage =
    document.getElementById("readingPercentage");


/* =========================================
   READER STATE
========================================= */


let currentChapter = null;

let narrationParagraphs = [];

let currentParagraphIndex = 0;

let currentUtterance = null;

let isNarrating = false;

let isPaused = false;

let narrationSession = 0;

let voices = [];


/* =========================================
   URL
========================================= */


function getRequestedChapterId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return (
        params.get("chapter") ||
        "prologue"
    );
}


/* =========================================
   CHAPTER PROGRESS
========================================= */


function getChapterProgressLevel(
    chapterId
) {

    const chapterIndex =
        CHAPTERS.findIndex(
            chapter =>
                chapter.id === chapterId
        );


    if (chapterIndex === -1) {

        return 0;
    }


    return chapterIndex + 1;
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


    if (newLevel > oldLevel) {

        localStorage.setItem(
            "drownedCrownFurthestChapter",
            String(newLevel)
        );
    }
}


/* =========================================
   LOAD CHAPTER
========================================= */


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

        console.error(error);


        showChapterError(
            "The chapter could not be loaded. Make sure the site is being opened through Live Server."
        );
    }
}


/* =========================================
   ERROR
========================================= */


function showChapterError(
    message
) {

    chapterText.innerHTML = `

        <p class="loading-message">
            ${message}
        </p>

    `;
}


/* =========================================
   PREPARE CHAPTER
========================================= */


function prepareChapterText() {

    narrationParagraphs =
        Array.from(
            chapterText.querySelectorAll(
                "p"
            )
        )
        .filter(
            paragraph =>
                paragraph.textContent
                    .trim()
                    .length > 0
        );


    narrationParagraphs.forEach(
        (paragraph, index) => {

            paragraph.dataset.narrationIndex =
                String(index);

        }
    );


    buildDrownedCrownChunks();
}


/* =========================================
   CHAPTER NAVIGATION
========================================= */


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
                currentIndex - 1
            ]
            : null;


    const next =
        currentIndex >= 0 &&
        currentIndex <
            CHAPTERS.length - 1
            ? CHAPTERS[
                currentIndex + 1
            ]
            : null;


    if (previous) {

        previousChapter.href =
            `reader.html?chapter=${encodeURIComponent(previous.id)}`;


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
            `reader.html?chapter=${encodeURIComponent(next.id)}`;


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


/* =========================================
   SAVE CHAPTER PROGRESS
========================================= */


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


/* =========================================
   READER SETTINGS
========================================= */


function loadReaderSettings() {

    const savedTheme =
        localStorage.getItem(
            "drownedCrownReaderTheme"
        ) || "ivory";


    const savedFont =
        localStorage.getItem(
            "drownedCrownReaderFont"
        ) || "medium";


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


/* =========================================
   SETTINGS EVENTS
========================================= */


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


/* =========================================
   READING PROGRESS
========================================= */


function updateReadingProgress() {

    const documentHeight =
        document.documentElement
            .scrollHeight -
        window.innerHeight;


    if (documentHeight <= 0) {

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
            progress * 100
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
        passive: true
    }
);


/* =========================================
   NARRATION POSITION STORAGE
========================================= */


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
        Number.isInteger(saved) &&
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


/* =========================================
   NARRATION 3.3 — DUAL ENGINE
========================================= */


const MODEL_ID =
    "onnx-community/Kokoro-82M-v1.0-ONNX";


const MODEL_CACHE_VERSION =
    "kokoro-82m-v1.0-onnx-fp32-webgpu";


const CACHE_IDENTITY_VERSION =
    "cache-identity-1";


const TARGET_BUFFER_SIZE =
    3;


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


let browserVoices = [];

let kokoro = null;

let kokoroLoadingPromise = null;

let drownedCrownVoices = [
    ...DROWNED_CROWN_FALLBACK_VOICES
];

let drownedCrownChunks = [];

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

let drownedCrownSessionVoice =
    "";

let drownedCrownSessionSpeed =
    1;


/* =========================================
   SOURCE
========================================= */


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


/* =========================================
   DEVICE VOICES
========================================= */


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
        window.speechSynthesis
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


    window.speechSynthesis
        .onvoiceschanged =
            loadBrowserVoices;
}


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
                    .startsWith("en")
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
            usableVoices[0].name;
    }
}


function populateDrownedCrownVoiceSelector() {

    voiceSelect.innerHTML =
        "";


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


function getSelectedBrowserVoice() {

    return (
        browserVoices.find(
            voice =>
                voice.name ===
                voiceSelect.value
        ) || null
    );
}


/* =========================================
   LOCAL NARRATOR MODEL
========================================= */


async function ensureDrownedCrownNarrator(
    {
        silent = false
    } = {}
) {

    if (kokoro) {

        return kokoro;
    }


    if (kokoroLoadingPromise) {

        return kokoroLoadingPromise;
    }


    const oldText =
        narrationPosition.textContent;


    if (!silent) {

        narrationPosition.textContent =
            "Loading Drowned Crown narrator…";

        playPause.disabled =
            true;
    }


    console.log(
        silent
            ? "Drowned Crown narrator loading in background…"
            : "Drowned Crown narrator loading…"
    );


    kokoroLoadingPromise =
        KokoroTTS.from_pretrained(
            MODEL_ID,
            {
                device: "webgpu",
                dtype: "fp32"
            }
        )
        .then(
            instance => {

                kokoro =
                    instance;


                loadDrownedCrownVoices();


                console.log(
                    "Drowned Crown narrator ready."
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


function loadDrownedCrownVoices() {

    let result =
        kokoro.list_voices();

    let list = [];


    if (Array.isArray(result)) {

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
        typeof result === "object"
    ) {

        list =
            Object.keys(result);
    }


    list =
        list.filter(Boolean);


    if (!list.length) {

        list = [
            ...DROWNED_CROWN_FALLBACK_VOICES
        ];
    }


    const english =
        list.filter(
            voice =>
                /^(am|af|bm|bf)_/
                    .test(voice)
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


/* =========================================
   TEXT PREPARATION
========================================= */


function prepareDeviceSpeechText(
    paragraph
) {

    let text =
        paragraph.textContent
            .replace(/\s+/g, " ")
            .replace(/[◆◇❖]/g, " ")
            .replace(/\s+/g, " ")
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
        paragraph.textContent
            .replace(
                /[◆◇❖]/g,
                " "
            )
    );
}


/* =========================================
   DROWNED CROWN CHUNK MAP
========================================= */


function buildDrownedCrownChunks() {

    drownedCrownChunks = [];

    let previousText = "";


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
                        text: piece,
                        speechText:
                            applyNarratorPronunciations(
                                piece
                            ),
                        performance: {
                            ...performance
                        },
                        sceneBreak: false
                    });
                }
            );


            previousText =
                text;
        }
    );
}


function splitDrownedCrownParagraph(
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


    const pieces = [];

    let working = "";


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

                working = "";
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
        ) || [
            text
        ]
    )
        .map(
            sentence =>
                sentence.trim()
        )
        .filter(Boolean);
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
            .filter(Boolean);


    if (
        clauses.length <=
        1
    ) {

        return hardSplitDrownedCrownText(
            sentence,
            maximum
        );
    }


    const pieces = [];

    let working = "";


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

                working = "";

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
        text.split(/\s+/);

    const pieces = [];

    let working = "";


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


/* =========================================
   CACHE IDENTITY
========================================= */


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
    ].join("\n");


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
                `${NARRATOR_VERSION}|` +
                `${CACHE_IDENTITY_VERSION}`
        });


    return {
        key,
        identity
    };
}


/* =========================================
   WAV
========================================= */


function createDrownedCrownWavBlob(
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
        36 +
        samples.length * 2,
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
                ? sample *
                    0x8000
                : sample *
                    0x7fff;


        view.setInt16(
            offset,
            value,
            true
        );


        offset += 2;
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


/* =========================================
   DEVICE ENGINE
========================================= */


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


    window.speechSynthesis
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
        ) || 1;


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


    window.speechSynthesis
        .speak(
            currentUtterance
        );


    updatePlayButton();
}


/* =========================================
   DROWNED CROWN SESSION
========================================= */


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
        Do NOT initialize Kokoro here.

        The cache can be read without the model.

        This means previously generated narration
        can begin immediately after a page refresh.
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
        targetChunk < 0
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
        voiceSelect.value ||
        localStorage.getItem(
            "drownedCrownNeuralVoice"
        ) ||
        drownedCrownVoices[0] ||
        "am_michael";


    drownedCrownSessionSpeed =
        Number(
            speedSelect.value
        ) || 1;


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


/* =========================================
   DROWNED CROWN BUFFER
========================================= */


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


/* =========================================
   CACHE-FIRST CHUNK ACQUISITION
========================================= */


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


    /*
        CACHE HIT

        No neural model is required.
    */


    if (
        cached &&
        cached.blob instanceof Blob
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
                    ) || 0,

                fromCache:
                    true,

                cacheKey:
                    key
            }
        );


        console.log(
            `Drowned Crown CACHE HIT — chunk ${index + 1}/${drownedCrownChunks.length}`
        );


        return;
    }


    /*
        CACHE MISS

        Only now do we initialize Kokoro.

        If cached narration is already playing,
        initialization happens silently in the
        background.
    */


    console.log(
        `Drowned Crown CACHE MISS — chunk ${index + 1}/${drownedCrownChunks.length}`
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


    const audioSeconds =
        generatedAudio.audio.length /
        generatedAudio.sampling_rate;


    const blob =
        createDrownedCrownWavBlob(
            generatedAudio
        );


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
                    drownedCrownSessionVoice,

                userSpeed:
                    drownedCrownSessionSpeed
                        .toFixed(4),

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
                key
        }
    );


    console.log(
        `Drowned Crown GENERATED — chunk ${index + 1}/${drownedCrownChunks.length}`,
        {
            generationSeconds:
                generationSeconds
                    .toFixed(2),

            audioSeconds:
                audioSeconds
                    .toFixed(2),

            realtimeFactor:
                audioSeconds > 0
                    ? (
                        generationSeconds /
                        audioSeconds
                    ).toFixed(2)
                    : "0.00"
        }
    );
}


/* =========================================
   DROWNED CROWN PLAYBACK
========================================= */


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


    drownedCrownAudio =
        new Audio(
            drownedCrownAudioURL
        );


    drownedCrownAudio.preload =
        "auto";


    drownedCrownAudio.addEventListener(
        "ended",
        handleDrownedCrownAudioEnded,
        {
            once:
                true
        }
    );


    drownedCrownAudio.addEventListener(
        "error",
        handleDrownedCrownAudioError,
        {
            once:
                true
        }
    );


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
        ] || null;


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
        pause > 0
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


/* =========================================
   PLAY / PAUSE / RESUME
========================================= */


function toggleNarration() {

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

        window.speechSynthesis
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

        window.speechSynthesis
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


/* =========================================
   PARAGRAPH MOVEMENT
========================================= */


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

        restartActiveEngineAtParagraph(
            currentParagraphIndex
        );

    } else {

        highlightCurrentParagraph();
    }
}


function moveToNextParagraph() {

    if (
        currentParagraphIndex >=
        narrationParagraphs.length -
            1
    ) {

        finishNarration();

        return;
    }


    currentParagraphIndex +=
        1;


    saveNarrationPosition();


    if (
        isNarrating ||
        isPaused
    ) {

        restartActiveEngineAtParagraph(
            currentParagraphIndex
        );

    } else {

        highlightCurrentParagraph();
    }
}


function restartActiveEngineAtParagraph(
    paragraphIndex
) {

    if (
        getNarrationSource() ===
        "drowned-crown"
    ) {

        startDrownedCrownNarration(
            paragraphIndex
        );

    } else {

        speakDeviceParagraph(
            paragraphIndex
        );
    }
}


/* =========================================
   STOP ENGINES
========================================= */


function stopDeviceEngine(
    updateButton = true
) {

    if (
        "speechSynthesis"
        in window
    ) {

        window.speechSynthesis
            .cancel();
    }


    currentUtterance =
        null;


    if (updateButton) {

        isNarrating =
            false;


        isPaused =
            false;


        updatePlayButton();
    }
}


function cleanupDrownedCrownAudio() {

    const audio =
        drownedCrownAudio;


    const url =
        drownedCrownAudioURL;


    drownedCrownAudio =
        null;


    drownedCrownAudioURL =
        null;


    if (audio) {

        try {

            audio.pause();

        } catch {

            /* no-op */
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


function releaseDrownedCrownBuffer() {

    drownedCrownBuffer.forEach(
        item => {

            if (item.url) {

                URL.revokeObjectURL(
                    item.url
                );
            }
        }
    );


    drownedCrownBuffer.clear();
}


function stopDrownedCrownEngine(
    updateButton = true
) {

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


    releaseDrownedCrownBuffer();


    drownedCrownGenerationRunning =
        false;


    if (updateButton) {

        isNarrating =
            false;


        isPaused =
            false;


        updatePlayButton();
    }
}


function stopAllNarrationEngines() {

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


    updatePlayButton();
}


function stopNarrationPlayback() {

    stopAllNarrationEngines();


    clearNarrationHighlight();


    saveNarrationPosition();


    updateNarrationDisplay();
}


function finishNarration() {

    stopAllNarrationEngines();


    clearNarrationHighlight();


    currentParagraphIndex =
        Math.max(
            0,
            narrationParagraphs.length -
                1
        );


    saveNarrationPosition();


    updateNarrationDisplay();
}


/* =========================================
   HIGHLIGHT / DISPLAY
========================================= */


function clearNarrationHighlight() {

    narrationParagraphs.forEach(
        paragraph => {

            paragraph.classList.remove(
                "narrating"
            );
        }
    );
}


function showCurrentNarrationParagraph() {

    if (
        !narrationParagraphs.length
    ) {

        return;
    }


    clearNarrationHighlight();


    const paragraph =
        narrationParagraphs[
            currentParagraphIndex
        ];


    paragraph.classList.add(
        "narrating"
    );


    saveNarrationPosition();


    updateNarrationDisplay();


    paragraph.scrollIntoView({
        behavior:
            "smooth",
        block:
            "center"
    });
}


function highlightCurrentParagraph() {

    showCurrentNarrationParagraph();
}


function updateNarrationDisplay() {

    const total =
        narrationParagraphs.length;


    if (
        total === 0
    ) {

        narrationPosition.textContent =
            "No narration available";


        narrationSeekFill.style.width =
            "0%";


        return;
    }


    const displayedIndex =
        currentParagraphIndex +
        1;


    narrationPosition.textContent =
        `Paragraph ${displayedIndex} of ${total}`;


    const progress =
        total <= 1
            ? 100
            : (
                currentParagraphIndex /
                (
                    total -
                    1
                )
            ) *
            100;


    narrationSeekFill.style.width =
        `${progress}%`;


    narrationSeek.setAttribute(
        "aria-valuemax",
        String(
            total
        )
    );


    narrationSeek.setAttribute(
        "aria-valuenow",
        String(
            displayedIndex
        )
    );
}


/* =========================================
   SEEK
========================================= */


function seekNarration(
    clientX
) {

    if (
        !narrationParagraphs.length
    ) {

        return;
    }


    const rect =
        narrationSeek
            .getBoundingClientRect();


    const percentage =
        Math.min(
            1,
            Math.max(
                0,
                (
                    clientX -
                    rect.left
                ) /
                rect.width
            )
        );


    const targetIndex =
        Math.round(
            percentage *
            (
                narrationParagraphs.length -
                1
            )
        );


    currentParagraphIndex =
        targetIndex;


    saveNarrationPosition();


    if (
        isNarrating ||
        isPaused
    ) {

        restartActiveEngineAtParagraph(
            currentParagraphIndex
        );

    } else {

        highlightCurrentParagraph();
    }
}


/* =========================================
   OPTION EVENTS
========================================= */


if (
    narrationSource
) {

    narrationSource.addEventListener(
        "change",
        () => {

            stopAllNarrationEngines();


            localStorage.setItem(
                "drownedCrownNarrationSource",
                narrationSource.value
            );


            refreshVoiceSelector();


            updateNarrationDisplay();
        }
    );
}


voiceSelect.addEventListener(
    "change",
    () => {

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

            restartActiveEngineAtParagraph(
                currentParagraphIndex
            );
        }
    }
);


speedSelect.addEventListener(
    "change",
    () => {

        localStorage.setItem(
            "drownedCrownSpeechRate",
            speedSelect.value
        );


        if (
            isNarrating ||
            isPaused
        ) {

            restartActiveEngineAtParagraph(
                currentParagraphIndex
            );
        }
    }
);


/* =========================================
   PLAYER EVENTS
========================================= */


listenButton.addEventListener(
    "click",
    () => {

        narrationPlayer.hidden =
            false;


        updateNarrationDisplay();


        highlightCurrentParagraph();
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
    stopNarrationPlayback
);


closeNarration.addEventListener(
    "click",
    () => {

        stopNarrationPlayback();


        narrationPlayer.hidden =
            true;
    }
);


narrationSeek.addEventListener(
    "click",
    event => {

        seekNarration(
            event.clientX
        );
    }
);


narrationSeek.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "ArrowLeft"
        ) {

            event.preventDefault();


            moveToPreviousParagraph();
        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            event.preventDefault();


            moveToNextParagraph();
        }
    }
);


/* =========================================
   KEYBOARD
========================================= */


document.addEventListener(
    "keydown",
    event => {

        const tag =
            document.activeElement
                ?.tagName
                ?.toLowerCase();


        if (
            tag ===
                "select" ||
            tag ===
                "input" ||
            tag ===
                "button"
        ) {

            return;
        }


        if (
            event.code ===
                "Space" &&
            !narrationPlayer.hidden
        ) {

            event.preventDefault();


            toggleNarration();
        }
    }
);


/* =========================================
   PAGE EXIT
========================================= */


window.addEventListener(
    "beforeunload",
    () => {

        saveNarrationPosition();


        stopAllNarrationEngines();
    }
);


/* =========================================
   START
========================================= */


function startReader() {

    loadReaderSettings();


    loadNarrationSettings();


    loadChapter();
}


startReader();