// Global App State
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdateId = null;
let selectedTone = 'hype';
let isDraftDirty = false;
let activeHashtags = ['#BigQuery', '#GoogleCloud', '#GCP'];

const defaultHashtags = ['#BigQuery', '#GoogleCloud', '#GCP', '#DataEngineering', '#GenAI', '#DevOps'];

// Elements
const feedContainer = document.getElementById('feed-container');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const spinnerIcon = refreshBtn.querySelector('.spinner-icon');
const lastUpdatedText = document.getElementById('last-updated-text');
const resultsCount = document.getElementById('results-count');
const toast = document.getElementById('toast');

// Filter & Search Elements
const searchQuery = document.getElementById('search-query');
const clearSearch = document.getElementById('clear-search');
const filterBtns = document.querySelectorAll('.filter-btn');

// Stats Elements
const totalUpdatesStat = document.getElementById('total-updates-stat');
const featureRatioStat = document.getElementById('feature-ratio-stat');
const countAll = document.getElementById('count-all');
const countFeature = document.getElementById('count-feature');
const countAnnouncement = document.getElementById('count-announcement');
const countIssue = document.getElementById('count-issue');
const countDeprecation = document.getElementById('count-deprecation');
const countUpdate = document.getElementById('count-update');

// Composer Elements
const composerEmpty = document.getElementById('composer-empty');
const composerActive = document.getElementById('composer-active');
const composerDate = document.getElementById('composer-date');
const composerTypePill = document.getElementById('composer-type-pill');
const tweetTextarea = document.getElementById('tweet-text');
const toneBtns = document.querySelectorAll('.tone-btn');
const hashtagOptions = document.getElementById('hashtag-options');
const charCountText = document.getElementById('char-count');
const charWarning = document.getElementById('character-warning');
const progressIndicator = document.getElementById('progress-indicator');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const tweetShareBtn = document.getElementById('tweet-share-btn');

// Mobile Composer Drawer Elements
const sidebarRight = document.querySelector('.sidebar-right');
const mobileComposerToggle = document.getElementById('mobile-composer-toggle');
const closeComposerMobile = document.getElementById('close-composer-mobile');

// Circular Progress Config
const circleRadius = progressIndicator.r.baseVal.value;
const circleCircumference = circleRadius * 2 * Math.PI;
progressIndicator.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
progressIndicator.style.strokeDashoffset = circleCircumference;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchUpdates();
    setupEventListeners();
    renderHashtagsList();
});

// Setup Events
function setupEventListeners() {
    // Refresh feed
    refreshBtn.addEventListener('click', () => {
        fetchUpdates(true);
    });

    // Search input
    searchQuery.addEventListener('input', () => {
        if (searchQuery.value.trim().length > 0) {
            clearSearch.classList.remove('hidden');
        } else {
            clearSearch.classList.add('hidden');
        }
        applyFiltersAndSearch();
    });

    // Clear search
    clearSearch.addEventListener('click', () => {
        searchQuery.value = '';
        clearSearch.classList.add('hidden');
        applyFiltersAndSearch();
    });

    // Sidebar Category Filter Buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFiltersAndSearch();
        });
    });

    // Tone Preset Selector Buttons
    toneBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toneBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTone = btn.getAttribute('data-tone');
            isDraftDirty = false;
            updateComposerDraft();
        });
    });

    // Textarea Changes
    tweetTextarea.addEventListener('input', () => {
        isDraftDirty = true;
        updateCharCounter();
    });

    // Actions
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    tweetShareBtn.addEventListener('click', shareOnTwitter);

    // Mobile / Tablet Drawer actions
    mobileComposerToggle.addEventListener('click', () => {
        sidebarRight.classList.add('open');
    });

    closeComposerMobile.addEventListener('click', () => {
        sidebarRight.classList.remove('open');
    });
}

// Fetch notes from Flask API
async function fetchUpdates(force = false) {
    toggleLoading(true);
    try {
        const response = await fetch(`/api/updates?refresh=${force}`);
        const data = await response.json();
        
        if (data.error) {
            showToast(data.error);
        } else if (force) {
            showToast("Release notes refreshed!");
        }

        allUpdates = data.updates || [];
        
        if (data.last_updated) {
            lastUpdatedText.textContent = `Updated: ${data.last_updated}`;
        } else {
            lastUpdatedText.textContent = 'Updated: Just now';
        }

        updateStats();
        applyFiltersAndSearch();
    } catch (err) {
        console.error(err);
        showToast("Error loading release notes");
    } finally {
        toggleLoading(false);
    }
}

// Loading indicator states
function toggleLoading(isLoading) {
    if (isLoading) {
        spinnerIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        feedContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
        skeletonLoader.classList.remove('hidden');
    } else {
        spinnerIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
        skeletonLoader.classList.add('hidden');
        feedContainer.classList.remove('hidden');
    }
}

