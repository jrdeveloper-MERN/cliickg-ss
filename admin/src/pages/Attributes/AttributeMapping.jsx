import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Common/Pagination';
import { Trash2, Edit2, Check, RefreshCw, X, Sliders } from 'lucide-react';

const AttributeMapping = () => {
  const [mappings, setMappings] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [selectedMain, setSelectedMain] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedAttributeId, setSelectedAttributeId] = useState('');
  const [activeAttributeObj, setActiveAttributeObj] = useState(null);

  // Dynamic value selections
  const [availableCaptionValues, setAvailableCaptionValues] = useState([]);
  const [selectedValues, setSelectedValues] = useState([]);

  const { showToast, showErrorModal } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [mapRes, mainRes, catRes, subRes, capRes] = await Promise.all([
        api.get('/attribute/mappings'),
        api.get('/main-categories'),
        api.get('/categories'),
        api.get('/sub-categories'),
        api.get('/attribute/captions'),
      ]);
      setMappings(mapRes.data);
      setMainCategories(mainRes.data);
      setAllCategories(catRes.data);
      setAllSubCategories(subRes.data);
      setCaptions(capRes.data);
    } catch (err) {
      showToast('Failed to load Attribute Mappings', 'error');
    }
  };

  const getId = (item) => (item && typeof item === 'object' ? (item._id || item.id || '') : String(item || ''));

  const handleMainChange = (mId) => {
    setSelectedMain(mId);
    if (!mId) {
      setFilteredCategories([]);
      setSelectedCategory('');
      setFilteredSubCategories([]);
      setSelectedSubCategory('');
      return;
    }
    const cats = allCategories.filter(c => getId(c.mainCategoryId) === mId);
    setFilteredCategories(cats);
    setSelectedCategory('');
    setFilteredSubCategories([]);
    setSelectedSubCategory('');
  };

  const handleCategoryChange = (cId) => {
    setSelectedCategory(cId);
    if (!cId) {
      setFilteredSubCategories([]);
      setSelectedSubCategory('');
      return;
    }
    const subs = allSubCategories.filter(s => getId(s.categoryId) === cId);
    setFilteredSubCategories(subs);
    setSelectedSubCategory('');
  };

  const handleAttributeChange = (attrId) => {
    setSelectedAttributeId(attrId);
    setSelectedValues([]);
    if (!attrId) {
      setActiveAttributeObj(null);
      setAvailableCaptionValues([]);
      return;
    }

    const cap = captions.find(c => getId(c) === attrId);
    setActiveAttributeObj(cap);

    if (cap && Array.isArray(cap.values)) {
      const validVals = cap.values
        .map(v => typeof v === 'string' ? v : (v?.value || v?.name))
        .filter(Boolean);
      setAvailableCaptionValues(validVals);
    } else {
      setAvailableCaptionValues([]);
    }
  };

  const handleEditMapping = (m) => {
    const mapId = m._id || m.id;
    setEditingId(mapId);
    const mId = getId(m.mainCategoryId) || getId(m.attributes?.mainCategoryId);
    const cId = getId(m.categoryId) || getId(m.attributes?.categoryId);
    const sId = getId(m.subCategoryId) || getId(m.attributes?.subCategoryId);
    const attrId = getId(m.attributeId) || getId(m.attributes?.attributeId);

    setSelectedMain(mId || '');
    if (mId) {
      const cats = allCategories.filter(c => getId(c.mainCategoryId) === mId);
      setFilteredCategories(cats);
    } else {
      setFilteredCategories([]);
    }

    setSelectedCategory(cId || '');
    if (cId) {
      const subs = allSubCategories.filter(s => getId(s.categoryId) === cId);
      setFilteredSubCategories(subs);
    } else {
      setFilteredSubCategories([]);
    }

    setSelectedSubCategory(sId || '');
    setSelectedAttributeId(attrId || '');

    const cap = captions.find(c => getId(c) === attrId);
    setActiveAttributeObj(cap);

    if (cap && Array.isArray(cap.values)) {
      const validVals = cap.values
        .map(v => typeof v === 'string' ? v : (v?.value || v?.name))
        .filter(Boolean);
      setAvailableCaptionValues(validVals);
    } else {
      setAvailableCaptionValues([]);
    }

    setSelectedValues(m.values || (m.attributes?.values || []));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleCheckbox = (val) => {
    if (selectedValues.includes(val)) {
      setSelectedValues(selectedValues.filter(v => v !== val));
    } else {
      setSelectedValues([...selectedValues, val]);
    }
  };

  const handleRadioSelect = (val) => {
    setSelectedValues([val]);
  };

  const handleMultiSelectDropdownChange = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedValues(options);
  };

  const handleRemoveTag = (val) => {
    setSelectedValues(selectedValues.filter(v => v !== val));
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!selectedMain || !selectedCategory || !selectedSubCategory || !selectedAttributeId) {
      showToast('Please select all required Category and Attribute fields', 'error');
      return;
    }
    if (selectedValues.length === 0) {
      showToast('Please select at least one value', 'error');
      return;
    }

    try {
      if (editingId) {
        const res = await api.put(`/attribute/mappings/${editingId}`, {
          mainCategoryId: selectedMain,
          categoryId: selectedCategory,
          subCategoryId: selectedSubCategory,
          attributeId: selectedAttributeId,
          values: selectedValues,
        });

        setMappings(mappings.map(map => map._id === editingId ? res.data : map));
        showToast('Attribute Mapping updated successfully');
      } else {
        const res = await api.post('/attribute/mappings', {
          mainCategoryId: selectedMain,
          categoryId: selectedCategory,
          subCategoryId: selectedSubCategory,
          attributeId: selectedAttributeId,
          values: selectedValues,
        });

        setMappings([res.data, ...mappings]);
        showToast('Attribute Mapping saved successfully');
      }
      handleClearForm();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save mapping', 'error');
    }
  };

  const handleClearForm = () => {
    setEditingId(null);
    setSelectedMain('');
    setFilteredCategories([]);
    setSelectedCategory('');
    setFilteredSubCategories([]);
    setSelectedSubCategory('');
    setSelectedAttributeId('');
    setActiveAttributeObj(null);
    setAvailableCaptionValues([]);
    setSelectedValues([]);
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Delete this attribute mapping?')) return;
    try {
      await api.delete(`/attribute/mappings/${id}`);
      setMappings(mappings.filter(m => m._id !== id));
      showToast('Mapping deleted successfully');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to delete mapping';
      showErrorModal({
        title: 'Cannot Delete Attribute Mapping',
        message: msg,
      });
    }
  };

  const inputType = activeAttributeObj?.inputType || 'checkbox';

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-black">Add Attribute Mapping</h1>
      </div>

      {/* Form Card */}
      <div className="card-minimal p-6">
        <h3 className="text-base font-semibold text-admin-text-primary mb-5">
          {editingId ? 'Edit Attribute Mapping' : 'Configure Attribute Association'}
        </h3>
        <form onSubmit={handleSaveMapping} className="flex flex-col gap-5">
          {/* Row 1: Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="form-label">Main Category *</label>
              <select className="form-control" value={selectedMain} onChange={(e) => handleMainChange(e.target.value)} required>
                <option value="">Select Main Category</option>
                {mainCategories.map(m => (
                  <option key={m._id || m.id} value={m._id || m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Category *</label>
              <select className="form-control" value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)} required disabled={!selectedMain}>
                <option value="">Select Category</option>
                {filteredCategories.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Sub Category *</label>
              <select className="form-control" value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} required disabled={!selectedCategory}>
                <option value="">Select Sub Category</option>
                {filteredSubCategories.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Attribute Dropdown */}
          <div className="w-full md:w-1/3">
            <label className="form-label">Attribute *</label>
            <select className="form-control" value={selectedAttributeId} onChange={(e) => handleAttributeChange(e.target.value)} required>
              <option value="">Select Attribute Caption</option>
              {captions.map(cap => (
                <option key={cap._id || cap.id} value={cap._id || cap.id}>{cap.caption}</option>
              ))}
            </select>
          </div>

          {/* Row 3: Dynamic Input Render based on inputType */}
          {activeAttributeObj && (
            <div className="bg-admin-subtle p-5 rounded-xl border border-admin-border">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-amber-500 m-0">
                  Values for "{activeAttributeObj.caption}"
                </label>
              </div>

              {availableCaptionValues.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-amber-600 font-medium m-0">
                    No predefined option values in caption "{activeAttributeObj.caption}". Type allowed values below (separated by commas):
                  </p>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="e.g. 14mm, 16mm, 18mm, 20mm or S, M, L, XL"
                    value={selectedValues.join(', ')}
                    onChange={(e) => {
                      const vals = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                      setSelectedValues(vals);
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* CHECKBOX GROUP TYPE */}
                  {inputType === 'checkbox' && (
                    <div className="flex flex-wrap gap-4">
                      {availableCaptionValues.map((val, idx) => (
                        <label key={idx} className="flex items-center gap-2 text-sm text-admin-text-primary cursor-pointer bg-admin-card py-1.5 px-3 rounded-md border border-admin-border">
                          <input
                            type="checkbox"
                            checked={selectedValues.includes(val)}
                            onChange={() => handleToggleCheckbox(val)}
                          />
                          <span className="font-medium">{val}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* RADIO BUTTONS TYPE */}
                  {inputType === 'radio' && (
                    <div className="flex flex-wrap gap-4">
                      {availableCaptionValues.map((val, idx) => (
                        <label key={idx} className="flex items-center gap-2 text-sm text-admin-text-primary cursor-pointer bg-admin-card py-1.5 px-3 rounded-md border border-admin-border">
                          <input
                            type="radio"
                            name="attributeRadioGroup"
                            checked={selectedValues.includes(val)}
                            onChange={() => handleRadioSelect(val)}
                          />
                          <span className="font-medium">{val}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* MULTI-SELECT DROPDOWN TYPE WITH TAG PILLS */}
                  {inputType === 'multiselect' && (
                    <div className="flex flex-col gap-3">
                      <select
                        multiple
                        className="form-control h-32"
                        value={selectedValues}
                        onChange={handleMultiSelectDropdownChange}
                      >
                        {availableCaptionValues.map((val, idx) => (
                          <option key={idx} value={val} className="py-1 px-2">
                            {val}
                          </option>
                        ))}
                      </select>

                      {/* Selected Tags Display */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-xs text-admin-text-muted self-center mr-1.5">
                          Selected ({selectedValues.length}):
                        </span>
                        {selectedValues.map((tag, idx) => (
                          <span key={idx} className="bg-amber-500/15 text-amber-500 border border-amber-500/30 py-0.5 px-2 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => handleRemoveTag(tag)} className="bg-transparent border-none text-amber-500 cursor-pointer p-0 flex items-center">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Row 4: Action Buttons */}
          <div className="flex justify-end gap-2.5 mt-2">
            <button type="submit" className="btn-primary flex items-center gap-1.5">
              <Check size={16} /> {editingId ? 'Update Mapping' : 'Save Mapping'}
            </button>
            <button type="button" className="btn-secondary flex items-center gap-1.5" onClick={handleClearForm}>
              <RefreshCw size={16} /> Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="card-minimal p-6">
        <h3 className="text-base font-semibold mb-4 text-admin-text-primary">Active Mappings</h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Img</th>
                <th>Main Category</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Attribute</th>
                <th>Values</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-admin-text-muted p-6">No Attribute Mappings created yet</td></tr>
              ) : (
                mappings.slice((page - 1) * limit, page * limit).map((m, mIdx) => (
                  <tr key={m._id || m.id || `am-${mIdx}`}>
                    <td>
                      {m.attributeId?.image ? (
                        <img src={getImageUrl(m.attributeId.image)} alt={m.attributeId?.caption} className="w-8 h-8 rounded-md object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
                          <Sliders size={14} className="text-amber-500" />
                        </div>
                      )}
                    </td>
                    {(() => {
                      const mainName = m.mainCategoryId?.name || mainCategories.find(x => (x._id || x.id) === (m.mainCategoryId?._id || m.mainCategoryId || m.attributes?.mainCategoryId))?.name || 'N/A';
                      const catName = m.categoryId?.name || allCategories.find(x => (x._id || x.id) === (m.categoryId?._id || m.categoryId || m.attributes?.categoryId))?.name || 'N/A';
                      const subName = m.subCategoryId?.name || allSubCategories.find(x => (x._id || x.id) === (m.subCategoryId?._id || m.subCategoryId || m.attributes?.subCategoryId))?.name || 'N/A';
                      const attrCaption = m.attributeId?.caption || captions.find(x => (x._id || x.id) === (m.attributeId?._id || m.attributeId || m.attributes?.attributeId))?.caption || 'N/A';
                      const valList = (Array.isArray(m.values) && m.values.length > 0 ? m.values : (m.attributes?.values || [])).filter(Boolean);

                      return (
                        <>
                          <td><span className="badge badge-accent">{mainName}</span></td>
                          <td><span className="badge badge-success">{catName}</span></td>
                          <td className="font-semibold">{subName}</td>
                          <td className="font-bold text-amber-500">{attrCaption}</td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {valList.length > 0 ? valList.map((v, idx) => (
                                <span key={idx} className="bg-amber-500/10 text-admin-text-primary border border-amber-500/30 py-0.5 px-2 rounded text-xs">
                                  {v}
                                </span>
                              )) : 'N/A'}
                            </div>
                          </td>
                        </>
                      );
                    })()}
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-secondary p-1.5" onClick={() => handleEditMapping(m)} title="Edit Mapping">
                          <Edit2 size={15} className="text-blue-500" />
                        </button>
                        <button className="btn-danger p-1.5" onClick={() => handleDeleteMapping(m._id || m.id)} title="Delete Mapping">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(mappings.length / limit) || 1}
          onPageChange={(p) => setPage(p)}
          totalItems={mappings.length}
          limit={limit}
        />
      </div>
    </div>
  );
};

export default AttributeMapping;
