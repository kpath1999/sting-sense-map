require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { streamText } = require('ai');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Add this line after your existing middleware
app.use(express.static('public'));

// Add a catch-all route for your main page
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simple in-memory cache for responses
const responseCache = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        env: process.env.NODE_ENV,
        hasApiKey: !!process.env.AI_GATEWAY_API_KEY 
    });
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
        if (!process.env.AI_GATEWAY_API_KEY) {
            console.error('AI_GATEWAY_API_KEY is not defined');
            return res.status(500).json({ 
                error: 'API configuration error',
                message: 'Please contact the administrator'
            });
        }

        console.log('Making request to AI Gateway with xai/grok-3...');
        
        const result = await streamText({
            model: 'xai/grok-3',
            prompt: prompt,
            maxTokens: 500  // Limit response to stay within rate limits
        });

        // Collect the full response
        let fullResponse = '';
        for await (const textPart of result.textStream) {
            fullResponse += textPart;
        }

        const usage = await result.usage;
        const finishReason = await result.finishReason;

        console.log('Successfully received response from AI Gateway');
        console.log('Token usage:', usage);

        // Format response to match OpenAI-style structure for compatibility
        const data = {
            choices: [{
                message: {
                    content: fullResponse,
                    role: 'assistant'
                },
                finish_reason: finishReason
            }],
            usage: usage
        };

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

app.post('/api/generate-insight', validateRequest, async (req, res) => {
    const { prompt } = req.body;
    const cacheKey = generateCacheKey(prompt);

    if (responseCache.has(cacheKey)) {
        console.log('Serving insight from cache');
        return res.json(responseCache.get(cacheKey));
    }

    try {
        if (!process.env.AI_GATEWAY_API_KEY) {
            console.error('AI_GATEWAY_API_KEY is not defined');
            return res.status(500).json({ error: 'API configuration error' });
        }

        console.log('Making insight request to AI Gateway with xai/grok-3...');
        
        const result = await streamText({
            model: 'xai/grok-3',
            prompt: prompt,
            maxTokens: 150  // Shorter responses for insights
        });

        // Collect the full response
        let fullResponse = '';
        for await (const textPart of result.textStream) {
            fullResponse += textPart;
        }

        const usage = await result.usage;
        const finishReason = await result.finishReason;

        console.log('Successfully received insight from AI Gateway');
        console.log('Token usage:', usage);

        // Format response to match OpenAI-style structure for compatibility
        const data = {
            choices: [{
                message: {
                    content: fullResponse,
                    role: 'assistant'
                },
                finish_reason: finishReason
            }],
            usage: usage
        };

        responseCache.set(cacheKey, data);
        res.json(data);

    } catch (error) {
        console.error('Error in generate-insight endpoint:', error);
        res.status(500).json({ error: 'Service temporarily unavailable' });
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
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`AI Gateway API Key present: ${!!process.env.AI_GATEWAY_API_KEY}`);
    });
}

// Export for Vercel
module.exports = app; 