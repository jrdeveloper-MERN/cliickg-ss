import React from 'react';

const PriceRow = ({
  chargeKey,
  label,
  isAdditive,
  chargeData = {},
  calculatedComp = {},
  onChange
}) => {
  const {
    enabled = false,
    type = 'Flat',
    value = '0',
    discountEnabled = false,
    discountType = 'Flat',
    discountValue = '0',
  } = chargeData;

  const handleFieldChange = (field, val) => {
    onChange(chargeKey, {
      ...chargeData,
      [field]: val
    });
  };

  return (
    <div
      className={`border border-admin-border rounded-admin-xs p-3 px-4 transition-all duration-150 ${
        enabled ? 'bg-admin-card' : 'bg-admin-subtle'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.1fr_1.1fr_1.3fr_1.5fr] gap-3 items-center">
        {/* Col 1: Toggle & Charge Name */}
        <div className="flex items-center gap-3">
          <label className="switch m-0 shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleFieldChange('enabled', e.target.checked)}
            />
            <span className="slider"></span>
          </label>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-admin-text-primary">
                {label}
              </span>
              <span
                className={`badge text-[10px] py-0.5 px-1.5 ${
                  isAdditive ? 'badge-success' : 'badge-danger'
                }`}
              >
                {isAdditive ? '+ Additive' : '- Deduction'}
              </span>
            </div>
            {enabled && (
              <span className="text-[11px] text-admin-text-secondary font-medium block mt-0.5">
                Base: ₹{(calculatedComp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        {/* Col 2: Charge Type */}
        <div>
          <select
            className="form-control text-xs py-1.5 px-2 text-admin-text-primary"
            disabled={!enabled}
            value={type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
          >
            <option value="Flat">Flat (₹)</option>
            <option value="Percentage">Percentage (%)</option>
            <option value="Per Gram">Per Gram (₹/g)</option>
          </select>
        </div>

        {/* Col 3: Value */}
        <div>
          <input
            type="number"
            step="any"
            className="form-control text-xs font-semibold text-admin-text-primary"
            disabled={!enabled}
            placeholder="0"
            value={value}
            onChange={(e) => handleFieldChange('value', e.target.value)}
          />
        </div>

        {/* Col 4: Line Discount Controls */}
        <div className="flex flex-col gap-1">
          <label
            className={`inline-flex items-center gap-1.5 text-xs text-admin-text-primary font-semibold ${
              enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            }`}
          >
            <input
              type="checkbox"
              disabled={!enabled}
              checked={discountEnabled}
              onChange={(e) => handleFieldChange('discountEnabled', e.target.checked)}
              className="accent-admin-accent"
            />
            <span>Discount</span>
          </label>

          {discountEnabled && enabled && (
            <div className="flex gap-1 mt-0.5">
              <select
                className="form-control text-[11px] p-1 w-12 text-admin-text-primary"
                value={discountType}
                onChange={(e) => handleFieldChange('discountType', e.target.value)}
              >
                <option value="Flat">₹</option>
                <option value="Percentage">%</option>
              </select>
              <input
                type="number"
                step="any"
                className="form-control text-[11px] py-1 px-1.5 text-admin-text-primary"
                placeholder="Disc"
                value={discountValue}
                onChange={(e) => handleFieldChange('discountValue', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Col 5: Final Net Component Amount */}
        <div className="text-right">
          <span className="text-[11px] text-admin-text-secondary block font-semibold uppercase">
            Calculated Net
          </span>
          <span
            className={`text-sm font-bold ${
              enabled
                ? isAdditive
                  ? 'text-admin-accent'
                  : 'text-admin-danger'
                : 'text-admin-text-muted'
            }`}
          >
            {isAdditive ? '+' : '-'} ₹{(calculatedComp.finalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {discountEnabled && enabled && calculatedComp.discountAmount > 0 && (
            <span className="text-[11px] text-admin-success block font-semibold mt-0.5">
              (Saved ₹{calculatedComp.discountAmount})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceRow;
