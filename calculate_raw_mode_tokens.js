#!/usr/bin/env node

/**
 * Token Calculator for Raw Mode Benchmark Questions
 * 
 * This script calculates the estimated number of prompt tokens used by the raw mode
 * for each of the 5 benchmark questions in the Sting Sense bus analytics system.
 * 
 * Usage: node calculate_raw_mode_tokens.js
 * Requirements: Node.js environment with access to the bus data files
 */

const fs = require('fs');
const path = require('path');

// Constants from the original system
const TOKENS_PER_CHAR_ESTIMATE_LEGACY = 0.35; // Original estimate from splitFeaturesForRawMode
const TOKENS_PER_CHAR_ESTIMATE_MODERN = 4;    // More accurate estimate from ContextModeEvaluator (text.length / 4)
const RAW_SINGLE_REQUEST_CHAR_LIMIT = 11000;
const MAX_INPUT_TOKENS = 3000;

// Benchmark questions from the system
const benchmarkQuestions = [
    {
        id: "aggressive-driving",
        question: "Tell me about aggressive driving behaviors around campus",
        groundTruth: "Should identify Klaus and Student Center as hotspots, mention hard braking or rapid acceleration"
    },
    {
        id: "dwell-time", 
        question: "Which parts of campus have the highest dwell time associated with them",
        groundTruth: "Should mention long pauses near Student Center, CRC, or Klaus with durations over 2 minutes"
    },
    {
        id: "moderate-behavior",
        question: "How many instances of moderate driving behavior can be found on campus",
        groundTruth: "Should provide a numeric count of 'Moderate' behavior events from the dataset"
    },
    {
        id: "route-efficiency",
        question: "How efficient was the bus route",
        groundTruth: "Should mention efficiency ratio and compare traveled distance to straight-line distance"
    },
    {
        id: "tech-square-patterns",
        question: "What are the driving patterns like around Tech Square",
        groundTruth: "Should reference Tech Square and describe behavior types (moderate, aggressive) found there"
    }
];

// Prompt templates from the system
const promptTemplates = {
    raw: `You are a transportation analyst. You will receive the entire bus telemetry dataset as raw JSON without any preprocessing. Use it to answer the user's question directly, pointing to concrete observations. Respond in plain text only—do not use markdown formatting, bullet points, or special characters—and keep your reply under 200 words.

RAW DATASET (JSON):
{{data}}

USER QUESTION: {{userQuery}}`,

    rawChunk: `You are a transportation analyst reviewing bus telemetry part {{chunkIndex}} of {{totalChunks}}. The data is raw JSON with no preprocessing. Extract concrete observations (locations, timestamps, behaviors) relevant to the user question. Write in plain text with no markdown, lists, or special characters, keep your response under 120 words, note any potential safety concerns, and focus only on this chunk.

RAW DATA CHUNK:
{{data}}

USER QUESTION: {{userQuery}}`,

    rawFinal: `You previously reviewed {{chunkCount}} raw telemetry chunks. Combine the analyst notes below into one cohesive answer for the user. Reference the question directly, call out specific patterns or anomalies, and keep the response under 220 words. Produce plain text only—no markdown formatting, bullets, or special characters. {{truncatedNote}}

ANALYST NOTES:
{{data}}

USER QUESTION: {{userQuery}}`
};

/**
 * Build prompt using template replacement
 */
function buildPrompt(template, query, dataSummary, extraReplacements = {}) {
    const replacements = { data: dataSummary, userQuery: query, ...extraReplacements };
    return template.replace(/{{(.*?)}}/g, (_, key) => {
        const token = key.trim();
        return Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : '';
    });
}

/**
 * Estimate tokens using the modern approach (text.length / 4)
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens using the legacy approach (text.length * 0.35)
 */
function estimateTokensLegacy(text) {
    if (!text) return 0;
    return Math.ceil(text.length * TOKENS_PER_CHAR_ESTIMATE_LEGACY);
}

/**
 * Compress dataset similar to the original compressDataset function
 */
function compressDataset(data) {
    return data.map(record => ({
        b: record.behavior,
        t: record.timestamp,
        c: record.coordinates,
        i: record.id,
        cl: record.cluster,
        a: record.activity
    }));
}

/**
 * Simulate chunking logic from splitFeaturesForRawMode
 */
function simulateChunking(data) {
    const compressed = compressDataset(data);
    const fullDataString = JSON.stringify(compressed, null, 2);
    
    // If data fits in single request
    if (fullDataString.length <= RAW_SINGLE_REQUEST_CHAR_LIMIT) {
        return {
            chunks: [fullDataString],
            isSingleRequest: true,
            totalChars: fullDataString.length
        };
    }
    
    // Simulate chunking (simplified version)
    const chunkSize = Math.floor(RAW_SINGLE_REQUEST_CHAR_LIMIT * 0.8); // 80% of limit for safety
    const chunks = [];
    let currentPos = 0;
    
    while (currentPos < fullDataString.length) {
        const chunk = fullDataString.substring(currentPos, currentPos + chunkSize);
        chunks.push(chunk);
        currentPos += chunkSize;
    }
    
    return {
        chunks: chunks,
        isSingleRequest: false,
        totalChars: fullDataString.length
    };
}

