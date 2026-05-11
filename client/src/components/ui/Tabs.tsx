import { type ReactNode, type KeyboardEvent, useState, useId, useRef, useCallback } from 'react';
import { cn } from '../../utils/cn';

type Tab = {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
};

type TabsProps = {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
};

export const Tabs = ({ tabs, defaultTab, onChange, className }: TabsProps) => {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const tabListRef = useRef<HTMLDivElement>(null);

  const activateTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  }, [onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);
    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % enabledTabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    const nextTab = enabledTabs[nextIndex]!;
    activateTab(nextTab.id);

    const btn = tabListRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${nextTab.id}"]`,
    );
    btn?.focus();
  }, [tabs, activeTab, activateTab]);

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={className}>
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="flex border-b border-border"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              data-tab-id={tab.id}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => activateTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
                isActive
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeTab}`}
        aria-labelledby={`${baseId}-tab-${activeTab}`}
        tabIndex={0}
        className="pt-4"
      >
        {activeContent}
      </div>
    </div>
  );
};
