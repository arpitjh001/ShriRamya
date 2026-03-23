import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const sortOptions = [
  { value: 'newest', label: "What's New" },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'discount', label: 'Discount' },
  { value: 'rating', label: 'Customer Rating' },
];

const SortDropdown = ({ value = 'popularity', onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = sortOptions.find(opt => opt.value === value) || sortOptions[1];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-background border border-accent/20 rounded-lg text-sm hover:border-accent/40 transition-colors"
        data-testid="sort-dropdown-trigger"
      >
        <span className="text-muted-foreground">Sort by:</span>
        <span className="font-medium text-primary">{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-accent/20 rounded-lg shadow-lg z-50 py-1">
          {sortOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-accent/5 transition-colors ${
                value === option.value ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
              data-testid={`sort-option-${option.value}`}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortDropdown;
