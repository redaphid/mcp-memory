/**
 * Example Slack Bot Worker that uses MCP Memory for project knowledge
 * This would be deployed as a separate Cloudflare Worker
 */

export interface Env {
  MEMORY_URL: string; // Your MCP Memory server URL
  AI: any; // Cloudflare AI binding
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
}

interface SlackEvent {
  type: string;
  text: string;
  user: string;
  channel: string;
  ts: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Verify Slack request (simplified - add proper verification in production)
    const body = await request.json() as any;
    
    if (body.type === 'url_verification') {
      return new Response(body.challenge);
    }
    
    if (body.event && body.event.type === 'app_mention') {
      // Process the mention asynchronously
      const event = body.event as SlackEvent;
      
      // Extract project name from channel or message
      const project = extractProjectName(event.channel, event.text);
      
      if (project) {
        const response = await handleProjectQuery(event, project, env);
        await postToSlack(event.channel, response, env);
      }
      
      return new Response('ok');
    }
    
    return new Response('ok');
  }
};

async function handleProjectQuery(event: SlackEvent, project: string, env: Env): Promise<string> {
  try {
    // Search project memories
    const searchResponse = await fetch(`${env.MEMORY_URL}/search/project/${project}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: event.text
      })
    });
    
    if (!searchResponse.ok) {
      return `I couldn't find any information about project ${project}.`;
    }
    
    const { memories } = await searchResponse.json();
    
    if (!memories || memories.length === 0) {
      return `I don't have any stored knowledge about that topic in project ${project}.`;
    }
    
    // Build context from memories
    const context = memories
      .slice(0, 5) // Top 5 most relevant
      .map((m: any) => m.content)
      .join('\n\n');
    
    // Generate response using AI
    const prompt = `Based on the following project knowledge, answer the user's question.
    
Project: ${project}
Question: ${event.text}

Relevant Knowledge:
${context}

Answer:`;
    
    const aiResponse = await env.AI.run('@cf/meta/llama-2-7b-chat', {
      prompt,
      max_tokens: 500
    });
    
    return aiResponse.response || "I couldn't generate a response.";
    
  } catch (error) {
    console.error('Error handling project query:', error);
    return `Sorry, I encountered an error while searching project ${project} knowledge.`;
  }
}

function extractProjectName(channel: string, text: string): string | null {
  // Example: Look for "project:name" in message
  const projectMatch = text.match(/project:(\S+)/);
  if (projectMatch) {
    return projectMatch[1];
  }
  
  // Or map channels to projects
  const channelToProject: Record<string, string> = {
    'C1234567890': 'frontend-app',
    'C0987654321': 'backend-api',
    // Add your channel mappings
  };
  
  return channelToProject[channel] || null;
}

async function postToSlack(channel: string, text: string, env: Env): Promise<void> {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel,
      text
    })
  });
}

/**
 * Alternative: Durable Object for stateful conversations
 */
export class SlackBotDO {
  private state: DurableObjectState;
  private env: Env;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request: Request): Promise<Response> {
    // Handle conversation state, multi-turn queries, etc.
    return new Response('ok');
  }
  
  async searchAcrossProjects(query: string, projects: string[]): Promise<any[]> {
    // Search multiple project namespaces
    const searchPromises = projects.map(project =>
      fetch(`${this.env.MEMORY_URL}/search/project/${project}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      }).then(r => r.json())
    );
    
    const results = await Promise.all(searchPromises);
    
    // Merge and rank results from all projects
    const allMemories = results
      .flatMap((r, i) => r.memories?.map((m: any) => ({ ...m, project: projects[i] })) || [])
      .sort((a, b) => b.score - a.score);
    
    return allMemories;
  }
}
