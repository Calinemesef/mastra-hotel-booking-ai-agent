# AI Coding Assistant Usage Log
## Assistant Used
- Primary: Cursor IDE with Claude-Sonnet 3.5/3.7 LLMs for Agent Development
- gpt-4o at the beginning, for project/mastra setup



## Key Interactions
### 1. Initial Project Setup
**Task:** Setting up Mastra MCP server
**Prompt Used:** Fix the MCP server configuration from mcp.json in order to be able to use Mastra
**Output Quality:** Good for a first prompt, Completed 50% of the Task 
**Modifications Made:** Ran all the terminal commands myself, since Cursor coudln't do that properly
**Time Saved:** 1h


### 2. Hotel Booking Agent Implementation
**Task:** Setup Phase - new Agent from scratch
**Prompt Used:** Instead of being a weather assistant, I want you to be a Hotel Booking Asistant. You should use LiteAPI's travel API in order to be able to help users search for and book hotels through national language conversation. Also display your execution plan for this task.
**Challenge:** - get it to compile afterwards, lots of fine-tunings needed
**Output Quality:** +80%, very satisfied&impressed with the API integration


**Task:** Agent Development
**Prompt Used:** The agent should be able to: ..
**Time Saved** none, this step should have been skipped in my opinion since it only slowed done the next task, which needed lots of refactorings
**Output Quality:** 0%, my mistake for trying to help him manually more than needed


**Task:** API Integration
**Prompt Used:** Given the following list of technical requirements for this Agent, implement each one of them using the appropriate Mastra tool structure.
**Challenge:** Rewrite the PDF with only the requirements/functionalities that are important to the agent, and prompt them accordingly; Find the correct API Endpoints documentation from LiteAPI, which Cursor can actually access..
**Time Saved:** ? -
**Output Quality:** Seemed perfect at first glance, after testing the Agent i.e. talking to him, noticed none of the endpoint calls were actually working. ONLY started working properly once I provided him the OpenAPI/Swagger specifications, only then he could implement the API endpoint calls correctly. Probably the most time-consuming task


**Task:** State Management
**Prompt Used:** Improve the agent by maintaining context about the ongoing conversation.
**Time Saved:** ? -
**Output Quality:** Noticed only after implementing the Agent and testing it, that he does not store/remember any previous informations at all. Revamp needed. Lots of modifications. Time consuming


**Task:** Custom Error handling
**Prompt Used:** What else could be done regarding the error handling aspect of this Agent?
**Output Quality** Very satisfied, AI provided comprehensive error handling strategy, both technical and business-wise


**Task:** Testing
**Prompt:** Write some comprehensive tests that should cover all the core functionalities of this Agent as good as possible.


**Task:** Final touches & Polishing
**Prompts** Would you say the agent is currently fully covered regarding the error handling aspect?
**Prompts** Improve API Key validation
**Prompts** Take a look at the current test class and check whether there are uncovered functionalities of the Agent.
**Prompts** There are a lot of compilation errors right now. This is possibly due to your last modifications. Take a look and each one of them and fix it accordingly.



## Learning Points
### What worked well with the AI
**MCP Server debugging** - Several problems with Mastras MCP server initially, AI had correct guesses
**Agent development debugging** - Cursor/Sonnet3.5 has pretty good understanding of Mastra doc, calls the MCP everytime when needed
**Testing** - Testing & Test debugging seem to work once the main code is clean and functional
**Core Requirements Analysis** - AI could interpret the core requirements from the pdf file, make a list with the missing/incomplete functionalities, and also implement the TODOs that were left.
**Agent Tool structure** - implemented a tool structure which provides a complete booking flow, with a tool for each core functionality of the agent
**PDF interpretation** - with little changes&rephrasings, could understand what was needed to do without huge modifications and further explanations from me

### What didn't work well
**Terminal usage** - Terminal commands needed to be ran manually, Cursors built-in features seem to not work properly
**API integration** - Seemd flawless at first, integrated all the needed APIs from LiteAPI in its tool structure without almost any refactoring needed, but after testing/talking to the Agent I noticed none of the API calls where actually implemented correctly.
**Auxiliary project setup problems due to VPN/Zscaler certs** - not project-specific, just own local setup/networking problems that Cursor couldn't handle itself
**AI installed dependencies** - Manually installing dependencies/modules worked better than letting AI do them automatically
**Npm cache update** - some forced manual cache deletion & update were necessary every now and then, AI could not handle compiling errors properly, due to incorrect dependencies
**Mastra output folder** - Compiled & bundled app directory needed manual deletion on certain problems.

### How you adapted your prompting
**Prompt length** - Clear, concise sentences with no extra useless words that imitate human interaction.
**Multi sentence** - Each task in its own short sentence, no long phrases to be decyphered.
**Consistent check-up** - After every 2-3 prompts executed, ask him to take a look at the whole implementation again and fix any ocurred potential problems/ compiling errors, rather than force him fix them all at the end.
**Debugging/Fixing** - Let AI fix itself, do not manually fix its compiling errors since this would probably just slow down its refactoring phase.
**(Compilation) ERRORS FIRST** - Have him fix any error (compilation, dependency, deployment) as soon as possible, delaying this & continuing with the development makes it way harder at the end. 
**Self prompting** - Ask him what kind of input/prompt he needs from me in order to fix current errors.



##### Further Observations
**0** UI testing/ actually using the Agent might be the best way to go about testing.

**1** When testing the Agent via UI chat, noticed some gaps in the implementation:
**1.1** The agent is not generating appropriate dates for "this year"
**1.2** Has difficulties in vague prompts like "anywhere", "any location", any star rating", non-specific check-in/check-out dates etc
**1.3** Agent uses past dates when not prompted explicit dates from the future
**1.4** Fortunately, after displaying him these gaps, he was able to implement these use-cases on its own.

**2** After testing the Agent in natural language myself, came to the conclusion that the best way of implementing such Assistants/Agents would probably be:
**2.1** A simple, small version of a functional Agent to start with
**2.2** Extension of its functionalities through direct use of/conversation with the Agent, and see exactly what the real-life use-cases are, where he struggles, instead of trying to implement all its functionalities first, and test him only after.
**2.3** After noticing lacking points, prompt him with these use-cases and ask him to extend its functionalities on its own accordingly.
**2.4** Non-explicit use-cases seem to be a general problem -> require several "defaults" in order to be able to treat each non-exact use-case without crashing.
**2.5** In the same manner, parameters which are sent to external API endpoints should be sanitized first, as good as possible

**3** In general, the more vague/unprecise you are with your prompt/requirements, the higher the chances are, that the Agent will fail trying to respond appropriately to your requirement.

**4** API Integration works best when providing him the OpenAPI/Swagger specification. Anything else seemed to be problematic for him to understand.

**5** Lots of refactorings/revamps needed for each Tool. Main problems: API integration, State management, Error handling. Main cause: vague, non-specific prompts.

**6** Lots of use-cases/edge-cases need to be taken into consideration on implementation, a fully functional agent implementation that can handle any request seems not possible in 1-2h currently, based on this being my only experience with this framework so far. However, still impressive what an Agent that was implemented in a couple hours from scratch can do.