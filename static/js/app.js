// -------------------------------------------------------------
// BigQuery Release Notes App Javascript Logic
// Rich Interactivity, SVG Progress Rings, & Twitter Share Intent
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let selectedNote = null;
    let activeTemplate = 'standard';

    // DOM Elements
    const notesFeed = document.getElementById('notes-feed');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const totalCountEl = document.getElementById('total-count');
    const filteredCountEl = document.getElementById('filtered-count');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Modal DOM Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const publishTweetBtn = document.getElementById('publish-tweet-btn');
    const charCountEl = document.getElementById('char-count');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const tplStandardBtn = document.getElementById('tpl-standard');
    const tplShortBtn = document.getElementById('tpl-short');
    const tplMinimalBtn = document.getElementById('tpl-minimal');
    const previewCardTitle = document.getElementById('preview-card-title');
    const previewCardDesc = document.getElementById('preview-card-desc');

    // Progress Ring Constants
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    // Toast Notification System
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'warning') iconClass = 'fa-circle-exclamation';
        if (type === 'error') iconClass = 'fa-circle-xmark';

        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Trigger reflow & show
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Theme toggling (Dark / Light Mode)
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('theme', 'light');
            showToast('Light mode enabled', 'info');
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('theme', 'dark');
            showToast('Dark mode enabled', 'info');
        }
    });

    // Fetch release notes from backend
    async function fetchReleaseNotes(forceRefresh = false) {
        showLoading(true);
        refreshBtn.querySelector('i').classList.add('spinning');
        refreshBtn.disabled = true;

        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'success') {
                releaseNotes = data.data;
                renderNotes();
                
                const fetchSource = data.source === 'fresh' ? 'Fetched fresh from Google Cloud' : 'Loaded from cache';
                showToast(`Successfully loaded ${releaseNotes.length} notes (${fetchSource})`, 'success');
            } else {
                throw new Error(data.message || 'Unknown backend error');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast(`Failed to fetch release notes: ${error.message}`, 'error');
            // If empty, show empty state
            if (releaseNotes.length === 0) {
                showEmptyState(true);
            }
        } finally {
            showLoading(false);
            refreshBtn.querySelector('i').classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            notesFeed.classList.add('hidden');
            emptyState.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
            notesFeed.classList.remove('hidden');
        }
    }

    function showEmptyState(isEmpty) {
        if (isEmpty) {
            emptyState.classList.remove('hidden');
            notesFeed.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            notesFeed.classList.remove('hidden');
        }
    }

    // Render cards to UI
    function renderNotes() {
        // Filter notes
        const filteredNotes = releaseNotes.filter(note => {
            const matchesCategory = activeCategory === 'all' || note.category.toLowerCase() === activeCategory;
            const matchesSearch = searchQuery === '' || 
                note.title.toLowerCase().includes(searchQuery) ||
                note.category.toLowerCase().includes(searchQuery) ||
                note.content_text.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        // Update counts
        totalCountEl.textContent = releaseNotes.length;
        filteredCountEl.textContent = filteredNotes.length;

        // Clear existing feed
        notesFeed.innerHTML = '';

        if (filteredNotes.length === 0) {
            showEmptyState(true);
            return;
        }

        showEmptyState(false);

        // Append note cards
        filteredNotes.forEach((note, index) => {
            const card = document.createElement('article');
            const safeCategoryClass = note.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
            card.className = `note-card card-glass card-cat-${safeCategoryClass}`;
            card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;
            
            // Format dates
            let formattedDate = note.date;
            
            card.innerHTML = `
                <div class="card-meta">
                    <span class="date-badge" aria-label="Release Date">
                        <i class="fa-regular fa-calendar-days"></i> ${formattedDate}
                    </span>
                    <span class="category-badge badge-cat-${safeCategoryClass}" aria-label="Category">${note.category}</span>
                </div>
                <div class="card-content">
                    ${note.content_html}
                </div>
                <div class="card-actions">
                    <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="card-permalink" title="View official release documentation page">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Google Cloud Docs
                    </a>
                    <div class="action-buttons">
                        <button class="action-btn btn-copy" data-id="${note.id}" title="Copy plaintext release note description">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                        <button class="action-btn btn-tweet" data-id="${note.id}" title="Share this release update on Twitter / X">
                            <i class="fa-brands fa-x-twitter"></i> Share Update
                        </button>
                    </div>
                </div>
            `;
            
            notesFeed.appendChild(card);
        });

        // Register card action listeners
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = btn.getAttribute('data-id');
                const note = releaseNotes.find(n => n.id === noteId);
                if (note) {
                    navigator.clipboard.writeText(`${note.date} - BigQuery Release Note [${note.category}]:\n${note.content_text}\nSource: ${note.link}`);
                    showToast('Release note copied to clipboard!', 'success');
                }
            });
        });

        document.querySelectorAll('.btn-tweet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = btn.getAttribute('data-id');
                const note = releaseNotes.find(n => n.id === noteId);
                if (note) {
                    openTweetModal(note);
                }
            });
        });
    }

    // Category filter click handler
    categoryFiltersContainer.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.filter-btn');
        if (!filterBtn) return;

        // Toggle active classes
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        filterBtn.classList.add('active');

        activeCategory = filterBtn.getAttribute('data-category');
        renderNotes();
    });

    // Search query input handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderNotes();
    });

    // Reset filters button handler
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        activeCategory = 'all';
        
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
        
        renderNotes();
        showToast('Filters reset', 'info');
    });

    // Manual Refresh button
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // -------------------------------------------------------------
    // Twitter Composer Modal Logics
    // -------------------------------------------------------------
    function openTweetModal(note) {
        selectedNote = note;
        activeTemplate = 'standard';
        
        // Select template chip
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        tplStandardBtn.classList.add('active');
        
        // Populate modal link preview card
        previewCardTitle.textContent = `${note.date} BigQuery Release`;
        previewCardDesc.textContent = note.content_text;
        
        // Build Tweet text
        updateTweetText();
        
        // Display Modal
        tweetModal.classList.add('active');
        tweetModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        tweetModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        selectedNote = null;
    }

    closeModalBtn.addEventListener('click', closeTweetModal);
    
    // Close modal clicking backdrop
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });

    // Template switcher
    tplStandardBtn.addEventListener('click', () => {
        setTemplate('standard', tplStandardBtn);
    });
    tplShortBtn.addEventListener('click', () => {
        setTemplate('short', tplShortBtn);
    });
    tplMinimalBtn.addEventListener('click', () => {
        setTemplate('minimal', tplMinimalBtn);
    });

    function setTemplate(type, element) {
        activeTemplate = type;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        element.classList.add('active');
        updateTweetText();
    }

    function updateTweetText() {
        if (!selectedNote) return;
        
        const note = selectedNote;
        let text = '';
        
        // Calculate max description snippet length
        // Twitter counts characters differently but standard text areas are 280 length limit.
        const hashTags = '#BigQuery #GCP';
        const link = note.link;
        
        switch (activeTemplate) {
            case 'standard': {
                const prefix = `BigQuery ${note.category} (${note.date}): `;
                const suffix = `\n\nRead more: ${link}\n${hashTags}`;
                const availableLen = 280 - prefix.length - suffix.length;
                
                let snippet = note.content_text;
                if (snippet.length > availableLen) {
                    snippet = snippet.substring(0, availableLen - 3) + '...';
                }
                text = `${prefix}${snippet}${suffix}`;
                break;
            }
            case 'short': {
                const prefix = `BigQuery ${note.category}: `;
                const suffix = `\n${link} #BigQuery`;
                const availableLen = 280 - prefix.length - suffix.length;
                
                let snippet = note.content_text;
                if (snippet.length > availableLen) {
                    snippet = snippet.substring(0, availableLen - 3) + '...';
                }
                text = `${prefix}${snippet}${suffix}`;
                break;
            }
            case 'minimal': {
                const suffix = `\n${link}`;
                const availableLen = 280 - suffix.length;
                
                let snippet = note.content_text;
                if (snippet.length > availableLen) {
                    snippet = snippet.substring(0, availableLen - 3) + '...';
                }
                text = `${snippet}${suffix}`;
                break;
            }
        }
        
        tweetTextarea.value = text;
        handleCharCount();
    }

    // Handle character count updates & circle rendering
    function handleCharCount() {
        const text = tweetTextarea.value;
        const remaining = 280 - text.length;
        
        charCountEl.textContent = remaining;

        // Apply classes
        charCountEl.className = 'char-count';
        if (remaining <= 20 && remaining > 0) {
            charCountEl.classList.add('warning');
        } else if (remaining <= 0) {
            charCountEl.classList.add('danger');
        }

        // Render progress circle
        const percentage = Math.max(0, Math.min(100, (text.length / 280) * 100));
        const strokeOffset = circumference - (percentage / 100) * circumference;
        
        progressCircle.style.strokeDashoffset = strokeOffset;

        // Set circle color
        if (remaining <= 0) {
            progressCircle.style.stroke = '#f43f5e'; // Rose
        } else if (remaining <= 20) {
            progressCircle.style.stroke = '#eab308'; // Amber
        } else {
            progressCircle.style.stroke = '#3b82f6'; // Blue
        }
        
        // Disable publish button if empty or exceeds limit
        if (text.length === 0 || text.length > 280) {
            publishTweetBtn.disabled = true;
            publishTweetBtn.style.opacity = '0.5';
            publishTweetBtn.style.cursor = 'not-allowed';
        } else {
            publishTweetBtn.disabled = false;
            publishTweetBtn.style.opacity = '1';
            publishTweetBtn.style.cursor = 'pointer';
        }
    }

    tweetTextarea.addEventListener('input', handleCharCount);

    // Copy tweet draft text
    copyTweetBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetTextarea.value);
        showToast('Tweet draft copied to clipboard!', 'success');
    });

    // Publish to Twitter (redirects to Web intent)
    publishTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > 0 && text.length <= 280) {
            const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
            showToast('Opening Twitter composer in a new tab...', 'info');
            closeTweetModal();
        } else {
            showToast('Tweet content exceeds the 280-character limit!', 'error');
        }
    });

    // Initial setup
    initTheme();
    fetchReleaseNotes(false);
});
