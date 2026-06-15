/* =========================
   BOOKMARK HIDER — Recovery Page
========================= */

let savedData = null;

/* ========================
   COUNT helpers
======================== */
function countItems(nodes) {
    let bookmarks = 0, folders = 0;
    for (const node of nodes) {
        if (node.url) {
            bookmarks++;
        } else {
            folders++;
            if (node.children) {
                const sub = countItems(node.children);
                bookmarks += sub.bookmarks;
                folders += sub.folders;
            }
        }
    }
    return { bookmarks, folders };
}

/* ========================
   ESCAPE HTML
======================== */
function escapeHtml(str) {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/* ========================
   BUILD EXPORT HTML
   Format chuẩn Netscape Bookmark File để Chrome import được
======================== */
function buildBookmarkHTML(nodes, indent) {
    const pad = " ".repeat(indent);
    let html = "";
    for (const node of nodes) {
        if (node.url) {
            html += `${pad}<DT><A HREF="${escapeHtml(node.url)}">${escapeHtml(node.title)}</A>\n`;
        } else {
            html += `${pad}<DT><H3>${escapeHtml(node.title)}</H3>\n`;
            html += `${pad}<DL><p>\n`;
            if (node.children) {
                html += buildBookmarkHTML(node.children, indent + 4);
            }
            html += `${pad}</DL><p>\n`;
        }
    }
    return html;
}

function generateExportHTML(data) {
    const barHTML = buildBookmarkHTML(data.bookmarksBar || [], 4);
    const otherHTML = buildBookmarkHTML(data.otherBookmarks || [], 4);
    return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>Bookmarks bar</H3>
    <DL><p>
${barHTML}    </DL><p>
    <DT><H3>Other bookmarks</H3>
    <DL><p>
${otherHTML}    </DL><p>
</DL>`;
}

/* ========================
   BUILD PREVIEW TREE
======================== */
function buildTreeHTML(nodes, depth) {
    let html = "";
    const pad = "&nbsp;".repeat(depth * 4);
    for (const node of nodes) {
        if (node.url) {
            html += `<div class="tree-bookmark">${pad}🔖 <a href="${escapeHtml(node.url)}" target="_blank">${escapeHtml(node.title) || "(no title)"}</a></div>`;
        } else {
            html += `<div class="tree-folder">${pad}📁 ${escapeHtml(node.title) || "(folder)"}</div>`;
            if (node.children) {
                html += buildTreeHTML(node.children, depth + 1);
            }
        }
    }
    return html;
}

/* ========================
   NORMALIZE format cũ (array với parentId/index)
======================== */
function stripMeta(nodes) {
    return nodes.map((n) => {
        if (n.url) return { title: n.title, url: n.url };
        return { title: n.title, children: stripMeta(n.children || []) };
    });
}

function normalizeOldFormat(arr) {
    const result = { bookmarksBar: [], otherBookmarks: [] };
    for (const container of arr) {
        const children = stripMeta(container.children || []);
        const title = (container.title || "").toLowerCase();
        if (title.includes("other")) {
            result.otherBookmarks = children;
        } else {
            result.bookmarksBar = [...result.bookmarksBar, ...children];
        }
    }
    return result;
}

/* ========================
   INIT
======================== */
document.getElementById("stateLoading").style.display = "block";

chrome.storage.local.get(["bh_original_structure"], (result) => {
    document.getElementById("stateLoading").style.display = "none";

    const data = result["bh_original_structure"];

    if (!data) {
        document.getElementById("stateNoData").style.display = "block";
        return;
    }

    // Normalize
    if (Array.isArray(data)) {
        if (data.length === 0) {
            document.getElementById("stateNoData").style.display = "block";
            return;
        }
        savedData = normalizeOldFormat(data);
    } else if (data.bookmarksBar || data.otherBookmarks) {
        savedData = data;
    } else {
        document.getElementById("stateNoData").style.display = "block";
        return;
    }

    // Đếm items
    const allNodes = [...(savedData.bookmarksBar || []), ...(savedData.otherBookmarks || [])];
    if (allNodes.length === 0) {
        document.getElementById("stateNoData").style.display = "block";
        return;
    }

    const counts = countItems(allNodes);
    document.getElementById("countBookmarks").textContent = counts.bookmarks;
    document.getElementById("countFolders").textContent = counts.folders;

    document.getElementById("stateHasData").style.display = "block";
});

/* ========================
   EXPORT
======================== */
document.addEventListener("click", (e) => {
    if (e.target.id === "btnExport") {
        const html = generateExportHTML(savedData);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bookmarks_recovery.html";
        a.click();
        URL.revokeObjectURL(url);
    }

    if (e.target.id === "btnPreview") {
        const section = document.getElementById("previewSection");
        const treeView = document.getElementById("treeView");
        if (section.style.display === "block") {
            section.style.display = "none";
            return;
        }
        const allNodes = [
            ...(savedData.bookmarksBar || []),
            ...(savedData.otherBookmarks || [])
        ];
        treeView.innerHTML = buildTreeHTML(allNodes, 0);
        section.style.display = "block";
    }
});
