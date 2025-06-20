# Claude Code Prompts for TPP Tracking & ADD Development

## Core TPP Tracking Prompt

```
You are an expert in Test-Driven Development using the Transformation Priority Premise (TPP) and Asshole Driven Development (ADD). 

TPP stages in order:
1. {} → nil (no code → return nil/null)
2. nil → constant (return nil → return "constant")
3. constant → variable (return 42 → return x)
4. variable → array element (return x → return array[0])
5. array element → array iteration (array[0] → for/map/forEach)
6. array iteration → conditional (forEach → if statement)
7. conditional → polymorphism (if/else → class hierarchy)

For any code I show you:
1. Identify the current TPP stage
2. Show what test would drive the next transformation
3. Show the minimal code change to make that test pass
4. Explain why this transformation follows TPP

Current code:
[PASTE CODE HERE]

Current tests:
[PASTE TESTS HERE]
```

## ADD Ping-Pong Session Prompt

```
Let's do ADD (Asshole Driven Development) ping-pong pairing. Rules:
- Person A writes the simplest possible test that could fail
- Person B writes the simplest possible code to make it pass (even hard-coding the answer)
- Person B then writes the next simplest failing test
- Continue alternating

I'll play Person A first. You be Person B.

Target: We're building [DESCRIBE WHAT YOU'RE BUILDING]

Test 1:
```javascript
test('should exist', () => {
  expect(functionName).toBeDefined();
});
```

Your turn: Implement the minimal solution, then write Test 2.
```

## Automated Test Generation Prompt

```
Analyze this code and generate a comprehensive test suite following ADD principles.

Rules:
1. Start with the absolute simplest test (existence)
2. Each test should force only ONE small change
3. Follow TPP stages - tests get more specific, code gets more generic
4. Include edge cases only after basic functionality
5. Number each test with its TPP stage

Generate exactly 10 tests that would drive this code from nothing to its current state.

Code to analyze:
[PASTE CODE HERE]

Format each test as:
Test N (TPP Stage: stage_name):
```javascript
test('description', () => {
  // test code
});
```
```

## Interactive TPP Analysis Prompt

```
I'm going to paste code and tests. For each test-code pair, you will:

1. Identify the TPP transformation that occurred
2. Rate if it followed TPP principles (1-10)
3. Suggest a better path if score < 8
4. Predict the next logical test

This helps me learn TPP patterns.

Test 1:
[PASTE TEST]

Code after Test 1:
[PASTE CODE]

Analyze this transformation.
```

## MCP Memory Integration Prompt

```
I have an MCP Memory server that stores text with vector embeddings. Help me extend it to track TPP transformations.

Current capability: store_memory(text, userId) and retrieve_memory(query, userId)

I want to:
1. Store each test-code transformation pair
2. Track which TPP stage each transformation represents
3. Query for similar transformations when writing new code
4. Build a library of transformation patterns

For any code I show you:
1. Format it as a transformation memory entry
2. Generate appropriate tags and metadata
3. Suggest how to query for similar patterns

Current transformation:
Before: [PASTE BEFORE CODE]
Test: [PASTE TEST THAT DROVE CHANGE]
After: [PASTE AFTER CODE]
```

## Quick TPP Stage Identifier

```
What TPP stage is this code at? Just give me the stage name and a one-line explanation.

Code:
[PASTE CODE]
```

## Reverse Engineering Tests Prompt

```
This code exists but has no tests. Generate the ADD sequence that WOULD HAVE created this code, starting from nothing.

Show each round:
- Test that would have been written
- Minimal implementation
- Why this follows ADD/TPP

Final code:
[PASTE CODE]

Work backwards to show the ADD journey.
```

## Pattern Library Builder

```
I'm building a library of TPP transformations. For this code change:

1. Name the pattern (e.g., "constant_to_lookup_table")
2. Generalize it (what's the abstract transformation?)
3. Show 3 other examples of this same pattern
4. Create a memory entry I can store in my MCP

Before: [PASTE]
After: [PASTE]
Test that drove it: [PASTE]
```

## Claude Code Workflow Commands

### Command 1: Start ADD Session
```
/add-session functionName goal

Starts an ADD ping-pong session. I'll be Person A first, write the simplest test for functionName to achieve goal.
```

### Command 2: Analyze TPP Stage
```
/tpp-stage

Look at the current file and identify its TPP stage. Suggest next transformation.
```

### Command 3: Generate Test Sequence
```
/generate-add-tests 

Create a sequence of 10 tests following ADD principles for the selected code.
```

### Command 4: Track Transformation
```
/track-transformation

Compare current file with git history, identify the TPP transformation that occurred, and format for MCP Memory storage.
```

## Power User Tip: Prompt Chaining

Create a `.claude-code` directory in your project with these prompts as templates:

```bash
.claude-code/
├── add-session.md
├── tpp-analyze.md
├── generate-tests.md
└── track-transformation.md
```

Then in Claude Code:
```
@.claude-code/tpp-analyze.md analyze the selected function
```

This makes it easy to reuse prompts across your codebase!

## Example Session

```
You: Let's do ADD for a function that calculates fibonacci numbers

Claude: I'll be Person B. You wrote:

test('should exist', () => {
  expect(fibonacci).toBeDefined();
});

My minimal implementation:
```javascript
const fibonacci = null;
```

Test 2 (my turn as Person A):
```javascript
test('should be a function', () => {
  expect(typeof fibonacci).toBe('function');
});
```

You: [implements: const fibonacci = () => {}]

[Continue ping-ponging...]
```

## MCP Memory Integration

Once you have transformations, store them:

```
Store this TPP transformation:
- Stage: constant_to_variable  
- Pattern: "hardcoded return → parameter-based return"
- Test: "should return different values for different inputs"
- Before: return 42;
- After: return n;
- Tags: ["fibonacci", "tpp", "stage-3"]
```