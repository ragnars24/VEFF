// Game state variables
let sequence = [];
let playerSequence = [];
let gameStarted = false;
let currentLevel = 1;
let highScore = 0;

// Constants for pads and their corresponding notes
const PADS = {
    'pad-red': 'C4',
    'pad-yellow': 'D4',
    'pad-green': 'E4',
    'pad-blue': 'F4'
};

// Key mappings
const KEY_TO_PAD = {
    'q': 'pad-red',
    'w': 'pad-yellow',
    'a': 'pad-green',
    's': 'pad-blue'
};

// Set this to false for production deployment
const useLocalApi = false;

// API base URL with toggle
const BASE_URL = useLocalApi 
  ? 'http://localhost:3000/api/v1'
  : 'https://simon-says-api.r4ng4r.workers.dev/api/v1';

// Get DOM elements
const startButton = document.getElementById('start-btn');
const replayButton = document.getElementById('replay-btn');
const highScoreDisplay = document.getElementById('high-score');
const levelIndicator = document.getElementById('level-indicator');
const soundSelect = document.getElementById('sound-select');
const failureModal = document.getElementById('failure-modal');
const resetButton = document.getElementById('reset-btn');

// Add required scripts at runtime if they're not in the HTML
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Load required scripts
window.onload = function() {
    if (typeof axios === 'undefined') {
        loadScript('https://unpkg.com/axios/dist/axios.min.js', function() {
            if (typeof Tone === 'undefined') {
                loadScript('https://unpkg.com/tone', initializeGame);
            } else {
                initializeGame();
            }
        });
    } else if (typeof Tone === 'undefined') {
        loadScript('https://unpkg.com/tone', initializeGame);
    } else {
        initializeGame();
    }
};

// Initialize the game once scripts are loaded
function initializeGame() {
    // Initialize synth
    const synth = new Tone.Synth().toDestination();
    
    // Initialize game state on page load
    initGame();
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    replayButton.addEventListener('click', playSequence);
    resetButton.addEventListener('click', initGame);
    
    // Keyboard support
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (KEY_TO_PAD[key]) {
            handlePadClick(KEY_TO_PAD[key]);
        }
    });
    
    // Pad click handlers
    Object.keys(PADS).forEach(padId => {
        document.getElementById(padId).addEventListener('click', () => handlePadClick(padId));
    });
    
    // Play tone and light up pad
    function playPad(padId) {
        const pad = document.getElementById(padId);
        const note = PADS[padId];
        
        // Update synth oscillator type
        synth.oscillator.type = soundSelect.value;
        
        // Play the tone
        synth.triggerAttackRelease(note, '0.3');
        
        // Visual feedback
        pad.classList.add('active');
        setTimeout(() => pad.classList.remove('active'), 300);
    }
    
    // Play sequence
    async function playSequence() {
        replayButton.disabled = true;
        startButton.disabled = true;
        
        console.log("Playing sequence:", sequence);
        
        for (const padId of sequence) {
            await new Promise(resolve => setTimeout(resolve, 500));
            playPad(padId);
        }
        
        replayButton.disabled = false;
        if (!gameStarted) {
            startButton.disabled = false;
        }
    }
    
    // Handle pad clicks
    function handlePadClick(padId) {
        if (!gameStarted) return;
        
        playPad(padId);
        playerSequence.push(padId);
    
        if (playerSequence.length === sequence.length) {
            validateSequence();
        }
    }
    
    // Start game
    async function startGame() {
        try {
            console.log("Attempting to connect to backend at:", BASE_URL);
            
            // Reset game state
            const resetResponse = await axios.put(`${BASE_URL}/game-state`);
            console.log("Game reset response:", resetResponse.data);
            
            // After resetting, get the current game state to see the sequence
            const getResponse = await axios.get(`${BASE_URL}/game-state`);
            console.log("Game state response:", getResponse.data);
            
            // Now we have the initial sequence from the game state
            if (getResponse.data && getResponse.data.sequence) {
                sequence = getResponse.data.sequence.map(color => `pad-${color}`);
                
                // Update game state variables
                gameStarted = true;
                startButton.disabled = true;
                replayButton.disabled = false;
                playerSequence = [];
                currentLevel = getResponse.data.level || 1;
                levelIndicator.textContent = currentLevel;
                
                console.log("Initial sequence to play:", sequence);
                
                // Play the sequence
                if (sequence.length > 0) {
                    playSequence();
                } else {
                    console.error("No sequence in game state");
                }
            } else {
                console.error("Invalid game state response:", getResponse.data);
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            if (error.response) {
                console.log('Error details:', error.response.data);
            }
        }
    }
    
    // Validate sequence
    async function validateSequence() {
        try {
            const sequenceToValidate = playerSequence.map(padId => padId.replace('pad-', ''));
            console.log("Sending sequence to validate:", sequenceToValidate);
            
            const response = await axios.post(`${BASE_URL}/game-state/sequence`, {
                sequence: sequenceToValidate
            });
            
            console.log("Validation response:", response.data);
            
            if (response.status === 200) {
                currentLevel++;
                levelIndicator.textContent = currentLevel;
                
                // Handle different response structures
                if (response.data.gameState) {
                    if (response.data.gameState.highScore > highScore) {
                        highScore = response.data.gameState.highScore;
                        highScoreDisplay.textContent = highScore;
                    }
                    sequence = response.data.gameState.sequence.map(color => `pad-${color}`);
                } else {
                    sequence = response.data.sequence.map(color => `pad-${color}`);
                }
                
                playerSequence = [];
                console.log("Next sequence:", sequence);
                setTimeout(playSequence, 1000);
            }
        } catch (error) {
            console.error('Failed to validate sequence:', error);
            console.log('Error details:', error.response || error);
            showFailureModal();
        }
    }
}

// Initialize game state on page load
const initGame = async () => {
    try {
        const response = await axios.put(`${BASE_URL}/game-state`);
        console.log("Game initialized:", response.data);
        resetGameState();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
};

// Reset local game state
const resetGameState = () => {
    sequence = [];
    playerSequence = [];
    gameStarted = false;
    currentLevel = 1;
    levelIndicator.textContent = currentLevel;
    startButton.disabled = false;
    replayButton.disabled = true;
    failureModal.style.display = 'none';
};

// Show failure modal
const showFailureModal = () => {
    failureModal.style.display = 'block';
}; 