// Global state
let userUuid = localStorage.getItem("mcpUserUuid");
let selectedNamespaces = new Set();
let currentPage = 1;
let currentTab = 'recent';
let wishesRemaining = 3;
let searchResults = null;
let isOracleActive = false;

// Initialize UUID
if (!userUuid) {
  userUuid = crypto.randomUUID ? crypto.randomUUID() : 
    `cursed-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem("mcpUserUuid", userUuid);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Update SSE URL
  const sseUrlInput = document.getElementById("sse-url");
  const currentOrigin = window.location.origin;
  const sseUrl = `${currentOrigin}/user/${userUuid}/sse`;
  sseUrlInput.value = sseUrl;
  
  // Copy button functionality
  document.getElementById("copy-button").addEventListener("click", () => {
    navigator.clipboard.writeText(sseUrl).then(() => {
      showFortune("The pact is sealed... Your soul is bound to the Oracle.");
      const btn = document.getElementById("copy-button");
      btn.textContent = "✓ Pact Sealed";
      setTimeout(() => { btn.textContent = "📜 Seal Pact"; }, 2000);
    });
  });
  
  // Coin slot functionality
  document.getElementById("insert-coin").addEventListener("click", () => {
    if (!isOracleActive) {
      activateOracle();
    } else {
      showFortune("The Oracle is already awake... Do not anger it further.");
    }
  });
  
  // Select all namespaces
  document.getElementById("select-all-namespaces").addEventListener("click", () => {
    document.querySelectorAll("#namespace-tokens button").forEach(btn => {
      const namespace = btn.dataset.namespace;
      selectedNamespaces.add(namespace);
      btn.classList.remove("opacity-60");
      btn.classList.add("opacity-100", "glow");
    });
  });
  
  // Clear namespaces
  document.getElementById("clear-namespaces").addEventListener("click", () => {
    selectedNamespaces.clear();
    document.querySelectorAll("#namespace-tokens button").forEach(btn => {
      btn.classList.add("opacity-60");
      btn.classList.remove("opacity-100", "glow");
    });
  });
  
  // Oracle consultation
  document.getElementById("consult-oracle").addEventListener("click", consultOracle);
  document.getElementById("oracle-query").addEventListener("keypress", (e) => {
    if (e.key === "Enter") consultOracle();
  });
  
  // Tab functionality
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      switchToTab(btn.dataset.tab);
    });
  });
  
  // Load more button
  document.getElementById("load-more").addEventListener("click", () => {
    currentPage++;
    loadMemories(true);
  });
});

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

function showFortune(message) {
  const fortuneOutput = document.getElementById("fortune-output");
  const fortuneText = document.getElementById("fortune-text");
  
  fortuneText.textContent = message;
  fortuneOutput.classList.remove("hidden");
  
  setTimeout(() => {
    fortuneOutput.classList.add("hidden");
  }, 5000);
}

// Activate the Oracle
function activateOracle() {
  isOracleActive = true;
  
  // Show sections with animation
  document.getElementById("crystal-ball-section").classList.remove("hidden");
  document.getElementById("tabs-section").classList.remove("hidden");
  document.getElementById("memories-display").classList.remove("hidden");
  
  // Shake effect
  document.getElementById("insert-coin").classList.add("shake");
  setTimeout(() => {
    document.getElementById("insert-coin").classList.remove("shake");
  }, 500);
  
  // Load namespaces and memories
  loadNamespaces();
  loadMemories();
  
  showFortune("The Oracle awakens... What forbidden knowledge do you seek?");
}

// Load available namespaces
async function loadNamespaces() {
  try {
    const response = await fetch("/api/namespaces");
    const data = await response.json();
    
    if (data.success) {
      const container = document.getElementById("namespace-tokens");
      container.innerHTML = "";
      
      // Add user namespaces
      data.namespaces.users.forEach(user => {
        addNamespaceToken("user", user, container);
      });
      
      // Add project namespaces
      data.namespaces.projects.forEach(project => {
        addNamespaceToken("project", project, container);
      });
      
      // Add "all" if available
      if (data.namespaces.all) {
        addNamespaceToken("all", "all", container);
      }
      
      // Auto-select current user
      const userToken = document.querySelector(`[data-namespace="user:${userUuid}"]`);
      if (userToken) {
        userToken.click();
      }
    }
  } catch (error) {
    console.error("Failed to load namespaces:", error);
    showFortune("The spirits refuse to reveal the realms...");
  }
}

// Add namespace token
function addNamespaceToken(type, id, container) {
  const token = document.createElement("button");
  token.className = "mystical-token px-4 py-2 rounded-full text-sm font-bold transition-all opacity-60";
  token.dataset.namespace = type === "all" ? "all" : `${type}:${id}`;
  
  const icon = type === "user" ? "👤" : type === "project" ? "📁" : "🌐";
  token.textContent = `${icon} ${id}`;
  
  token.addEventListener("click", () => {
    const namespace = token.dataset.namespace;
    if (selectedNamespaces.has(namespace)) {
      selectedNamespaces.delete(namespace);
      token.classList.add("opacity-60");
      token.classList.remove("opacity-100", "glow");
    } else {
      selectedNamespaces.add(namespace);
      token.classList.remove("opacity-60");
      token.classList.add("opacity-100", "glow");
    }
  });
  
  container.appendChild(token);
}

// Oracle consultation
async function consultOracle() {
  const query = document.getElementById("oracle-query").value.trim();
  if (!query) {
    showFortune("The Oracle demands a question... Do not waste its time.");
    return;
  }
  
  if (selectedNamespaces.size === 0) {
    showFortune("Choose a realm first, mortal... The Oracle cannot see into nothingness.");
    return;
  }
  
  // Decrement wishes
  wishesRemaining--;
  document.querySelector("#wishes-counter .blood-text").textContent = wishesRemaining;
  
  if (wishesRemaining === 0) {
    showFortune("Your wishes are spent... The Oracle grows silent. Refresh to bargain again.");
  }
  
  // Show loading state
  const btn = document.getElementById("consult-oracle");
  btn.textContent = "👁️ Gazing...";
  btn.disabled = true;
  
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        namespaces: Array.from(selectedNamespaces)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      searchResults = data.results;
      switchToTab("search");
      displaySearchResults();
      
      const totalFound = data.results.reduce((sum, r) => sum + r.memories.length, 0);
      showFortune(`The Oracle has found ${totalFound} cursed memories...`);
    }
  } catch (error) {
    console.error("Oracle consultation failed:", error);
    showFortune("The Oracle chokes on your question... Try again, if you dare.");
  } finally {
    btn.textContent = "🔮 Consult";
    btn.disabled = wishesRemaining <= 0;
  }
}

// Tab functionality
function switchToTab(tab) {
  currentTab = tab;
  currentPage = 1;
  
  // Update tab buttons
  document.querySelectorAll(".tab-button").forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.remove("opacity-60");
      btn.classList.add("opacity-100");
    } else {
      btn.classList.add("opacity-60");
      btn.classList.remove("opacity-100");
    }
  });
  
  // Load appropriate content
  if (tab === "recent") {
    loadMemories();
  } else if (tab === "search") {
    displaySearchResults();
  } else if (tab === "browse") {
    loadBrowseView();
  }
}

// Load memories
async function loadMemories(append = false) {
  if (!selectedNamespaces.size) {
    selectedNamespaces.add(`user:${userUuid}`);
  }
  
  const container = document.getElementById("memories-container");
  if (!append) container.innerHTML = '<p class="text-center text-purple-400">The spirits gather your memories...</p>';
  
  try {
    // For recent tab, just load from first selected namespace
    const namespace = Array.from(selectedNamespaces)[0];
    const [type, id] = namespace.includes(':') ? namespace.split(':') : ['all', 'all'];
    
    const response = await fetch(`/${type}/${id}/memories?page=${currentPage}&limit=10`);
    const data = await response.json();
    
    if (data.success) {
      if (!append) container.innerHTML = '';
      
      if (data.memories.length === 0 && currentPage === 1) {
        container.innerHTML = `
          <div class="text-center py-12 text-purple-400">
            <p class="text-2xl mb-4">💀</p>
            <p class="mystical-font text-xl">The void is empty...</p>
            <p class="text-sm mt-2">No memories haunt this realm</p>
          </div>
        `;
      } else {
        data.memories.forEach(memory => {
          container.appendChild(createMemoryCard(memory, namespace));
        });
        
        // Show/hide load more button
        const pagination = document.getElementById("pagination");
        if (data.pagination && data.pagination.page < data.pagination.totalPages) {
          pagination.classList.remove("hidden");
        } else {
          pagination.classList.add("hidden");
        }
      }
    }
  } catch (error) {
    console.error("Failed to load memories:", error);
    container.innerHTML = '<p class="text-center text-red-400">The spirits are angry... They refuse to speak.</p>';
  }
}

// Create memory card
function createMemoryCard(memory, namespace) {
  const card = document.createElement("div");
  card.className = "tarot-card p-4 rounded-lg hover:scale-[1.01] transition-transform";
  
  const date = new Date(memory.created_at);
  const timeAgo = getTimeAgo(date);
  const [type, id] = namespace.includes(':') ? namespace.split(':') : ['all', 'all'];
  
  card.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <div class="flex items-center gap-2">
        <span class="text-purple-400 text-sm">${type === 'user' ? '👤' : '📁'} ${id}</span>
        <span class="text-purple-500 text-xs">•</span>
        <span class="text-purple-500 text-xs">${timeAgo}</span>
      </div>
      <div class="flex gap-2">
        <button onclick="editMemory('${memory.id}')" class="text-purple-400 hover:text-purple-300 text-sm">
          ✏️ Edit
        </button>
        <button onclick="deleteMemory('${memory.id}')" class="text-red-400 hover:text-red-300 text-sm">
          🗑️ Delete
        </button>
      </div>
    </div>
    <p class="text-purple-100 whitespace-pre-wrap">${escapeHtml(memory.content)}</p>
    ${memory.metadata ? `
      <div class="mt-2 text-xs text-purple-400">
        ${Object.entries(memory.metadata).map(([key, value]) => 
          `<span class="inline-block bg-purple-900/30 px-2 py-1 rounded mr-1">${key}: ${value}</span>`
        ).join('')}
      </div>
    ` : ''}
  `;
  
  return card;
}

