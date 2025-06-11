import { useState, useEffect } from 'react';
import { NamespacesResponse, SearchResponse, MemoriesResponse, Memory, VectorSearchMemory, TabType } from './types/api';
import OracleHeader from './components/OracleHeader';
import ServerConfig from './components/ServerConfig';
import CoinSlot from './components/CoinSlot';
import CrystalBall from './components/CrystalBall';
import TabsSection from './components/TabsSection';
import MemoryDisplay from './components/MemoryDisplay';
import FortuneNotification from './components/FortuneNotification';
import SmokeEffects from './components/SmokeEffects';

const tabs: TabType[] = [
  { id: 'recent', label: 'Recent Visions', icon: '📅' },
  { id: 'search', label: 'Oracle Results', icon: '🔮' },
  { id: 'browse', label: 'Cursed Archives', icon: '📚' }
];

function App() {
  // Global state
  const [userUuid] = useState(() => {
    let uuid = localStorage.getItem('mcpUserUuid');
    if (!uuid) {
      uuid = crypto.randomUUID ? crypto.randomUUID() :
        `cursed-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('mcpUserUuid', uuid);
    }
    return uuid;
  });

  const [selectedNamespaces, setSelectedNamespaces] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTab, setCurrentTab] = useState<TabType['id']>('recent');
  const [wishesRemaining, setWishesRemaining] = useState(3);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isOracleActive, setIsOracleActive] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [namespaces, setNamespaces] = useState<NamespacesResponse['namespaces']>({ users: [], projects: [], all: false });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [fortuneMessage, setFortuneMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize by auto-selecting current user namespace
  useEffect(() => {
    if (namespaces.users.includes(userUuid.replace('cursed-', '').split('-')[0])) {
      setSelectedNamespaces(new Set([`user:${userUuid}`]));
    }
  }, [namespaces, userUuid]);

  const showFortune = (message: string) => {
    setFortuneMessage(message);
    setTimeout(() => setFortuneMessage(null), 5000);
  };

  const activateOracle = async () => {
    if (isOracleActive) {
      showFortune("The Oracle is already awake... Do not anger it further.");
      return;
    }

    setIsOracleActive(true);
    showFortune("The Oracle awakens... What forbidden knowledge do you seek?");

    // Load namespaces
    await loadNamespaces();

    // Load initial memories
    await loadMemories();
  };

  const loadNamespaces = async () => {
    try {
      const response = await fetch('/api/namespaces');
      const data: NamespacesResponse = await response.json();

      if (data.success) {
        setNamespaces(data.namespaces);
      }
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      showFortune("The spirits refuse to reveal the realms...");
    }
  };

  const loadMemories = async (append = false) => {
    if (selectedNamespaces.size === 0) {
      setSelectedNamespaces(new Set([`user:${userUuid}`]));
      return;
    }

    setIsLoading(true);

    try {
      const namespace = Array.from(selectedNamespaces)[0];
      const [type, id] = namespace.includes(':') ? namespace.split(':') : ['all', 'all'];

      const response = await fetch(`/${type}/${id}/memories?page=${currentPage}&limit=10`);
      const data: MemoriesResponse = await response.json();

      if (data.success) {
        if (append) {
          setMemories(prev => [...prev, ...data.memories]);
        } else {
          setMemories(data.memories);
        }
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      showFortune("The spirits are angry... They refuse to speak.");
    } finally {
      setIsLoading(false);
    }
  };

  const consultOracle = async (query: string) => {
    if (!query.trim()) {
      showFortune("The Oracle demands a question... Do not waste its time.");
      return;
    }

    if (selectedNamespaces.size === 0) {
      showFortune("Choose a realm first, mortal... The Oracle cannot see into nothingness.");
      return;
    }

    // Decrement wishes
    setWishesRemaining(prev => prev - 1);

    if (wishesRemaining <= 1) {
      showFortune("Your wishes are spent... The Oracle grows silent. Refresh to bargain again.");
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          namespaces: Array.from(selectedNamespaces)
        })
      });

      const data: SearchResponse = await response.json();

      if (data.success) {
        setSearchResults(data);
        setCurrentTab('search');

        const totalFound = data.results.reduce((sum, r) => sum + r.memories.length, 0);
        showFortune(`The Oracle has found ${totalFound} cursed memories...`);
      }
    } catch (error) {
      console.error('Oracle consultation failed:', error);
      showFortune("The Oracle chokes on your question... Try again, if you dare.");
    } finally {
      setIsLoading(false);
    }
  };

  const editMemory = async (memoryId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });

      const data = await response.json();
      if (data.success) {
        showFortune("The memory has been altered... Reality shifts.");
        // Reload current view
        if (currentTab === 'recent') {
          await loadMemories();
        }
      }
    } catch (error) {
      console.error('Failed to edit memory:', error);
      showFortune("The memory resists change... It cannot be altered.");
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm("Erase this memory forever? This cannot be undone...")) {
      return;
    }

    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        showFortune("The memory fades into oblivion...");
        // Reload current view
        if (currentTab === 'recent') {
          await loadMemories();
        }
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      showFortune("The memory clings to existence... It refuses to die.");
    }
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
    loadMemories(true);
  };

  // Load memories when tab or page changes
  useEffect(() => {
    if (isOracleActive && currentTab === 'recent') {
      loadMemories();
    }
  }, [currentTab, selectedNamespaces]);

  return (
    <div className="min-h-screen text-purple-100">
      <SmokeEffects />

      <OracleHeader />

      <main className="container mx-auto px-4 pb-16 relative z-10">
        <ServerConfig userUuid={userUuid} showFortune={showFortune} />

        <CoinSlot
          isOracleActive={isOracleActive}
          wishesRemaining={wishesRemaining}
          onActivate={activateOracle}
        />

        {isOracleActive && (
          <>
            <CrystalBall
              namespaces={namespaces}
              selectedNamespaces={selectedNamespaces}
              onNamespaceToggle={(namespace) => {
                const newSelected = new Set(selectedNamespaces);
                if (newSelected.has(namespace)) {
                  newSelected.delete(namespace);
                } else {
                  newSelected.add(namespace);
                }
                setSelectedNamespaces(newSelected);
              }}
              onSelectAll={() => {
                const allNamespaces = [
                  ...namespaces.users.map(u => `user:${u}`),
                  ...namespaces.projects.map(p => `project:${p}`),
                  ...(namespaces.all ? ['all'] : [])
                ];
                setSelectedNamespaces(new Set(allNamespaces));
              }}
              onClearAll={() => setSelectedNamespaces(new Set())}
              onConsult={consultOracle}
              isLoading={isLoading}
              wishesRemaining={wishesRemaining}
            />

            <TabsSection
              tabs={tabs}
              currentTab={currentTab}
              onTabChange={setCurrentTab}
            />

            <MemoryDisplay
              currentTab={currentTab}
              memories={memories}
              searchResults={searchResults}
              namespaces={namespaces}
              pagination={pagination}
              isLoading={isLoading}
              onLoadMore={loadMore}
              onEditMemory={editMemory}
              onDeleteMemory={deleteMemory}
              selectedNamespaces={selectedNamespaces}
              onNamespaceSelect={(namespace) => {
                setSelectedNamespaces(new Set([namespace]));
                setCurrentTab('recent');
              }}
            />
          </>
        )}
      </main>

      <footer className="text-center py-8 text-purple-400 text-sm mystical-font">
        <p>The Oracle's power flows through Cloudflare's darkest magics...</p>
        <p className="mt-2 text-purple-500">Workers, Vectorize, and D1 bind the memories for eternity</p>
      </footer>

      {fortuneMessage && (
        <FortuneNotification message={fortuneMessage} />
      )}
    </div>
  );
}

export default App;
