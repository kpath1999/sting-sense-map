require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate-summary', async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY is not defined');
            return res.status(500).json({ error: 'API key not configured' });
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
                    content: req.body.prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Groq API error:', errorData);
            return res.status(response.status).json({ error: 'Groq API request failed', details: errorData });
        }

        const data = await response.json();
        console.log('Successfully received response from Groq API');
        res.json(data);
    } catch (error) {
        console.error('Error in generate-summary endpoint:', error);
        res.status(500).json({ error: 'Failed to generate summary', details: error.message });
    }
});

// For Vercel serverless functions
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app; 