/**
 * Calculate tokens for a single question in raw mode
 */
function calculateTokensForQuestion(question, busData) {
    const results = {
        questionId: question.id,
        question: question.question,
        tokenCalculations: []
    };
    
    // Simulate the chunking behavior
    const chunkingResult = simulateChunking(busData);
    
    if (chunkingResult.isSingleRequest) {
        // Single request mode
        const prompt = buildPrompt(promptTemplates.raw, question.question, chunkingResult.chunks[0]);
        const tokenCount = estimateTokens(prompt);
        const tokenCountLegacy = estimateTokensLegacy(prompt);
        
        results.tokenCalculations.push({
            type: 'single-request',
            promptText: prompt,
            promptLength: prompt.length,
            estimatedTokens: tokenCount,
            estimatedTokensLegacy: tokenCountLegacy,
            dataSize: chunkingResult.totalChars
        });
        
        results.totalTokens = tokenCount;
        results.totalTokensLegacy = tokenCountLegacy;
        
    } else {
        // Multi-chunk mode
        let totalTokens = 0;
        let totalTokensLegacy = 0;
        
        // Calculate tokens for each chunk
        chunkingResult.chunks.forEach((chunk, index) => {
            const chunkPrompt = buildPrompt(promptTemplates.rawChunk, question.question, chunk, {
                chunkIndex: index + 1,
                totalChunks: chunkingResult.chunks.length
            });
            
            const chunkTokens = estimateTokens(chunkPrompt);
            const chunkTokensLegacy = estimateTokensLegacy(chunkPrompt);
            
            results.tokenCalculations.push({
                type: `chunk-${index + 1}`,
                promptText: chunkPrompt.substring(0, 200) + '...', // Truncate for display
                promptLength: chunkPrompt.length,
                estimatedTokens: chunkTokens,
                estimatedTokensLegacy: chunkTokensLegacy,
                dataSize: chunk.length
            });
            
            totalTokens += chunkTokens;
            totalTokensLegacy += chunkTokensLegacy;
        });
        
        // Add final synthesis prompt tokens
        const mockAnalystNotes = chunkingResult.chunks.map((_, i) => `Chunk ${i + 1} analysis notes...`).join('\n\n');
        const finalPrompt = buildPrompt(promptTemplates.rawFinal, question.question, mockAnalystNotes, {
            chunkCount: chunkingResult.chunks.length,
            truncatedNote: ''
        });
        
        const finalTokens = estimateTokens(finalPrompt);
        const finalTokensLegacy = estimateTokensLegacy(finalPrompt);
        
        results.tokenCalculations.push({
            type: 'final-synthesis',
            promptText: finalPrompt.substring(0, 200) + '...', // Truncate for display
            promptLength: finalPrompt.length,
            estimatedTokens: finalTokens,
            estimatedTokensLegacy: finalTokensLegacy,
            dataSize: mockAnalystNotes.length
        });
        
        totalTokens += finalTokens;
        totalTokensLegacy += finalTokensLegacy;
        
        results.totalTokens = totalTokens;
        results.totalTokensLegacy = totalTokensLegacy;
        results.chunkCount = chunkingResult.chunks.length;
    }
    
    return results;
}

/**
 * Load bus data from CSV file
 */
function loadBusData() {
    try {
        const csvPath = path.join(__dirname, 'bus_data.csv');
        if (!fs.existsSync(csvPath)) {
            console.warn('⚠️  bus_data.csv not found. Using simulated data.');
            return generateSimulatedData();
        }
        
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        
        const data = lines.slice(1).map((line, index) => {
            const values = line.split(',');
            return {
                id: index,
                timestamp: values[0] || `2024-10-24T${String(8 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00Z`,
                behavior: values[1] || ['Moderate', 'Aggressive', 'Calm'][index % 3],
                coordinates: values[2] ? JSON.parse(values[2]) : [Math.random() * 0.01 + 33.775, Math.random() * 0.01 - 84.39],
                cluster: values[3] || `Cluster_${index % 5}`,
                activity: values[4] || ['Moving', 'Stopped', 'Turning'][index % 3]
            };
        });
        
        console.log(`✅ Loaded ${data.length} records from bus_data.csv`);
        return data;
        
    } catch (error) {
        console.warn(`⚠️  Error loading bus_data.csv: ${error.message}. Using simulated data.`);
        return generateSimulatedData();
    }
}

/**
 * Generate simulated bus data for demonstration
 */
