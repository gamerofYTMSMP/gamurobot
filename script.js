
// Global variables
let allGames = [];
let filteredGames = [];
let currentUser = null;
let isAuthRequired = false;
let categories = new Set();
let currentCategory = 'all';

// DOM Elements
const authModal = document.getElementById('authModal');
const authBtn = document.getElementById('authBtn');
const authForm = document.getElementById('authForm');
const authTabs = document.querySelectorAll('.tab-btn');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const skipAuth = document.getElementById('skipAuth');
const authMessage = document.getElementById('authMessage');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const gamesGrid = document.getElementById('gamesGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const gameModal = document.getElementById('gameModal');
const gameFrame = document.getElementById('gameFrame');
const gameTitle = document.getElementById('gameTitle');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const categoriesContainer = document.getElementById('categoriesContainer');

// Database URL
const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1dA60aigQuQVTY2AWGinJBwFBm5QyHNnrP-tYjcb-H7M/export?format=csv';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadGamesDatabase();
});

function initializeApp() {
    // Check if user is already authenticated
    if (window.firebaseAuth) {
        window.onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                currentUser = user;
                updateAuthButton(user);
                if (user.emailVerified) {
                    console.log('User is verified');
                } else {
                    showAuthMessage('Please check your email and verify your account.', 'success');
                }
            } else {
                currentUser = null;
                updateAuthButton(null);
            }
        });
    }
    
    // Show auth modal on first visit
    setTimeout(() => {
        if (!currentUser && !localStorage.getItem('skipAuth')) {
            showAuthModal();
        }
    }, 1000);
}

function setupEventListeners() {
    // Auth modal events
    authBtn.addEventListener('click', showAuthModal);
    skipAuth.addEventListener('click', skipAuthentication);
    authForm.addEventListener('submit', handleAuthSubmit);
    
    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });
    
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    clearSearch.addEventListener('click', clearSearchInput);
    
    // Fullscreen functionality
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Modal close events
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
            if (e.target.closest('.game-modal')) {
                exitFullscreen();
                gameFrame.src = '';
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            if (e.target.classList.contains('game-modal')) {
                exitFullscreen();
                gameFrame.src = '';
            }
        }
    });
    
    // Escape key for fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gameModal.classList.contains('fullscreen')) {
            exitFullscreen();
        }
    });
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

