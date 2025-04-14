import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';

import { hotelBookingAgent } from './agents';

export const mastra = new Mastra({
  agents: { hotelBookingAgent },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
