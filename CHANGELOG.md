# Changelog — Bookmark Hider

---

## v1.0.0 — Current release

### Core features
- Toggle ON/OFF via popup icon
- Hide bookmarks by serializing full tree to `chrome.storage.local` then deleting from Chrome
- Restore bookmarks by recreating from saved data — preserves nested folder structure
- Icon reflects current state (on/off)
- State persists across browser sessions via `chrome.storage.local`

### Safety & Recovery
- Recovery tool (`recovery.html`) — accessible from popup when state is ON
  - Shows bookmark/folder count from saved data
  - Export as Netscape HTML file for Chrome reimport
  - Preview full bookmark tree before exporting
- Uninstall page (`uninstall.html`) hosted on GitHub Pages
  - Opens automatically when extension is removed
  - Shows warning if bookmarks were still hidden at time of uninstall (`?state=on`)
  - Shows safe confirmation if extension was OFF

---

## Development history

### Approach 1 — Inject CSS ❌

**Idea:** Inject CSS into web pages to hide bookmark elements in the omnibox dropdown.

**Why it failed:** The omnibox dropdown is native Chrome browser UI — not part of any webpage DOM. Content scripts have no access to it and no Chrome Extension API allows manipulation of omnibox suggestions.

---

### Approach 2 — Move bookmarks into hidden folder ❌

**Idea:** Use `chrome.bookmarks.move` to move all bookmarks into a folder named `_hidden_by_ext`.

**Why it failed:** Chrome indexes and suggests **all bookmarks regardless of which folder they're in**. Moving into a subfolder has no effect on omnibox suggestions.

---

### Approach 3 — Delete + save to storage ✅

**Idea:** Serialize the full bookmark tree to `chrome.storage.local`, delete all bookmarks from Chrome, then recreate them on restore.

**Why it works:** Chrome only suggests bookmarks that exist — deleting them removes them from omnibox completely. Data is safe in local storage.

---

### Bug fixes

**v3.1 — "Can't modify the root bookmark folders" on restore**

Cause: `serializeNodes` was saving `parentId: "0"` (virtual root) for top-level containers. Chrome does not allow creating bookmarks directly under the virtual root.

Fix: Changed serialize format to `{ bookmarksBar: [...], otherBookmarks: [...] }`. Restore now creates directly into `"1"` (Bookmarks Bar) and `"2"` (Other Bookmarks). Added `normalizeStructure()` for backward compatibility with old data format.

---

**v3.2 — Nested bookmarks lost after restore**

Cause: `hideBookmarks` used `chrome.bookmarks.getChildren("1")` which only retrieves one level — children of nested folders were not serialized.

Fix: Replaced with `chrome.bookmarks.getSubTree("1")` which returns the full recursive tree. `serializeNodes` and `recreateNodes` were already recursive so only the data source needed fixing.

---

**v3.3 — CSP error in recovery.html**

Cause: `recovery.html` had an inline `<script>` block — Manifest V3 CSP blocks all inline scripts.

Fix: Extracted all JS into `recovery.js` and referenced it via `<script src="recovery.js">`.

---

## Final permissions

```json
"permissions": ["storage", "bookmarks", "tabs"]
```

- `storage` — persist state and bookmark tree
- `bookmarks` — read, delete, recreate bookmarks
- `tabs` — open recovery.html in a new tab from popup
- Removed: `activeTab`, `scripting` — no content script needed