async function loadGamesDatabase() {
    try {
        loadingSpinner.style.display = 'block';
        
        const response = await fetch(DATABASE_URL);
        const csvText = await response.text();
        
        // Parse CSV data
        const lines = csvText.trim().split('\n');
        const games = [];
        
        // Skip header row and process data
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [name, icon, link, category] = parseCSVLine(line);
                if (name && icon && link) {
                    const gameCategory = category ? category.trim() : 'Other';
                    categories.add(gameCategory);
                    games.push({
                        name: name.trim(),
                        icon: icon.trim(),
                        link: link.trim(),
                        category: gameCategory
                    });
                }
            }
        }
        
        allGames = games;
        filteredGames = [...allGames];
        renderCategories();
        renderGames();
        
    } catch (error) {
        console.error('Error loading games database:', error);
        showFallbackGames();
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function showFallbackGames() {
    // Fallback games in case the database fails to load
    allGames = [
        {
            name: "Puzzle Adventure",
            icon: "https://via.placeholder.com/300x200/ff6b6b/white?text=Puzzle",
            link: "https://example.com/puzzle-game",
            category: "Puzzle"
        },
        {
            name: "Racing Fun",
            icon: "https://via.placeholder.com/300x200/4ecdc4/white?text=Racing",
            link: "https://example.com/racing-game",
            category: "Racing"
        },
        {
            name: "Memory Game",
            icon: "https://via.placeholder.com/300x200/45b7d1/white?text=Memory",
            link: "https://example.com/memory-game",
            category: "Puzzle"
        }
    ];
    categories.add('Puzzle');
    categories.add('Racing');
    filteredGames = [...allGames];
    renderCategories();
    renderGames();
}

function renderGames() {
    gamesGrid.innerHTML = '';
    
    if (filteredGames.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    filteredGames.forEach(game => {
        const gameCard = createGameCard(game);
        gamesGrid.appendChild(gameCard);
    });
}

function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
        <img src="${game.icon}" alt="${game.name}" class="game-icon" onerror="this.src='https://via.placeholder.com/300x200/f8f9fa/666?text=Game'">
        <div class="game-info">
            <h3 class="game-name">${game.name}</h3>
            <button class="play-btn">
                <i class="fas fa-play"></i> Play Now
            </button>
        </div>
    `;
    
    card.addEventListener('click', () => playGame(game));
    
    return card;
}

function playGame(game) {
    // Add some fun animations
    const card = event.currentTarget;
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);
    
    // Open game in modal
    gameTitle.textContent = game.name;
    gameFrame.src = game.link;
    gameModal.style.display = 'block';
    
    // Automatically enter fullscreen when game loads
    gameFrame.onload = () => {
        console.log('Game loaded successfully');
        setTimeout(() => {
            enterFullscreen();
        }, 500); // Reduced delay for better user experience
    };
    
    gameFrame.onerror = () => {
        gameFrame.srcdoc = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div>
                    <h2>🎮 Game Loading...</h2>
                    <p>Please wait while we prepare your game!</p>
                    <p><a href="${game.link}" target="_blank" style="color: #4ecdc4;">Click here to play in a new tab</a></p>
                </div>
            </div>
        `;
    };
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredGames = currentCategory === 'all' ? [...allGames] : allGames.filter(game => game.category === currentCategory);
        clearSearch.classList.remove('show');
    } else {
        let searchBase = currentCategory === 'all' ? allGames : allGames.filter(game => game.category === currentCategory);
        filteredGames = searchBase.filter(game => 
            game.name.toLowerCase().includes(searchTerm)
        );
        clearSearch.classList.add('show');
    }
    
    renderGames();
}

function clearSearchInput() {
    searchInput.value = '';
    filteredGames = currentCategory === 'all' ? [...allGames] : allGames.filter(game => game.category === currentCategory);
    clearSearch.classList.remove('show');
    renderGames();
    searchInput.focus();
}

// Auth functions
function showAuthModal() {
    authModal.style.display = 'block';
}

function skipAuthentication() {
    authModal.style.display = 'none';
    localStorage.setItem('skipAuth', 'true');
    showAuthMessage('You can always sign up later to save your progress!', 'success');
}

