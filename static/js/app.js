/**
 * MailGuard AI - Intelligent Email Spam Detection System
 * Frontend Application Controller
 */

// Application State
const state = {
    currentView: 'dashboard',
    gmailConnected: false,
    userEmail: null,
    stats: {
        total: 0,
        spam_count: 0,
        ham_count: 0,
        spam_percentage: 0,
        avg_spam_confidence: 0,
        avg_ham_confidence: 0
    },
    recordsFilter: 'ALL',
    recordsSearch: '',
    recordsSort: 'date_desc',
    recordsPage: 1,
    recordsLimit: 8,
    charts: {
        dashboardDonut: null,
        dashboardBar: null,
        deepDonut: null,
        deepTimeline: null
    }
};

// Preset Sample Emails for Live Tester
const PRESETS = {
    lottery: {
        subject: "URGENT: Claim your $2,500,000 lottery winning prize today!",
        sender: "Claims Department <winner-claim-notice@reward-international.org>",
        body: "Congratulations! You have been selected as the official winner in our annual international lottery draw. To claim your cash prize of $2,500,000, call urgent now or text reply with your bank account details and home address. Standard rates apply. Failure to respond within 24 hours will forfeit your winning."
    },
    bank: {
        subject: "SECURITY ALERT: Immediate verification required for your account",
        sender: "Account Security Desk <security-verify@online-banking-alerts.com>",
        body: "Dear Customer, We detected an unauthorized login attempt from an unrecognized IP address. Your account has been temporarily restricted for security reasons. Click the link below to verify your password, debit card number, and security PIN immediately to avoid permanent account termination."
    },
    crypto: {
        subject: "Guaranteed 500% ROI in 48 hours - Exclusive Bitcoin Investment Opportunity",
        sender: "Crypto Wealth Group <invest@fast-crypto-doubler.net>",
        body: "Double your crypto balance today! Deposit a minimum of 0.05 BTC to our verified trading pool and receive automated daily payouts. Guaranteed returns with zero risk. Act now - only 5 spots remaining for new VIP investors."
    },
    meeting: {
        subject: "Project Sprint Planning Sync - Tomorrow at 10:00 AM",
        sender: "Sarah Jenkins <s.jenkins@organization.com>",
        body: "Hi team, please find attached the agenda for tomorrow's sprint planning session. We will review our Q3 milestones, discuss client feedback, and prioritize our engineering tickets. Let me know if you have any questions or need to add discussion topics beforehand. Thanks!"
    },
    university: {
        subject: "Notice: Industrial Training Presentation Schedule and Guidelines",
        sender: "Department Coordinator <coord@engineering-college.edu>",
        body: "Dear Final Year Students, The schedule for the upcoming Industrial Training Project Evaluation has been finalized. Each presentation will be 15 minutes followed by 5 minutes of Q&A with the faculty review panel. Please ensure your project repository, slide deck, and live system demonstration are fully configured."
    }
};

// =========================================================
// Initialization
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupEventListeners();
    refreshAllData();
});

// =========================================================
// Navigation & Views
// =========================================================
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.getAttribute('data-view');
            switchView(viewId);
        });
    });

    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function switchView(viewId) {
    state.currentView = viewId;

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update view containers
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active-view');
    });

    const activeView = document.getElementById(`view-${viewId}`);
    if (activeView) {
        activeView.classList.add('active-view');
    }

    // Update top title
    const titleMap = {
        dashboard: "Dashboard Overview",
        scanner: "Gmail Inbox Scanner",
        records: "Classification Records",
        tester: "Live Email Security Tester",
        analytics: "Analytics & Performance Metrics",
        settings: "Gmail OAuth & Security Configuration"
    };
    const topTitle = document.getElementById('top-title');
    if (topTitle) {
        topTitle.textContent = titleMap[viewId] || "Dashboard";
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Trigger view-specific loads
    if (viewId === 'records') {
        loadRecords();
    } else if (viewId === 'analytics') {
        loadAnalytics();
    }
}

