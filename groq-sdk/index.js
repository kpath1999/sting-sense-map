require('dotenv').config();
const { streamText } = require('ai');

async function main() {
  // AI_GATEWAY_API_KEY is set in Vercel environment variables
  // For local development, set it in your .env file
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('Error: AI_GATEWAY_API_KEY environment variable is not set');
    console.log('Please set it in your .env file or Vercel environment variables');
    process.exit(1);
  }

  console.log('Making request to Vercel AI Gateway with xai/grok-3...\n');

  const result = await streamText({
    model: 'xai/grok-3',
    prompt: 'what is the quality of Georgia tech Stinger buses?',
  });

  // Stream the response to stdout
  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }

  console.log('\n');
  
  // Display token usage information
  const usage = await result.usage;
  const finishReason = await result.finishReason;
  
  console.log('\n--- Metadata ---');
  console.log('Token usage:', usage);
  console.log('Finish reason:', finishReason);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
