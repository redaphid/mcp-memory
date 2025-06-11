import { useState } from 'react';
import { Namespace } from '../types/api';

interface CrystalBallProps {
  namespaces: Namespace;
  selectedNamespaces: Set<string>;
  onNamespaceToggle: (namespace: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onConsult: (query: string) => void;
  isLoading: boolean;
  wishesRemaining: number;
}

const CrystalBall = ({
  namespaces,
  selectedNamespaces,
  onNamespaceToggle,
  onSelectAll,
  onClearAll,
  onConsult,
  isLoading,
  wishesRemaining
}: CrystalBallProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConsult(query);
  };

  const getNamespaceIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'project': return '📁';
      case 'all': return '🌐';
      default: return '❓';
    }
  };

  const allNamespaces = [
    ...namespaces.users.map(u => ({ type: 'user', id: u, full: `user:${u}` })),
    ...namespaces.projects.map(p => ({ type: 'project', id: p, full: `project:${p}` })),
    ...(namespaces.all ? [{ type: 'all', id: 'all', full: 'all' }] : [])
  ];

  return (
    <section className="mb-12 max-w-4xl mx-auto">
      <div className="crystal-ball rounded-3xl p-8 relative overflow-hidden">
        <h2 className="creepy-font text-4xl text-center mb-6 text-purple-200">
          Gaze Into The Void
        </h2>

        {/* Namespace Selection */}
        <div className="mb-6">
          <p className="mystical-font text-lg text-purple-300 mb-3">
            Choose your cursed realms wisely...
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {allNamespaces.map((namespace) => (
              <button
                key={namespace.full}
                onClick={() => onNamespaceToggle(namespace.full)}
                className={`mystical-token px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  selectedNamespaces.has(namespace.full)
                    ? 'opacity-100 glow'
                    : 'opacity-60'
                }`}
              >
                {getNamespaceIcon(namespace.type)} {namespace.id}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              ✦ Summon All Realms ✦
            </button>
            <button
              onClick={onClearAll}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              ✦ Banish All ✦
            </button>
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full cursed-input py-4 px-6 rounded-lg text-lg text-purple-100"
              placeholder="Whisper your darkest query..."
              disabled={isLoading || wishesRemaining <= 0}
            />
            <button
              type="submit"
              disabled={isLoading || wishesRemaining <= 0 || !query.trim()}
              className="absolute right-2 top-2 mystical-token px-6 py-2 rounded-md font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '👁️ Gazing...' : '🔮 Consult'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-purple-400 italic">
          {wishesRemaining > 0
            ? "Some memories were meant to stay buried..."
            : "The Oracle grows weary... Refresh to renew your pact."
          }
        </p>
      </div>
    </section>
  );
};

export default CrystalBall;
