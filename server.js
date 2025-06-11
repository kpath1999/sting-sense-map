require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Add this line after your existing middleware
app.use(express.static('public'));

// Add a catch-all route for your main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Make sure to require path at the top
const path = require('path');

// Simple in-memory cache for responses
const responseCache = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// Validate request body
const validateRequest = (req, res, next) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid prompt. Please provide a non-empty string.' });
    }
    next();
};

// Generate a cache key from the prompt
const generateCacheKey = (prompt) => {
    return prompt.trim().toLowerCase();
};

app.post('/api/generate-summary', validateRequest, async (req, res) => {
    const { prompt } = req.body;
    const cacheKey = generateCacheKey(prompt);

    // Check cache first
    if (responseCache.has(cacheKey)) {
        console.log('Serving from cache');
        return res.json(responseCache.get(cacheKey));
    }

    try {
        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY is not defined');
            return res.status(500).json({ 
                error: 'API configuration error',
                message: 'Please contact the administrator'
            });
        }

        console.log('Making request to Groq API...');
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Groq API error:', errorData);
            
            // Return a user-friendly error message
            return res.status(response.status).json({ 
                error: 'Unable to generate response',
                message: 'Please try again later'
            });
        }

        const data = await response.json();
        console.log('Successfully received response from Groq API');

        // Cache the successful response
        responseCache.set(cacheKey, data);

        res.json(data);
    } catch (error) {
        console.error('Error in generate-summary endpoint:', error);
        
        // Return a user-friendly error message
        res.status(500).json({ 
            error: 'Service temporarily unavailable',
            message: 'Please try again later'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Please try again later'
    });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app; 