function switchAuthTab(tab) {
    authTabs.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    if (tab === 'signin') {
        authTitle.textContent = 'Welcome Back!';
        authSubmit.textContent = 'Sign In';
    } else {
        authTitle.textContent = 'Join the Fun!';
        authSubmit.textContent = 'Sign Up';
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isSignUp = document.querySelector('.tab-btn.active').dataset.tab === 'signup';
    
    try {
        if (isSignUp) {
            const userCredential = await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
            await window.sendEmailVerification(userCredential.user);
            showAuthMessage('Account created! Please check your email to verify your account.', 'success');
        } else {
            await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
            showAuthMessage('Welcome back! Signed in successfully.', 'success');
            setTimeout(() => {
                authModal.style.display = 'none';
            }, 1500);
        }
    } catch (error) {
        showAuthMessage(getErrorMessage(error.code), 'error');
    }
}

function updateAuthButton(user) {
    if (user) {
        authBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email.split('@')[0]}`;
        authBtn.onclick = () => {
            if (confirm('Do you want to sign out?')) {
                window.signOut(window.firebaseAuth);
            }
        };
    } else {
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.onclick = showAuthModal;
    }
}

function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.style.display = 'block';
    
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-not-found': 'No account found with this email. Try signing up instead.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// Categories functionality
function renderCategories() {
    categoriesContainer.innerHTML = '<button class="category-btn active" data-category="all"><i class="fas fa-th"></i> All Games</button>';
    
    // Add category icons
    const categoryIcons = {
        'Puzzle': 'fas fa-puzzle-piece',
        'Racing': 'fas fa-car',
        'Action': 'fas fa-fist-raised',
        'Adventure': 'fas fa-mountain',
        'Educational': 'fas fa-graduation-cap',
        'Sports': 'fas fa-football-ball',
        'Strategy': 'fas fa-chess',
        'Arcade': 'fas fa-gamepad',
        'Other': 'fas fa-star'
    };
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.dataset.category = category;
        const icon = categoryIcons[category] || 'fas fa-star';
        button.innerHTML = `<i class="${icon}"></i> ${category}`;
        button.addEventListener('click', () => filterByCategory(category));
        categoriesContainer.appendChild(button);
    });
}

function filterByCategory(category) {
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Filter games
    if (category === 'all') {
        filteredGames = [...allGames];
    } else {
        filteredGames = allGames.filter(game => game.category === category);
    }
    
    // Clear search if active
    if (searchInput.value) {
        searchInput.value = '';
        clearSearch.classList.remove('show');
    }
    
    renderGames();
}

// Fullscreen functionality
function toggleFullscreen() {
    if (gameModal.classList.contains('fullscreen')) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function enterFullscreen() {
    gameModal.classList.add('fullscreen');
    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    fullscreenBtn.title = 'Exit Fullscreen';
    
    // Hide website elements completely
    document.body.style.overflow = 'hidden';
    
    // Try to enter browser fullscreen
    const fullscreenElement = gameModal;
    
    if (fullscreenElement.requestFullscreen) {
        fullscreenElement.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    } else if (fullscreenElement.webkitRequestFullscreen) {
        fullscreenElement.webkitRequestFullscreen();
    } else if (fullscreenElement.mozRequestFullScreen) {
        fullscreenElement.mozRequestFullScreen();
    } else if (fullscreenElement.msRequestFullscreen) {
        fullscreenElement.msRequestFullscreen();
    }
}

function exitFullscreen() {
    gameModal.classList.remove('fullscreen');
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.title = 'Fullscreen';
    
    // Restore website elements
    document.body.style.overflow = 'auto';
    
    // Try to exit browser fullscreen
    if (document.fullscreenElement || document.webkitFullscreenElement || 
        document.mozFullScreenElement || document.msFullscreenElement) {
        
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => {
                console.log('Exit fullscreen failed:', err);
            });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Add some fun interactions
document.addEventListener('mousemove', (e) => {
    if (Math.random() < 0.001) { // Very rare
        createFloatingEmoji(e.clientX, e.clientY);
    }
});

function createFloatingEmoji(x, y) {
    const emojis = ['🎮', '🎯', '🎲', '🎪', '🎨', '🚀', '⭐', '🎊'];
    const emoji = document.createElement('div');
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.position = 'fixed';
    emoji.style.left = x + 'px';
    emoji.style.top = y + 'px';
    emoji.style.fontSize = '20px';
    emoji.style.pointerEvents = 'none';
    emoji.style.zIndex = '9999';
    emoji.style.transition = 'all 2s ease-out';
    
    document.body.appendChild(emoji);
    
    setTimeout(() => {
        emoji.style.transform = 'translateY(-100px)';
        emoji.style.opacity = '0';
    }, 100);
    
    setTimeout(() => {
        document.body.removeChild(emoji);
    }, 2100);
}

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle fullscreen changes
function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                           document.mozFullScreenElement || document.msFullscreenElement);
    
    if (!isFullscreen && gameModal.classList.contains('fullscreen')) {
        // User exited fullscreen via browser controls
        exitFullscreen();
    }
}

// Debounce search input
const debouncedSearch = debounce(handleSearch, 300);
searchInput.removeEventListener('input', handleSearch);
searchInput.addEventListener('input', debouncedSearch);