// Display search results
function displaySearchResults() {
  const container = document.getElementById("memories-container");
  container.innerHTML = '';
  
  if (!searchResults) {
    container.innerHTML = '<p class="text-center text-purple-400">No visions to display...</p>';
    return;
  }
  
  let totalMemories = 0;
  searchResults.forEach(result => {
    if (result.memories.length > 0) {
      const section = document.createElement("div");
      section.className = "mb-6";
      
      section.innerHTML = `
        <h3 class="text-purple-300 font-bold mb-3">
          ${result.namespace === 'all' ? '🌐' : result.namespace.startsWith('user:') ? '👤' : '📁'} 
          ${result.namespace}
        </h3>
      `;
      
      result.memories.forEach(memory => {
        section.appendChild(createMemoryCard(memory, result.namespace));
      });
      
      container.appendChild(section);
      totalMemories += result.memories.length;
    }
  });
  
  if (totalMemories === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-purple-400">
        <p class="text-2xl mb-4">🔮</p>
        <p class="mystical-font text-xl">The Oracle finds nothing...</p>
        <p class="text-sm mt-2">Your query yields no memories</p>
      </div>
    `;
  }
  
  // Hide pagination for search results
  document.getElementById("pagination").classList.add("hidden");
}

// Load browse view
async function loadBrowseView() {
  const container = document.getElementById("memories-container");
  container.innerHTML = '<p class="text-center text-purple-400">Summoning the archives...</p>';
  
  try {
    const allNamespaces = Array.from(document.querySelectorAll("#namespace-tokens button"))
      .map(btn => btn.dataset.namespace);
    
    container.innerHTML = '';
    
    for (const namespace of allNamespaces) {
      const [type, id] = namespace.includes(':') ? namespace.split(':') : ['all', 'all'];
      const response = await fetch(`/${type}/${id}/memories?page=1&limit=5`);
      const data = await response.json();
      
      if (data.success && data.memories.length > 0) {
        const section = document.createElement("div");
        section.className = "mb-8";
        
        section.innerHTML = `
          <h3 class="text-purple-300 font-bold mb-3 text-lg">
            ${type === 'user' ? '👤' : type === 'project' ? '📁' : '🌐'} 
            ${id} 
            <span class="text-sm font-normal text-purple-400">(${data.pagination.total} memories)</span>
          </h3>
        `;
        
        data.memories.forEach(memory => {
          section.appendChild(createMemoryCard(memory, namespace));
        });
        
        if (data.pagination.totalPages > 1) {
          const viewMoreBtn = document.createElement("button");
          viewMoreBtn.className = "mt-3 text-purple-400 hover:text-purple-300 text-sm underline";
          viewMoreBtn.textContent = "View more from this realm...";
          viewMoreBtn.onclick = () => {
            selectedNamespaces.clear();
            selectedNamespaces.add(namespace);
            switchToTab("recent");
          };
          section.appendChild(viewMoreBtn);
        }
        
        container.appendChild(section);
      }
    }
    
    if (container.innerHTML === '') {
      container.innerHTML = `
        <div class="text-center py-12 text-purple-400">
          <p class="text-2xl mb-4">📚</p>
          <p class="mystical-font text-xl">The archives are empty...</p>
          <p class="text-sm mt-2">No memories exist in any realm</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Failed to load archives:", error);
    container.innerHTML = '<p class="text-center text-red-400">The archives are cursed... Cannot access.</p>';
  }
  
  // Hide pagination for browse view
  document.getElementById("pagination").classList.add("hidden");
}

