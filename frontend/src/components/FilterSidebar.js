import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { formatPrice } from '../utils';

// ==========================================
// CHECKBOX GROUP COMPONENT
// ==========================================
const CheckboxGroup = ({ title, options, selected, onChange, showCounts = true, maxVisible = 5 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleOptions = showAll ? options : options.slice(0, maxVisible);
  const hasMore = options.length > maxVisible;

  const handleChange = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(s => s !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <div className="border-b border-accent/10 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          {title}
          {selected.length > 0 && (
            <span className="ml-2 text-xs font-normal text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 pt-2">
          {visibleOptions.map(option => {
            const value = typeof option === 'object' ? option.name || option.value : option;
            const label = typeof option === 'object' ? option.name || option.label : option;
            const count = typeof option === 'object' ? option.count : null;
            const isSelected = selected.includes(value);

            return (
              <label
                key={value}
                className={`flex items-center gap-3 cursor-pointer group ${
                  count === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => count !== 0 && handleChange(value)}
                  disabled={count === 0}
                  className="w-4 h-4 rounded border-accent/30 text-primary focus:ring-primary/20"
                />
                <span className={`text-sm flex-1 ${isSelected ? 'text-primary font-medium' : 'text-muted-foreground group-hover:text-primary'}`}>
                  {label}
                </span>
                {showCounts && count !== null && count !== undefined && (
                  <span className="text-xs text-muted-foreground">({count})</span>
                )}
              </label>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-accent hover:text-primary mt-2"
            >
              {showAll ? 'Show less' : `+ ${options.length - maxVisible} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// COLOR SELECTOR COMPONENT
// ==========================================
const ColorSelector = ({ colors, selected, onChange, counts = {}, colorHexes = {} }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = (colorName) => {
    const newSelected = selected.includes(colorName)
      ? selected.filter(c => c !== colorName)
      : [...selected, colorName];
    onChange(newSelected);
  };

  const colorMap = {
    red: '#DC2626',
    blue: '#2563EB',
    green: '#16A34A',
    yellow: '#EAB308',
    pink: '#EC4899',
    purple: '#9333EA',
    orange: '#EA580C',
    black: '#171717',
    white: '#FAFAFA',
    maroon: '#7F1D1D',
    teal: '#0D9488',
    gold: '#CA8A04',
    beige: '#D4C4A8',
    navy: '#1E3A5F',
    coral: '#F87171',
    mint: '#86EFAC',
    mustard: '#CA8A04',
    lavender: '#C4B5FD',
    peach: '#FECACA',
    burgundy: '#7F1D1D',
    'royal blue': '#1E40AF',
    magenta: '#DB2777',
    cream: '#FEF3C7',
    wine: '#881337',
    silver: '#94A3B8',
    'rose gold': '#F472B6',
    turquoise: '#14B8A6',
    'mustard yellow': '#FFDB58',
    'haldi': '#F6C324',
    'haldi yellow': '#F6C324',
    'rani': '#E0115F',
    'rani pink': '#E0115F',
    'mehendi': '#556B2F',
    'mehendi green': '#556B2F',
    'wine red': '#722F37',
    'peacock blue': '#005F69',
    'off white': '#FAF9F6',
    'onion pink': '#E6A8A8',
    'gajri': '#F28C8C',
    'rust': '#B7410E',
    'olive green': '#808000',
    'bottle green': '#006A4E',
    'emerald green': '#50C878',
    'sage green': '#9CAF88',
    'mauve': '#E0B0FF',
    'lilac': '#C8A2C8',
    'navy blue': '#000080',
    'sky blue': '#87CEEB',
    'golden': '#FFD700',
    'copper': '#B87333',
    'bronze': '#CD7F32',
    'charcoal': '#36454F'
  };

  return (
    <div className="border-b border-accent/10 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Colors
          {selected.length > 0 && (
            <span className="ml-2 text-xs font-normal text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="flex flex-wrap gap-2 pt-2">
          {colors.map(color => {
            const colorName = typeof color === 'object' ? color.name : color;
            const count = counts[colorName] || 0;
            const isSelected = selected.includes(colorName);
            const cleanName = String(colorName).trim().toLowerCase();
            const resolvedHex = colorHexes[colorName] || colorHexes[cleanName];
            const hexColor = (resolvedHex && resolvedHex.toUpperCase() !== '#CCCCCC')
              ? resolvedHex
              : (colorMap[cleanName] || colorMap[colorName] || '#888888');

            return (
              <button
                key={colorName}
                onClick={() => handleToggle(colorName)}
                disabled={count === 0}
                className={`relative group ${count === 0 ? 'opacity-40' : ''}`}
                title={`${colorName}${count ? ` (${count})` : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 scale-110'
                      : 'border-accent/30 hover:border-accent'
                  }`}
                  style={{ backgroundColor: hexColor }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${hexColor === '#FAFAFA' || hexColor === '#FEF3C7' ? 'bg-gray-800' : 'bg-white'}`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==========================================
// PRICE RANGE COMPONENT
// ==========================================
const PriceRangeFilter = ({ min, max, value, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue) => {
    setLocalValue(newValue);
  };

  const handleCommit = () => {
    onChange(localValue);
  };

  return (
    <div className="border-b border-accent/10 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Price Range
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="pt-4 space-y-4">
          <Slider
            min={min}
            max={max}
            step={500}
            value={localValue}
            onValueChange={handleChange}
            onValueCommit={handleCommit}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{formatPrice(localValue[0])}</span>
            <span className="text-muted-foreground">{formatPrice(localValue[1])}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// DISCOUNT FILTER COMPONENT
// ==========================================
const DiscountFilter = ({ selected, onChange, counts = {} }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const discountOptions = [
    { value: 10, label: '10% and above' },
    { value: 20, label: '20% and above' },
    { value: 30, label: '30% and above' },
    { value: 40, label: '40% and above' },
    { value: 50, label: '50% and above' },
  ];

  return (
    <div className="border-b border-accent/10 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Discount
          {selected && (
            <span className="ml-2 text-xs font-normal text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {selected}%+
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 pt-2">
          {discountOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="discount"
                checked={selected === option.value}
                onChange={() => onChange(selected === option.value ? null : option.value)}
                className="w-4 h-4 border-accent/30 text-primary focus:ring-primary/20"
              />
              <span className={`text-sm flex-1 ${selected === option.value ? 'text-primary font-medium' : 'text-muted-foreground group-hover:text-primary'}`}>
                {option.label}
              </span>
              {counts[`${option.value}+`] !== undefined && (
                <span className="text-xs text-muted-foreground">({counts[`${option.value}+`]})</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// RATING FILTER COMPONENT
// ==========================================
const RatingFilter = ({ selected, onChange, counts = {} }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ratingOptions = [4, 3, 2, 1];

  return (
    <div className="border-b border-accent/10 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Customer Rating
          {selected && (
            <span className="ml-2 text-xs font-normal text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {selected}★+
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 pt-2">
          {ratingOptions.map(r => (
            <label key={r} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={selected === r}
                onChange={() => onChange(selected === r ? null : r)}
                className="w-4 h-4 border-accent/30 text-primary focus:ring-primary/20"
              />
              <span className={`text-sm flex-1 ${selected === r ? 'text-primary font-medium' : 'text-muted-foreground group-hover:text-primary'}`}>
                {r} stars & up
              </span>
              {counts[`${r}+`] !== undefined && (
                <span className="text-xs text-muted-foreground">({counts[`${r}+`]})</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// FILTER CHIPS COMPONENT
// ==========================================
export const FilterChips = ({ filters, onRemove, onClearAll }) => {
  const chips = [];

  // Price range
  if (filters.price_min || filters.price_max) {
    chips.push({
      key: 'price',
      label: `${formatPrice(filters.price_min || 0)} - ${formatPrice(filters.price_max || 100000)}`,
      onRemove: () => {
        onRemove('price_min');
        onRemove('price_max');
      }
    });
  }

  // Array filters
  ['category', 'size', 'color', 'fabric', 'occasion', 'pattern', 'style', 'neck', 'sleeve', 'brand', 'material'].forEach(key => {
    if (filters[key] && filters[key].length > 0) {
      filters[key].forEach(value => {
        chips.push({
          key: `${key}-${value}`,
          label: value,
          onRemove: () => {
            const newValues = filters[key].filter(v => v !== value);
            onRemove(key, newValues.length > 0 ? newValues : null);
          }
        });
      });
    }
  });

  // Discount
  if (filters.discount) {
    chips.push({
      key: 'discount',
      label: `${filters.discount}%+ off`,
      onRemove: () => onRemove('discount')
    });
  }

  // In stock
  if (filters.in_stock) {
    chips.push({
      key: 'in_stock',
      label: 'In Stock',
      onRemove: () => onRemove('in_stock')
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm text-muted-foreground">Applied filters:</span>
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-primary text-sm rounded-full"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-accent hover:text-primary underline"
      >
        Clear all
      </button>
    </div>
  );
};

// ==========================================
// MAIN FILTER SIDEBAR COMPONENT
// ==========================================
const FilterSidebar = ({
  filters,
  filterMetadata = {},
  onFilterChange,
  onClearFilters,
  isLoading = false,
  className = ''
}) => {
  const {
    sizes = {},
    colors = {},
    fabrics = {},
    occasions = {},
    patterns = {},
    styles = {},
    neckTypes = {},
    sleeveTypes = {},
    categories = {},
    priceRange = { min: 0, max: 100000 },
    discountRanges = {},
    colorHexes = {}
  } = filterMetadata;

  // New product-specific filters (brands, materials)
  const { brands = {}, materials = {} } = filterMetadata;

  // Convert object counts to array with counts
  const toOptionsArray = (obj) => 
    Object.entries(obj).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const sizeOptions = toOptionsArray(sizes);
  const fabricOptions = toOptionsArray(fabrics);
  const occasionOptions = toOptionsArray(occasions);
  const patternOptions = toOptionsArray(patterns);
  const styleOptions = toOptionsArray(styles);
  const neckOptions = toOptionsArray(neckTypes);
  const sleeveOptions = toOptionsArray(sleeveTypes);
  const colorOptions = Object.keys(colors);
  const brandOptions = toOptionsArray(brands);
  const materialOptions = toOptionsArray(materials);

  const categoryOptions = Object.entries(categories).map(([slug, data]) => ({
    value: slug,
    name: data.name,
    count: data.count
  })).sort((a, b) => b.count - a.count);

  const handleArrayFilterChange = (key, values) => {
    onFilterChange({ [key]: values.length > 0 ? values : undefined });
  };

  const handlePriceChange = (value) => {
    onFilterChange({
      price_min: value[0] > priceRange.min ? value[0] : undefined,
      price_max: value[1] < priceRange.max ? value[1] : undefined
    });
  };

  const handleDiscountChange = (value) => {
    onFilterChange({ discount: value });
  };

  const handleInStockChange = (checked) => {
    onFilterChange({ in_stock: checked ? true : undefined });
  };

  return (
    <div className={`bg-background/80 backdrop-blur-sm rounded-2xl border border-accent/10 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-accent/10">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Clear All
        </Button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-7rem)] pr-2">
        <div className="space-y-1">
        {/* Price Range */}
        <PriceRangeFilter
          min={priceRange.min}
          max={priceRange.max}
          value={[
            filters.price_min || priceRange.min,
            filters.price_max || priceRange.max
          ]}
          onChange={handlePriceChange}
        />

        {/* Categories */}
        {categoryOptions.length > 0 && (
          <CheckboxGroup
            title="Categories"
            options={categoryOptions}
            selected={filters.category || []}
            onChange={(values) => handleArrayFilterChange('category', values)}
          />
        )}

        {/* Size */}
        {sizeOptions.length > 0 && (
          <CheckboxGroup
            title="Size"
            options={sizeOptions}
            selected={filters.size || []}
            onChange={(values) => handleArrayFilterChange('size', values)}
          />
        )}

        {/* Colors */}
        {colorOptions.length > 0 && (
          <ColorSelector
            colors={colorOptions}
            selected={filters.color || []}
            onChange={(values) => handleArrayFilterChange('color', values)}
            counts={colors}
            colorHexes={colorHexes}
          />
        )}

        {/* Brand */}
        {brandOptions.length > 0 && (
          <CheckboxGroup
            title="Brand"
            options={brandOptions}
            selected={filters.brand || []}
            onChange={(values) => handleArrayFilterChange('brand', values)}
          />
        )}

        {/* Material */}
        {materialOptions.length > 0 && (
          <CheckboxGroup
            title="Material"
            options={materialOptions}
            selected={filters.material || []}
            onChange={(values) => handleArrayFilterChange('material', values)}
          />
        )}

        {/* Fabric */}
        {fabricOptions.length > 0 && (
          <CheckboxGroup
            title="Fabric"
            options={fabricOptions}
            selected={filters.fabric || []}
            onChange={(values) => handleArrayFilterChange('fabric', values)}
          />
        )}

        {/* Occasion */}
        {occasionOptions.length > 0 && (
          <CheckboxGroup
            title="Occasion"
            options={occasionOptions}
            selected={filters.occasion || []}
            onChange={(values) => handleArrayFilterChange('occasion', values)}
          />
        )}

        {/* Pattern */}
        {patternOptions.length > 0 && (
          <CheckboxGroup
            title="Pattern & Print"
            options={patternOptions}
            selected={filters.pattern || []}
            onChange={(values) => handleArrayFilterChange('pattern', values)}
          />
        )}

        {/* Style */}
        {styleOptions.length > 0 && (
          <CheckboxGroup
            title="Style"
            options={styleOptions}
            selected={filters.style || []}
            onChange={(values) => handleArrayFilterChange('style', values)}
          />
        )}

        {/* Discount */}
        <DiscountFilter
          selected={filters.discount}
          onChange={handleDiscountChange}
          counts={discountRanges}
        />

        {/* Rating */}
        <RatingFilter
          selected={filters.rating}
          onChange={(value) => onFilterChange({ rating: value || undefined })}
          counts={{}}
        />

        {/* Neck Type */}
        {neckOptions.length > 0 && (
          <CheckboxGroup
            title="Neck Type"
            options={neckOptions}
            selected={filters.neck || []}
            onChange={(values) => handleArrayFilterChange('neck', values)}
          />
        )}

        {/* Sleeve Type */}
        {sleeveOptions.length > 0 && (
          <CheckboxGroup
            title="Sleeve Length"
            options={sleeveOptions}
            selected={filters.sleeve || []}
            onChange={(values) => handleArrayFilterChange('sleeve', values)}
          />
        )}

        {/* In Stock */}
        <div className="py-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.in_stock || false}
              onChange={(e) => handleInStockChange(e.target.checked)}
              className="w-4 h-4 rounded border-accent/30 text-primary focus:ring-primary/20"
            />
            <span className="text-sm text-muted-foreground">In Stock Only</span>
          </label>
        </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
