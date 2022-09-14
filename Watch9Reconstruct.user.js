// ==UserScript==
// @name         Watch9 Reconstruct
// @version      2.1.0
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
    oldAutoplay: true,        // Classic autoplay renderer with "Up next" text
    removeBloatButtons: true  // Removes "Clip", "Thanks", "Download", etc.
}

/**
 * Localization strings.
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
 * Wait for a selector to exist
 * 
 * @param {string}       selector  CSS Selector
 * @param {HTMLElement}  base      Element to search inside
 * @returns {Node}
 */
async function waitForElm(selector, base = document) {
    if (!selector) return null;
    if (!base.querySelector) return null;
    while (base.querySelector(selector) == null) {
        await new Promise(r => requestAnimationFrame(r));
    };
    return base.querySelector(selector);
};

/**
 * Get a string from the localization strings.
 *
 * @param {string} string  Name of string to get
 * @param {string} hl      Language to use.
 * @returns {string}
 */
function getString(string, hl = "en") {
    if (!string) return "ERROR";
    if (w9ri18n[hl]) {
        if (w9ri18n[hl][string]) {
            return w9ri18n[hl][string];
        } else if (w9r18n.en[string]) {
            return w9ri18n.en[string];
        } else {
            return "ERROR";
        }
    } else {
        if (w9ri18n.en[string]) return w9ri18n.en[string];
        return "ERROR";
    }
}

/**
 * Format upload date string to include "Published on" if applicable.
 *
 * @param {string} dateStr  dateText from InnerTube ("Sep 13, 2022", "Premiered 2 hours ago", etc.)
 * @param {string} hl       Language to use.
 * @returns {string}
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
 * @returns {string}
 */
function formatSubCount(count, hl = "en") {
    if (count == null) return "";
    var tmp = count.replace(getString("subSuffixMatch", hl), "");
    tmp = tmp.replace(getString("subCntZero", hl), "0");
    return tmp;
}

/**
 * Parse document.cookie
 * 
 * @returns {object}
 */
function parseCookies() {
    var c = document.cookie.split(";"), o = {};
    for (var i = 0, j = c.length; i < j; i++) {
        var s = c[i].split("=");
        var n = s[0].replace(" ", "");
        s.splice(0, 1);
        s = s.join("=");
        o[n] = s;
    }
    return o;
}

/**
 * Parse YouTube's PREF cookie.
 * 
 * @param {string} pref  PREF cookie content
 * @returns {object}
 */
function parsePref(pref) {
    var a = pref.split("&"), o = {};
    for (var i = 0, j = a.length; i < j; i++) {
        var b = a[i].split("=");
        o[b[0]] = b[1];
    }
    return o;
}

/**
 * Is autoplay enabled?
 * 
 * @returns {boolean}
 */
function autoplayState() {
    var cookies = parseCookies();
    if (cookies.PREF) {
        var pref = parsePref(cookies.PREF);
        if (pref.f5) {
            return !(pref.f5 & 8192)
        } else {
            return true; // default
        }
    } else {
        return true;
    }
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

/**
 * Remove bloaty action buttons.
 * 
 * @returns {void}
 */
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
            if (iconType == "MONEY_HEART" || iconType == "CONTENT_CUT") {
                abList[i].remove();
            }
        }
    }
}

/**
 * Build the classic compact autoplay renderer.
 * 
 * @returns {void}
 */
