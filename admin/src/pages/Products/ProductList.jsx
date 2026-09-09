import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Package, X } from 'lucide-react';

const ProductList = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  // Modal for full description preview
  const [selectedDesc, setSelectedDesc] = useState(null);

  const navigate = useNavigate();
  const { showToast, showErrorModal } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [page, limit, search, dateParam]);

  const fetchProducts = async () => {
    try {
      const params = { search, page, limit };
      if (dateParam) params.date = dateParam;
      const res = await api.get('/products', {
        params,
      });
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      showToast('Failed to load Products list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const targetId = id;
      const res = await api.patch(`/products/${targetId}/status`);
      setProducts(prev => prev.map(p => (p._id === targetId || p.id === targetId) ? { ...p, ...res.data, _id: res.data._id || res.data.id || targetId } : p));
      showToast('Product status updated');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id && p.id !== id));
      showToast(res.data?.message || 'Product deleted successfully');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to delete product';
      showErrorModal({
        title: 'Cannot Delete Product',
        message: msg,
      });
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-1">Product Management</h1>
          <p className="subheading mt-0.5">Manage catalog, variants, and pricing</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/products/add')}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Main Content Card */}
      <div className="card-minimal p-6">
        
        {/* Active Filter indicator */}
        {dateParam === 'today' && (
          <div className="mb-4 flex items-center gap-2 text-xs bg-admin-subtle border border-admin-accent/30 text-admin-text-primary py-1.5 px-3 rounded-md w-fit">
            <span>Filtering: <strong>Today's Added Products</strong></span>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="text-admin-text-muted hover:text-admin-danger ml-2 p-0.5 cursor-pointer bg-transparent border-none flex items-center"
              title="Clear today filter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Controls: Show entries & Search */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs text-admin-text-secondary">
            <span>Show</span>
            <select
              className="form-control w-17.5 py-1.5 px-2 text-xs"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>entries</span>
          </div>

          <div className="search-box w-64">
            <Search size={15} className="text-admin-text-muted shrink-0 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-15">SNo</th>
                <th>Product Name</th>
                <th>Main Category</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th className="min-w-[200px]">Description</th>
                <th className="text-center">Image</th>
                <th className="text-center">Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center p-8 text-admin-text-muted">Loading products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="9" className="text-center p-8 text-admin-text-muted">No products found</td></tr>
              ) : (
                products.map((p, index) => {
                  const sno = (page - 1) * limit + index + 1;
                  const rawImg = p.productImage || (p.images && p.images[0]) || '';
                  const displayImg = getImageUrl(rawImg);
                  const shortDescText = p.description || p.shortDescription || '';

                  const mainCatName = p.mainCategory?.name || (typeof p.mainCategoryId === 'object' ? p.mainCategoryId?.name : '') || 'N/A';
                  const catName = p.category?.name || (typeof p.categoryId === 'object' ? p.categoryId?.name : '') || 'N/A';
                  const subCatName = p.subCategory?.name || (typeof p.subCategoryId === 'object' ? p.subCategoryId?.name : '') || 'N/A';

                  const prodId = p._id || p.id;
                  return (
                    <tr key={prodId}>
                      <td className="font-medium text-admin-text-secondary">{sno}</td>
                      <td className="font-semibold text-admin-text-primary">{p.name}</td>
                      <td>{mainCatName}</td>
                      <td>{catName}</td>
                      <td>{subCatName}</td>
                      <td className="max-w-[240px]">
                        <div className="text-xs text-admin-text-secondary leading-normal">
                          {shortDescText.slice(0, 55)}
                          {shortDescText.length > 55 ? '...' : ''}
                        </div>
                        {shortDescText && (
                          <button
                            type="button"
                            onClick={() => setSelectedDesc(p)}
                            className="bg-transparent border-none text-admin-accent text-[11px] cursor-pointer p-0 mt-0.5 hover:underline"
                          >
                            Read More
                          </button>
                        )}
                      </td>
                      <td className="text-center">
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={p.name}
                            className="w-10 h-10 rounded-md object-cover border border-admin-border mx-auto"
                            onError={(e) => {
                              e.currentTarget.src = '/assets/images/fallback-product.png';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-admin-subtle inline-flex items-center justify-center text-admin-text-muted mx-auto">
                            <Package size={18} />
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={p.status === 'Active'}
                            onChange={() => handleToggleStatus(prodId)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td className="text-center">
                        <div className="inline-flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => navigate(`/products/edit/${prodId}`)}
                            className="btn-secondary p-1.5 text-admin-accent"
                            title="Edit Product"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(prodId)}
                            className="btn-danger p-1.5"
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar: Entries Counter & Pagination */}
        <div className="flex items-center justify-between mt-5 flex-wrap gap-4">
          <span className="text-xs text-admin-text-muted">
            Showing {startItem} to {endItem} of {total} entries
          </span>

          <div className="flex gap-1">
            <button
              type="button"
              className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                type="button"
                key={pNum}
                onClick={() => setPage(pNum)}
                className={`py-1.5 px-3 text-xs rounded-sm border cursor-pointer ${
                  page === pNum
                    ? 'bg-admin-accent text-white border-admin-accent font-semibold'
                    : 'bg-admin-card text-admin-text-primary border-admin-border font-normal hover:bg-admin-hover'
                }`}
              >
                {pNum}
              </button>
            ))}

            <button
              type="button"
              className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Description Modal */}
      {selectedDesc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[9999]">
          <div className="card-minimal w-[90%] max-w-lg p-6">
            <div className="flex justify-between items-center mb-4 border-b border-admin-border pb-3">
              <h3 className="heading-3">{selectedDesc.name}</h3>
              <button type="button" onClick={() => setSelectedDesc(null)} className="bg-transparent border-none text-admin-text-muted cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="text-admin-text-secondary text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {selectedDesc.description || selectedDesc.shortDescription || 'No description available.'}
            </div>

            <div className="text-right mt-5">
              <button type="button" className="btn-secondary text-xs" onClick={() => setSelectedDesc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductList;
