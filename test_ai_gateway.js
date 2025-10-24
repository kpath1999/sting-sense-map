#!/usr/bin/env node

/**
 * Test script for Vercel AI Gateway integration
 * Tests the new xai/grok-3 model configuration
 * 
 * Usage: node test_ai_gateway.js
 */

require('dotenv').config();
const { streamText } = require('ai');

async function testAIGateway() {
    console.log('🧪 Testing Vercel AI Gateway Integration');
    console.log('=' .repeat(60));
    
    // Check environment
    if (!process.env.AI_GATEWAY_API_KEY) {
        console.error('❌ AI_GATEWAY_API_KEY not found in environment');
        console.log('\nPlease set it in your .env file:');
        console.log('AI_GATEWAY_API_KEY=your_key_here');
        process.exit(1);
    }
    
    console.log('✅ AI_GATEWAY_API_KEY found');
    console.log(`📋 Key prefix: ${process.env.AI_GATEWAY_API_KEY.substring(0, 10)}...`);
    console.log('');
    
    // Test 1: Simple query
    console.log('Test 1: Simple Query');
    console.log('-'.repeat(60));
    
    const testPrompt = 'Explain in one sentence what makes a good bus route.';
    console.log(`Prompt: "${testPrompt}"`);
    console.log('Model: xai/grok-3');
    console.log('');
    
    try {
        const startTime = Date.now();
        
        const result = await streamText({
            model: 'xai/grok-3',
            prompt: testPrompt,
            maxTokens: 100
        });
        
        console.log('Response:');
        console.log('-'.repeat(60));
        
        let fullResponse = '';
        for await (const textPart of result.textStream) {
            process.stdout.write(textPart);
            fullResponse += textPart;
        }
        
        const endTime = Date.now();
        console.log('\n' + '-'.repeat(60));
        
        const usage = await result.usage;
        const finishReason = await result.finishReason;
        
        console.log('');
        console.log('📊 Metrics:');
        console.log(`   Latency: ${endTime - startTime}ms`);
        console.log(`   Token usage:`, usage);
        console.log(`   Finish reason: ${finishReason}`);
        console.log('');
        console.log('✅ Test 1 PASSED');
        
    } catch (error) {
        console.error('❌ Test 1 FAILED');
        console.error('Error:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
        process.exit(1);
    }
    
    console.log('');
    
    // Test 2: Transportation-specific query (similar to actual use case)
    console.log('Test 2: Transportation Query (Actual Use Case)');
    console.log('-'.repeat(60));
    
    const transportPrompt = `You are a transportation analyst. Given the following bus behavior data, summarize the key safety concerns in plain text with no markdown formatting:

DATA: Bus showed aggressive driving near Student Center at 10:30 AM with hard braking events (3 occurrences). Moderate driving observed near Klaus building.

USER QUESTION: What are the main safety concerns?`;
    
    console.log('Testing prompt format used by application...');
    console.log('');
    
    try {
        const startTime = Date.now();
        
        const result = await streamText({
            model: 'xai/grok-3',
            prompt: transportPrompt,
            maxTokens: 200
        });
        
        console.log('Response:');
        console.log('-'.repeat(60));
        
        let fullResponse = '';
        for await (const textPart of result.textStream) {
            process.stdout.write(textPart);
            fullResponse += textPart;
        }
        
        const endTime = Date.now();
        console.log('\n' + '-'.repeat(60));
        
        const usage = await result.usage;
        const finishReason = await result.finishReason;
        
        console.log('');
        console.log('📊 Metrics:');
        console.log(`   Latency: ${endTime - startTime}ms`);
        console.log(`   Token usage:`, usage);
        console.log(`   Finish reason: ${finishReason}`);
        console.log('');
        console.log('✅ Test 2 PASSED');
        
    } catch (error) {
        console.error('❌ Test 2 FAILED');
        console.error('Error:', error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
        process.exit(1);
    }
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('🎉 All tests PASSED! AI Gateway is working correctly.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start your server: npm start');
    console.log('  2. Visit http://localhost:3000');
    console.log('  3. Test the query interface');
    console.log('=' .repeat(60));
}

// Run the tests
testAIGateway().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
