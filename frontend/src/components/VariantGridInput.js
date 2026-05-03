import React, { useState, useMemo } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Trash2, Plus, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VariantGridInput - Admin component for managing product variants
 * Displays a grid/matrix of Color x Size combinations with stock input
 */
const VariantGridInput = ({
  variants = [],
  onChange,
  availableColors = [],
  availableSizes = [],
  basePrice = 0,
  lowStockThreshold = 5,
}) => {
  const [bulkStockValue, setBulkStockValue] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [customColor, setCustomColor] = useState('');

  const normalizedLowStockThreshold = useMemo(() => {
    const parsed = parseInt(lowStockThreshold, 10);
    if (Number.isNaN(parsed)) return 5;
    return Math.max(0, parsed);
  }, [lowStockThreshold]);

  // Predefined colors and sizes for clothing
  const predefinedColors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 
    'Pink', 'Purple', 'Orange', 'Grey', 'Navy', 'Brown',
    'Beige', 'Maroon', 'Teal', 'Gold', 'Silver'
  ];

  const predefinedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE_SIZE'];

  // Get unique colors and sizes from variants
  const variantColors = useMemo(() => {
    const colors = new Set(variants.map(v => v.color).filter(Boolean));
    return Array.from(colors);
  }, [variants]);

  const variantSizes = useMemo(() => {
    const sizes = new Set(variants.map(v => v.size).filter(Boolean));
    return Array.from(sizes);
  }, [variants]);

  // Use provided available colors/sizes or derive from variants
  const colors = availableColors.length > 0 ? availableColors : variantColors;
  const sizes = availableSizes.length > 0 ? availableSizes : variantSizes;
  const customColors = colors.filter(color => (
    !predefinedColors.some(predefinedColor => predefinedColor.toLowerCase() === color.toLowerCase())
  ));

  // Get or create variant for a specific color/size combination
  const getVariant = (color, size) => {
    return variants.find(
      v => v.color === color && v.size === size
    );
  };

  // Update variant stock
  const updateVariantStock = (color, size, stock) => {
    const variant = getVariant(color, size);
    let newVariants;

    if (variant) {
      newVariants = variants.map(v =>
        v.color === color && v.size === size
          ? { ...v, stock: parseInt(stock, 10) || 0, stock_quantity: parseInt(stock, 10) || 0 }
          : v
      );
    } else {
      // Create new variant
      newVariants = [
        ...variants,
        {
          id: `new_${color}_${size}_${Date.now()}`,
          color,
          size,
          stock: parseInt(stock, 10) || 0,
          stock_quantity: parseInt(stock, 10) || 0,
          price: basePrice,
          attributes: { color, size },
        },
      ];
    }

    onChange(newVariants);
  };

  // Update variant price
  const updateVariantPrice = (color, size, price) => {
    const variant = getVariant(color, size);
    if (!variant) return;

    const newVariants = variants.map(v =>
      v.color === color && v.size === size
        ? { ...v, price: parseFloat(price) || basePrice, price_override: parseFloat(price) || null }
        : v
    );

    onChange(newVariants);
  };

  // Remove variant
  const removeVariant = (color, size) => {
    const newVariants = variants.filter(
      v => !(v.color === color && v.size === size)
    );
    onChange(newVariants);
  };

  // Apply bulk stock to all variants
  const applyBulkStock = () => {
    const stockValue = parseInt(bulkStockValue, 10) || 0;
    const newVariants = variants.map(v => ({
      ...v,
      stock: stockValue,
      stock_quantity: stockValue,
    }));
    onChange(newVariants);
    setBulkStockValue('');
    setShowBulkInput(false);
  };

  const addColorVariants = (color) => {
    const sizesForColor = sizes.length > 0 ? sizes : predefinedSizes;
    const newVariants = [...variants];

    sizesForColor.forEach(size => {
      if (!newVariants.some(v => v.color === color && v.size === size)) {
        newVariants.push({
          id: `new_${color}_${size}_${Date.now()}`,
          color,
          size,
          stock: 0,
          stock_quantity: 0,
          price: basePrice,
          attributes: { color, size },
        });
      }
    });

    onChange(newVariants);
  };

  const handleAddCustomColor = (event) => {
    event.preventDefault();

    const normalizedColor = customColor.trim().replace(/\s+/g, ' ');
    if (!normalizedColor) return;

    const existingColor = [...predefinedColors, ...colors].find(color => (
      color.toLowerCase() === normalizedColor.toLowerCase()
    ));
    const colorToAdd = existingColor || normalizedColor;

    if (!colors.includes(colorToAdd)) {
      addColorVariants(colorToAdd);
    }

    setCustomColor('');
  };

  // Toggle color selection
  const toggleColor = (color) => {
    if (colors.includes(color)) {
      // Remove color and all its variants
      const newVariants = variants.filter(v => v.color !== color);
      onChange(newVariants);
    } else {
      addColorVariants(color);
    }
  };

  // Toggle size selection
  const toggleSize = (size) => {
    if (sizes.includes(size)) {
      // Remove size and all its variants
      const newVariants = variants.filter(v => v.size !== size);
      onChange(newVariants);
    } else {
      // Add size with all colors (create variants with 0 stock)
      const newVariants = [...variants];
      
      colors.forEach(color => {
        if (!getVariant(color, size)) {
          newVariants.push({
            id: `new_${color}_${size}_${Date.now()}`,
            color,
            size,
            stock: 0,
            stock_quantity: 0,
            price: basePrice,
            attributes: { color, size },
          });
        }
      });
      
      onChange(newVariants);
    }
  };

  // Calculate total stock
  const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);

  // Get stock status badge
  const getStockStatus = (stock) => {
    const numericStock = Number.isFinite(stock) ? stock : parseInt(stock, 10);
    const safeStock = Number.isFinite(numericStock) && numericStock > 0 ? numericStock : 0;

    if (safeStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (safeStock <= normalizedLowStockThreshold) {
      return <Badge variant="destructive">Low Stock</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">In Stock</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Color Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Select Colors</Label>
          <span className="text-xs text-gray-500">{colors.length} colors selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {predefinedColors.map(color => (
            <button
              type="button"
              key={color}
              onClick={() => toggleColor(color)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                colors.includes(color)
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
        <form onSubmit={handleAddCustomColor} className="grid grid-cols-1 gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="custom-color" className="text-xs font-medium text-gray-600">Enter New Color</Label>
            <Input
              id="custom-color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="e.g. Peacock Blue"
              className="h-9 bg-white"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!customColor.trim()}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Color
          </Button>
        </form>
        {customColors.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            {customColors.map(color => (
              <button
                type="button"
                key={color}
                onClick={() => toggleColor(color)}
                aria-label={`Remove ${color} color`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:bg-indigo-700"
              >
                {color}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Size Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Select Sizes</Label>
          <span className="text-xs text-gray-500">{sizes.length} sizes selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {predefinedSizes.map(size => (
            <button
              type="button"
              key={size}
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sizes.includes(size)
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Stock Input */}
      {variants.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Bulk Stock Update</Label>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowBulkInput(!showBulkInput)}
              variant={showBulkInput ? 'secondary' : 'outline'}
              className="gap-2"
            >
              {showBulkInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showBulkInput ? 'Cancel' : 'Apply to All'}
            </Button>
          </div>
          
          <AnimatePresence>
            {showBulkInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 pt-2">
                  <Input
                    type="number"
                    min="0"
                    value={bulkStockValue}
                    onChange={(e) => setBulkStockValue(e.target.value)}
                    placeholder="Enter stock quantity"
                    className="w-48"
                  />
                  <Button
                    type="button"
                    onClick={applyBulkStock}
                    disabled={!bulkStockValue}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Apply
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Variant Grid Table */}
      {variants.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <Label className="text-sm font-semibold">Variant Inventory</Label>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                Total Variants: <span className="font-semibold">{variants.length}</span>
              </span>
              <span className="text-gray-600">
                Total Stock: <span className="font-semibold">{totalStock}</span>
              </span>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-32">Color</TableHead>
                  <TableHead className="w-24">Size</TableHead>
                  <TableHead className="w-32">SKU</TableHead>
                  <TableHead className="w-28">Price</TableHead>
                  <TableHead className="w-32">Stock</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, index) => (
                  <TableRow key={variant.id || index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{variant.color || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="w-16 justify-center">
                        {variant.size || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {variant.sku || `SKU-${variant.color?.substring(0, 3) || 'X'}-${variant.size || 'X'}`}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price_override || variant.price || basePrice}
                        onChange={(e) => updateVariantPrice(variant.color, variant.size, e.target.value)}
                        className="w-24"
                        placeholder={basePrice.toString()}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={variant.stock ?? variant.stock_quantity ?? 0}
                        onChange={(e) => updateVariantStock(variant.color, variant.size, e.target.value)}
                        className="w-24"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      {getStockStatus(parseInt(variant.stock ?? variant.stock_quantity ?? 0, 10))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(variant.color, variant.size)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm">
            Select colors and sizes above to generate variant combinations
          </p>
        </div>
      )}
    </div>
  );
};

export default VariantGridInput;
