'use client';

import { ChevronsLeft, ChevronsRight, Menu } from 'lucide-react';
import { useT } from '../../i18n';

export function SidebarTrigger({
  onOpen,
  collapsed,
  onToggleCollapse,
  className = '',
  expanded,
  controlsId,
}: {
  onOpen: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  expanded?: boolean;
  controlsId?: string;
}) {
  const { t, dir } = useT();
  return (
    <>
      <button
        onClick={onOpen}
        aria-expanded={expanded}
        aria-controls={controlsId}
        aria-label={t('openMenu')}
        className={`-ms-1 rounded-lg p-2 transition-colors lg:hidden ${className}`}
      >
        <Menu className="h-5 w-5" />
      </button>
      {typeof onToggleCollapse === 'function' && (
        <button
          onClick={onToggleCollapse}
          className={`hidden rounded-lg p-2 transition-colors lg:inline-flex ${className}`}
          aria-label={t(collapsed ? 'expandSidebar' : 'collapseSidebar')}
          title={t(collapsed ? 'expandSidebar' : 'collapseSidebar')}
        >
          {(dir === 'rtl') === collapsed ? (
            <ChevronsLeft className="h-5 w-5" />
          ) : (
            <ChevronsRight className="h-5 w-5" />
          )}
        </button>
      )}
    </>
  );
}