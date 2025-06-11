import { Memory } from '../types/api';

interface MemoryCardProps {
  memory: Memory & { score?: number };
  namespace: string;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showScore?: boolean;
}

const MemoryCard = ({ memory, namespace, onEdit, onDelete, showScore = false }: MemoryCardProps) => {
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
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
  };

  const handleEdit = () => {
    const newContent = prompt("Rewrite this memory (beware the consequences):", memory.content);
    if (newContent && newContent.trim()) {
      onEdit(memory.id, newContent.trim());
    }
  };

  const handleDelete = () => {
    onDelete(memory.id);
  };

  const [type, id] = namespace.includes(':') ? namespace.split(':') : ['all', 'all'];
  const timeAgo = getTimeAgo(memory.created_at);

  return (
    <div className="tarot-card p-4 rounded-lg hover:scale-[1.01] transition-transform">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">
            {type === 'user' ? '👤' : type === 'project' ? '📁' : '🌐'} {id}
          </span>
          <span className="text-purple-500 text-xs">•</span>
          <span className="text-purple-500 text-xs">{timeAgo}</span>
          {showScore && memory.score && (
            <>
              <span className="text-purple-500 text-xs">•</span>
              <span className="text-purple-400 text-xs">
                Score: {memory.score.toFixed(4)}
              </span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
      <p className="text-purple-100 whitespace-pre-wrap">{memory.content}</p>
      {memory.metadata && Object.keys(memory.metadata).length > 0 && (
        <div className="mt-2 text-xs text-purple-400">
          {Object.entries(memory.metadata).map(([key, value]) => (
            <span
              key={key}
              className="inline-block bg-purple-900/30 px-2 py-1 rounded mr-1"
            >
              {key}: {String(value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryCard;
