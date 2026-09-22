"use strict";


/* =========================================
   THE DROWNED CROWN
   NARRATOR AUDIO CACHE 1.0

   Persistent local audiobook cache.

   Generated WAV files are stored in IndexedDB
   on the reader's own device.

   No audio is uploaded anywhere.
========================================= */


const DATABASE_NAME =
    "drowned-crown-narrator";


const DATABASE_VERSION =
    1;


const AUDIO_STORE =
    "audio-chunks";


/* =========================================
   OPEN DATABASE
========================================= */


function openDatabase() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    DATABASE_NAME,
                    DATABASE_VERSION
                );


            request.onupgradeneeded =
                event => {

                    const database =
                        event.target.result;


                    if (
                        !database.objectStoreNames
                            .contains(AUDIO_STORE)
                    ) {

                        const store =
                            database.createObjectStore(
                                AUDIO_STORE,
                                {
                                    keyPath: "key"
                                }
                            );


                        store.createIndex(
                            "createdAt",
                            "createdAt",
                            {
                                unique: false
                            }
                        );

                    }

                };


            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


/* =========================================
   HASH TEXT
========================================= */


async function hashString(
    value
) {

    const encoded =
        new TextEncoder()
            .encode(value);


    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            encoded
        );


    return Array
        .from(
            new Uint8Array(digest)
        )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}


/* =========================================
   CREATE CACHE KEY
========================================= */


export async function createNarrationCacheKey({

    text,

    voice,

    speed,

    model,

    narratorVersion

}) {

    const identity =
        JSON.stringify({

            text:
                String(text || ""),

            voice:
                String(voice || ""),

            speed:
                Number(speed)
                    .toFixed(4),

            model:
                String(model || ""),

            narratorVersion:
                String(
                    narratorVersion ||
                    ""
                )

        });


    return await hashString(
        identity
    );

}


/* =========================================
   READ CACHE
========================================= */


export async function getCachedNarration(
    key
) {

    const database =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                database.transaction(
                    AUDIO_STORE,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    AUDIO_STORE
                );


            const request =
                store.get(key);


            request.onsuccess =
                () => {

                    database.close();


                    resolve(
                        request.result ||
                        null
                    );

                };


            request.onerror =
                () => {

                    database.close();


                    reject(
                        request.error
                    );

                };

        }
    );

}


/* =========================================
   WRITE CACHE
========================================= */


export async function saveNarrationToCache({

    key,

    blob,

    audioSeconds,

    metadata = {}

}) {

    const database =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                database.transaction(
                    AUDIO_STORE,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    AUDIO_STORE
                );


            store.put({

                key,

                blob,

                audioSeconds,

                metadata,

                createdAt:
                    Date.now()

            });


            transaction.oncomplete =
                () => {

                    database.close();


                    resolve();

                };


            transaction.onerror =
                () => {

                    database.close();


                    reject(
                        transaction.error
                    );

                };

        }
    );

}


/* =========================================
   DELETE ONE ENTRY
========================================= */


export async function deleteCachedNarration(
    key
) {

    const database =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                database.transaction(
                    AUDIO_STORE,
                    "readwrite"
                );


            transaction
                .objectStore(AUDIO_STORE)
                .delete(key);


            transaction.oncomplete =
                () => {

                    database.close();
                    resolve();

                };


            transaction.onerror =
                () => {

                    database.close();

                    reject(
                        transaction.error
                    );

                };

        }
    );

}


/* =========================================
   CLEAR ALL NARRATION AUDIO
========================================= */


export async function clearNarrationCache() {

    const database =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                database.transaction(
                    AUDIO_STORE,
                    "readwrite"
                );


            transaction
                .objectStore(AUDIO_STORE)
                .clear();


            transaction.oncomplete =
                () => {

                    database.close();
                    resolve();

                };


            transaction.onerror =
                () => {

                    database.close();

                    reject(
                        transaction.error
                    );

                };

        }
    );

}


/* =========================================
   CACHE STATISTICS
========================================= */


export async function getNarrationCacheStats() {

    const database =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                database.transaction(
                    AUDIO_STORE,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    AUDIO_STORE
                );


            const request =
                store.getAll();


            request.onsuccess =
                () => {

                    const records =
                        request.result || [];


                    let bytes =
                        0;


                    records.forEach(
                        record => {

                            if (
                                record.blob
                            ) {

                                bytes +=
                                    record.blob.size;

                            }

                        }
                    );


                    database.close();


                    resolve({

                        entries:
                            records.length,

                        bytes,

                        megabytes:
                            bytes /
                            1024 /
                            1024

                    });

                };


            request.onerror =
                () => {

                    database.close();

                    reject(
                        request.error
                    );

                };

        }
    );

}