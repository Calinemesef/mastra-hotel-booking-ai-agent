import { hotelBookingAgent } from './mastra/agents';
import * as dotenv from 'dotenv';

// Load environment variables from .env.development
dotenv.config({ path: '.env.development' });

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required in .env.development');
}
if (!process.env.LITEAPI_KEY) {
  throw new Error('LITEAPI_KEY is required in .env.development');
}

async function testHotelBookingAgent() {
  try {
    // Test the agent with a simple query
    const response = await hotelBookingAgent.generate(
      "I'm looking for a hotel in New York for 2 adults from 2024-05-01 to 2024-05-05"
    );
    console.log('Agent Response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

testHotelBookingAgent(); 