// =========================================================
// Event Listeners
// =========================================================
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('global-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = document.getElementById('refresh-icon');
            if (icon) icon.classList.add('fa-spin');
            refreshAllData().finally(() => {
                setTimeout(() => {
                    if (icon) icon.classList.remove('fa-spin');
                }, 400);
            });
        });
    }

    // Top action button
    const topActionBtn = document.getElementById('top-action-btn');
    if (topActionBtn) {
        topActionBtn.addEventListener('click', () => {
            if (state.gmailConnected) {
                switchView('scanner');
            } else {
                triggerConnectGmail();
            }
        });
    }

    // Start Scan Button
    const startScanBtn = document.getElementById('start-scan-btn');
    if (startScanBtn) {
        startScanBtn.addEventListener('click', handleInboxScan);
    }

    // Records Search input (debounced)
    const searchInput = document.getElementById('records-search-input');
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                state.recordsSearch = e.target.value.trim();
                state.recordsPage = 1;
                loadRecords();
            }, 250);
        });
    }

    // Category Filter Pills
    const filterPills = document.querySelectorAll('.category-filter-group .filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.recordsFilter = pill.getAttribute('data-filter');
            state.recordsPage = 1;
            loadRecords();
        });
    });

    // Records Sort Select
    const sortSelect = document.getElementById('records-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.recordsSort = e.target.value;
            state.recordsPage = 1;
            loadRecords();
        });
    }

    // Pagination buttons
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (state.recordsPage > 1) {
                state.recordsPage--;
                loadRecords();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            state.recordsPage++;
            loadRecords();
        });
    }

    // Clear all history
    const clearBtn = document.getElementById('clear-all-history-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearHistory);
    }

    // Live Email Tester Run Button
    const runTestBtn = document.getElementById('run-test-btn');
    if (runTestBtn) {
        runTestBtn.addEventListener('click', handleLiveTest);
    }

    // Credentials Upload Form
    const uploadForm = document.getElementById('upload-creds-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleCredentialsUpload);
    }
}

// =========================================================
// Data Fetching & State Updates
// =========================================================
async function refreshAllData() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        // Update stats
        if (data.stats) {
            state.stats = data.stats;
            updateStatsUI(data.stats);
        }

        // Update Gmail status
        if (data.gmail) {
            updateGmailUI(data.gmail);
        }

        // Update Dashboard Recent Table & Charts
        loadDashboardData();

        // Update records view if active
        if (state.currentView === 'records') {
            loadRecords();
        } else if (state.currentView === 'analytics') {
            loadAnalytics();
        }

        showToast("System data synchronized", "info");
    } catch (err) {
        console.error("Failed to load status:", err);
        showToast("Error connecting to server", "error");
    }
}

function updateStatsUI(stats) {
    const totalEl = document.getElementById('stat-total');
    const spamEl = document.getElementById('stat-spam');
    const hamEl = document.getElementById('stat-ham');
    const pctEl = document.getElementById('stat-pct');

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (spamEl) spamEl.textContent = stats.spam_count || 0;
    if (hamEl) hamEl.textContent = stats.ham_count || 0;
    if (pctEl) pctEl.textContent = (stats.spam_percentage || 0) + '%';

    const recordsBadge = document.getElementById('nav-records-count');
    if (recordsBadge) recordsBadge.textContent = stats.total || 0;

    const filterAll = document.getElementById('filter-all-count');
    const filterSpam = document.getElementById('filter-spam-count');
    const filterHam = document.getElementById('filter-ham-count');
    if (filterAll) filterAll.textContent = stats.total || 0;
    if (filterSpam) filterSpam.textContent = stats.spam_count || 0;
    if (filterHam) filterHam.textContent = stats.ham_count || 0;
}

