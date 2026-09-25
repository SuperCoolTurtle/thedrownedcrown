"use strict";


/* =========================================
   THE DROWNED CROWN
   CHAPTER DATABASE
========================================= */


const CHAPTERS = [

    /* =====================================
       PROLOGUE
    ====================================== */

    {
        id: "prologue",

        number: 0,

        label: "Prologue",

        pov: "Harl",

        location: "The Mourning Sea",

        file: "chapters/prologue.html",

        previous: null,

        next: "chapter-01"
    },


    /* =====================================
       CHAPTER ONE
    ====================================== */

    {
        id: "chapter-01",

        number: 1,

        label: "Chapter One",

        pov: "Polonius",

        location: "The Mourning Sea",

        file: "chapters/chapter-01.html",

        previous: "prologue",

        next: "chapter-02"
    },


    /* =====================================
       CHAPTER TWO
    ====================================== */

    {
        id: "chapter-02",

        number: 2,

        label: "Chapter Two",

        pov: "Rava",

        location: "Dentora",

        file: "chapters/chapter-02.html",

        previous: "chapter-01",

        next: null
    }

];



/* =========================================
   CHAPTER LOOKUP
========================================= */

function getChapterById(id) {

    return CHAPTERS.find(
        chapter => chapter.id === id
    );

}