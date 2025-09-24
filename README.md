# 💬 Nostalgie-Chatraum

Ein schlanker Webchat im Retro-2000er-Stil, entwickelt im Rahmen des
Moduls **M306 -- Projekte planen und realisieren**.\
Die App ermöglicht es, sich per OAuth (Google/GitHub) oder anonym
einzuloggen und sofort mit anderen Nutzenden in einem globalen Chatraum
zu schreiben.

------------------------------------------------------------------------

## 🚀 Features

-   Login via **Google/GitHub OAuth** oder **anonym**
-   **Live-Chat** mit Zeitstempel
-   **User-List** mit allen eingeloggten Personen
-   **Light/Dark Theme** (wahlweise Old-School vs. Modern)
-   **Emotes & Sounds** für authentisches 2000er-Feeling
-   Nachrichten bleiben auch nach **Page Reload** sichtbar

------------------------------------------------------------------------

## 🛠️ Tech Stack

-   **Frontend**: React (Vite)
-   **Backend / DB / Auth**: Firebase (Free Spark Plan)

------------------------------------------------------------------------

## 🌙 Dark Mode

The app includes a fully functional dark mode toggle with the following features:

-   **Automatic Theme Detection**: Uses system preference (`prefers-color-scheme`) on first load
-   **Persistent Storage**: Theme preference is saved to `localStorage`
-   **Flash Prevention**: Inline script in `index.html` sets theme before React mounts
-   **Accessible Toggle**: Theme toggle button with proper ARIA labels and sun/moon icons
-   **TypeScript Support**: Type-safe theme utilities, no `any` types used

### Usage

The theme toggle appears in the navigation bar. Users can:
1. Click the theme toggle button (sun/moon icon) to switch modes
2. Theme preference is automatically saved and persisted across sessions
3. On first visit, the app respects the user's system theme preference

------------------------------------------------------------------------

## 👥 Team

-   **Imad**
-   **Ricardo**
-   **Mathias**

------------------------------------------------------------------------

## 📜 Lizenz

Dieses Projekt ist ein **Schulprojekt** (Modul M306).\
Die Nutzung ist frei zu Lern- und Demonstrationszwecken.