function updateGmailUI(gmail) {
    state.gmailConnected = gmail.connected;
    state.userEmail = gmail.email;

    const pill = document.getElementById('top-gmail-pill');
    const pillText = document.getElementById('top-gmail-text');
    const topActionBtn = document.getElementById('top-action-btn');

    if (gmail.connected) {
        if (pill) {
            pill.className = "gmail-status-pill connected";
        }
        if (pillText) {
            pillText.textContent = `Connected: ${gmail.email}`;
        }
        if (topActionBtn) {
            topActionBtn.className = "btn btn-primary btn-sm";
            topActionBtn.innerHTML = `<i class="fa-solid fa-inbox"></i><span>Analyze Inbox</span>`;
        }
    } else {
        if (pill) {
            pill.className = "gmail-status-pill disconnected";
        }
        if (pillText) {
            pillText.textContent = "Gmail Not Connected";
        }
        if (topActionBtn) {
            topActionBtn.className = "btn btn-primary btn-sm";
            topActionBtn.innerHTML = `<i class="fa-brands fa-google"></i><span>Connect Gmail</span>`;
        }
    }

    // Update Scanner Tab Status Card
    const accountNameEl = document.getElementById('scanner-account-name');
    const accountDescEl = document.getElementById('scanner-account-desc');
    const scannerActions = document.getElementById('scanner-auth-actions');

    if (accountNameEl && accountDescEl && scannerActions) {
        if (gmail.connected) {
            accountNameEl.textContent = `Google Account: ${gmail.email}`;
            accountDescEl.textContent = `Authorized read-only access. Total inbox messages: ${gmail.messages_total.toLocaleString()}`;
            scannerActions.innerHTML = `
                <button class="btn btn-outline btn-sm" onclick="triggerDisconnectGmail()" style="color: var(--spam-red);">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Disconnect
                </button>
            `;
        } else {
            accountNameEl.textContent = "Gmail Account Not Connected";
            accountDescEl.textContent = gmail.has_credentials 
                ? "OAuth credentials detected. Click 'Connect Gmail' to authorize with Google OAuth 2.0."
                : "No credentials.json found. Please upload your Google OAuth Client ID file in the Settings tab.";
            scannerActions.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="triggerConnectGmail()">
                    <i class="fa-brands fa-google"></i> Connect Gmail
                </button>
            `;
        }
    }

    // Update Settings Tab
    const settingsStatus = document.getElementById('settings-status-details');
    const settingsButtons = document.getElementById('settings-auth-buttons');
    const credsFileStatus = document.getElementById('creds-file-status');

    if (credsFileStatus) {
        if (gmail.has_credentials) {
            credsFileStatus.innerHTML = `<span style="color: var(--ham-green); font-weight: 600;"><i class="fa-solid fa-check-circle"></i> credentials.json is present</span>`;
        } else {
            credsFileStatus.innerHTML = `<span style="color: var(--spam-red); font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> credentials.json missing</span>`;
        }
    }

    if (settingsStatus && settingsButtons) {
        if (gmail.connected) {
            settingsStatus.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13.5px;">
                    <div><strong>Connected Account:</strong> ${gmail.email}</div>
                    <div><strong>OAuth Scope:</strong> <code>https://www.googleapis.com/auth/gmail.readonly</code></div>
                    <div><strong>Total Mailbox Messages:</strong> ${gmail.messages_total.toLocaleString()}</div>
                    <div><strong>Token Storage:</strong> <code>token.json</code> (Securely managed on backend)</div>
                </div>
            `;
            settingsButtons.innerHTML = `
                <button class="btn btn-danger btn-sm" onclick="triggerDisconnectGmail()">
                    <i class="fa-solid fa-unlink"></i> Disconnect Account
                </button>
            `;
        } else {
            settingsStatus.innerHTML = `
                <p style="font-size: 13.5px; color: var(--text-secondary);">
                    No Google account is currently authenticated. Connect using Google OAuth 2.0 to grant read-only access to recent emails for spam classification.
                </p>
                ${gmail.error ? `<div class="ml-disclaimer-box" style="border-left-color: var(--spam-red); margin-top: 10px;"><strong>Notice:</strong> ${gmail.error}</div>` : ''}
            `;
            settingsButtons.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="triggerConnectGmail()">
                    <i class="fa-brands fa-google"></i> Connect Google Account
                </button>
            `;
        }
    }
}

