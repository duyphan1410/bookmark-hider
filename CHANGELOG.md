# Changelog — Bookmark Hider

## Tổng quan các lần thay đổi và lý do

---

### v1.0 — Approach ban đầu: Inject CSS (❌ Bị loại bỏ)

**Ý tưởng:** Inject CSS vào trang web để ẩn bookmark suggestions trong omnibox dropdown.

**Lý do thất bại:**
- Omnibox dropdown là UI của Chrome browser, không phải DOM của trang web
- Content script không thể truy cập vào native Chrome UI
- Không có Extension API nào cho phép can thiệp vào omnibox suggestions

---

### v2.0 — Approach thứ hai: Move bookmark vào folder ẩn (❌ Bị loại bỏ)

**Ý tưởng:** Dùng `chrome.bookmarks.move` để chuyển toàn bộ bookmark vào folder `_hidden_by_ext`. Chrome sẽ không gợi ý bookmark trong folder đó.

**Lý do thất bại:**
- Chrome **vẫn index và gợi ý tất cả bookmark** bất kể nằm trong folder nào
- Move vào subfolder không ẩn được khỏi omnibox

---

### v3.0 — Approach cuối: Xóa bookmark + lưu vào storage (✅ Hoạt động)

**Ý tưởng:** Serialize toàn bộ bookmark tree vào `chrome.storage.local`, sau đó xóa hẳn khỏi Chrome. Restore lại bằng cách `chrome.bookmarks.create` từ data đã lưu.

**Tại sao hoạt động:**
- Chrome chỉ gợi ý bookmark tồn tại thật sự — xóa đi thì omnibox sạch
- Data được lưu an toàn trong local storage, không mất khi tắt browser

---

### v3.1 — Fix: "Can't modify the root bookmark folders" khi restore

**Bug:** `restoreBookmarks` cố tạo bookmark vào `parentId: "0"` (virtual root) thay vì `"1"` (Bookmarks Bar) hoặc `"2"` (Other Bookmarks).

**Nguyên nhân:**
- `serializeNodes` version cũ lưu cả `parentId` và `index` của từng node
- Top-level containers (Bookmarks Bar, Other Bookmarks) có `parentId: "0"` — Chrome không cho phép tạo trực tiếp vào root

**Fix:**
- Đổi format serialize thành `{ bookmarksBar: [...], otherBookmarks: [...] }` — không lưu `parentId`/`index` nữa
- `restoreBookmarks` recreate thẳng vào `"1"` và `"2"` hardcode
- Thêm `normalizeStructure()` để đọc được cả data format cũ lẫn mới (backward compatible)

---

### v3.2 — Fix: Bookmark trong folder lồng nhau bị mất khi restore

**Bug:** Sau khi restore, bookmark nằm trong subfolder biến mất.

**Nguyên nhân:**
- `hideBookmarks` dùng `chrome.bookmarks.getChildren("1")` — chỉ lấy 1 cấp top-level, không lấy children của folder con
- `serializeNodes` không có data để serialize folder lồng nhau

**Fix:**
- Thay `getChildren` bằng `getSubTree` khi serialize — API này trả về toàn bộ cây đệ quy
- `serializeNodes` và `recreateNodes` đã đệ quy đúng từ đầu nên chỉ cần fix phần lấy data đầu vào

---

## Permissions cuối cùng

```json
"permissions": ["storage", "bookmarks"]
```

- Bỏ `activeTab`, `scripting` so với plan ban đầu — không cần content script
- Thêm `bookmarks` — cần để đọc/xóa/tạo bookmark

## Files cuối cùng

```
bookmark-hider/
├── manifest.json       — MV3, permissions: storage + bookmarks
├── background.js       — service worker, toàn bộ logic
├── popup.html          — toggle UI
├── popup.js            — giao tiếp với background qua message passing
├── generate-icons.html — tool tạo icon PNG (chạy 1 lần)
└── icons/              — on/off icons 16/48/128px
```