function generateSimulatedData(recordCount = 1000) {
    console.log(`📊 Generating ${recordCount} simulated bus telemetry records...`);
    
    const behaviors = ['Moderate', 'Aggressive', 'Calm'];
    const activities = ['Moving', 'Stopped', 'Turning', 'Accelerating', 'Braking'];
    const clusters = ['Klaus_Area', 'Student_Center', 'Tech_Square', 'CRC_Zone', 'Library_Quad'];
    
    const data = [];
    const baseTime = new Date('2024-10-24T08:00:00Z');
    
    for (let i = 0; i < recordCount; i++) {
        const timestamp = new Date(baseTime.getTime() + i * 30000); // 30 second intervals
        data.push({
            id: i,
            timestamp: timestamp.toISOString(),
            behavior: behaviors[i % behaviors.length],
            coordinates: [
                33.775 + (Math.random() - 0.5) * 0.02, // Latitude around GT campus
                -84.39 + (Math.random() - 0.5) * 0.02   // Longitude around GT campus
            ],
            cluster: clusters[i % clusters.length],
            activity: activities[i % activities.length]
        });
    }
    
    return data;
}

/**
 * Export results to JSON file
 */
function exportResults(results) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `raw_mode_token_analysis_${timestamp}.json`;
    
    const exportData = {
        metadata: {
            analysisDate: new Date().toISOString(),
            questionsAnalyzed: results.length,
            tokenEstimationMethod: 'text.length / 4 (modern) and text.length * 0.35 (legacy)',
            description: 'Token usage analysis for raw mode benchmark questions'
        },
        summary: {
            totalTokensModern: results.reduce((sum, r) => sum + r.totalTokens, 0),
            totalTokensLegacy: results.reduce((sum, r) => sum + r.totalTokensLegacy, 0),
            averageTokensPerQuestion: Math.round(results.reduce((sum, r) => sum + r.totalTokens, 0) / results.length),
            questions: results.map(r => ({
                id: r.questionId,
                question: r.question,
                totalTokens: r.totalTokens,
                totalTokensLegacy: r.totalTokensLegacy,
                requestType: r.chunkCount ? 'multi-chunk' : 'single-request',
                chunkCount: r.chunkCount || 1
            }))
        },
        detailedResults: results
    };
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n📄 Detailed results exported to: ${filename}`);
    return filename;
}

/**
 * Main execution function
 */
function main() {
    console.log('🚀 Raw Mode Token Calculator for Sting Sense Bus Analytics');
    console.log('=' .repeat(65));
    
    // Load bus data
    const busData = loadBusData();
    console.log(`📊 Dataset size: ${busData.length} records`);
    console.log(`📊 Estimated dataset size: ${JSON.stringify(busData).length} characters\n`);
    
    // Calculate tokens for each benchmark question
    const results = [];
    
    benchmarkQuestions.forEach((question, index) => {
        console.log(`[${index + 1}/5] Analyzing: "${question.question}"`);
        const result = calculateTokensForQuestion(question, busData);
        results.push(result);
        
        console.log(`   Token estimate (modern): ${result.totalTokens.toLocaleString()}`);
        console.log(`   Token estimate (legacy): ${result.totalTokensLegacy.toLocaleString()}`);
        if (result.chunkCount) {
            console.log(`   Request type: Multi-chunk (${result.chunkCount} chunks + 1 synthesis)`);
        } else {
            console.log(`   Request type: Single request`);
        }
        console.log('');
    });
    
    // Summary
    console.log('📊 SUMMARY STATISTICS');
    console.log('-'.repeat(50));
    
    const totalTokensModern = results.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalTokensLegacy = results.reduce((sum, r) => sum + r.totalTokensLegacy, 0);
    const avgTokensModern = Math.round(totalTokensModern / results.length);
    const avgTokensLegacy = Math.round(totalTokensLegacy / results.length);
    
    console.log(`Total tokens (modern method): ${totalTokensModern.toLocaleString()}`);
    console.log(`Total tokens (legacy method): ${totalTokensLegacy.toLocaleString()}`);
    console.log(`Average per question (modern): ${avgTokensModern.toLocaleString()}`);
    console.log(`Average per question (legacy): ${avgTokensLegacy.toLocaleString()}`);
    console.log(`Token estimation difference: ${((totalTokensModern - totalTokensLegacy) / totalTokensLegacy * 100).toFixed(1)}%`);
    
    // Cost estimation (using rates from the original system)
    const costModern = (totalTokensModern / 1_000_000) * 0.11; // $0.11 per 1M input tokens
    const costLegacy = (totalTokensLegacy / 1_000_000) * 0.11;
    
    console.log(`\n💰 COST ESTIMATION`);
    console.log('-'.repeat(50));
    console.log(`Estimated cost (modern): $${costModern.toFixed(6)}`);
    console.log(`Estimated cost (legacy): $${costLegacy.toFixed(6)}`);
    
    // Export detailed results
    const exportFile = exportResults(results);
    
    console.log(`\n✅ Analysis complete! ${results.length} questions analyzed.`);
    console.log(`📁 Results saved to: ${exportFile}`);
}

// Run the analysis
if (require.main === module) {
    main();
}

module.exports = {
    calculateTokensForQuestion,
    benchmarkQuestions,
    estimateTokens,
    estimateTokensLegacy
};