// =========================================================
// Dashboard Data & Charts
// =========================================================
async function loadDashboardData() {
    try {
        const res = await fetch('/api/emails?limit=5&sort=date_desc');
        const data = await res.json();
        
        const tbody = document.getElementById('dashboard-recent-tbody');
        const emptyState = document.getElementById('dashboard-empty-state');

        if (!tbody) return;
        tbody.innerHTML = '';

        if (!data.emails || data.emails.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            tbody.closest('table').style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            tbody.closest('table').style.display = 'table';

            data.emails.forEach(email => {
                const tr = document.createElement('tr');
                tr.innerHTML = renderEmailRowHtml(email);
                tbody.appendChild(tr);
            });
        }

        renderDashboardCharts();
    } catch (err) {
        console.error("Failed to load dashboard recent emails:", err);
    }
}

function renderEmailRowHtml(email) {
    const isSpam = email.category === 'SPAM';
    const badgeClass = isSpam ? 'badge-spam' : 'badge-ham';
    const badgeIcon = isSpam ? 'fa-shield-virus' : 'fa-circle-check';
    const fillClass = isSpam ? 'spam' : 'ham';

    return `
        <td class="email-subject-cell" title="${escapeHtml(email.subject)}">
            ${escapeHtml(email.subject)}
        </td>
        <td class="email-sender-cell" title="${escapeHtml(email.sender)}">
            ${escapeHtml(email.sender)}
        </td>
        <td style="white-space: nowrap; font-size: 12.5px;">
            ${escapeHtml(email.received_date || email.analyzed_at || 'Recent')}
        </td>
        <td>
            <span class="badge ${badgeClass}">
                <i class="fa-solid ${badgeIcon}"></i> ${email.category}
            </span>
        </td>
        <td>
            <div class="confidence-bar-container">
                <div class="confidence-bar">
                    <div class="confidence-bar-fill ${fillClass}" style="width: ${Math.min(email.confidence, 100)}%;"></div>
                </div>
                <div class="confidence-text">${email.confidence.toFixed(1)}%</div>
            </div>
        </td>
        <td>
            <button class="btn btn-outline btn-sm" onclick="openDetailModal(${email.id})">
                <i class="fa-solid fa-eye"></i> Details
            </button>
        </td>
    `;
}

// Chart.js Visualizations
async function renderDashboardCharts() {
    try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        const stats = data.stats;
        const timeline = data.timeline || [];

        // 1. Donut Chart
        const donutCtx = document.getElementById('dashboardDonutChart');
        const donutEmpty = document.getElementById('donut-empty-state');
        if (donutCtx) {
            if (stats.total === 0) {
                donutCtx.style.display = 'none';
                if (donutEmpty) donutEmpty.style.display = 'flex';
            } else {
                donutCtx.style.display = 'block';
                if (donutEmpty) donutEmpty.style.display = 'none';

                if (state.charts.dashboardDonut) {
                    state.charts.dashboardDonut.destroy();
                }

                state.charts.dashboardDonut = new Chart(donutCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Spam', 'Legitimate (Ham)'],
                        datasets: [{
                            data: [stats.spam_count, stats.ham_count],
                            backgroundColor: ['#dc2626', '#16a34a'],
                            borderColor: ['#ffffff', '#ffffff'],
                            borderWidth: 2,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { font: { family: 'Inter', size: 12 } }
                            }
                        },
                        cutout: '70%'
                    }
                });
            }
        }

        // 2. Bar Chart
        const barCtx = document.getElementById('dashboardBarChart');
        const barEmpty = document.getElementById('bar-empty-state');
        if (barCtx) {
            if (timeline.length === 0) {
                barCtx.style.display = 'none';
                if (barEmpty) barEmpty.style.display = 'flex';
            } else {
                barCtx.style.display = 'block';
                if (barEmpty) barEmpty.style.display = 'none';

                if (state.charts.dashboardBar) {
                    state.charts.dashboardBar.destroy();
                }

                const labels = timeline.map(t => t.date_label);
                const spamData = timeline.map(t => t.spam_count);
                const hamData = timeline.map(t => t.ham_count);

                state.charts.dashboardBar = new Chart(barCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Spam',
                                data: spamData,
                                backgroundColor: '#dc2626',
                                borderRadius: 4
                            },
                            {
                                label: 'Legitimate',
                                data: hamData,
                                backgroundColor: '#16a34a',
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } }
                        },
                        scales: {
                            x: { stacked: true, grid: { display: false } },
                            y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
                        }
                    }
                });
            }
        }
    } catch (err) {
        console.error("Failed to render charts:", err);
    }
}

