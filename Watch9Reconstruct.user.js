// ==UserScript==
// @name         Watch9 Reconstruct
// @version      b3.0.0
// @description  Restores the old watch layout from before 2019
// @author       Aubrey P.
// @icon         https://www.youtube.com/favicon.ico
// @updateURL    https://github.com/aubymori/Watch9Reconstruct/raw/main/Watch9Reconstruct.user.js
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
 *
 * See LOCALIZATION.md in the GitHub repo.
 */
 const w9ri18n = {
    en: {
        subCountIsolator: /( subscribers)|( subscriber)/,
        uploadTypeMatch: /(Premier)|(Stream)|(Start)/,
        dateTextPublic: "Published on %s",
        dateTextPrivate: "Uploaded on %s",
        autoplayTitle: "Up next",
        autoplayToggleDesc: "Autoplay",
        autoplayInfoText: "When autoplay is enabled, a suggested video will automatically play next."
    },
    ja: {
        subCountIsolator: /(チャンネル登録者数 )|(人)/g,
        uploadTypeMatch: /(公開済)|(開始済)/g,
        dateTextPublic: "%s に公開",
        dateTextPrivate: "%s にアップロード",
        autoplayTitle: "自動再生",
        autoplayToggleDesc: "次の動画",
        autoplayInfoText: "自動再生を有効にすると、関連動画が自動的に再生されます。"
    },
    pl: {
        subCountIsolator: /( subskrybentów)|( subskrybent)/,
        uploadTypeMatch: /(Data premiery: )|(adawane na żywo )|(Transmisja zaczęła się )/,
        dateTextPublic: "Opublikowany %s",
        dateTextPrivate: "Przesłany %s",
        autoplayTitle: "Następny",
        autoplayToggleDesc: "Autoodtwarzanie",
        autoplayInfoText: "Jeśli masz włączone autoodtwarzanie, jako następny włączy się automatycznie proponowany film."
    },
    fil: {
        subCountIsolator: /(na)|( subscribers)|( subscriber)|(\s)/g,
        uploadTypeMatch: /(simula)/,
        dateTextPublic: "Na-publish noong %s",
        dateTextPrivate: "Na-upload noong %s",
        autoplayTitle: "Susunod",
        autoplayToggleDesc: "I-autoplay",
        autoplayInfoText: "Kapag naka-enable ang autoplay, awtomatikong susunod na magpe-play ang isang iminumungkahing video."
    },
    fr: {
        subCountIsolator: /( abonnés)|( abonné)|( d’abonnés)|( d’abonné)/g,
        uploadTypeMatch: /(Diffus)|(Sortie)/g,
        dateTextPublic: "Publiée le %s",
        dateTextPrivate: "Mise en ligne le %s",
        autoplayTitle: "À suivre",
        autoplayToggleDesc: "Lecture automatique",
        autoplayInfoText: "Lorsque cette fonctionnalité est activée, une vidéo issue des suggestions est automatiquement lancée à la suite de la lecture en cours."
    },
    es: {
        subCountIsolator: /( de suscriptores)|( suscriptor)/g,
        uploadTypeMatch: /(directo)|(Fecha)/g,
        dateTextPublic: "Publicado el %s",
        dateTextPrivate: "Subido el %s",
        autoplayTitle: "A continuación",
        autoplayToggleDesc: "Reproducción automática",
        autoplayInfoText: "Si la reproducción automática está habilitada, se reproducirá automáticamente un vídeo a continuación."
    },
    pt: {
        subCountIsolator: /( de subscritores)|( subscritor)/g,
        uploadTypeMatch: /(Stream)|(Estreou)/g,
        dateTextPublic: "Publicado a %s",
        dateTextPrivate: "Carregado a %s",
        autoplayTitle: "Próximo",
        autoplayToggleDesc: "Reprodução automática",
        autoplayInfoText: "Quando a reprodução automática é ativada, um vídeo sugerido será executado automaticamente em seguida."
    },
    ru: {
        subCountIsolator: /( подписчиков)|( подписчик)/g,
        uploadTypeMatch: /(Сейчас смотрят:)|(Прямой эфир состоялся)|(Дата премьеры:)/g,
        dateTextPublic: "Дата публикации: %s",
        dateTextPrivate: "Дата публикации: %s",
        autoplayTitle: "Следующее видео",
        autoplayToggleDesc: "Автовоспроизведение",
        autoplayInfoText: "Если функция включена, то следующий ролик начнет воспроизводиться автоматически."
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
    if (!string) return "";
    if (w9ri18n[hl]) {
        if (w9ri18n[hl][string]) {
            return w9ri18n[hl][string];
        } else if (w9ri18n.en[string]) {
            return w9ri18n.en[string];
        } else {
            return "";
        }
    } else {
        if (w9ri18n.en[string]) return w9ri18n.en[string];
        return "";
    }
}

/**
 * Format upload date string to include "Published on" or "Uploaded on" if applicable.
 *
 * @param {string}  dateStr  dateText from InnerTube ("Sep 13, 2022", "Premiered 2 hours ago", etc.)
 * @param {boolean} isPublic Is the video public?
 * @param {string}  hl       Language to use.
 * @returns {string}
 */
function formatDateText(dateStr, isPublic, hl = "en") {
    var uploadTypeMatch = getString("uploadTypeMatch", hl);
    var string = isPublic ? getString("dateTextPublic", hl) : getString("dateTextPrivate", hl);
    if (uploadTypeMatch.test(dateStr)) {
        return dateStr;
    } else {
        return string.replace("%s", dateStr);
    }
}

/**
 * Format subscriber count string to only include count.
 *
 * @param {string} count  Subscriber count string from InnerTube ("374K subscribers", "No subscribers", etc.)
 * @param {string} hl     Language to use.
 * @returns {string}
 */
function formatSubscriberCount(count, hl = "en") {
    if (count == null) return "";
    var tmp = count.replace(getString("subCountIsolator", hl), "");
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
 * Is a value in an array? Exactly like the
 * PHP equivalent, minus the strict param.
 * 
 * @param {*}     needle    Value to search
 * @param {Array} haystack  Array to search
 * @returns {boolean}
 */
function inArray(needle, haystack) {
    for (var i = 0; i < haystack.length; i++) {
        if (needle == haystack[i]) return true;
    }
    return false;
}

/**
 * Is the current video public? Or is it unlisted/private?
 *
 * @returns {boolean}
 */
function isVideoPublic() {
    var primaryInfo = document.querySelector("ytd-video-primary-info-renderer");
    if (primaryInfo.data.badges == null) return true;
    var badges = primaryInfo.data.badges;

    for (var i = 0; i < badges.length; i++) {
        var iconType = badges[i].metadataBadgeRenderer.icon.iconType;
        if (iconType == "PRIVACY_UNLISTED" || iconType == "PRIVACY_PRIVATE") {
            return false;
        }
    }
    return true;
}

/**
 * Force Polymer to rebuild element based on new data
 * 
 * @param {Node} element  Element to refresh data of.
 * @returns {void}
 */
function refreshData(element) {
    if (!element.nodeName) return;
    var tmp = element.data;
    element.data = {};
    element.data = tmp;
}

/**
 * Format a subscriber count text object from InnerTube
 * to include the subscriber count.
 * 
 * @param {object} text   InnerTube text object.
 * @param {string} count  Subscriber count string.
 */
function formatSubscriberButtonText(text, count) {
    return (count != null && typeof count == "string") ? {
        runs: [
            {
                text: (text.runs[0].text ?? "") + " "
            },
            {
                text: count,
                deemphasize: true
            }
        ]
    } : text;
}

/**
 * Update the watch page
 * 
 * @returns {void}
 */
async function updateWatch() {
    var primaryInfo   = document.querySelector("ytd-video-primary-info-renderer"),
        secondaryInfo = document.querySelector("ytd-video-secondary-info-renderer"),
        language      = yt.config_.HL.split("-")[0] ?? "en",
        country       = yt.config_.GL ?? "US";
        
    // Date text
    var dateText = formatDateText(primaryInfo.data.dateText.simpleText, isVideoPublic(), language);
    secondaryInfo.data.dateText = {
        simpleText: dateText
    };
    delete primaryInfo.data.dateText;

    // Subscriber count text
    // This check is to determine if it's the subscribe button
    // or the edit video button
    if (secondaryInfo.data.subscribeButton.subscribeButtonRenderer) {
        var subscriberCount = formatSubscriberCount(secondaryInfo.data.owner.videoOwnerRenderer.subscriberCountText.simpleText);
        var subscribeButton = secondaryInfo.data.subscribeButton.subscribeButtonRenderer;

        subscribeButton.buttonText = formatSubscriberButtonText(subscribeButton.buttonText, subscriberCount);
        subscribeButton.subscribedButtonText = formatSubscriberButtonText(subscribeButton.subscribedButtonText, subscriberCount);
        subscribeButton.unsubscribeButtonText = formatSubscriberButtonText(subscribeButton.unsubscribeButtonText, subscriberCount);
        subscribeButton.unsubscribedButtonText = formatSubscriberButtonText(subscribeButton.unsubscribedButtonText, subscriberCount);
    }
    delete secondaryInfo.data.owner.videoOwnerRenderer.subscriberCountText;

    // Bloat buttons
    if (w9rOptions.removeBloatButtons) {
        var actionButtons = primaryInfo.data.videoActions.menuRenderer.topLevelButtons;

        for (var i = 0; i < actionButtons.length; i++) {
            if (actionButtons[i].downloadButtonRenderer) {
                actionButtons.splice(i, 1);
                i--;
            } else if (actionButtons[i].buttonRenderer) {
                if (inArray(actionButtons[i].buttonRenderer.icon.iconType, ["MONEY_HEART", "CONTENT_CUT"])) {
                    actionButtons.splice(i, 1);
                    i--;
                }
            }
        }
    }

    // Make Polymer use new data.
    refreshData(primaryInfo);
    refreshData(secondaryInfo);
}

/**
 * Run the Watch9 build/update functions.
 */
document.addEventListener("yt-page-data-updated", (e) => {
    if (e.detail.pageType == "watch")
        updateWatch();
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

    ytd-video-view-count-renderer[small] {
        font-size: 1.6rem !important;
        line-height: 2.2rem !important;
    }

    ytd-subscribe-button-renderer {
        --yt-formatted-string-deemphasize-color: rgb(255 255 255 / 85%);
    }
    </style>
    `);
    document.removeEventListener("DOMContentLoaded", tmp);
});
