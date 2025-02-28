// Import Cloudflare Workers-specific packages
import { Router } from 'itty-router';

// Game state variables (Since Workers are stateless, we'll use global variables for now)
let gameState = {
  highScore: 0,
  level: 1,
  sequence: [],
};

// Function to generate a random game sequence
const generateSequence = (level) => {
  const colors = ["red", "yellow", "green", "blue"];
  return Array.from(
    { length: level },
    () => colors[Math.floor(Math.random() * colors.length)]
  );
};

// Initialize the sequence
gameState.sequence = generateSequence(1);

// Create a new router
const router = Router();

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS requests for CORS preflight
router.options('*', () => {
  return new Response(null, {
    headers: corsHeaders,
  });
});

// GET game state endpoint
router.get('/api/v1/game-state', async () => {
  return new Response(JSON.stringify(gameState), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
});

// PUT to reset game state
router.put('/api/v1/game-state', async () => {
  gameState.level = 1;
  gameState.sequence = generateSequence(1);
  
  return new Response(JSON.stringify({ 
    message: "Game reset successfully", 
    gameState 
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
});

// POST to validate sequence
router.post('/api/v1/game-state/sequence', async (request) => {
  // Parse the request body
  const data = await request.json();
  
  // Validate the user input
  if (!data || !Array.isArray(data.sequence) || data.sequence.length <= 0) {
    return new Response(JSON.stringify({ 
      message: "A non-empty sequence array is required."
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
  
  // Check sequence length
  if (data.sequence.length !== gameState.level) {
    return new Response(JSON.stringify({
      message: `Sequence must be exactly ${gameState.level} items long.`,
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  // Check if user sequence matches game sequence
  if (JSON.stringify(data.sequence) === JSON.stringify(gameState.sequence)) {
    // Update high score if needed
    if (gameState.level > gameState.highScore) {
      gameState.highScore = gameState.level;
    }

    // Increase level and generate new sequence
    gameState.level++;
    gameState.sequence = generateSequence(gameState.level);

    return new Response(JSON.stringify({
      gameState,
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } else {
    // Reset on failure
    gameState.level = 1;
    gameState.sequence = generateSequence(1);
    
    return new Response(JSON.stringify({
      message: "Incorrect sequence. Restarting at level 1.",
      gameState,
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});

// 404 handler for unsupported routes
router.all('*', () => {
  return new Response(JSON.stringify({ error: "Resource not found" }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
});

// Export a default event handler for the Worker
export default {
  async fetch(request, env, ctx) {
    return router.handle(request);
  },
}; 