// =========================================================
// Inbox Scanner Execution
// =========================================================
async function handleInboxScan() {
    const scanBtn = document.getElementById('start-scan-btn');
    const select = document.getElementById('scan-count-select');
    const count = select ? parseInt(select.value) : 5;
    const progressBox = document.getElementById('scan-progress-box');
    const progressLabel = document.getElementById('scan-progress-label');
    const progressBar = document.getElementById('scan-progress-bar');
    const tbody = document.getElementById('scanner-batch-tbody');
    const emptyState = document.getElementById('scanner-empty-state');

    if (!state.gmailConnected) {
        showToast("Please connect your Gmail account first", "error");
        switchView('settings');
        return;
    }

    try {
        scanBtn.disabled = true;
        scanBtn.innerHTML = `<div class="spinner"></div><span>Scanning Inbox...</span>`;
        if (progressBox) progressBox.style.display = 'block';

        // Animated progress steps
        const steps = [
            { text: "Connecting to Gmail REST API v1...", pct: "25%" },
            { text: "Fetching email headers & base64 MIME bodies...", pct: "50%" },
            { text: "Preprocessing text with BeautifulSoup & Regex...", pct: "75%" },
            { text: "Applying TF-IDF vectorizer & MultinomialNB classification...", pct: "90%" }
        ];

        let stepIndex = 0;
        const interval = setInterval(() => {
            if (stepIndex < steps.length) {
                if (progressLabel) progressLabel.textContent = steps[stepIndex].text;
                if (progressBar) progressBar.style.width = steps[stepIndex].pct;
                stepIndex++;
            }
        }, 500);

        const res = await fetch('/api/analyze/inbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: count })
        });

        clearInterval(interval);
        const data = await res.json();

        if (progressBar) progressBar.style.width = "100%";
        if (progressLabel) progressLabel.textContent = "Analysis complete!";

        setTimeout(() => {
            if (progressBox) progressBox.style.display = 'none';
        }, 800);

        if (!data.success) {
            showToast(data.error || "Inbox analysis failed", "error");
            return;
        }

        showToast(`Successfully analyzed ${data.count} emails!`, "success");

        // Render batch table
        if (tbody) {
            tbody.innerHTML = '';
            if (data.emails && data.emails.length > 0) {
                if (emptyState) emptyState.style.display = 'none';
                tbody.closest('table').style.display = 'table';
                data.emails.forEach(email => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = renderEmailRowHtml(email);
                    tbody.appendChild(tr);
                });
            }
        }

        // Refresh statistics
        if (data.stats) {
            state.stats = data.stats;
            updateStatsUI(data.stats);
        }

        renderDashboardCharts();

    } catch (err) {
        console.error("Inbox scan failed:", err);
        showToast("Inbox analysis error occurred", "error");
    } finally {
        scanBtn.disabled = false;
        scanBtn.innerHTML = `<i class="fa-solid fa-bolt"></i><span>Analyze Inbox Now</span>`;
    }
}

