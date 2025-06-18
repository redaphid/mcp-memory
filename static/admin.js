// Bundled admin page JavaScript
const { useState, useEffect, createElement } = React;

const UserTree = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsersAndMemories = async () => {
      try {
        // First get all namespaces
        const namespacesResponse = await fetch('/api/namespaces');
        const namespacesData = await namespacesResponse.json();

        if (!namespacesData.success) {
          throw new Error('Failed to fetch namespaces');
        }

        // For each user, fetch their recent memories
        const userPromises = namespacesData.namespaces.users.map(async (userId) => {
          const memoriesResponse = await fetch(`/user/${userId}/memories?page=1&limit=5`);
          const memoriesData = await memoriesResponse.json();

          return {
            id: userId,
            memories: memoriesData.success ? memoriesData.memories : []
          };
        });

        const usersWithMemories = await Promise.all(userPromises);
        setUsers(usersWithMemories);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUsersAndMemories();
  }, []);

  if (loading) {
    return createElement('div', { className: 'text-purple-300' }, 'Loading users and memories...');
  }

  if (error) {
    return createElement('div', { className: 'text-red-400' }, `Error: ${error}`);
  }

  return createElement('div', { className: 'space-y-4' },
    users.map(user =>
      createElement('div', { key: user.id, className: 'tarot-card p-4 rounded-lg' },
        createElement('div', { className: 'flex items-center gap-2 mb-3' },
          createElement('span', { className: 'text-purple-400' }, '👤'),
          createElement('h3', { className: 'text-purple-300 font-bold' }, user.id)
        ),

        user.memories.length > 0
          ? createElement('div', { className: 'space-y-2 pl-6' },
              user.memories.map(memory =>
                createElement('div', { key: memory.id, className: 'border-l-2 border-purple-700 pl-3' },
                  createElement('div', { className: 'text-sm text-purple-400 mb-1' },
                    new Date(memory.created_at).toLocaleString()
                  ),
                  createElement('div', { className: 'text-purple-100' }, memory.content)
                )
              )
            )
          : createElement('div', { className: 'text-purple-400 italic pl-6' }, 'No memories found')
      )
    )
  );
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('user-tree-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(createElement(UserTree));
  }
});
