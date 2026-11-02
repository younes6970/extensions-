# MySpace — New Tab Extension

A ready-to-test Chrome Manifest V3 extension. All dashboard data stays in Chrome local extension storage.

## Installation
1. Unzip `myspace-newtab.zip`.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the extracted `myspace-newtab` folder (containing manifest.json).
5. Open a **new tab**.

## Features
- Local clock, Persian date and greeting
- Google search (explicit Google search, not the browser's default engine)
- Add/remove/reorder widgets using the Customize drawer
- Tasks, auto-saved notes, customizable quick links, 25-minute focus timer, quote
- Accent color, custom name, reset option
- Local-only storage (no server)

## Notes
- Weather is explicitly a placeholder; it does not provide live weather.
- Focus timer runs while the tab is active and should not be relied upon as a background alarm.
- New Tab override replaces the standard Chrome new-tab page while enabled.
- To uninstall or disable, return to `chrome://extensions`.
