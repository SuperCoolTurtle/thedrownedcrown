"use strict";


/* =========================================
   THE DROWNED CROWN
   MAIN WEBSITE
========================================= */


/* =========================================
   ELEMENTS
========================================= */


const menuButton =
    document.getElementById(
        "menuButton"
    );


const mainNav =
    document.getElementById(
        "mainNav"
    );


const currentYear =
    document.getElementById(
        "currentYear"
    );


/* =========================================
   MOBILE NAVIGATION
========================================= */


if (
    menuButton &&
    mainNav
) {

    menuButton.addEventListener(
        "click",
        () => {

            const isOpen =
                mainNav.classList.toggle(
                    "open"
                );


            menuButton.setAttribute(
                "aria-expanded",
                String(
                    isOpen
                )
            );


            menuButton.textContent =
                isOpen
                    ? "×"
                    : "☰";

        }
    );


    /*
        Close the menu after selecting
        an internal homepage link.
    */

    mainNav
        .querySelectorAll("a")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        mainNav.classList.remove(
                            "open"
                        );


                        menuButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );


                        menuButton.textContent =
                            "☰";

                    }
                );

            }
        );

}


/* =========================================
   COPYRIGHT YEAR
========================================= */


if (currentYear) {

    currentYear.textContent =
        new Date().getFullYear();
}