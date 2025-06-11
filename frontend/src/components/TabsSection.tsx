import { TabType } from '../types/api';

interface TabsSectionProps {
  tabs: TabType[];
  currentTab: TabType['id'];
  onTabChange: (tab: TabType['id']) => void;
}

const TabsSection = ({ tabs, currentTab, onTabChange }: TabsSectionProps) => {
  return (
    <section className="max-w-6xl mx-auto mb-8">
      <div className="flex justify-center space-x-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`mystical-token px-6 py-3 rounded-t-lg font-bold transition-all ${
              currentTab === tab.id ? 'opacity-100' : 'opacity-60'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default TabsSection;
