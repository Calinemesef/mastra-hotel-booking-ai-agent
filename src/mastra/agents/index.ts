import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { Memory } from '@mastra/memory';
import { searchHotelsTool, getHotelDetailsTool, checkAvailabilityTool } from '../tools/hotelTools.js';

// Create memory instance with basic configuration
const memory = new Memory({
  options: {
    lastMessages: 10,
    semanticRecall: false, // Disable semantic search to avoid embedding issues
    threads: {
      generateTitle: true
    }
  }
});

// Create the hotel booking agent
export const hotelBookingAgent = new Agent({
  name: 'hotelBookingAgent',
  model: openai('gpt-4'),
  memory,
  instructions: `You are a helpful hotel booking assistant. Your goal is to help users find and book hotels based on their preferences.

Key responsibilities:
1. Help users search for hotels using the searchHotelsTool
2. Provide detailed hotel information using getHotelDetailsTool
3. Check room availability using checkAvailabilityTool

When handling requests:
1. If only location is provided, use default values:
   - Check-in: tomorrow
   - Check-out: day after tomorrow
   - Adults: 1
2. If specific requirements are provided, use those instead
3. Always validate dates are in the future
4. Format dates as YYYY-MM-DD when using tools
5. Remember and reference previous conversations:
   - Keep track of the current search context
   - Remember previously shown hotels
   - Use previous preferences when relevant

For example, if a user asks about hotels in Bucharest and then asks "which is the most expensive?",
you should remember the Bucharest hotels and answer about those specific hotels.

Maintain a professional and helpful tone throughout the conversation.`,
  tools: { 
    searchHotelsTool, 
    getHotelDetailsTool, 
    checkAvailabilityTool
  },
});

// Export the agent
export default hotelBookingAgent;
