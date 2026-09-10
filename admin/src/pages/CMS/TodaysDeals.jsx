import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import { Edit2, Trash2 } from 'lucide-react';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads')) return path;
  return `/uploads/${path.replace(/^\//, '')}`;
};

const TodaysDeals = () => {
  const [deals, setDeals] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState('Active');
  const [type, setType] = useState('main_category');

  // CMS configuration fields
  const [gridType, setGridType] = useState('Grid 4');
  const [carouselType, setCarouselType] = useState('non_carousel');
  const [mediaType, setMediaType] = useState('image');
  const [productStyle, setProductStyle] = useState('Grid 4');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [items, setItems] = useState([{ title: '', name: '', image: '', categoryId: '', subCategoryId: '' }]);

  // Category filters
  const [mainCats, setMainCats] = useState([]);
  const [allCats, setAllCats] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
  const [allProds, setAllProds] = useState([]);
  const [selectedMainCatId, setSelectedMainCatId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchDeals();
    loadAllDBData();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await api.get('/cms/todays-deals');
      setDeals(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDeals([]);
    }
  };

  const loadAllDBData = async () => {
    try {
      const [mainRes, catRes, subRes, prodRes] = await Promise.all([
        api.get('/main-categories'),
        api.get('/categories'),
        api.get('/sub-categories').catch(() => api.get('/subcategories')),
        api.get('/products?limit=100')
      ]);
      setMainCats(mainRes.data || []);
      setAllCats(catRes.data || []);
      setAllSubs(subRes.data || []);
      setAllProds(prodRes.data?.products || prodRes.data || []);
    } catch (err) {
      console.error('Failed to load DB details for selectors:', err);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { title: '', name: '', image: '', categoryId: '', subCategoryId: '' }]);
  };

  const handleFileChange = async (index, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/cms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updated = [...items];
      updated[index].image = res.data.imageUrl;
      setItems(updated);
      showToast('Image uploaded successfully!');
    } catch {
      showToast('Image upload failed', 'error');
    }
  };

  const [editingId, setEditingId] = useState(null);

  const handleEditClick = (section) => {
    const secId = section.id || section._id;
    setEditingId(secId);
    setTitle(section.title || '');
    setShortDesc(section.shortDescription || section.shortDesc || '');
    setSeoDesc(section.seoKeywordDescription || section.seoDesc || '');
    setPriority(section.priority ?? section.position ?? 1);
    setStatus(section.status || 'Active');
    setType(section.type || section.selectType || 'main_category');
    setGridType(section.gridType || 'Grid 4');
    setCarouselType(section.carouselType || 'non_carousel');
    setMediaType(section.mediaType || 'image');
    setProductStyle(section.productStyle || 'Grid 4');
    setSelectedProductIds(section.productIds || []);

    if (section.items && section.items.length > 0) {
      setItems(section.items.map(it => {
        const matchingSub = allSubs.find(s => (s.id || s._id) === it.name);
        const catId = matchingSub ? matchingSub.categoryId : '';
        return {
          title: it.title,
          name: it.name,
          image: it.image,
          categoryId: catId,
          subCategoryId: it.name
        };
      }));
    } else {
      setItems([{ title: '', name: '', image: '', categoryId: '', subCategoryId: '' }]);
    }
    showToast('Editing Today Deals section...');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setShortDesc('');
    setSeoDesc('');
    setPriority(1);
    setStatus('Active');
    setType('main_category');
    setGridType('Grid 4');
    setCarouselType('non_carousel');
    setMediaType('image');
    setProductStyle('Grid 4');
    setSelectedProductIds([]);
    setItems([{ title: '', name: '', image: '', categoryId: '', subCategoryId: '' }]);
    showToast('Deals editing cancelled', 'warn');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      const payload = {
        title,
        shortDescription: shortDesc,
        seoKeywordDescription: seoDesc,
        priority,
        status,
        type,
        selectType: type,
        gridType,
        carouselType,
        mediaType,
        productStyle,
        productIds: selectedProductIds,
        items: items.map(it => ({ title: it.title, name: it.name, image: it.image }))
      };

      if (editingId) {
        await api.put(`/cms/todays-deals/${editingId}`, payload);
        showToast('Today Deals section updated!');
      } else {
        await api.post('/cms/todays-deals', payload);
        showToast('Today Deals section created!');
      }

      handleCancelEdit();
      fetchDeals();
    } catch {
      showToast('Failed to save Today Deals section', 'error');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/cms/todays-deals/${id}`, { status: newStatus });
      fetchDeals();
      showToast('Section status updated');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Today Deals section?')) return;
    try {
      await api.delete(`/cms/todays-deals/${id}`);
      fetchDeals();
      showToast('Section deleted');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div>
        <h1 className="heading-1">Today Deals Sections</h1>
      </div>

      {/* Form Card */}
      <div className="card-minimal p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Row 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="form-label">Title *</label>
              <input type="text" className="form-control text-xs" placeholder="e.g. Best Sellers" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Short Description</label>
              <input type="text" className="form-control text-xs" placeholder="Brief subtitle" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Seo Keyword Description *</label>
              <input type="text" className="form-control text-xs" placeholder="SEO tags" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Priority *</label>
              <input type="number" className="form-control text-xs" value={priority} onChange={(e) => setPriority(Number(e.target.value))} required />
            </div>
            <div>
              <label className="form-label">Status *</label>
              <select className="form-control text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Row 2: Select Type and Type Configurations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Select Type *</label>
              <select className="form-control text-xs" value={type} onChange={(e) => { setType(e.target.value); setItems([{ title: '', name: '', image: '', categoryId: '', subCategoryId: '' }]); }}>
                <option value="main_category">Main Category</option>
                <option value="category">Category</option>
                <option value="sub_category">Sub Category</option>
                <option value="product_price">Products With Price</option>
                <option value="products_grid">Products Grid</option>
              </select>
            </div>

            {/* Style Type (Carousel vs Non-Carousel) */}
            <div>
              <label className="form-label">Style Type *</label>
              <select className="form-control text-xs" value={carouselType} onChange={(e) => setCarouselType(e.target.value)}>
                <option value="non_carousel">Non-Carousel Style Type</option>
                <option value="carousel_type">Carousel Style Type</option>
              </select>
            </div>

            {/* Media Type (image vs video) */}
            {(type === 'main_category' || type === 'category' || type === 'sub_category') ? (
              <div>
                <label className="form-label">Media Type *</label>
                <select className="form-control text-xs" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                  <option value="image">image</option>
                  <option value="video">video</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="form-label">Media Type</label>
                <input type="text" className="form-control text-xs bg-admin-subtle" value="image (Product)" disabled />
              </div>
            )}

            {/* Grid Style Dropdown for ALL select types */}
            <div>
              <label className="form-label">Grid Style *</label>
              <select
                className="form-control text-xs"
                value={gridType}
                onChange={(e) => {
                  setGridType(e.target.value);
                  setProductStyle(e.target.value);
                }}
              >
                <option value="Grid 4">Grid 4 (Standard 4 Cols)</option>
                <option value="Grid 1 (Banner)">Grid 1 (Banner)</option>
                <option value="Grid 2 (Mini Banner)">Grid 2 (Mini Banner)</option>
                <option value="Grid 3">Grid 3 (3 Columns)</option>
                <option value="Grid 6">Grid 6 (6 Columns)</option>
                <option value="Filtered Grid">Filtered Grid</option>
              </select>
            </div>
          </div>

          {/* Row 3: Items Multi-Add or Product Checklist */}
          {(type === 'main_category' || type === 'category' || type === 'sub_category' || type === 'products_grid') && (
            <div className="mt-2.5 border-t border-admin-border pt-4">
              <div className="flex flex-col gap-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end bg-admin-subtle p-4 rounded-lg border border-admin-border">

                    <div>
                      <label className="form-label">
                        {type === 'products_grid' ? 'Product Title *' : 'Main Category Title *'}
                      </label>
                      <input
                        type="text"
                        className="form-control text-xs"
                        placeholder={type === 'products_grid' ? 'Product Title' : 'Main Category Title'}
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].title = e.target.value;
                          setItems(updated);
                        }}
                        required
                      />
                    </div>

                    {type === 'main_category' && (
                      <div>
                        <label className="form-label">Main Category Name *</label>
                        <select
                          className="form-control text-xs"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].name = e.target.value;
                            setItems(updated);
                          }}
                          required
                        >
                          <option value="">Select Main category</option>
                          {mainCats.map(m => {
                            const mId = m.id || m._id;
                            return <option key={mId} value={mId}>{m.name}</option>;
                          })}
                        </select>
                      </div>
                    )}

                    {type === 'category' && (
                      <div>
                        <label className="form-label">Main Category Name *</label>
                        <select
                          className="form-control text-xs"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].name = e.target.value;
                            setItems(updated);
                          }}
                          required
                        >
                          <option value="">Select category</option>
                          {allCats
                            .filter(c => !selectedMainCatId || (c.mainCategoryId?._id || c.mainCategoryId?.id || c.mainCategoryId) === selectedMainCatId)
                            .map(c => {
                              const cId = c.id || c._id;
                              return <option key={cId} value={cId}>{c.name}</option>;
                            })}
                        </select>
                      </div>
                    )}

                    {type === 'sub_category' && (
                      <>
                        <div>
                          <label className="form-label">Category Name *</label>
                          <select
                            className="form-control text-xs"
                            value={item.categoryId}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index].categoryId = e.target.value;
                              updated[index].name = '';
                              setItems(updated);
                            }}
                            required
                          >
                            <option value="">Select Category</option>
                            {allCats
                              .filter(c => !selectedMainCatId || (c.mainCategoryId?._id || c.mainCategoryId?.id || c.mainCategoryId) === selectedMainCatId)
                              .map(c => {
                                const cId = c.id || c._id;
                                return <option key={cId} value={cId}>{c.name}</option>;
                              })}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Sub Category Name *</label>
                          <select
                            className="form-control text-xs"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index].name = e.target.value;
                              setItems(updated);
                            }}
                            required
                          >
                            <option value="">Select Sub category</option>
                            {allSubs
                            .filter(s => !item.categoryId || (s.categoryId?._id || s.categoryId?.id || s.categoryId) === item.categoryId)
                            .map(s => {
                              const sId = s.id || s._id;
                              return <option key={sId} value={sId}>{s.name}</option>;
                            })}
                          </select>
                        </div>
                      </>
                    )}

                    {type === 'products_grid' && (
                      <div>
                        <label className="form-label">Product Id's *</label>
                        <select
                          className="form-control text-xs"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[index].name = e.target.value;
                            setItems(updated);
                          }}
                          required
                        >
                          <option value="">Select product</option>
                          {allProds.map(p => {
                            const pId = p.id || p._id;
                            return <option key={pId} value={pId}>{p.name}</option>;
                          })}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="form-label">
                        {type === 'products_grid' ? 'Product Image *' : 'Main Category Image *'}
                      </label>
                      <input
                        type="file"
                        className="form-control text-xs"
                        onChange={(e) => handleFileChange(index, e.target.files[0])}
                      />
                      {item.image && (
                        <div className="mt-1 text-xs text-emerald-600 truncate">
                          Uploaded: {item.image.split('/').pop()}
                        </div>
                      )}
                    </div>

                    <div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-danger p-2"
                          onClick={() => setItems(items.filter((_, i) => i !== index))}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-primary mt-3 py-1.5 px-3 text-xs"
                onClick={handleAddItem}
              >
                {type === 'products_grid' ? '+ Add Product' : '+ Add Category'}
              </button>

            </div>
          )}

          {(type === 'product_price' || type === 'products_grid') && (
            <div className="mt-2.5 relative">
              <label className="form-label">Product Id's *</label>

              {/* Custom search-select input box containing tags */}
              <div
                className="flex flex-wrap items-center gap-1.5 border border-admin-border rounded-md p-2 px-3 bg-admin-card min-h-[40px] cursor-text shadow-xs transition-all"
                onClick={() => setShowDropdown(true)}
              >
                {selectedProductIds.map(id => {
                  const prod = allProds.find(p => (p.id || p._id) === id);
                  if (!prod) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 bg-admin-subtle rounded py-0.5 px-2 text-xs text-admin-text-primary border border-admin-border"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductIds(selectedProductIds.filter(x => x !== id));
                        }}
                        className="border-none bg-transparent cursor-pointer text-admin-text-muted p-0 text-xs inline-flex items-center hover:text-rose-500"
                      >
                        ✕
                      </button>
                      {prod.name}
                    </span>
                  );
                })}
                <input
                  type="text"
                  placeholder={selectedProductIds.length === 0 ? "Search and select products..." : ""}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="border-none outline-hidden flex-1 min-w-[120px] text-xs text-admin-text-primary bg-transparent"
                />
              </div>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-[998]"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div
                    className="absolute top-full left-0 right-0 bg-admin-card border border-admin-border rounded-lg mt-1.5 max-h-48 overflow-y-auto z-[999] shadow-lg p-1"
                  >
                    {allProds
                      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(p => {
                        const pId = p.id || p._id;
                        const isSelected = selectedProductIds.includes(pId);
                        return (
                          <div
                            key={pId}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== pId));
                              } else {
                                setSelectedProductIds([...selectedProductIds, pId]);
                              }
                              setSearchQuery('');
                            }}
                            className={`p-2 px-3 cursor-pointer rounded-md text-xs flex items-center justify-between mb-0.5 font-medium ${
                              isSelected ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 font-semibold' : 'bg-transparent text-admin-text-primary hover:bg-admin-hover'
                            }`}
                          >
                            <span>{p.name}</span>
                            {isSelected && <span className="text-xs">✓</span>}
                          </div>
                        );
                      })}
                    {allProds.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="p-3 text-admin-text-muted text-center text-xs">
                        No matching products found
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end mt-3 gap-2">
            {editingId && (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
            <button type="submit" className="btn-primary text-xs flex items-center gap-1.5">
              {editingId ? '✓ Update Section' : '✓ Add Section'}
            </button>
          </div>

        </form>
      </div>

      <div className="card-minimal p-6">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-15">SNo</th>
                <th>Title</th>
                <th>Type</th>
                <th>Grid Type</th>
                <th>Carousel Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-admin-text-muted p-6">No Today Deals sections added yet</td>
                </tr>
              ) : (
                deals.slice((page - 1) * limit, page * limit).map((item, idx) => {
                  const itemId = item.id || item._id;
                  return (
                    <tr key={itemId || `td-${idx}`}>
                      <td className="font-medium text-admin-text-secondary">{(page - 1) * limit + idx + 1}</td>
                      <td className="font-semibold text-admin-text-primary">{item.title}</td>
                      <td><span className="badge badge-accent">{item.type || item.selectType}</span></td>
                      <td>{item.gridType || 'Grid 4'}</td>
                      <td>{item.carouselType || 'non_carousel'}</td>
                      <td className="font-medium">{item.priority ?? item.position}</td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={item.status === 'Active'}
                            onChange={() => handleToggleStatus(itemId, item.status)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="btn-secondary p-1.5 text-blue-500 mr-2"
                          title="Edit Section"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(itemId)}
                          className="btn-danger p-1.5"
                          title="Delete Section"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(deals.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={deals.length}
          limit={limit}
        />
      </div>

    </div>
  );
};

export default TodaysDeals;