function buildAutoplay() {
    const watchFlexy = document.querySelector("ytd-watch-flexy");
    const secondaryResults = watchFlexy.querySelector("ytd-watch-next-secondary-results-renderer");
    const sidebarItems = secondaryResults.querySelector("#items");
    const language = yt.config_.HL ?? "en";
    const autoplayStub = `
    <ytd-compact-autoplay-renderer class="style-scope ytd-watch-next-secondary-results-renderer">
        <div id="head" class="style-scope ytd-compact-autoplay-renderer">
            <div id="upnext" class="style-scope ytd-compact-autoplay-renderer"></div>
            <div id="autoplay" class="style-scope ytd-compact-autoplay-renderer"></div>
            <tp-yt-paper-toggle-button id="toggle" noink="" class="style-scope ytd-compact-autoplay-renderer" role="button" aria-pressed="" tabindex="0" style="touch-action: pan-y;" toggles="" aria-disabled="false" aria-label=""></tp-yt-paper-toggle-button>
            <tp-yt-paper-tooltip id="tooltip" for="toggle" class="style-scope ytd-compact-autoplay-renderer" role="tooltip" tabindex="-1">${getString("autoplayTip", language)}</tp-yt-paper-tooltip>
        </div>
        <div id="contents" class="style-scope ytd-compact-autoplay-renderer"></div>
    </ytd-compact-autoplay-renderer>
    `;

    // Insert the autoplay stub.
    sidebarItems.insertAdjacentHTML("afterbegin", autoplayStub);
    var autoplayRenderer = sidebarItems.querySelector("ytd-compact-autoplay-renderer");

    // Apply the appropriate localized text.
    autoplayRenderer.querySelector("#upnext").innerText = getString("upNext", language);
    autoplayRenderer.querySelector("#autoplay").innerText = getString("autoplay", language);

    // Add event listener to toggle
    autoplayRenderer.querySelector("#toggle").addEventListener("click", clickAutoplay);

    // And finally, place the first video in the autoplay renderer.
    // Recommended list loading is kinda delayed,
    // so we wait for the first video renderer
    waitForElm("ytd-compact-video-renderer", sidebarItems).then((e) => {
        autoplayRenderer.querySelector("#contents").appendChild(e);
    });

    // Add the interval to update toggle if it isn't already.
    if (!watchFlexy.getAttribute("autoplay-interval-active")) {
        var autoplayInterval = setInterval(() => {
            if (autoplayState()) {
                autoplayRenderer.querySelector("#toggle").setAttribute("checked", "");
            } else {
                autoplayRenderer.querySelector("#toggle").removeAttribute("checked");
            }
        }, 100);
    }
}

/**
 * Build new Watch9 elements and tweak currently existing elements accordingly.
 *
 * @returns {void}
 */
 function buildWatch9() {
    const watchFlexy = document.querySelector("ytd-watch-flexy");
    const primaryInfo = watchFlexy.querySelector("ytd-video-primary-info-renderer");
    const secondaryInfo = watchFlexy.querySelector("ytd-video-secondary-info-renderer");
    const viewCount = primaryInfo.querySelector("ytd-video-view-count-renderer");
    const subBtn = secondaryInfo.querySelector("#subscribe-button tp-yt-paper-button");
    const uploadDate = secondaryInfo.querySelector(".date.ytd-video-secondary-info-renderer"); // Old unused element that we inject the date into
    const language = yt.config_.HL ?? "en";

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

    // Autoplay
    if (w9rOptions.oldAutoplay && shouldHaveAutoplay()) buildAutoplay();
}

/**
 * Update currently existing Watch9 elements.
 *
 * @returns {void}
 */
function updateWatch9() {
    const watchFlexy = document.querySelector("ytd-watch-flexy");
    const primaryInfo = watchFlexy.querySelector("ytd-video-primary-info-renderer");
    const secondaryInfo = watchFlexy.querySelector("ytd-video-secondary-info-renderer");
    const subCnt = secondaryInfo.querySelector("yt-formatted-string.deemphasize");
    const uploadDate = secondaryInfo.querySelector(".date.ytd-video-secondary-info-renderer");
    const language = yt.config_.HL ?? "en";

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

    // Autoplay
    if (w9rOptions.oldAutoplay && shouldHaveAutoplay()) buildAutoplay();
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
    <style id="watch9-fix">
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
    if (w9rOptions.oldAutoplay) document.head.insertAdjacentHTML("beforeend", `
        <style id="compact-autoplay-fix">
        yt-related-chip-cloud-renderer {
            display: none;
        }

        ytd-compact-autoplay-renderer {
            padding-bottom: 8px;
            border-bottom: 1px solid var(--yt-spec-10-percent-layer);
            margin-bottom: 16px;
        }
        
        ytd-compact-autoplay-renderer ytd-compact-video-renderer {
            margin: 0 !important;
            padding-bottom: 8px;
        }
        
        #head.ytd-compact-autoplay-renderer {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
        }
        
        #upnext.ytd-compact-autoplay-renderer {
            color: var(--yt-spec-text-primary);
            font-size: 1.6rem;
            flex-grow: 1;
        }
        
        #autoplay.ytd-compact-autoplay-renderer {
            color: var(--yt-spec-text-secondary);
            font-size: 1.3rem;
            font-weight: 500;
            text-transform: uppercase;
            line-height: 1;
        }
        
        #toggle.ytd-compact-autoplay-renderer {
            margin-left: 8px;
        }
        
        ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer.ytd-item-section-renderer:first-of-type {
            margin-top: 0 !important;
        }
        </style>
    `);
    document.removeEventListener("DOMContentLoaded", tmp);
});