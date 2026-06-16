/* =========================
   BOOKMARK HIDER — Background Service Worker
========================= */

const STORAGE_KEYS = {
    state: "bh_state",
    originalStructure: "bh_original_structure"
};

let isProcessing = false;

/* =========================
   STORAGE HELPERS
========================= */
async function getStorageData(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

async function setStorageData(data) {
    return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

async function removeStorageData(keys) {
    return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

async function getState() {
    const data = await getStorageData([STORAGE_KEYS.state]);
    return data[STORAGE_KEYS.state] || "off";
}

/* =========================
   SERIALIZE
   Đệ quy — giữ toàn bộ cây folder lồng nhau
   Output: { title, url? } hoặc { title, children: [] }
========================= */
function serializeNodes(nodes) {
    if (!nodes || nodes.length === 0) return [];
    return nodes.map((node) => {
        if (node.url) {
            return { title: node.title, url: node.url };
        } else {
            return {
                title: node.title,
                children: serializeNodes(node.children || [])
            };
        }
    });
}

/* =========================
   NORMALIZE — hỗ trợ format cũ (array với parentId/index) lẫn format mới
========================= */
function stripMetadata(nodes) {
    if (!nodes) return [];
    return nodes.map((node) => {
        if (node.url) {
            return { title: node.title, url: node.url };
        } else {
            return {
                title: node.title,
                children: stripMetadata(node.children || [])
            };
        }
    });
}

function normalizeStructure(saved) {
    // Format mới: { bookmarksBar, otherBookmarks }
    if (saved && !Array.isArray(saved) && (saved.bookmarksBar || saved.otherBookmarks)) {
        return saved;
    }
    // Format cũ: array of top-level containers
    if (Array.isArray(saved)) {
        const result = { bookmarksBar: [], otherBookmarks: [] };
        for (const container of saved) {
            const children = container.children || [];
            const title = (container.title || "").toLowerCase();
            if (title.includes("other")) {
                result.otherBookmarks = stripMetadata(children);
            } else {
                result.bookmarksBar = [...result.bookmarksBar, ...stripMetadata(children)];
            }
        }
        return result;
    }
    return { bookmarksBar: [], otherBookmarks: [] };
}

/* =========================
   DELETE ALL BOOKMARKS
========================= */
async function deleteChildren(parentId) {
    const children = await new Promise((resolve) => {
        chrome.bookmarks.getChildren(parentId, (items) => resolve(items || []));
    });
    for (const node of children) {
        if (node.url) {
            await new Promise((resolve) => chrome.bookmarks.remove(node.id, () => resolve()));
        } else {
            await new Promise((resolve) => chrome.bookmarks.removeTree(node.id, () => resolve()));
        }
    }
}

/* =========================
   RECREATE BOOKMARKS — đệ quy tạo lại đúng cấu trúc
========================= */
async function recreateNodes(nodes, parentId) {
    for (const node of nodes) {
        if (node.url) {
            await new Promise((resolve, reject) => {
                chrome.bookmarks.create(
                    { parentId, title: node.title, url: node.url },
                    (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    }
                );
            });
        } else {
            const folder = await new Promise((resolve, reject) => {
                chrome.bookmarks.create(
                    { parentId, title: node.title },
                    (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    }
                );
            });
            if (node.children && node.children.length > 0) {
                await recreateNodes(node.children, folder.id);
            }
        }
    }
}

/* =========================
   ICON + UNINSTALL URL
========================= */
function updateIcon(state) {
    const suffix = state === "on" ? "on" : "off";
    chrome.action.setIcon({
        path: {
            16: `icons/${suffix}-16.png`,
            48: `icons/${suffix}-48.png`,
            128: `icons/${suffix}-128.png`
        }
    });

    // Cập nhật uninstall URL với state hiện tại
    // Trang uninstall sẽ đọc ?state= để hiện cảnh báo phù hợp
    chrome.runtime.setUninstallURL(
        `https://duyphan1410.github.io/bookmark-hider/uninstall.html?state=${state}`
    );
}

/* =========================
   HIDE BOOKMARKS
   Dùng getSubTree để lấy toàn bộ cây đệ quy (folder lồng nhau)
========================= */
async function hideBookmarks() {
    try {
        // getSubTree trả về toàn bộ cây kể cả folder lồng sâu
        const barTree = await new Promise((resolve) => {
            chrome.bookmarks.getSubTree("1", (items) => resolve(items || []));
        });
        const otherTree = await new Promise((resolve) => {
            chrome.bookmarks.getSubTree("2", (items) => resolve(items || []));
        });

        // items[0] là node container chính, lấy children của nó
        const barChildren = (barTree[0] && barTree[0].children) || [];
        const otherChildren = (otherTree[0] && otherTree[0].children) || [];

        // Serialize đầy đủ TRƯỚC khi xóa
        const serialized = {
            bookmarksBar: serializeNodes(barChildren),
            otherBookmarks: serializeNodes(otherChildren)
        };

        // Kiểm tra storage limit (chrome.storage.local max 10MB)
        const size = new TextEncoder().encode(JSON.stringify(serialized)).length;
        console.log(`💾 Storage size: ${(size / 1024).toFixed(1)} KB`);
        if (size > 9 * 1024 * 1024) {
            throw new Error("Too many bookmarks to store safely (exceeds 9MB limit)");
        }

        await setStorageData({ [STORAGE_KEYS.originalStructure]: serialized });

        // Xóa toàn bộ
        await deleteChildren("1");
        await deleteChildren("2");

        await setStorageData({ [STORAGE_KEYS.state]: "on" });
        updateIcon("on");

        return { success: true, state: "on" };
    } catch (err) {
        console.error("❌ hideBookmarks failed:", err.message);
        await setStorageData({ [STORAGE_KEYS.state]: "off" });
        updateIcon("off");
        return { success: false, state: "off", error: err.message };
    }
}

/* =========================
   RESTORE BOOKMARKS
========================= */
async function restoreBookmarks() {
    try {
        const data = await getStorageData([STORAGE_KEYS.originalStructure]);
        const raw = data[STORAGE_KEYS.originalStructure];

        if (!raw) {
            console.warn("⚠️ No saved structure, resetting to off");
            await setStorageData({ [STORAGE_KEYS.state]: "off" });
            updateIcon("off");
            return { success: true, state: "off" };
        }

        // Normalize về format mới (xử lý cả data cũ lẫn mới)
        const saved = normalizeStructure(raw);

        if (saved.bookmarksBar && saved.bookmarksBar.length > 0) {
            await recreateNodes(saved.bookmarksBar, "1");
        }
        if (saved.otherBookmarks && saved.otherBookmarks.length > 0) {
            await recreateNodes(saved.otherBookmarks, "2");
        }

        await removeStorageData([STORAGE_KEYS.originalStructure]);
        await setStorageData({ [STORAGE_KEYS.state]: "off" });
        updateIcon("off");

        return { success: true, state: "off" };
    } catch (err) {
        console.error("❌ restoreBookmarks failed:", err.message);
        // Giữ state = "on" — data vẫn trong storage, user có thể thử lại
        return { success: false, state: "on", error: err.message };
    }
}

/* =========================
   MESSAGE HANDLER
========================= */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_STATE") {
        getState().then((state) => {
            sendResponse({ state, loading: isProcessing });
        });
        return true;
    }

    if (message.type === "TOGGLE") {
        if (isProcessing) {
            sendResponse({ success: false, state: "unknown", error: "Already processing" });
            return true;
        }
        isProcessing = true;
        getState().then(async (currentState) => {
            const result = currentState === "off"
                ? await hideBookmarks()
                : await restoreBookmarks();
            isProcessing = false;
            sendResponse(result);
        });
        return true;
    }
});

/* =========================
   LIFECYCLE
========================= */
chrome.runtime.onInstalled.addListener(async () => {
    console.log("✅ Bookmark Hider installed");
    const existing = await getStorageData([STORAGE_KEYS.state]);
    if (!existing[STORAGE_KEYS.state]) {
        await setStorageData({
            [STORAGE_KEYS.state]: "off",
            [STORAGE_KEYS.originalStructure]: null
        });
    }
    updateIcon(await getState());
});

chrome.runtime.onStartup.addListener(async () => {
    updateIcon(await getState());
});
