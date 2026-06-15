# Bookmark Hider

A Chrome extension that hides all bookmarks from the omnibox (address bar) suggestions with one click, and restores them on demand.

## Why

Chrome always suggests bookmarks when you type in the address bar — there's no built-in option to disable this. This extension gives you a toggle to hide/show bookmark suggestions instantly.

## How it works

- **Hide:** Serializes your entire bookmark tree to local storage, then deletes all bookmarks from Chrome. The omnibox no longer suggests them.
- **Restore:** Recreates all bookmarks from the saved data, restoring the exact folder structure.

> ⚠️ Your bookmarks are never permanently deleted — they're stored safely in `chrome.storage.local`. But it's recommended to **export a backup** via `chrome://bookmarks → ⋮ → Export bookmarks` before first use.

## Installation

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `bookmark-hider/` folder

## Usage

Click the extension icon in the toolbar → toggle **Hide / Show Bookmarks**

## Permissions

- `storage` — save and restore bookmark data
- `bookmarks` — read, delete, and recreate bookmarks

No data is sent anywhere. Everything stays local.

## Browser support

Chrome 120+, Manifest V3
