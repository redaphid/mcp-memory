import { useState } from 'react';

interface ServerConfigProps {
  userUuid: string;
  showFortune: (message: string) => void;
}

const ServerConfig = ({ userUuid, showFortune }: ServerConfigProps) => {
  const [showModal, setShowModal] = useState(false);
  const [activeConfig, setActiveConfig] = useState<'cursor' | 'claude' | 'windsurf' | null>(null);

  const currentOrigin = window.location.origin;
  const sseUrl = `${currentOrigin}/user/${userUuid}/sse`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sseUrl).then(() => {
      showFortune("The pact is sealed... Your soul is bound to the Oracle.");
    });
  };

  const showConfigInstructions = (client: 'cursor' | 'claude' | 'windsurf') => {
    setActiveConfig(client);
    setShowModal(true);
  };

  const getConfigContent = () => {
    if (!activeConfig) return '';

    const configs = {
      cursor: `
### Cursor Binding Ritual

1. Open your \`~/.cursor/mcp.json\` file
2. Add this incantation:

\`\`\`json
{
  "mcpServers": {
    "mcp-memory": {
      "url": "${sseUrl}"
    }
  }
}
\`\`\`

The cursor shall remember all...
      `,
      claude: `
### Claude Binding Ritual

1. Locate your Claude Desktop config:
   - macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
   - Windows: \`%APPDATA%\\Claude\\claude_desktop_config.json\`
   - Linux: \`~/.config/Claude/claude_desktop_config.json\`

2. Add this dark pact:

\`\`\`json
{
  "mcpServers": {
    "mcp-memory": {
      "command": "npx",
      "args": ["mcp-remote", "${sseUrl}"]
    }
  }
}
\`\`\`

Claude's mind expands beyond time...
      `,
      windsurf: `
### Windsurf Binding Ritual

1. Find \`~/.codeium/windsurf/mcp_config.json\`
2. Inscribe these runes:

\`\`\`json
{
  "mcpServers": {
    "mcp-memory": {
      "serverUrl": "${sseUrl}"
    }
  }
}
\`\`\`

The winds carry memories across realms...
      `
    };

    return configs[activeConfig];
  };

  return (
    <>
      <section className="mb-12 max-w-4xl mx-auto">
        <div className="tarot-card p-6 rounded-lg">
          <h2 className="creepy-font text-3xl text-purple-300 mb-4">The Binding Ritual</h2>
          <label className="block mystical-font text-lg text-purple-200 mb-2">
            Your Personal Summoning Incantation:
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              className="flex-grow cursed-input py-3 px-4 rounded-md text-purple-100 text-lg font-mono"
              readOnly
              value={sseUrl}
              placeholder="The spirits are gathering..."
            />
            <button
              onClick={copyToClipboard}
              className="mystical-token px-6 py-3 rounded-md text-white font-bold hover:scale-105 transition-transform cursor-pointer"
              title="Seal the pact"
            >
              📜 Seal Pact
            </button>
          </div>
          <p className="mt-3 text-sm text-purple-300 italic">
            Guard this incantation with your life. It binds your soul to the Oracle...
          </p>

          <div className="mt-4 flex gap-2 justify-center">
            <button
              onClick={() => showConfigInstructions('cursor')}
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Cursor Ritual
            </button>
            <span className="text-purple-500">•</span>
            <button
              onClick={() => showConfigInstructions('claude')}
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Claude Ritual
            </button>
            <span className="text-purple-500">•</span>
            <button
              onClick={() => showConfigInstructions('windsurf')}
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Windsurf Ritual
            </button>
          </div>
        </div>
      </section>

      {/* Configuration Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="tarot-card max-w-2xl w-full p-8 rounded-lg relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-purple-300 hover:text-purple-100 text-2xl"
              >
                ✕
              </button>
              <h2 className="creepy-font text-3xl text-purple-300 mb-6">The Sacred Incantations</h2>
              <div className="space-y-6 text-purple-100">
                <pre className="whitespace-pre-wrap text-sm">{getConfigContent()}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServerConfig;