// =========================================================
// Classification Records (History)
// =========================================================
async function loadRecords() {
    try {
        const url = `/api/emails?page=${state.recordsPage}&limit=${state.recordsLimit}&sort=${state.recordsSort}&search=${encodeURIComponent(state.recordsSearch)}&category=${encodeURIComponent(state.recordsFilter)}`;
        const res = await fetch(url);
        const data = await res.json();

        const tbody = document.getElementById('records-table-tbody');
        const emptyState = document.getElementById('records-empty-state');
        const pagination = document.getElementById('records-pagination');

        if (!tbody) return;
        tbody.innerHTML = '';

        if (!data.emails || data.emails.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            tbody.closest('table').style.display = 'none';
            if (pagination) pagination.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            tbody.closest('table').style.display = 'table';
            if (pagination) pagination.style.display = 'flex';

            data.emails.forEach(email => {
                const tr = document.createElement('tr');
                tr.innerHTML = renderEmailRowHtml(email);
                tbody.appendChild(tr);
            });
        }

        // Update pagination numbers
        const curPage = document.getElementById('current-page-num');
        const totPage = document.getElementById('total-pages-num');
        const totRec = document.getElementById('total-records-num');
        const pageInd = document.getElementById('page-indicator');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');

        if (curPage) curPage.textContent = data.page;
        if (totPage) totPage.textContent = data.total_pages;
        if (totRec) totRec.textContent = data.total;
        if (pageInd) pageInd.textContent = data.page;

        if (prevBtn) prevBtn.disabled = data.page <= 1;
        if (nextBtn) nextBtn.disabled = data.page >= data.total_pages;

    } catch (err) {
        console.error("Failed to load records:", err);
    }
}

async function handleClearHistory() {
    if (!confirm("Are you sure you want to clear all stored email classification history? This cannot be undone.")) {
        return;
    }

    try {
        const res = await fetch('/api/emails/clear', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast("Classification history cleared", "info");
            refreshAllData();
        }
    } catch (err) {
        showToast("Failed to clear history", "error");
    }
}

// =========================================================
// Live Email Security Tester
// =========================================================
function loadTesterPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;

    const subInput = document.getElementById('tester-subject');
    const senderInput = document.getElementById('tester-sender');
    const bodyInput = document.getElementById('tester-body');

    if (subInput) subInput.value = preset.subject;
    if (senderInput) senderInput.value = preset.sender;
    if (bodyInput) bodyInput.value = preset.body;

    showToast(`Loaded "${key.toUpperCase()}" sample preset`, "info");
}

async function handleLiveTest() {
    const subInput = document.getElementById('tester-subject');
    const senderInput = document.getElementById('tester-sender');
    const bodyInput = document.getElementById('tester-body');
    const testBtn = document.getElementById('run-test-btn');

    const subject = subInput ? subInput.value.trim() : '';
    const sender = senderInput ? senderInput.value.trim() : '';
    const body = bodyInput ? bodyInput.value.trim() : '';

    if (!subject && !body) {
        showToast("Please enter an email subject or body text to classify", "error");
        return;
    }

    try {
        testBtn.disabled = true;
        testBtn.innerHTML = `<div class="spinner"></div><span>Running MultinomialNB Inference...</span>`;

        const res = await fetch('/api/analyze/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: subject,
                sender: sender || "Manual Inspector <tester@mailguard.ai>",
                body: body
            })
        });

        const data = await res.json();
        if (!data.success) {
            showToast(data.error || "Classification failed", "error");
            return;
        }

        const result = data.result;
        displayTesterResult(result);
        showToast(`Classified as ${result.category} (${result.confidence}%)`, "success");

        // Refresh stats
        if (data.stats) {
            state.stats = data.stats;
            updateStatsUI(data.stats);
        }

    } catch (err) {
        console.error("Test classification error:", err);
        showToast("Inference error occurred", "error");
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = `<i class="fa-solid fa-microchip"></i><span>Run Machine Learning Classification</span>`;
    }
}

