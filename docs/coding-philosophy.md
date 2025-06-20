# Master Prompt Template: Composable Components

## How to Use This Template

1. **Choose your components** based on what the exercise needs
2. **Copy only the relevant sections** to keep prompts lean
3. **Combine with exercise-specific instructions**
4. **Add exercise context** at the end

---

## Component A: Core Development Concepts

```
### Development Concepts

**ADD (Asshole Driven Development)** - A pair programming technique based on extreme Test-Driven Development where:
- Person A writes the simplest possible test that could fail (often absurdly simple like "function exists")
- Person B implements the absolute minimum code to make it pass (even hard-coding the expected result)
- Person B then writes the next simplest test that forces Person A to generalize
- Partners alternate roles, being "assholes" by forcing each other to handle cases incrementally
- Example: Test 1: "should exist" → Implementation: `const add = null`
- Based on article by Jade Meskill about making TDD fun and forcing truly incremental development

**TDD (Test-Driven Development)** - Writing tests before code:
- Red: Write a failing test
- Green: Write minimal code to pass
- Refactor: Improve code while keeping tests green

**Arrange-Act-Assert** - Test structure pattern:
- Arrange: Set up test data and environment
- Act: Execute the function being tested
- Assert: Verify the expected outcome
```

---

## Component B: TPP (Transformation Priority Premise)

```
### TPP (Transformation Priority Premise)

Uncle Bob Martin's concept that code evolves through predictable transformations:
1. {} → nil (no code → return nil/null)
2. nil → constant (return nil → return "constant") 
3. constant → variable (return 42 → return x)
4. variable → array element (return x → return array[0])
5. array element → array iteration (array[0] → for/map)
6. array iteration → conditional (forEach → if statement)
7. conditional → polymorphism (if/else → class hierarchy)

Key insight: "As tests get more specific, code gets more generic"
```

---

## Component C: Technology Stack

```
### Technology Context

**MCP (Model Context Protocol)** - Anthropic's protocol for AI tools:
- Allows AI assistants to interact with external tools and services
- Tools are described in a standardized format
- Can be hosted locally or remotely (e.g., on Cloudflare Workers)

**Cloudflare Workers** - Edge computing platform:
- Serverless functions that run at the edge (close to users)
- 0ms cold starts, global distribution
- One-click deployment from GitHub

**REST/OpenAPI/Hono** - API development stack:
- REST: Simple HTTP-based APIs
- OpenAPI: Markdown-friendly API documentation format
- Hono: Lightweight web framework perfect for Workers
```

---

## Component D: Strategic Business Context

```
### Business Context

I'm building a case for my company to adopt:
1. **Cloudflare Workers** for hosting remote MCP servers (0ms cold starts, global edge)
2. **REST/OpenAPI/Hono** over GraphQL (simpler, AI-friendly, markdown-based)
3. **Micro-repos** over monorepos (team autonomy, faster deployment)
4. **AI-assisted development** using these patterns

Key research findings:
- Developers only spend 24% of time coding (Forrester 2025)
- AI productivity gains require developer autonomy (McKinsey)
- Micro-services enable team ownership and innovation
```

---

## Component E: Mobile Learning Context

```
### Learning Context

I am on a mobile phone during a 6-hour flight. I cannot write code directly but want to explore these concepts through conversation. I have 20+ years of software development experience and want to practice these patterns interactively.
```

---

## Component F: AI Era Productivity Context

```
### AI Era Development Context

Research shows that in 2024-2025:
- Developer productivity with AI tools increases 2x ONLY with autonomy (McKinsey)
- Teams fixing "wrong problems" by adding AI without addressing core issues (DORA Report)
- Microservices and team autonomy are key to AI-assisted development success
- Simple patterns (REST) outperform complex ones (GraphQL) for AI comprehension
```

---

## Composition Examples

### For ADD/TDD Exercise:
- Component A (Core Development)
- Component B (TPP)
- Component E (Mobile Context)

### For MCP Tool Design:
- Component C (Technology)
- Component D (Business)
- Component F (AI Era)

### For Business Case Building:
- Component D (Business)
- Component F (AI Era)
- Skip components A & B

### Minimal Version (after context established):
- Just Component E
- Reference: "Using our established ADD/TPP concepts..."
```# Master Prompt Template: Core Definitions for All Exercises

Copy this section at the beginning of any exercise prompt to provide full context:

```
## Context and Definitions

You are helping me learn and practice software development concepts during a 6-hour flight where I only have my mobile phone. I cannot write code directly but want to explore these concepts through conversation.

### Core Concepts:

**ADD (Asshole Driven Development)** - A pair programming technique based on extreme Test-Driven Development where:
- Person A writes the simplest possible test that could fail (often absurdly simple like "function exists")
- Person B implements the absolute minimum code to make it pass (even hard-coding the expected result)
- Person B then writes the next simplest test that forces Person A to generalize
- Partners alternate roles, being "assholes" by forcing each other to handle cases incrementally
- Example: Test 1: "should exist" → Implementation: `const add = null`
- Based on article by Jade Meskill about making TDD fun and forcing truly incremental development

**TDD (Test-Driven Development)** - Writing tests before code:
- Red: Write a failing test
- Green: Write minimal code to pass
- Refactor: Improve code while keeping tests green

**TPP (Transformation Priority Premise)** - Uncle Bob Martin's concept that code evolves through predictable transformations:
1. {} → nil (no code → return nil/null)
2. nil → constant (return nil → return "constant") 
3. constant → variable (return 42 → return x)
4. variable → array element (return x → return array[0])
5. array element → array iteration (array[0] → for/map)
6. array iteration → conditional (forEach → if statement)
7. conditional → polymorphism (if/else → class hierarchy)
Key insight: "As tests get more specific, code gets more generic"

**Arrange-Act-Assert** - Test structure pattern:
- Arrange: Set up test data and environment
- Act: Execute the function being tested
- Assert: Verify the expected outcome
- Example:
  ```javascript
  test('should calculate discount', () => {
    // Arrange
    const price = 100;
    const discountPercent = 20;
    
    // Act
    const result = calculateDiscount(price, discountPercent);
    
    // Assert
    expect(result).toBe(80);
  });
  ```

**MCP (Model Context Protocol)** - Anthropic's protocol for AI tools:
- Allows AI assistants to interact with external tools and services
- Tools are described in a standardized format
- Can be hosted locally or remotely (e.g., on Cloudflare Workers)
- Enables AI to perform actions beyond conversation

**Cloudflare Workers** - Edge computing platform:
- Serverless functions that run at the edge (close to users)
- 0ms cold starts, global distribution
- Ideal for hosting MCP servers and APIs
- Supports one-click deployment from GitHub

**My Strategic Goals**:
1. Automate ADD/TDD/TPP practices - having an AI agent play both roles (A and B) in ping-pong pairing
2. Build a case for my company to adopt Cloudflare Workers for hosting remote MCP servers
3. Advocate for REST/OpenAPI/Hono over GraphQL (both MCP and OpenAPI use markdown-friendly formats)
4. Promote micro-repos (one service per repo) over monorepos for developer autonomy and culture

**Current Context**: I have 20+ years of software development experience, a CS master's degree, and deep expertise in ADD/TDD/TPP. I've successfully used these practices manually and now want to explore how AI tools like Claude Code can automate the ping-pong pairing process, with AI taking on both developer roles alternately.