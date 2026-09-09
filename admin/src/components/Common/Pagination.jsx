import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange, totalItems, limit = 10 }) => {
  const pageNum = Number(currentPage) || 1;
  const pagesTotal = Number(totalPages) || 1;
  const itemLimit = Number(limit) || 10;
  const itemsTotal = typeof totalItems === 'number' && !isNaN(totalItems) ? totalItems : pagesTotal * itemLimit;

  if (pagesTotal <= 1) return null;

  const startItem = itemsTotal > 0 ? (pageNum - 1) * itemLimit + 1 : 0;
  const endItem = itemsTotal > 0 ? Math.min(pageNum * itemLimit, itemsTotal) : 0;

  return (
    <div className="flex items-center justify-between p-4 mt-4 border-t border-admin-border">
      {totalItems !== undefined && (
        <div className="text-xs text-admin-text-secondary">
          Showing <span className="text-amber-500 font-semibold">{startItem}</span> to{' '}
          <span className="text-amber-500 font-semibold">{endItem}</span> of{' '}
          <span className="text-admin-text-primary font-semibold">{itemsTotal}</span> entries
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-admin-card border border-admin-border text-admin-text-primary hover:bg-admin-subtle py-1.5 px-3 rounded-md cursor-pointer flex items-center gap-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="text-xs text-admin-text-secondary">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-admin-card border border-admin-border text-admin-text-primary hover:bg-admin-subtle py-1.5 px-3 rounded-md cursor-pointer flex items-center gap-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