function displayTesterResult(result) {
    const placeholder = document.getElementById('tester-placeholder-state');
    const resultContent = document.getElementById('tester-result-content');
    const verdictBox = document.getElementById('tester-verdict-box');
    const verdictTitle = document.getElementById('tester-verdict-title');
    const confMetric = document.getElementById('tester-confidence-metric');
    const meterFill = document.getElementById('tester-meter-fill');
    const probBreakdown = document.getElementById('tester-prob-breakdown');
    const keywordsPills = document.getElementById('tester-keywords-pills');

    if (placeholder) placeholder.style.display = 'none';
    if (resultContent) resultContent.style.display = 'block';

    const isSpam = result.category === 'SPAM';
    if (verdictBox) {
        verdictBox.className = `result-verdict-box ${isSpam ? 'spam' : 'ham'}`;
    }

    if (verdictTitle) {
        verdictTitle.innerHTML = isSpam 
            ? `<i class="fa-solid fa-shield-virus"></i> SPAM DETECTED` 
            : `<i class="fa-solid fa-circle-check"></i> LEGITIMATE (NOT SPAM)`;
    }

    if (confMetric) {
        confMetric.textContent = `Model Classification Confidence: ${result.confidence.toFixed(2)}%`;
    }

    if (meterFill) {
        meterFill.style.width = `${result.confidence}%`;
        meterFill.style.backgroundColor = isSpam ? 'var(--spam-red)' : 'var(--ham-green)';
    }

    if (probBreakdown) {
        probBreakdown.textContent = `Spam: ${(result.spam_prob * 100).toFixed(1)}% | Ham: ${(result.ham_prob * 100).toFixed(1)}%`;
    }

    if (keywordsPills) {
        keywordsPills.innerHTML = '';
        if (result.key_indicators && result.key_indicators.length > 0) {
            result.key_indicators.forEach(item => {
                const span = document.createElement('span');
                span.className = 'preset-pill';
                span.style.cursor = 'default';
                span.innerHTML = `<strong>${escapeHtml(item.word)}</strong> (log weight: ${item.weight > 0 ? '+' : ''}${item.weight})`;
                keywordsPills.appendChild(span);
            });
        } else {
            keywordsPills.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Common vocabulary detected</span>`;
        }
    }
}

// =========================================================
// Deep Analytics View
// =========================================================
async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        const stats = data.stats;
        const timeline = data.timeline || [];

        // Metric values
        const totalEl = document.getElementById('analytics-total');
        const spamConfEl = document.getElementById('analytics-spam-conf');
        const hamConfEl = document.getElementById('analytics-ham-conf');

        if (totalEl) totalEl.textContent = stats.total || 0;
        if (spamConfEl) spamConfEl.textContent = (stats.avg_spam_confidence || 0) + '%';
        if (hamConfEl) hamConfEl.textContent = (stats.avg_ham_confidence || 0) + '%';

        // Deep Donut
        const donutCtx = document.getElementById('deepDonutChart');
        const donutEmpty = document.getElementById('deep-donut-empty');
        if (donutCtx) {
            if (stats.total === 0) {
                donutCtx.style.display = 'none';
                if (donutEmpty) donutEmpty.style.display = 'flex';
            } else {
                donutCtx.style.display = 'block';
                if (donutEmpty) donutEmpty.style.display = 'none';

                if (state.charts.deepDonut) state.charts.deepDonut.destroy();

                state.charts.deepDonut = new Chart(donutCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Spam', 'Legitimate (Ham)'],
                        datasets: [{
                            data: [stats.spam_count, stats.ham_count],
                            backgroundColor: ['#dc2626', '#16a34a']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } }
                        }
                    }
                });
            }
        }

        // Deep Timeline
        const timelineCtx = document.getElementById('deepTimelineChart');
        const timelineEmpty = document.getElementById('deep-timeline-empty');
        if (timelineCtx) {
            if (timeline.length === 0) {
                timelineCtx.style.display = 'none';
                if (timelineEmpty) timelineEmpty.style.display = 'flex';
            } else {
                timelineCtx.style.display = 'block';
                if (timelineEmpty) timelineEmpty.style.display = 'none';

                if (state.charts.deepTimeline) state.charts.deepTimeline.destroy();

                state.charts.deepTimeline = new Chart(timelineCtx, {
                    type: 'line',
                    data: {
                        labels: timeline.map(t => t.date_label),
                        datasets: [
                            {
                                label: 'Spam Volume',
                                data: timeline.map(t => t.spam_count),
                                borderColor: '#dc2626',
                                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                tension: 0.3,
                                fill: true
                            },
                            {
                                label: 'Legitimate Volume',
                                data: timeline.map(t => t.ham_count),
                                borderColor: '#16a34a',
                                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                                tension: 0.3,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } }
                        }
                    }
                });
            }
        }
    } catch (err) {
        console.error("Failed to load analytics:", err);
    }
}

// =========================================================
// Email Details Modal
// =========================================================
async function openDetailModal(emailId) {
    try {
        const res = await fetch(`/api/emails/${emailId}`);
        const data = await res.json();
        if (!data.success || !data.email) {
            showToast("Failed to fetch email details", "error");
            return;
        }

        const email = data.email;
        const modal = document.getElementById('email-detail-modal');
        const bodyContent = document.getElementById('modal-body-content');

        const isSpam = email.category === 'SPAM';
        const badgeClass = isSpam ? 'badge-spam' : 'badge-ham';
        const badgeIcon = isSpam ? 'fa-shield-virus' : 'fa-circle-check';

        bodyContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                    <span class="badge ${badgeClass}" style="font-size: 14px; padding: 6px 14px;">
                        <i class="fa-solid ${badgeIcon}"></i> ${email.category}
                    </span>
                    <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">
                        Confidence: ${email.confidence.toFixed(2)}%
                    </span>
                </div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 8px;">
                    ${escapeHtml(email.subject)}
                </h3>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid var(--border-light); margin-bottom: 20px;">
                <div><strong>Sender:</strong> ${escapeHtml(email.sender)}</div>
                <div><strong>Date:</strong> ${escapeHtml(email.received_date || email.analyzed_at)}</div>
                <div><strong>Spam Probability:</strong> ${(email.spam_prob * 100).toFixed(2)}%</div>
                <div><strong>Ham Probability:</strong> ${(email.ham_prob * 100).toFixed(2)}%</div>
            </div>

            <div style="margin-bottom: 16px;">
                <label style="font-size: 13px; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">
                    Extracted & Preprocessed Body Preview:
                </label>
                <div style="background: #ffffff; border: 1px solid var(--border-light); border-radius: 8px; padding: 14px; font-size: 13px; color: var(--text-secondary); max-height: 200px; overflow-y: auto; line-height: 1.6; font-family: monospace;">
                    ${escapeHtml(email.body_full || email.body_preview || '(No text content)')}
                </div>
            </div>

            <div class="ml-disclaimer-box">
                <strong><i class="fa-solid fa-triangle-exclamation"></i> Academic Presentation Disclaimer:</strong>
                This classification is generated by the Multinomial Naive Bayes model based on TF-IDF term weights. Machine learning predictions are probabilistic estimates and should be used as decision-support indicators.
            </div>
        `;

        modal.classList.add('active');
    } catch (err) {
        console.error("Detail modal error:", err);
    }
}

function closeDetailModal() {
    const modal = document.getElementById('email-detail-modal');
    if (modal) modal.classList.remove('active');
}

// =========================================================
// Google OAuth Actions
// =========================================================
async function triggerConnectGmail() {
    showToast("Opening browser for Google OAuth 2.0 authorization...", "info");
    try {
        const res = await fetch('/api/auth/connect', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast("Gmail connected successfully!", "success");
            refreshAllData();
        } else {
            showToast(data.error || "Authentication could not be completed", "error");
            switchView('settings');
        }
    } catch (err) {
        showToast("OAuth flow error: Please check server console or credentials", "error");
    }
}

async function triggerDisconnectGmail() {
    if (!confirm("Are you sure you want to disconnect your Gmail account?")) return;
    try {
        const res = await fetch('/api/auth/disconnect', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast("Gmail disconnected", "info");
            refreshAllData();
        } else {
            showToast(data.error || "Failed to disconnect", "error");
        }
    } catch (err) {
        showToast("Disconnect error occurred", "error");
    }
}

async function handleCredentialsUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('creds-file-input');
    const btn = document.getElementById('upload-creds-btn');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast("Please select a credentials.json file to upload", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        btn.disabled = true;
        btn.innerHTML = `<div class="spinner"></div><span>Saving credentials...</span>`;

        const res = await fetch('/api/auth/upload-credentials', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (data.success) {
            showToast(data.message, "success");
            fileInput.value = '';
            refreshAllData();
        } else {
            showToast(data.error || "Upload failed", "error");
        }
    } catch (err) {
        showToast("Failed to upload credentials", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload & Install credentials.json`;
    }
}

// =========================================================
// Toast Notification Utility
// =========================================================
function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-exclamation";

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3800);
}

// HTML Escaper
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
