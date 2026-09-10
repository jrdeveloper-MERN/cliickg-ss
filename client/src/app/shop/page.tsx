'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import ProductGrid from '../../components/products/ProductGrid';
import productService from '../../services/product.service';
import categoryService from '../../services/category.service';
import { Product } from '../../types/products/product.types';
import { Category, AttributeCaption } from '../../types/categories/category.types';
import ErrorState from '../../components/ui/ErrorState/ErrorState';
import { parseAppError, isNetworkOrServerDown, AppError } from '../../utils/error-handler.utils';
import { calculatePricing } from '../../utils/pricing.utils';

// True Dual-Thumb Range Slider Component (Two Handles on a Single Track)
const TrueDualRangeSlider: React.FC<{
  min?: number;
  max?: number;
  minValue: number;
  maxValue: number;
  step?: number;
  onChange: (vals: { min: number; max: number }) => void;
}> = ({
  min = 0,
  max = 1000000,
  minValue,
  maxValue,
  step = 1000,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<string | null>(null);

  const minPercent = Math.max(0, Math.min(100, ((minValue - min) / (max - min || 1)) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxValue - min) / (max - min || 1)) * 100));

  const getValueFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return min;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = (clientX - rect.left) / rect.width;
      const clampedPos = Math.max(0, Math.min(1, pos));
      const rawVal = min + clampedPos * (max - min);
      const steppedVal = Math.round(rawVal / step) * step;
      return Math.max(min, Math.min(max, steppedVal));
    },
    [min, max, step]
  );

  const handlePointerDown = (type: string, e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = type;

    const handlePointerMove = (moveEvent: PointerEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX =
        (moveEvent as PointerEvent).clientX ??
        (moveEvent as TouchEvent).touches?.[0]?.clientX ??
        0;
      const val = getValueFromClientX(clientX);

      if (isDraggingRef.current === 'min') {
        const nextMin = Math.min(val, maxValue - step);
        onChange({ min: nextMin, max: maxValue });
      } else if (isDraggingRef.current === 'max') {
        const nextMax = Math.max(val, minValue + step);
        onChange({ min: minValue, max: nextMax });
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  };

  const handleTrackClick = (e: React.PointerEvent) => {
    if (isDraggingRef.current) return;
    const clientX = e.clientX;
    const clickVal = getValueFromClientX(clientX);

    const distToMin = Math.abs(clickVal - minValue);
    const distToMax = Math.abs(clickVal - maxValue);

    if (distToMin <= distToMax) {
      const nextMin = Math.min(clickVal, maxValue - step);
      onChange({ min: nextMin, max: maxValue });
    } else {
      const nextMax = Math.max(clickVal, minValue + step);
      onChange({ min: minValue, max: nextMax });
    }
  };

  return (
    <div className="py-1.5">
      {/* Track & Two Handles */}
      <div
        ref={containerRef}
        onPointerDown={handleTrackClick}
        className="relative w-full h-6 flex items-center cursor-pointer touch-none"
      >
        {/* Background Track */}
        <div className="absolute w-full h-1.5 rounded-full bg-slate-200" />

        {/* Selected Range Highlight */}
        <div
          className="absolute h-1.5 rounded-full bg-primary"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Left Thumb Handle (Minimum Price) */}
        <div
          onPointerDown={(e) => handlePointerDown('min', e)}
          onTouchStart={(e) => handlePointerDown('min', e)}
          className="absolute -translate-x-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-primary shadow-[0_2px_6px_rgba(0,0,0,0.18)] cursor-grab z-10 touch-none"
          style={{ left: `${minPercent}%` }}
          title={`Minimum Price: ₹${minValue.toLocaleString('en-IN')}`}
        />

        {/* Right Thumb Handle (Maximum Price) */}
        <div
          onPointerDown={(e) => handlePointerDown('max', e)}
          onTouchStart={(e) => handlePointerDown('max', e)}
          className="absolute -translate-x-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-primary shadow-[0_2px_6px_rgba(0,0,0,0.18)] cursor-grab z-11 touch-none"
          style={{ left: `${maxPercent}%` }}
          title={`Maximum Price: ₹${maxValue.toLocaleString('en-IN')}`}
        />
      </div>

      {/* Manual Input Fields for User Stepper / Type Increment */}
      <div className="flex items-center justify-between gap-2 mt-3">
        {/* Min Manual Input Box */}
        <div className="flex flex-col flex-1">
          <label className="text-[0.68rem] text-slate-500 font-bold uppercase mb-1">
            Min (₹)
          </label>
          <input
            type="number"
            min={min}
            max={maxValue - step}
            step={step}
            value={minValue}
            onChange={(e) => {
              const raw = e.target.value === '' ? 0 : Number(e.target.value);
              const val = Math.max(min, Math.min(raw, maxValue - step));
              onChange({ min: val, max: maxValue });
            }}
            className="w-full py-1.5 px-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-md outline-none bg-white shadow-inner"
          />
        </div>

        <span className="text-slate-300 font-bold mt-3.5 text-sm">—</span>

        {/* Max Manual Input Box */}
        <div className="flex flex-col flex-1">
          <label className="text-[0.68rem] text-slate-500 font-bold uppercase mb-1">
            Max (₹)
          </label>
          <input
            type="number"
            min={minValue + step}
            max={max}
            step={step}
            value={maxValue}
            onChange={(e) => {
              const raw = e.target.value === '' ? max : Number(e.target.value);
              const val = Math.min(max, Math.max(raw, minValue + step));
              onChange({ min: minValue, max: val });
            }}
            className="w-full py-1.5 px-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-md outline-none bg-white shadow-inner"
          />
        </div>
      </div>

      {/* Dynamic Range Label */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-400 font-semibold">
        <span>₹{min.toLocaleString('en-IN')}</span>
        <span>Scale Max: 10 Lac (₹{max.toLocaleString('en-IN')})</span>
      </div>
    </div>
  );
};

function ShopContent() {
  const searchParams = useSearchParams();

  const queryCategory =
    searchParams.get('category') || searchParams.get('mainCategory') || searchParams.get('subCategory') || '';
  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
  const paramMinPrice = searchParams.get('minPrice');
  const paramMaxPrice = searchParams.get('maxPrice');
  const priceSort = searchParams.get('sort') || '';

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributeCaptions, setAttributeCaptions] = useState<AttributeCaption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<AppError | null>(null);

  const [dbMinPrice, setDbMinPrice] = useState(0);
  const [dbMaxPrice, setDbMaxPrice] = useState(1000000);

  const [minPrice, setMinPrice] = useState(paramMinPrice ? Number(paramMinPrice) : 0);
  const [maxPrice, setMaxPrice] = useState(paramMaxPrice ? Number(paramMaxPrice) : 1000000);

  const [sliderMin, setSliderMin] = useState(paramMinPrice ? Number(paramMinPrice) : 0);
  const [sliderMax, setSliderMax] = useState(paramMaxPrice ? Number(paramMaxPrice) : 1000000);

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const [key, val] of searchParams.entries()) {
      if (['category', 'mainCategory', 'subCategory', 'q', 'search', 'minPrice', 'maxPrice', 'sort'].includes(key))
        continue;
      if (val) {
        initial[key] = val.split(',').map((v) => v.trim()).filter(Boolean);
      }
    }
    return initial;
  });

  const [selectedCategory, setSelectedCategory] = useState(queryCategory);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    setSelectedCategory(queryCategory);
  }, [queryCategory]);

  const fetchMetadata = async () => {
    try {
      const [catList, captionList] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getAttributeCaptions(),
      ]);
      setCategories((catList || []).filter((c: any) => c.status === 'Active' || c.isActive !== false));
      setAttributeCaptions((captionList || []).filter((c: any) => c.status === 'Active' || c.isActive !== false));
    } catch (err) {
      console.error('Error fetching filter metadata:', err);
    }
  };

  const getProductPrice = useCallback((p: Product) => {
    const details = p.productDetails || p.variants || [];
    const first = (details && details.length > 0 ? details[0] : p) as any;
    const prodAny = p as any;
    const activeDetail = {
      ...prodAny,
      ...first,
      mrp: first.mrp !== undefined && first.mrp !== '' ? first.mrp : prodAny.mrp,
      offerPrice:
        first.offerPrice !== undefined && first.offerPrice !== ''
          ? first.offerPrice
          : (first.sellingPrice || first.price || prodAny.sellingPrice || prodAny.price),
      enableGst:
        first.enableGst !== undefined
          ? first.enableGst
          : first.attributes?.pricingConfig?.enableGst !== undefined
            ? first.attributes.pricingConfig.enableGst
            : prodAny.enableGst !== undefined
              ? prodAny.enableGst
              : true,
      gstMode:
        first.gstMode ||
        first.attributes?.pricingConfig?.gstMode ||
        prodAny.gstMode ||
        'EXCLUSIVE',
      gstType:
        first.gstType ||
        first.attributes?.pricingConfig?.gstType ||
        prodAny.gstType ||
        'CGST + SGST',
      finalGstRate:
        first.gst !== undefined && first.gst !== ''
          ? first.gst
          : prodAny.finalGstRate !== undefined && prodAny.finalGstRate !== ''
            ? prodAny.finalGstRate
            : prodAny.gst !== undefined
              ? prodAny.gst
              : 0,
    };
    const pricing = calculatePricing(activeDetail);
    const finalPrice = Number(pricing.finalPayablePrice || pricing.finalPrice || 0);
    if (finalPrice > 0) return finalPrice;
    if (p.sellingPrice && Number(p.sellingPrice) > 0) return Number(p.sellingPrice);
    if (p.price && Number(p.price) > 0) return Number(p.price);
    return 0;
  }, []);

  const productsWithPrices = useMemo(() => {
    return allProducts.map((p) => ({
      product: p,
      price: getProductPrice(p),
    }));
  }, [allProducts, getProductPrice]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await productService.getProducts({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 200,
      });
      const rawList = res.data || [];
      setAllProducts(rawList);

      if (rawList.length > 0) {
        const prices = rawList.map((p) => getProductPrice(p)).filter((p) => p > 0);
        if (prices.length > 0) {
          const calculatedMax = Math.max(1000000, Math.ceil(Math.max(...prices)));
          setDbMinPrice(0);
          setDbMaxPrice(calculatedMax);

          if (!paramMinPrice) setMinPrice(0);
          if (!paramMaxPrice) setMaxPrice((prev) => (prev === 1000000 ? calculatedMax : prev));
          if (!paramMinPrice) setSliderMin(0);
          if (!paramMaxPrice) setSliderMax((prev) => (prev === 1000000 ? calculatedMax : prev));
        }
      } else {
        setDbMinPrice(0);
        setDbMaxPrice(1000000);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      if (isNetworkOrServerDown(err)) {
        setPageError(parseAppError(err));
      } else {
        setAllProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, paramMinPrice, paramMaxPrice, getProductPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateUrlParams = useCallback(
    (
      newFilters: Record<string, string[]>,
      newCategory: string,
      newMin: number,
      newMax: number,
      newSort: string
    ) => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (newCategory) params.set('category', newCategory);
      if (newMin > dbMinPrice) params.set('minPrice', String(newMin));
      if (newMax < dbMaxPrice) params.set('maxPrice', String(newMax));
      if (newSort) params.set('sort', newSort);

      Object.entries(newFilters).forEach(([cap, vals]) => {
        if (vals && vals.length > 0) {
          params.set(cap, vals.join(','));
        }
      });

      const queryStr = params.toString();
      const newPath = queryStr ? `/shop?${queryStr}` : '/shop';
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', newPath);
      }
    },
    [searchQuery, dbMinPrice, dbMaxPrice]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setMinPrice(sliderMin);
      setMaxPrice(sliderMax);
      updateUrlParams(selectedFilters, selectedCategory, sliderMin, sliderMax, priceSort);
    }, 200);
    return () => clearTimeout(handler);
  }, [sliderMin, sliderMax]);

  const matchesCaptionValue = useCallback((p: Product, captionName: string, val: string) => {
    const cleanVal = String(val).toLowerCase().trim();
    const cleanCap = String(captionName).toLowerCase().trim();

    const matchesObj = (obj: any) => {
      if (!obj) return false;

      if (cleanCap === 'gender') {
        if (obj.gender && String(obj.gender).toLowerCase().trim() === cleanVal) return true;
      }
      if (cleanCap === 'metal' || cleanCap === 'metal color' || cleanCap === 'color') {
        const col = obj.metalType || obj.metal || obj.color;
        if (col && String(col).toLowerCase().trim() === cleanVal) return true;
      }
      if (cleanCap === 'purity' || cleanCap === 'metal purity') {
        if (obj.purity && String(obj.purity).toLowerCase().trim() === cleanVal) return true;
      }

      if (obj.attributes) {
        let attrVal: any = null;
        if (typeof obj.attributes.get === 'function') {
          attrVal = obj.attributes.get(captionName);
        } else if (typeof obj.attributes === 'object') {
          attrVal = obj.attributes[captionName];
        }
        if (attrVal && String(attrVal).toLowerCase().trim() === cleanVal) return true;
      }

      return false;
    };

    if (matchesObj(p)) return true;
    const details = p.productDetails || p.variants;
    if (Array.isArray(details) && details.some((v) => matchesObj(v))) return true;

    return false;
  }, []);

  const filteredProducts = useMemo(() => {
    let result = productsWithPrices.filter((item) => item.price >= sliderMin && item.price <= sliderMax);

    Object.entries(selectedFilters).forEach(([captionName, selectedVals]) => {
      if (!selectedVals || selectedVals.length === 0) return;
      result = result.filter((item) =>
        selectedVals.some((val) => matchesCaptionValue(item.product, captionName, val))
      );
    });

    const finalProducts = result.map((item) => item.product);

    if (priceSort === 'lowToHigh' || priceSort === 'price_asc') {
      finalProducts.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    } else if (priceSort === 'highToLow' || priceSort === 'price_desc') {
      finalProducts.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    }

    return finalProducts;
  }, [productsWithPrices, sliderMin, sliderMax, selectedFilters, priceSort, getProductPrice, matchesCaptionValue]);

  const displayFilterGroups = useMemo(() => {
    const groupsMap: Record<string, Map<string, { _id: string; value: string }>> = {};

    (attributeCaptions || []).forEach((cap) => {
      const groupName = cap.caption || cap.name;
      if (!groupName) return;
      if (!groupsMap[groupName]) {
        groupsMap[groupName] = new Map();
      }
      if (Array.isArray(cap.values)) {
        cap.values.forEach((v: any) => {
          const valStr = typeof v === 'string' ? v : v?.value || v?.name || '';
          if (valStr && String(valStr).trim()) {
            const clean = String(valStr).trim();
            groupsMap[groupName].set(clean, { _id: v?._id || clean, value: clean });
          }
        });
      }
    });

    (allProducts || []).forEach((p) => {
      if (p.gender && String(p.gender).trim()) {
        const gen = String(p.gender).trim();
        if (!groupsMap['Gender']) groupsMap['Gender'] = new Map();
        groupsMap['Gender'].set(gen, { _id: `gen-${gen}`, value: gen });
      }

      if (p.attributes) {
        const entries = Object.entries(p.attributes);
        entries.forEach(([key, val]) => {
          if (
            key &&
            key !== 'pricingConfig' &&
            !key.startsWith('_') &&
            typeof val !== 'object' &&
            !Array.isArray(val) &&
            val !== null &&
            val !== undefined &&
            String(val).trim() &&
            String(val).trim() !== '[object Object]'
          ) {
            const groupName = String(key).trim();
            const valStr = String(val).trim();
            if (!groupsMap[groupName]) groupsMap[groupName] = new Map();
            groupsMap[groupName].set(valStr, { _id: `attr-${groupName}-${valStr}`, value: valStr });
          }
        });
      }

      const details = p.productDetails || p.variants || [];
      if (Array.isArray(details)) {
        details.forEach((v: any) => {
          if (v.grade && String(v.grade).trim()) {
            const grd = String(v.grade).trim();
            if (!groupsMap['Grade']) groupsMap['Grade'] = new Map();
            groupsMap['Grade'].set(grd, { _id: `grd-${grd}`, value: grd });
          }
          if (v.material && String(v.material).trim()) {
            const mat = String(v.material).trim();
            if (!groupsMap['Material']) groupsMap['Material'] = new Map();
            groupsMap['Material'].set(mat, { _id: `mat-${mat}`, value: mat });
          }
          if ((v.metalType || v.metal) && String(v.metalType || v.metal).trim()) {
            const met = String(v.metalType || v.metal).trim();
            if (!groupsMap['Material Type']) groupsMap['Material Type'] = new Map();
            groupsMap['Material Type'].set(met, { _id: `met-${met}`, value: met });
          }
          if (v.attributes) {
            const entries = Object.entries(v.attributes);
            entries.forEach(([key, val]: [string, any]) => {
              if (
                key &&
                key !== 'pricingConfig' &&
                !key.startsWith('_') &&
                typeof val !== 'object' &&
                !Array.isArray(val) &&
                val !== null &&
                val !== undefined &&
                String(val).trim() &&
                String(val).trim() !== '[object Object]'
              ) {
                const groupName = String(key).trim();
                const valStr = String(val).trim();
                if (!groupsMap[groupName]) groupsMap[groupName] = new Map();
                groupsMap[groupName].set(valStr, { _id: `var-${groupName}-${valStr}`, value: valStr });
              }
            });
          }
        });
      }
    });

    const result: Array<{ caption: string; values: Array<{ _id: string; value: string }> }> = [];
    Object.entries(groupsMap).forEach(([captionName, valMap]) => {
      if (captionName === 'pricingConfig' || captionName.startsWith('_')) return;
      const valuesList = Array.from(valMap.values()).filter((v) => v.value && v.value !== '[object Object]');
      if (valuesList.length > 0) {
        result.push({
          caption: captionName,
          values: valuesList,
        });
      }
    });

    return result;
  }, [attributeCaptions, allProducts]);

  const optionCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!productsWithPrices || productsWithPrices.length === 0) return counts;

    const priceFiltered = productsWithPrices.filter((item) => item.price >= sliderMin && item.price <= sliderMax);

    displayFilterGroups.forEach((group) => {
      group.values.forEach((val) => {
        const key = `${group.caption}:::${val.value}`;
        let count = 0;
        for (let i = 0; i < priceFiltered.length; i++) {
          const p = priceFiltered[i].product;
          let matchesOther = true;
          for (const [otherCap, otherVals] of Object.entries(selectedFilters)) {
            if (otherCap === group.caption || !otherVals || otherVals.length === 0) continue;
            if (!otherVals.some((v) => matchesCaptionValue(p, otherCap, v))) {
              matchesOther = false;
              break;
            }
          }
          if (matchesOther && matchesCaptionValue(p, group.caption, val.value)) {
            count++;
          }
        }
        counts[key] = count;
      });
    });

    return counts;
  }, [productsWithPrices, sliderMin, sliderMax, selectedFilters, displayFilterGroups, matchesCaptionValue]);

  const handleFilterToggle = (captionName: string, value: string) => {
    setSelectedFilters((prev) => {
      const current = prev[captionName] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      const nextState = { ...prev };
      if (updated.length > 0) {
        nextState[captionName] = updated;
      } else {
        delete nextState[captionName];
      }

      updateUrlParams(nextState, selectedCategory, sliderMin, sliderMax, priceSort);
      return nextState;
    });
  };

  const handleRemovePill = (captionName: string, val: string) => {
    handleFilterToggle(captionName, val);
  };

  const toggleAccordion = (name: string) => {
    setOpenAccordions((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleClearAll = () => {
    setSelectedFilters({});
    setSelectedCategory('');
    setMinPrice(dbMinPrice);
    setMaxPrice(dbMaxPrice);
    setSliderMin(dbMinPrice);
    setSliderMax(dbMaxPrice);
    updateUrlParams({}, '', dbMinPrice, dbMaxPrice, priceSort);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(selectedFilters).forEach((vals) => {
      count += vals.length;
    });
    if (selectedCategory) count++;
    if (sliderMin > dbMinPrice || sliderMax < dbMaxPrice) count++;
    return count;
  }, [selectedFilters, selectedCategory, sliderMin, sliderMax, dbMinPrice, dbMaxPrice]);

  const renderFilterSidebar = () => (
    <div className="flex flex-col gap-5">
      {/* Sidebar Header with Clear All Button */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary" />
          <h3 className="text-lg font-bold font-serif text-slate-800 m-0">
            Filters & Refine
          </h3>
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="bg-transparent border-none text-secondary hover:underline text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 1. DUAL MIN/MAX PRICE RANGE SLIDER */}
      <div className="border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={() => toggleAccordion('price')}
          className="w-full bg-transparent border-none flex items-center justify-between cursor-pointer p-0 text-left text-slate-800 mb-3"
        >
          <span className="text-sm font-semibold font-sans">
            Price Range (₹)
          </span>
          {openAccordions['price'] !== false ? (
            <ChevronUp size={16} className="text-slate-500" />
          ) : (
            <ChevronDown size={16} className="text-slate-500" />
          )}
        </button>

        {openAccordions['price'] !== false && (
          <TrueDualRangeSlider
            min={dbMinPrice}
            max={dbMaxPrice}
            minValue={sliderMin}
            maxValue={sliderMax}
            step={500}
            onChange={({ min, max }) => {
              setSliderMin(min);
              setSliderMax(max);
            }}
          />
        )}
      </div>

      {/* 2. DYNAMIC ATTRIBUTE FILTER ACCORDIONS LOADED FROM MONGODB */}
      {displayFilterGroups.map((caption) => {
        const hasSelection = Boolean(
          selectedFilters[caption.caption] && selectedFilters[caption.caption].length > 0
        );
        const isOpen = openAccordions[caption.caption] ?? hasSelection;

        return (
          <div key={caption.caption} className="border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => toggleAccordion(caption.caption)}
              className="w-full bg-transparent border-none flex items-center justify-between cursor-pointer p-0 text-left text-slate-800"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm ${
                    hasSelection ? 'font-bold text-primary' : 'font-semibold text-slate-800'
                  }`}
                >
                  {caption.caption}
                </span>
                {hasSelection && (
                  <span className="text-[0.68rem] bg-rose-50 text-primary rounded-full w-4.5 h-4.5 inline-flex items-center justify-center font-extrabold">
                    {selectedFilters[caption.caption].length}
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            {isOpen && (
              <div className="flex flex-col gap-2 text-xs mt-3 max-h-56 overflow-y-auto">
                {caption.values.map((val) => {
                  const isChecked = Boolean(selectedFilters[caption.caption]?.includes(val.value));
                  const count = optionCountsMap[`${caption.caption}:::${val.value}`] || 0;

                  return (
                    <label
                      key={val._id || val.value}
                      className={`flex items-center justify-between cursor-pointer py-0.5 ${
                        isChecked ? 'text-primary font-semibold' : 'text-slate-600 font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleFilterToggle(caption.caption, val.value)}
                          className="accent-primary w-4 h-4 cursor-pointer"
                        />
                        <span>{val.value}</span>
                      </div>
                      <span className="text-xs text-slate-400">({count})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 3. SHOP CATEGORY ACCORDION */}
      {categories.length > 0 && (
        <div className="border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => toggleAccordion('category')}
            className="w-full bg-transparent border-none flex items-center justify-between cursor-pointer p-0 text-left text-slate-800"
          >
            <span
              className={`text-sm ${
                selectedCategory ? 'font-bold text-primary' : 'font-semibold text-slate-800'
              }`}
            >
              Category
            </span>
            {openAccordions['category'] ?? Boolean(selectedCategory) ? (
              <ChevronUp size={16} className="text-slate-500" />
            ) : (
              <ChevronDown size={16} className="text-slate-500" />
            )}
          </button>

          {(openAccordions['category'] ?? Boolean(selectedCategory)) && (
            <div className="flex flex-col gap-2 text-xs mt-3 max-h-44 overflow-y-auto">
              {categories.map((cat) => (
                <label
                  key={cat.id || cat._id}
                  className={`flex items-center gap-2 cursor-pointer ${
                    selectedCategory === cat.name ? 'text-primary font-semibold' : 'text-slate-600 font-normal'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategory === cat.name}
                    onChange={() => {
                      const nextCat = selectedCategory === cat.name ? '' : cat.name;
                      setSelectedCategory(nextCat);
                      updateUrlParams(selectedFilters, nextCat, minPrice, maxPrice, priceSort);
                    }}
                    className="accent-primary w-4 h-4"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (pageError) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center">
        <ErrorState error={pageError} onRetry={fetchProducts} fullPage />
      </div>
    );
  }

  return (
    <div className="w-[min(100%-2rem,1360px)] md:w-[min(100%-3rem,1360px)] mx-auto py-8">
      {/* Mobile Sticky Filter Trigger Button */}
      <div className="flex lg:hidden mb-4 justify-between items-center">
        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className="inline-flex items-center gap-2 bg-white border border-primary text-primary py-2 px-5 rounded-full text-sm font-bold shadow-sm cursor-pointer"
        >
          <SlidersHorizontal size={16} />
          <span>Filters & Refine {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10">
        {/* Desktop Left Sidebar Filter */}
        <div className="hidden lg:block bg-white p-6 rounded-2xl border border-slate-100 h-fit shadow-[0_4px_20px_rgba(0,0,0,0.02)] sticky top-[90px]">
          {renderFilterSidebar()}
        </div>

        {/* Main Product Catalog Section */}
        <div>
          {/* Header Title & Sorting */}
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4 flex-wrap gap-4">
            <div>
              <h2 className="font-serif text-3xl font-normal text-slate-800 m-0">
                {searchQuery ? `Search Results: "${searchQuery}"` : selectedCategory ? selectedCategory : 'All Products'}
              </h2>
              <span className="text-xs text-slate-500">
                Showing {filteredProducts.length} items
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Sort by:</span>
              <select
                value={priceSort}
                onChange={(e) => {
                  const newSort = e.target.value;
                  updateUrlParams(selectedFilters, selectedCategory, minPrice, maxPrice, newSort);
                }}
                className="border border-slate-200 rounded-md py-1.5 px-3 outline-none text-sm font-semibold text-slate-800 bg-white cursor-pointer"
              >
                <option value="">Default Sorting</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* ACTIVE FILTER PILLS/TAGS ROW */}
          {activeFilterCount > 0 && (
            <div className="flex items-center flex-wrap gap-2 mb-5">
              <span className="text-xs font-bold text-slate-500">Active Filters:</span>

              {/* Category Pill */}
              {selectedCategory && (
                <div className="inline-flex items-center gap-1.5 bg-primary-light text-primary border border-primary-border py-1 px-2.5 rounded-full text-xs font-semibold">
                  <span>Category: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('');
                      updateUrlParams(selectedFilters, '', minPrice, maxPrice, priceSort);
                    }}
                    className="bg-transparent border-none text-primary hover:text-secondary cursor-pointer flex items-center p-0 ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Price Pill */}
              {(minPrice > dbMinPrice || maxPrice < dbMaxPrice) && (
                <div className="inline-flex items-center gap-1.5 bg-primary-light text-primary border border-primary-border py-1 px-2.5 rounded-full text-xs font-semibold">
                  <span>
                    Price: ₹{minPrice.toLocaleString('en-IN')} - ₹{maxPrice.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(dbMinPrice);
                      setMaxPrice(dbMaxPrice);
                      setSliderMin(dbMinPrice);
                      setSliderMax(dbMaxPrice);
                      updateUrlParams(selectedFilters, selectedCategory, dbMinPrice, dbMaxPrice, priceSort);
                    }}
                    className="bg-transparent border-none text-primary hover:text-secondary cursor-pointer flex items-center p-0 ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Dynamic Attribute Pills */}
              {Object.entries(selectedFilters).map(([caption, vals]) =>
                vals.map((v) => (
                  <div key={`${caption}-${v}`} className="inline-flex items-center gap-1.5 bg-primary-light text-primary border border-primary-border py-1 px-2.5 rounded-full text-xs font-semibold">
                    <span>
                      {caption}: {v}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePill(caption, v)}
                      className="bg-transparent border-none text-primary hover:text-secondary cursor-pointer flex items-center p-0 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}

              {/* Clear All Pill */}
              <button
                type="button"
                onClick={handleClearAll}
                className="border-none bg-transparent text-secondary hover:underline text-xs font-bold cursor-pointer ml-1"
              >
                Clear All
              </button>
            </div>
          )}

          {/* PRODUCT GRID DISPLAY */}
          <ProductGrid
            products={filteredProducts}
            loading={loading}
            emptyMessage="No products found for your selected filters. Try broadening your filter selections or clearing filters."
          />
        </div>
      </div>

      {/* MOBILE FILTER DRAWER OVERLAY */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999] flex justify-end lg:hidden animate-drawer-fade">
          <div className="w-80 max-w-[85vw] h-full bg-white shadow-[-4px_0_25px_rgba(0,0,0,0.15)] flex flex-col animate-slide-left">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="m-0 text-base font-bold text-slate-800">Filter Products</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grow">{renderFilterSidebar()}</div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-primary hover:bg-primary-hover text-white border-none py-3 rounded-lg font-bold text-sm cursor-pointer transition-colors"
              >
                Apply Filters ({filteredProducts.length} Results)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="text-center p-16 text-slate-500">Loading Shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}
