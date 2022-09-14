// ==UserScript==
// @name         Watch9 Reconstruct
// @version      2.0.1
// @description  Restores the old watch layout from before 2019
// @author       Aubrey P.
// @icon         https://www.youtube.com/favicon.ico
// @namespace    aubymori
// @license      Unlicense
// @match        www.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

const w9rOptions = {
    oldAutoplay: true,
    removeBloatButtons: true
}

/**
 * Internationalization strings.
 */
 const w9ri18n = {
    en: {
        subSuffixMatch: /( subscribers)|( subscriber)/, // Regex for isolating subscriber count
        subCntZero: "No",                               // When the author has 0 subscribers
        nonPublishMatch: /(Premier)|(Stream)|(Start)/,  // Match to determine if a video was normally uploaded
        publishedOn: "Published on %s",                 // Self explanatory
        upNext: "Up next",
        autoplay: "Autoplay",
        autoplayTip: "When autoplay is enabled, a suggested video will automatically play next."
    }
};

/**
 * Stub for autoplay renderer.
 * (CURRENTLY UNUSED)
 */
const autoplayStub = `
<ytd-compact-autoplay-renderer class="style-scope ytd-watch-next-secondary-results-renderer">
    <div id="head" class="style-scope ytd-compact-autoplay-renderer">
        <div id="upnext" class="style-scope ytd-compact-autoplay-renderer"></div>
        <div id="autoplay" class="style-scope ytd-compact-autoplay-renderer"></div>
        <tp-yt-paper-toggle-button id="toggle" noink="" class="style-scope ytd-compact-autoplay-renderer" role="button" aria-pressed="" tabindex="0" style="touch-action: pan-y;" toggles="" aria-disabled="false" aria-label=""></tp-yt-paper-toggle-button>
        <tp-yt-paper-tooltip id="tooltip for="toggle" class="style-scope ytd-compact-autoplay-renderer" role="tooltip" tabindex="-1"></tp-yt-paper-tooltip>
    </div>
    <div id="contents" class="style-scope ytd-compact-autoplay-renderer"></div>
</ytd-compact-autoplay-renderer>
`;

/**
 * Get a string from the internationalization strings.
 *
 * @param {string} string  Name of string to get
 * @param {string} hl      Language to use.
 * @returns {string}
 */
function getString(string, hl = "en") {
    if (string == null) return "ERROR";
    return w9ri18n[hl][string];
}

/**
 * Format upload date string to include "Published on" if applicable.
 *
 * @param {string} dateStr  dateText from InnerTube ("Sep 13, 2022", "Premiered 2 hours ago", etc.)
 * @param {string} hl       Language to use.
 * @returns
 */
function formatUploadDate(dateStr, hl = "en") {
    var nonPublishMatch = getString("nonPublishMatch", hl);
    var publishedOn = getString("publishedOn", hl);
    if (nonPublishMatch.test(dateStr)) {
        return dateStr;
    } else {
        return publishedOn.replace("%s", dateStr);
    }
}

/**
 * Format subscriber count string to only include count.
 *
 * @param {string} count  Subscriber count string from InnerTube ("374K subscribers", "No subscribers", etc.)
 * @param {string} hl     Language to use.
 * @returns
 */
function formatSubCount(count, hl = "en") {
    if (count == null) return "";
    var tmp = count.replace(getString("subSuffixMatch", hl), "");
    tmp = tmp.replace(getString("subCntZero", hl), "0");
    return tmp;
}

/**
 * Toggle autoplay.
 *
 * @returns {void}
 */
function clickAutoplay() {
    var player = document.querySelector("#movie_player");
    var autoplay;
    if (autoplay = player.querySelector(".ytp-autonav-toggle-button-container")) {
        autoplay.parentNode.click();
    } else {
        var settings = player.querySelector('.ytp-settings-button');
        settings.click();settings.click();
        var item = player.querySelector('.ytp-menuitem[role="menuitemcheckbox"]');
        item.click();
    }
}

/**
 * Should the Autoplay renderer be inserted?
 * (Basically, if there's a playlist active)
 *
 * @returns {boolean}
 */
