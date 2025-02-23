// Game variables
const SERVER_URL = 'https://scintillating-crostata-a05d44.netlify.app/';
const startBtn = document.getElementById('startBtn');
const replayBtn = document.getElementById('replayBtn');
const levelText = document.getElementById('levelText');
const scoreText = document.getElementById('scoreText');
const buttons = document.querySelectorAll('.game-button');

let level = 1;
let canPlay = false;
let computerPattern = [];
let playerPattern = [];

// Get HTML elements
const redBtn = document.getElementById('pad-red');
const yellowBtn = document.getElementById('pad-yellow');
const greenBtn = document.getElementById('pad-green');
const blueBtn = document.getElementById('pad-blue');
const resetBtn = document.getElementById('reset-btn');
const soundSelect = document.getElementById('sound-select');
const gameOverBox = document.getElementById('failure-modal');

// Sound settings
const soundMaker = new Tone.Synth().toDestination();

// Musical notes for each button
const buttonNotes = {
    'red': 'C4',
    'yellow': 'D4',
    'green': 'E4',
    'blue': 'F4'
};

// Keyboard controls
const keyControls = {
    'Q': 'red',
    'W': 'yellow',
    'A': 'green',
    'S': 'blue'
};

// Start setup when page loads
window.onload = setupGame;

// Add button click listeners
startBtn.onclick = startGame;
replayBtn.onclick = replaySequence;
resetBtn.onclick = function() {
    gameOverBox.style.display = 'none';
    setupGame();
};

// Add colored button listeners
redBtn.onclick = function() { handleButtonClick('red'); };
yellowBtn.onclick = function() { handleButtonClick('yellow'); };
greenBtn.onclick = function() { handleButtonClick('green'); };
blueBtn.onclick = function() { handleButtonClick('blue'); };

// Add keyboard controls
document.onkeydown = function(event) {
    const color = keyControls[event.key.toUpperCase()];
    if (color) {
        handleButtonClick(color);
    }
};

// Set up new game
async function setupGame() {
    // Reset game state
    level = 1;
    canPlay = false;
    computerPattern = [];
    playerPattern = [];
    
    // Reset buttons
    startBtn.disabled = false;
    replayBtn.disabled = true;
    levelText.textContent = '1';

    // Reset server
    await axios.put(`${SERVER_URL}/game-state`);
    const response = await axios.get(`${SERVER_URL}/game-state`);
    scoreText.textContent = response.data.highScore || '0';
}

// Start new game
async function startGame() {
    startBtn.disabled = true;
    replayBtn.disabled = true;
    await playComputerSequence();
    canPlay = true;
    replayBtn.disabled = false;
}

// Show button pattern
async function showPattern() {
    canPlay = false;
    
    for (let color of computerPattern) {
        await flashButton(color);
        await sleep(500);
    }
    
    canPlay = true;
}

// Flash button and play sound
async function flashButton(color) {
    const button = document.getElementById(`pad-${color}`);
    button.classList.add('active');
    
    soundMaker.oscillator.type = soundSelect.value;
    await soundMaker.triggerAttackRelease(buttonNotes[color], '0.2s');
    
    await sleep(300);
    button.classList.remove('active');
}

// Handle button clicks
async function handleButtonClick(color) {
    if (!canPlay) return;
    
    await flashButton(color);
    playerPattern.push(color);
    
    if (playerPattern.length === computerPattern.length) {
        canPlay = false;
        const response = await axios.post(`${SERVER_URL}/validate`, {
            playerPattern,
            level
        });
        
        if (response.data.success) {
            level++;
            levelText.textContent = level;
            scoreText.textContent = response.data.highScore;
            playerPattern = [];
            await generateNextSequence();
            await playComputerSequence();
            canPlay = true;
        } else {
            const modal = document.getElementById('gameOverModal');
            modal.style.display = "block";
            startBtn.disabled = false;
            replayBtn.disabled = true;
        }
    }
}

// Show pattern again
async function replaySequence() {
    if (!canPlay) return;
    
    replayBtn.disabled = true;
    canPlay = false;
    playerPattern = [];
    await playComputerSequence();
    canPlay = true;
    replayBtn.disabled = false;
}

// Wait function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add modal close function
const closeModal = () => {
    const modal = document.getElementById('gameOverModal');
    modal.style.display = "none";
};

// Replace for-loop with forEach/map
async function playComputerSequence() {
    canPlay = false;
    for await (const color of computerPattern) {
        await playButton(color);
        await sleep(300);
    }
}

// Add event listeners using modern array methods
buttons.forEach(button => {
    button.addEventListener('click', () => {
        const color = button.dataset.color;
        handleButtonClick(color);
    });
});

async function generateNextSequence() {
    const response = await axios.post(`${SERVER_URL}/next-sequence`, { level });
    computerPattern = response.data.sequence;
}

async function playButton(color) {
    const button = document.querySelector(`[data-color="${color}"]`);
    const sound = document.querySelector(`[data-sound="${color}"]`);
    
    button.classList.add('active');
    sound.currentTime = 0;
    sound.play();
    await sleep(300);
    button.classList.remove('active');
}
