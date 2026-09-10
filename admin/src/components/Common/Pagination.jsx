import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange, totalItems, limit = 10 }) => {
  const pageNum = Number(currentPage) || 1;
  const pagesTotal = Math.max(1, Number(totalPages) || 1);
  const itemLimit = Number(limit) || 10;
  const itemsTotal = typeof totalItems === 'number' && !isNaN(totalItems) ? totalItems : pagesTotal * itemLimit;

  if (itemsTotal === 0 && pagesTotal <= 1) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 sm:p-4 mt-4 border-t border-admin-border text-center sm:text-left text-xs text-admin-text-muted">
        <div>Showing 0 to 0 of 0 entries</div>
      </div>
    );
  }

  const startItem = itemsTotal > 0 ? (pageNum - 1) * itemLimit + 1 : 0;
  const endItem = itemsTotal > 0 ? Math.min(pageNum * itemLimit, itemsTotal) : 0;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (pagesTotal <= maxVisible + 2) {
      for (let i = 1; i <= pagesTotal; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, pageNum - 1);
      let end = Math.min(pagesTotal - 1, pageNum + 1);

      if (pageNum <= 3) {
        end = 4;
      } else if (pageNum >= pagesTotal - 2) {
        start = pagesTotal - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < pagesTotal - 1) pages.push('...');
      pages.push(pagesTotal);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 sm:p-4 mt-4 border-t border-admin-border text-center sm:text-left w-full min-w-0 max-w-full">
      <div className="text-xs text-admin-text-secondary whitespace-normal">
        Showing <span className="font-semibold text-admin-text-primary">{startItem}</span> to{' '}
        <span className="font-semibold text-admin-text-primary">{endItem}</span> of{' '}
        <span className="font-semibold text-admin-text-primary">{itemsTotal}</span> entries
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(pageNum - 1)}
          disabled={pageNum <= 1}
          className="bg-admin-card border border-admin-border text-admin-text-primary hover:bg-admin-subtle py-1.5 px-3 rounded-md cursor-pointer flex items-center gap-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous Page"
        >
          <ChevronLeft size={15} /> Previous
        </button>

        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-admin-text-muted select-none">
                ...
              </span>
            );
          }
          const isActive = p === pageNum;
          return (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              className={`py-1.5 px-3 text-xs rounded-md border font-medium cursor-pointer transition-colors ${
                isActive
                  ? 'bg-admin-accent text-white border-admin-accent font-semibold'
                  : 'bg-admin-card border-admin-border text-admin-text-primary hover:bg-admin-subtle'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(pageNum + 1)}
          disabled={pageNum >= pagesTotal}
          className="bg-admin-card border border-admin-border text-admin-text-primary hover:bg-admin-subtle py-1.5 px-3 rounded-md cursor-pointer flex items-center gap-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next Page"
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
