/* =========================
   BOOKMARK HIDER — Popup UI
========================= */

const btn = document.getElementById("toggleBtn");
const statusDot = document.getElementById("statusDot");
const statusTxt = document.getElementById("statusText");
const errorTxt = document.getElementById("errorText");
const warningTxt = document.getElementById("warningText");

const MSG_TIMEOUT = 5000;

/**
 * Gửi message đến background với timeout.
 */
function sendMessage(payload) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Extension not responding"));
        }, MSG_TIMEOUT);

        chrome.runtime.sendMessage(payload, (response) => {
            clearTimeout(timer);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Render UI theo state.
 */
function renderState(state) {
    errorTxt.style.display = "none";

    if (state === "on") {
        statusDot.className = "status-dot on";
        statusTxt.textContent = "Bookmarks are HIDDEN";
        btn.className = "btn turn-off";
        btn.innerHTML = "Show Bookmarks";
        btn.disabled = false;
        warningTxt.style.display = "block";
        document.getElementById("recoveryBtn").style.display = "block";
    } else {
        statusDot.className = "status-dot off";
        statusTxt.textContent = "Bookmarks are visible";
        btn.className = "btn turn-on";
        btn.innerHTML = "Hide Bookmarks";
        btn.disabled = false;
        warningTxt.style.display = "none";
        document.getElementById("recoveryBtn").style.display = "none";
    }
}

/**
 * Render trạng thái loading.
 */
function renderLoading(message = "Processing...") {
    statusDot.className = "status-dot off";
    statusTxt.textContent = message;
    btn.className = "btn loading";
    btn.innerHTML = `<div class="spinner"></div> ${message}`;
    btn.disabled = true;
    warningTxt.style.display = "none";
}

/**
 * Hiện lỗi.
 */
function renderError(message) {
    errorTxt.textContent = message;
    errorTxt.style.display = "block";
}

/* =========================
   INIT
========================= */
async function init() {
    renderLoading("Loading...");

    try {
        const response = await sendMessage({ type: "GET_STATE" });
        renderState(response.state);
    } catch (err) {
        renderState("off");
        renderError(err.message);
    }
}

/* =========================
   TOGGLE
========================= */
btn.addEventListener("click", async () => {
    renderLoading("Processing...");

    try {
        const response = await sendMessage({ type: "TOGGLE" });

        if (response.success) {
            renderState(response.state);
        } else {
            renderState(response.state || "off");
            renderError(response.error || "Something went wrong");
        }
    } catch (err) {
        renderState("off");
        renderError(err.message);
    }
});

init();

// Recovery tool — mở từ nút dưới popup hoặc link trong warning
function openRecovery() {
    chrome.tabs.create({ url: chrome.runtime.getURL("recovery.html") });
}

document.getElementById("recoveryBtn").addEventListener("click", openRecovery);
document.getElementById("recoveryLink").addEventListener("click", (e) => {
    e.preventDefault();
    openRecovery();
});
