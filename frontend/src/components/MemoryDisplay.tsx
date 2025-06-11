import { Memory, SearchResponse, Namespace, Pagination, TabType } from '../types/api';
import MemoryCard from './MemoryCard';

interface MemoryDisplayProps {
  currentTab: TabType['id'];
  memories: Memory[];
  searchResults: SearchResponse | null;
  namespaces: Namespace;
  pagination: Pagination;
  isLoading: boolean;
  onLoadMore: () => void;
  onEditMemory: (id: string, content: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  selectedNamespaces: Set<string>;
  onNamespaceSelect: (namespace: string) => void;
}

const MemoryDisplay = ({
  currentTab,
  memories,
  searchResults,
  namespaces,
  pagination,
  isLoading,
  onLoadMore,
  onEditMemory,
  onDeleteMemory,
  selectedNamespaces,
  onNamespaceSelect
}: MemoryDisplayProps) => {

  const renderRecentMemories = () => {
    if (memories.length === 0) {
      return (
        <div className="text-center py-12 text-purple-400">
          <p className="text-2xl mb-4">💀</p>
          <p className="mystical-font text-xl">The void is empty...</p>
          <p className="text-sm mt-2">No memories haunt this realm</p>
        </div>
      );
    }

    const namespace = Array.from(selectedNamespaces)[0] || 'unknown';

    return (
      <div className="space-y-4">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            namespace={namespace}
            onEdit={onEditMemory}
            onDelete={onDeleteMemory}
          />
        ))}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!searchResults) {
      return <p className="text-center text-purple-400">No visions to display...</p>;
    }

    let totalMemories = 0;
    const sections = searchResults.results.map((result) => {
      if (result.memories.length === 0) return null;
      totalMemories += result.memories.length;

      return (
        <div key={result.namespace} className="mb-6">
          <h3 className="text-purple-300 font-bold mb-3">
            {result.namespace === 'all' ? '🌐' : result.namespace.startsWith('user:') ? '👤' : '📁'}
            {result.namespace}
          </h3>
          <div className="space-y-4">
            {result.memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={{
                  id: memory.id,
                  content: memory.content,
                  created_at: new Date().toISOString(), // Vector search doesn't return created_at
                  score: memory.score
                }}
                namespace={result.namespace}
                onEdit={onEditMemory}
                onDelete={onDeleteMemory}
                showScore
              />
            ))}
          </div>
        </div>
      );
    }).filter(Boolean);

    if (totalMemories === 0) {
      return (
        <div className="text-center py-12 text-purple-400">
          <p className="text-2xl mb-4">🔮</p>
          <p className="mystical-font text-xl">The Oracle finds nothing...</p>
          <p className="text-sm mt-2">Your query yields no memories</p>
        </div>
      );
    }

    return <div>{sections}</div>;
  };

  const renderBrowseView = () => {
    const allNamespaces = [
      ...namespaces.users.map(u => `user:${u}`),
      ...namespaces.projects.map(p => `project:${p}`),
      ...(namespaces.all ? ['all'] : [])
    ];

    if (allNamespaces.length === 0) {
      return (
        <div className="text-center py-12 text-purple-400">
          <p className="text-2xl mb-4">📚</p>
          <p className="mystical-font text-xl">The archives are empty...</p>
          <p className="text-sm mt-2">No memories exist in any realm</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {allNamespaces.slice(0, 3).map((namespace) => {
          const [type, id] = namespace.includes(':') ? namespace.split(':') : ['all', 'all'];
          const icon = type === 'user' ? '👤' : type === 'project' ? '📁' : '🌐';

          return (
            <div key={namespace} className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-purple-300 font-bold text-lg">
                  {icon} {id}
                </h3>
                <button
                  onClick={() => onNamespaceSelect(namespace)}
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  View more from this realm...
                </button>
              </div>
              <div className="text-purple-400 text-sm mb-2">
                Sample memories from this realm...
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'recent':
        return renderRecentMemories();
      case 'search':
        return renderSearchResults();
      case 'browse':
        return renderBrowseView();
      default:
        return null;
    }
  };

  return (
    <section className="max-w-6xl mx-auto">
      <div className="tarot-card rounded-lg p-6">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-purple-400">
              <p className="mystical-font text-xl">The spirits gather...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {/* Pagination for recent memories */}
        {currentTab === 'recent' && pagination.page < pagination.totalPages && (
          <div className="mt-6 text-center">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="mystical-token px-8 py-3 rounded-md font-bold hover:scale-105 transition-transform disabled:opacity-50"
            >
              📜 Unroll More Scrolls...
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MemoryDisplay;
