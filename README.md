# BigQuery Release Notes Dashboard & Tweet Composer

A web application built with **Python Flask** and **vanilla HTML, CSS, and JavaScript** that aggregates, filters, and searches the official Google BigQuery release notes. It includes an interactive **Tweet Composer** to customize and share updates on X (Twitter) directly from the dashboard.

## 🚀 Key Features

* **Sub-entry Splitting**: Feed entries are automatically parsed and split by update type (`Feature`, `Announcement`, `Issue`, `Deprecation`), allowing you to tweet about specific updates rather than the whole day's log.
* **Smart Caching Layer**: Aggregated release notes are cached in-memory for **10 minutes** to guarantee fast load times and avoid rate limits. If a feed fetch fails, the app falls back to the cache.
* **Interactive Filtering & Search**: Instant client-side text filtering and type sorting (e.g. view only Features or only Issues).
* **Smart Tweet Composer**: 
  * Select any update to generate automatic drafts.
  * Choose between different **Tone Presets** (Hype 🚀, Business 👔, Punchy ⚡).
  * Real-time character counts conforming to Twitter's URL rules (any link counts as exactly **23 characters**).
  * Auto-truncation of long updates to stay within 280 characters without breaking links or active hashtags.
  * One-click sharing via Twitter Web Intents or Copy to Clipboard.

---

## 🛠️ Tech Stack

* **Backend**: Python, Flask, BeautifulSoup4, ElementTree (Built-in XML)
* **Frontend**: HTML5, Vanilla CSS3 (Custom grid, animations), Vanilla JavaScript (ES6)

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                  # Flask server, cache controller & feed parser
├── requirements.txt        # Backend dependencies
├── .gitignore              # Ignored local runtime/IDE configurations
├── README.md               # Setup and project documentation
├── templates/
│   └── index.html          # Semantic HTML structure & SVGs
└── static/
    ├── style.css           # Custom dark layout styles & circular loader geometry
    └── app.js              # State manager, search, filtering & composer engine
```

---

## 📦 Getting Started

### Prerequisites
Make sure you have **Python 3.x** and **Git** installed on your system.

### 1. Install Dependencies
Navigate to the directory and install requirements:
```bash
pip install -r requirements.txt
```

### 2. Run the Application
Start the Flask development server:
```bash
python app.py
```

### 3. Open in Browser
Open your preferred web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🔗 Repository
Push updates and view origin code at:
[https://github.com/chorVitthal/-chorVitthal-event-talks-app](https://github.com/chorVitthal/-chorVitthal-event-talks-app)
