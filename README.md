# Bookmark Hider

A Chrome extension that hides all bookmarks from the omnibox (address bar) suggestions with one click, and restores them on demand.

## Why

Chrome always suggests bookmarks when you type in the address bar — there's no built-in option to disable this. This extension gives you a toggle to hide/show bookmark suggestions instantly.

## How it works

- **Hide:** Reads your entire bookmark tree, saves it to `chrome.storage.local`, then deletes all bookmarks from Chrome. The omnibox no longer suggests them.
- **Restore:** Recreates all bookmarks from the saved data, restoring the exact folder structure including nested folders.

> ⚠️ Before using for the first time, export a manual backup via `chrome://bookmarks → ⋮ → Export bookmarks`.

## Installation

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select this folder

## Usage

Click the extension icon in the toolbar:

- **Hide Bookmarks** — deletes bookmarks from Chrome, saves data locally
- **Show Bookmarks** — recreates all bookmarks from saved data
- **🛟 Recovery tool** — appears when bookmarks are hidden; lets you export saved data as an HTML file in case you need to uninstall

## Safety

- Bookmarks are never permanently deleted — data is always saved in `chrome.storage.local` before any deletion
- Storage size is checked before hiding — if your bookmark data exceeds 9MB, the extension will refuse to proceed and show an error
- The Recovery tool lets you export a `.html` file to reimport via `chrome://bookmarks → ⋮ → Import bookmarks`
- When you uninstall the extension, Chrome opens an [uninstall page](https://duyphan1410.github.io/bookmark-hider/uninstall.html) that warns you if bookmarks are still hidden

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save and restore bookmark data locally |
| `bookmarks` | Read, delete, and recreate bookmarks |
| `tabs` | Open the Recovery tool in a new tab |

No data is sent anywhere. Everything stays on your machine.

## Files

```
bookmark-hider/
├── manifest.json       — MV3 config
├── background.js       — service worker, all core logic
├── popup.html/js       — toggle UI
├── recovery.html/js    — export saved bookmarks as HTML
├── uninstall.html      — GitHub Pages uninstall page
└── icons/              — on/off icons at 16/48/128px
```

## Browser support

Chrome 120+, Manifest V3
