let game_sequence = [];
let player_sequence = [];
let game_is_running = false;
let current_level = 1;
let high_score = 0;


const PAD_NOTES = {
    'pad-red': 'C4',
    'pad-yellow': 'D4',
    'pad-green': 'E4',
    'pad-blue': 'F4'
};


const KEYBOARD_KEYS = {
    'q': 'pad-red',
    'w': 'pad-yellow',
    'a': 'pad-green',
    's': 'pad-blue'
};


const API_URL = 'http://localhost:3000/api/v1';

const start_button = document.getElementById('start-btn');
const replay_button = document.getElementById('replay-btn');
const high_score_display = document.getElementById('high-score');
const level_display = document.getElementById('level-indicator');
const sound_selector = document.getElementById('sound-select');
const failure_popup = document.getElementById('failure-modal');
const reset_button = document.getElementById('reset-btn');
let sound_maker;

const load_script = (url, callback) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
};

window.onload = () => {
    if (typeof axios === 'undefined') {
        load_script('https://unpkg.com/axios/dist/axios.min.js', () => {
            if (typeof Tone === 'undefined') {
                load_script('https://unpkg.com/tone', setup_game);
            } else {
                setup_game();
            }
        });
    } else if (typeof Tone === 'undefined') {
        load_script('https://unpkg.com/tone', setup_game);
    } else {
        setup_game();
    }
};

class Game {
    constructor() {
        this.setup();
    }
    
    setup() {

        sound_maker = new Tone.Synth().toDestination();
        

        this.reset_game();
        

        start_button.addEventListener('click', () => this.start_new_game());
        replay_button.addEventListener('click', () => this.show_sequence());
        reset_button.addEventListener('click', () => this.reset_game());
        
        
        document.addEventListener('keydown', (event) => {
            const key_pressed = event.key.toLowerCase();
            if (KEYBOARD_KEYS[key_pressed]) {
                this.handle_pad_click(KEYBOARD_KEYS[key_pressed]);
            }
        });
        

        Object.keys(PAD_NOTES).forEach(pad_id => {
            document.getElementById(pad_id).addEventListener('click', () => 
                this.handle_pad_click(pad_id)
            );
        });
    }

    play_pad(pad_id) {
        const pad = document.getElementById(pad_id);
        const note = PAD_NOTES[pad_id];
        

        sound_maker.oscillator.type = sound_selector.value;
        

        sound_maker.triggerAttackRelease(note, '0.3');
        

        pad.classList.add('active');
        setTimeout(() => pad.classList.remove('active'), 300);
    }
    

    async show_sequence() {
        replay_button.disabled = true;
        start_button.disabled = true;
        
        for (const pad_id of game_sequence) {
            await new Promise(resolve => setTimeout(resolve, 500));
            this.play_pad(pad_id);
        }
        
        replay_button.disabled = false;
        if (!game_is_running) {
            start_button.disabled = false;
        }
    }
    // handle pad click

    handle_pad_click(pad_id) {
        if (!game_is_running) return;
        
        this.play_pad(pad_id);
        player_sequence.push(pad_id);
    
        if (player_sequence.length === game_sequence.length) {
            this.check_sequence();
        }
    }
    // start game
    async start_new_game() {
        try {
            await axios.put(`${API_URL}/game-state`);
            
            const response = await axios.get(`${API_URL}/game-state`);
            
            if (response.data && response.data.sequence) {
                game_sequence = response.data.sequence.map(color => `pad-${color}`);
                
                game_is_running = true;
                start_button.disabled = true;
                replay_button.disabled = false;
                player_sequence = [];
                current_level = response.data.level || 1;
                level_display.textContent = current_level;
                
                if (game_sequence.length > 0) {
                    this.show_sequence();
                }
            }
        } catch (error) {
            console.error('Game could not start');
        }
    }
    // check how many pads the player has pressed
    async check_sequence() {
        try {
            const sequence_to_check = [];
            for (let i = 0; i < player_sequence.length; i++) {
                sequence_to_check.push(player_sequence[i].replace('pad-', ''));
            }
            
            const response = await axios.post(`${API_URL}/game-state/sequence`, {
                sequence: sequence_to_check
            });
            
            if (response.status === 200) {
                current_level++;
                level_display.textContent = current_level;
                
                if (response.data.gameState) {
                    if (response.data.gameState.highScore > high_score) {
                        high_score = response.data.gameState.highScore;
                        high_score_display.textContent = high_score;
                    }
                    game_sequence = response.data.gameState.sequence.map(color => `pad-${color}`);
                } else {
                    game_sequence = response.data.sequence.map(color => `pad-${color}`);
                }
                
                player_sequence = [];
                setTimeout(() => this.show_sequence(), 1000);
            }
        } catch (error) {
            console.error('Wrong sequence');
            show_game_over();
        }
    }
    
    async reset_game() {
        try {
            await axios.put(`${API_URL}/game-state`);
            reset_variables();
        } catch (error) {
            console.error('Could not reset game');
        }
    }
}

const reset_variables = () => {
    if (game_sequence.length > 0) {
        game_sequence = [];
    }
    player_sequence = [];
    game_is_running = false;
    current_level = 1;
    level_display.textContent = current_level;
    start_button.disabled = false;
    replay_button.disabled = true;
    failure_popup.style.display = 'none';
};

// Show GAME OVER popup
const show_game_over = () => {
    failure_popup.style.display = 'block';
};

// Create and setup the game
const setup_game = () => {
    window.game = new Game();
}; 