function shouldHaveAutoplay() {
    var playlist;
    if (playlist = document.querySelector("#playlist.ytd-watch-flexy")) {
        if (playlist.hidden && playlist.hidden == true) {
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
}

function removeBloatButtons() {
    var watchFlexy = document.querySelector("ytd-watch-flexy");
    var primaryInfo = watchFlexy.querySelector("ytd-video-primary-info-renderer");
    var actionBtns = primaryInfo.querySelector("ytd-menu-renderer.ytd-video-primary-info-renderer .top-level-buttons");
    // I have no idea why they made this a seperate element
    // type but go off I guess, Google
    var dlBtn;
    if (dlBtn = actionBtns.querySelector("ytd-download-button-renderer")) {
        dlBtn.remove();
    }

    var abList = actionBtns.querySelectorAll("ytd-button-renderer");
    for (var i = 0; i < abList.length; i++) {
        var iconType;
        if (iconType = abList[i].data.icon.iconType) {
            console.log(iconType);
            if (iconType == "MONEY_HEART" || iconType == "CONTENT_CUT") {
                abList[i].remove();
            }
        }
    }
}

/**
 * Build new Watch9 elements and tweak currently existing elements accordingly.
 *
 * @return {void}
 */
 function buildWatch9() {
    const watchFlexy = document.querySelector("ytd-watch-flexy");
    const primaryInfo = watchFlexy.querySelector("ytd-video-primary-info-renderer");
    const secondaryInfo = watchFlexy.querySelector("ytd-video-secondary-info-renderer");
    const viewCount = primaryInfo.querySelector("ytd-video-view-count-renderer");
    const subBtn = secondaryInfo.querySelector("#subscribe-button tp-yt-paper-button");
    const uploadDate = secondaryInfo.querySelector(".date.ytd-video-secondary-info-renderer"); // Old unused element that we inject the date into
    const language = yt.config_.HL;

    // Let script know we've done this initial build
    watchFlexy.setAttribute("watch9-built", "");

    // Make view count large like in Watch9
    viewCount.removeAttribute("small");

    // Publish date
    var newUploadDate = formatUploadDate(primaryInfo.data.dateText.simpleText, language);
    uploadDate.innerText = newUploadDate;

    // Sub count
    var newSubCount = formatSubCount(secondaryInfo.data.owner.videoOwnerRenderer.subscriberCountText.simpleText);
    var w9rSubCount = document.createElement("yt-formatted-string");
    w9rSubCount.classList.add("style-scope", "deemphasize");
    w9rSubCount.text = {
        simpleText: newSubCount
    };
    subBtn.insertAdjacentElement("beforeend", w9rSubCount);

    // Bloat buttons
    if (w9rOptions.removeBloatButtons) removeBloatButtons();
}

/**
 * Update currently existing Watch9 elements.
 *
 * @return {void}
 */
function updateWatch9() {
    const watchFlexy = document.querySelector("ytd-watch-flexy");
    const primaryInfo = watchFlexy.querySelector("ytd-video-primary-info-renderer");
    const secondaryInfo = watchFlexy.querySelector("ytd-video-secondary-info-renderer");
    const subCnt = secondaryInfo.querySelector("yt-formatted-string.deemphasize");
    const uploadDate = secondaryInfo.querySelector(".date.ytd-video-secondary-info-renderer");
    const language = yt.config_.HL;

    // Publish date
    var newUploadDate = formatUploadDate(primaryInfo.data.dateText.simpleText, language);
    uploadDate.innerText = newUploadDate;

    // Sub count
    var newSubCount = formatSubCount(secondaryInfo.data.owner.videoOwnerRenderer.subscriberCountText.simpleText, language);
    subCnt.text = {
        simpleText: newSubCount
    };

    // Bloat buttons
    if (w9rOptions.removeBloatButtons) removeBloatButtons();
}

/**
 * Run the Watch9 build/update functions.
 */
document.addEventListener("yt-page-data-updated", (e) => {
    if (e.detail.pageType == "watch") {
        if (document.querySelector("ytd-watch-flexy").getAttribute("watch9-built") != null) {
            updateWatch9();
        } else {
            buildWatch9();
        }
    }
});

/**
 * Inject styles.
 */
document.addEventListener("DOMContentLoaded", function tmp() {
    document.head.insertAdjacentHTML("beforeend", `
    <style>
    /* Hide Watch11 */
    ytd-watch-metadata {
        display: none !important;
    }

    /* Force Watch10 to display */
    #meta-contents[hidden],
    #info-contents[hidden] {
        display: block !important;
    }

    yt-formatted-string.deemphasize {
        opacity: .85;
        margin-left: 6px;
    }

    yt-formatted-string.deemphasize:empty {
        margin-left: 0;
    }

    /**
     * Prevent sub count from appearing on the "Edit video" button since
     * it uses the same element as subscribe button
     */
    ytd-button-renderer.style-primary yt-formatted-string.deemphasize {
        display: none;
    }

    #info-strings.ytd-video-primary-info-renderer,
    #owner-sub-count.ytd-video-owner-renderer {
        display: none !important;
    }
    </style>
    `);
    document.removeEventListener("DOMContentLoaded", tmp);
});