// Edit memory
async function editMemory(memoryId) {
  const newContent = prompt("Rewrite this memory (beware the consequences):");
  if (newContent && newContent.trim()) {
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() })
      });
      
      const data = await response.json();
      if (data.success) {
        showFortune("The memory has been altered... Reality shifts.");
        // Reload current view
        if (currentTab === "recent") loadMemories();
        else if (currentTab === "search") displaySearchResults();
        else if (currentTab === "browse") loadBrowseView();
      }
    } catch (error) {
      console.error("Failed to edit memory:", error);
      showFortune("The memory resists change... It cannot be altered.");
    }
  }
}

// Delete memory
async function deleteMemory(memoryId) {
  if (confirm("Erase this memory forever? This cannot be undone...")) {
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE"
      });
      
      const data = await response.json();
      if (data.success) {
        showFortune("The memory fades into oblivion...");
        // Reload current view
        if (currentTab === "recent") loadMemories();
        else if (currentTab === "search") displaySearchResults();
        else if (currentTab === "browse") loadBrowseView();
      }
    } catch (error) {
      console.error("Failed to delete memory:", error);
      showFortune("The memory clings to existence... It refuses to die.");
    }
  }
}

// Configuration modal functions
function showConfigInstructions(client) {
  const modal = document.getElementById("config-modal");
  const content = document.getElementById("config-content");
  const sseUrl = document.getElementById("sse-url").value;
  
  let instructions = '';
  
  if (client === 'cursor') {
    instructions = `
      <h3 class="mystical-font text-xl text-purple-300 mb-3">Cursor Binding Ritual</h3>
      <ol class="list-decimal list-inside space-y-2 text-sm">
        <li>Open your <code class="bg-purple-900/50 px-2 py-1 rounded">~/.cursor/mcp.json</code> file</li>
        <li>Add this incantation:</li>
      </ol>
      <pre class="mt-3 bg-purple-900/30 p-4 rounded overflow-x-auto text-xs"><code>{
  "mcpServers": {
    "mcp-memory": {
      "url": "${sseUrl}"
    }
  }
}</code></pre>
      <p class="mt-3 text-sm text-purple-400">The cursor shall remember all...</p>
    `;
  } else if (client === 'claude') {
    instructions = `
      <h3 class="mystical-font text-xl text-purple-300 mb-3">Claude Binding Ritual</h3>
      <ol class="list-decimal list-inside space-y-2 text-sm">
        <li>Locate your Claude Desktop config:
          <ul class="list-disc list-inside ml-4 mt-1 text-xs text-purple-400">
            <li>macOS: <code class="bg-purple-900/50 px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
            <li>Windows: <code class="bg-purple-900/50 px-1 rounded">%APPDATA%\\Claude\\claude_desktop_config.json</code></li>
            <li>Linux: <code class="bg-purple-900/50 px-1 rounded">~/.config/Claude/claude_desktop_config.json</code></li>
          </ul>
        </li>
        <li>Add this dark pact:</li>
      </ol>
      <pre class="mt-3 bg-purple-900/30 p-4 rounded overflow-x-auto text-xs"><code>{
  "mcpServers": {
    "mcp-memory": {
      "command": "npx",
      "args": ["mcp-remote", "${sseUrl}"]
    }
  }
}</code></pre>
      <p class="mt-3 text-sm text-purple-400">Claude's mind expands beyond time...</p>
    `;
  } else if (client === 'windsurf') {
    instructions = `
      <h3 class="mystical-font text-xl text-purple-300 mb-3">Windsurf Binding Ritual</h3>
      <ol class="list-decimal list-inside space-y-2 text-sm">
        <li>Find <code class="bg-purple-900/50 px-2 py-1 rounded">~/.codeium/windsurf/mcp_config.json</code></li>
        <li>Inscribe these runes:</li>
      </ol>
      <pre class="mt-3 bg-purple-900/30 p-4 rounded overflow-x-auto text-xs"><code>{
  "mcpServers": {
    "mcp-memory": {
      "serverUrl": "${sseUrl}"
    }
  }
}</code></pre>
      <p class="mt-3 text-sm text-purple-400">The winds carry memories across realms...</p>
    `;
  }
  
  content.innerHTML = instructions;
  modal.classList.remove("hidden");
}

function closeConfigModal() {
  document.getElementById("config-modal").classList.add("hidden");
}

// Make functions globally accessible
window.showConfigInstructions = showConfigInstructions;
window.closeConfigModal = closeConfigModal;
window.editMemory = editMemory;
window.deleteMemory = deleteMemory;
