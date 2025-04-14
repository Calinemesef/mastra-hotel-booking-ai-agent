### Project Architecture
This project follows a modular architecture that separates concerns into distinct components, enhancing maintainability and scalability. At its core, the application utilizes a service-oriented approach, where various tools handle specific functionalities such as hotel search, booking management, and error handling. The tools interact with external APIs to fetch and manipulate data, while a centralized error handling mechanism ensures robust error reporting and management. The project is built using TypeScript, providing type safety and improved developer experience, and employs Jest for unit testing to ensure code reliability.


### Setup
**1** git clone
**2** cd hotel-booking-agent && npm install
**3** npm run


### Example conversations
**1** Find me a hotel in Bucharest, Romania
**2** I want to book a hotel in London. Show me some options.
**3** I want to book a hotel from 22.05.2025 to 27.05.2025. The Hotel has to be in Bucharest, Romania. Can you help me find some availabe options?