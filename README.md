# MindBreak

MindBreak is a Flask-powered gaming dashboard with eight playable mini-games, a searchable and filterable library, and a local character customization studio. The games are implemented as independent vanilla JavaScript modules; the canvas arcade games need no extra game-engine dependencies.

## Requirements

- Python 3.10 or newer
- pip

## Install and run

Open a terminal in the project folder. In this workspace, use the existing virtual environment with these PowerShell commands:

```powershell
.\.venv\bin\python.exe -m pip install -r requirements.txt
.\.venv\bin\python.exe app.py
```

Then visit **http://127.0.0.1:5000**.

For a fresh, standard Windows setup without a virtual environment, create one and install the dependency:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

For a standard macOS or Linux setup, create and activate `.venv` with `python -m venv .venv` and `source .venv/bin/activate`, then run `python -m pip install -r requirements.txt` and `python app.py`.

## What's included

- Responsive homepage, game library, category filters, and live search
- Eight original, locally stored SVG game illustrations
- Light/dark mode plus three visual themes, per-game character artwork and optional Sudoku symbols
- Original character illustrations in six style-inspired packs, plus support for personal PNG, JPEG and WebP uploads
- A character studio at `/customize`, with per-game previews, upload management and artwork reset controls
- Uploaded artwork is kept in this browser's IndexedDB; theme and game selections are saved in localStorage
- Individual playable pages for Tic-Tac-Toe (local and computer opponent), Connect Four, Sudoku, Memory Match, Snake, Space Invaders, Bubble Shooter, and Endless Runner
- Keyboard, touch, restart, score, timer, and pause controls where appropriate
- A shared game template and styling, with independent game logic in `static/js/games/`
- Flask detail pages for the registered games and a custom 404 page
- A centralized game catalog in `games/catalog.py`

Open **Make it yours** or visit `http://127.0.0.1:5000/customize` to choose a game and set character art for its pieces. Your artwork appears in the games themselves. Upload PNG/JPEG/WebP images up to 5 MB; files are stored only in your browser on this device and are not sent to the Flask server. Transparent PNGs are supported. Remove uploads from the library, reset one game's choices, or reset all game selections and theme overrides. The global light/dark appearance remains available in the header.

The included character art is original SVG illustration and does not depict licensed franchise characters. Custom graphics change rendering only: player identifiers, Sudoku values, card-pair IDs, bubble colors, collisions, scores and other game rules remain independent of the selected image. The runner currently has decorative collectible-style accents only; they do not affect score or collision rules.
