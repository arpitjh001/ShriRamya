import React, { useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import { Button } from './ui/button';

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  filterMetadata,
  onFilterChange,
  onClearFilters,
  totalProducts = 0
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-background z-50 lg:hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-accent/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent/10 rounded-full transition-colors"
            data-testid="close-filter-drawer"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <FilterSidebar
            filters={filters}
            filterMetadata={filterMetadata}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            className="border-none p-0 bg-transparent"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-accent/10 bg-background">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="flex-1"
            >
              Clear All
            </Button>
            <Button
              onClick={onClose}
              className="flex-1"
              data-testid="apply-filters-btn"
            >
              Show {totalProducts} Results
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileFilterDrawer;