// Toast utility
function showToast(message) {
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Render Stats & Badge Counts
function updateStats() {
    const counts = {
        all: allUpdates.length,
        Feature: 0,
        Announcement: 0,
        Issue: 0,
        Deprecation: 0,
        Update: 0
    };

    allUpdates.forEach(u => {
        if (counts.hasOwnProperty(u.type)) {
            counts[u.type]++;
        } else {
            counts.Update++;
        }
    });

    // Update left panel badges
    countAll.textContent = counts.all;
    countFeature.textContent = counts.Feature;
    countAnnouncement.textContent = counts.Announcement;
    countIssue.textContent = counts.Issue;
    countDeprecation.textContent = counts.Deprecation;
    countUpdate.textContent = counts.Update;

    // Overview Stats
    totalUpdatesStat.textContent = counts.all;
    const ratio = counts.all > 0 ? Math.round((counts.Feature / counts.all) * 100) : 0;
    featureRatioStat.textContent = `${ratio}%`;
}

// Live Search & Category filters combiner
function applyFiltersAndSearch() {
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const selectedType = activeFilterBtn ? activeFilterBtn.getAttribute('data-type') : 'all';
    const query = searchQuery.value.toLowerCase().trim();

    filteredUpdates = allUpdates.filter(update => {
        // Apply category filter
        if (selectedType !== 'all' && update.type !== selectedType) {
            return false;
        }
        
        // Apply search keyword filter
        if (query) {
            const matchesText = update.content_text.toLowerCase().includes(query);
            const matchesDate = update.date.toLowerCase().includes(query);
            const matchesType = update.type.toLowerCase().includes(query);
            return matchesText || matchesDate || matchesType;
        }

        return true;
    });

    resultsCount.textContent = `Showing ${filteredUpdates.length} update${filteredUpdates.length === 1 ? '' : 's'}`;
    renderFeed();
}

// Render feed list of cards
function renderFeed() {
    feedContainer.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');

    filteredUpdates.forEach(update => {
        const isSelected = update.id === selectedUpdateId;
        const card = document.createElement('div');
        card.className = `update-card type-${update.type.toLowerCase()} ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-id', update.id);
        
        // Structure card content
        card.innerHTML = `
            <div class="update-card-header">
                <div class="update-date-wrapper">
                    <svg class="calendar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20ZM17 12H12V17H17V12Z" fill="currentColor"/>
                    </svg>
                    <span>${update.date}</span>
                </div>
                <span class="badge badge-${update.type.toLowerCase()}">${update.type}</span>
            </div>
            <div class="update-content">
                ${update.content_html}
            </div>
            <div class="update-card-actions">
                <a href="${update.docs_url}" target="_blank" class="card-action-btn docs-btn" title="View official GCloud documentation">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="currentColor"/>
                    </svg>
                    <span>Docs</span>
                </a>
                <button class="card-action-btn tweet-select" title="Compose tweet with this note">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Draft Tweet</span>
                </button>
            </div>
        `;
        
        // Handle selecting card
        card.addEventListener('click', (e) => {
            // If user clicks a link directly, let it open and do not trigger select
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            selectUpdate(update);
        });

        feedContainer.appendChild(card);
    });
}

// Select an update to Tweet about
function selectUpdate(update) {
    selectedUpdateId = update.id;
    isDraftDirty = false;
    
    // Highlight active card
    const cards = feedContainer.querySelectorAll('.update-card');
    cards.forEach(card => {
        if (card.getAttribute('data-id') === update.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Populate Composer meta
    composerDate.textContent = update.date;
    
    // Set badge style
    composerTypePill.className = `badge badge-${update.type.toLowerCase()}`;
    composerTypePill.textContent = update.type;

    // Show active state
    composerEmpty.classList.add('hidden');
    composerActive.classList.remove('hidden');

    // Add visual dot on mobile floating button
    mobileComposerToggle.querySelector('.badge-dot').classList.remove('hidden');

    // On mobile screens, slide open the panel
    if (window.innerWidth <= 1200) {
        sidebarRight.classList.add('open');
    }

    // Generate Draft Content
    updateComposerDraft();
}

// Render quick hashtag pill list
function renderHashtagsList() {
    hashtagOptions.innerHTML = '';
    defaultHashtags.forEach(tag => {
        const isSelected = activeHashtags.includes(tag);
        const pill = document.createElement('button');
        pill.className = `tag-pill ${isSelected ? 'active' : ''}`;
        pill.textContent = tag;
        pill.addEventListener('click', () => {
            if (activeHashtags.includes(tag)) {
                activeHashtags = activeHashtags.filter(t => t !== tag);
                pill.classList.remove('active');
            } else {
                activeHashtags.push(tag);
                pill.classList.add('active');
            }
            
            // If draft is dirty, we append/remove from the textarea directly
            // Otherwise, we regenerate the whole draft
            if (isDraftDirty) {
                syncHashtagsInDraft(tag);
            } else {
                updateComposerDraft();
            }
        });
        hashtagOptions.appendChild(pill);
    });
}

// Append/remove hashtag from manual edit text
function syncHashtagsInDraft(tag) {
    let text = tweetTextarea.value;
    const hasTag = text.includes(tag);
    const tagIndex = text.indexOf(tag);
    
    if (activeHashtags.includes(tag) && !hasTag) {
        // Tag is newly activated but doesn't exist in text -> Append it
        if (text.trim() === '') {
            tweetTextarea.value = tag;
        } else {
            tweetTextarea.value = text.trim() + " " + tag;
        }
    } else if (!activeHashtags.includes(tag) && hasTag) {
        // Tag is deactivated and exists -> Remove it
        const regex = new RegExp(`\\s*${tag}\\b`, 'g');
        tweetTextarea.value = text.replace(regex, '').trim();
    }
    
    updateCharCounter();
}

// Update Composer draft text fields
function updateComposerDraft() {
    if (!selectedUpdateId) return;
    
    const update = allUpdates.find(u => u.id === selectedUpdateId);
    if (!update) return;

    if (!isDraftDirty) {
        tweetTextarea.value = generateTweetDraft(update, selectedTone, activeHashtags);
    }
    
    updateCharCounter();
}

// Helper to determine string character length adhering to Twitter's URL t.co count rules
// In Twitter: any URL beginning with http:// or https:// is converted to a t.co link
// and counts as exactly 23 characters, regardless of its original length.
function getTwitterStringLength(str) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedString = str;
    // Replace URL links with a 23 character mock text
    computedString = computedString.replace(urlRegex, "a".repeat(23));
    return computedString.length;
}

// Real-time character counter + SVG circular ring updater
function updateCharCounter() {
    const text = tweetTextarea.value;
    const len = getTwitterStringLength(text);
    
    charCountText.textContent = `${len}/280`;

    // Calculate percentage for circular progress
    const pct = Math.min((len / 280) * 100, 100);
    const offset = circleCircumference - (pct / 100) * circleCircumference;
    progressIndicator.style.strokeDashoffset = offset;

    // Apply color changes based on limits
    if (len > 280) {
        progressIndicator.style.stroke = 'var(--color-issue)';
        charCountText.className = 'char-count danger';
        charWarning.classList.remove('hidden');
        tweetShareBtn.disabled = true;
    } else if (len >= 260) {
        progressIndicator.style.stroke = 'var(--color-deprecation)';
        charCountText.className = 'char-count warning';
        charWarning.classList.add('hidden');
        tweetShareBtn.disabled = false;
    } else {
        progressIndicator.style.stroke = 'var(--accent-blue)';
        charCountText.className = 'char-count';
        charWarning.classList.add('hidden');
        tweetShareBtn.disabled = false;
    }
}

// Generate templates for tweets
function generateTweetDraft(update, tone, hashtags) {
    const date = update.date;
    const type = update.type.toUpperCase();
    const url = update.docs_url;
    
    let prefix = "";
    let suffix = `\n\nRead more: ${url}`;
    
    if (hashtags.length > 0) {
        suffix += "\n" + hashtags.join(" ");
    }

    if (tone === 'hype') {
        prefix = `New BigQuery Update: ${type} Alert! 🚀\n\n`;
    } else if (tone === 'professional') {
        prefix = `Google Cloud BigQuery release note (${date}):\n\n`;
    } else { // punchy
        prefix = `BQ ${type} (${date}): `;
    }

    const rawBody = update.content_text;
    
    // Check if the whole text fits
    let currentTotalLen = getTwitterStringLength(prefix + rawBody + suffix);
    
    if (currentTotalLen <= 280) {
        return prefix + rawBody + suffix;
    }

    // Otherwise, truncate the body text dynamically to make it fit 280 chars
    let low = 0;
    let high = rawBody.length;
    let optimalBody = "";

    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        let testBody = rawBody.substring(0, mid) + "...";
        let testLen = getTwitterStringLength(prefix + testBody + suffix);
        
        if (testLen <= 280) {
            optimalBody = testBody;
            low = mid + 1; // Try longer body
        } else {
            high = mid - 1; // Body is too long, shorten it
        }
    }

    return prefix + optimalBody + suffix;
}

// Copy Tweet Content to Clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast("Tweet copied to clipboard! 📋");
    } catch (err) {
        console.error(err);
        showToast("Failed to copy text");
    }
}

// Opens Twitter Intent sharing page
function shareOnTwitter() {
    const text = tweetTextarea.value;
    if (getTwitterStringLength(text) > 280) {
        showToast("Tweet is too long to share!");
        return;
    }
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400,resizable=yes');
}
