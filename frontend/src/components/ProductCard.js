import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { wishlistAPI } from "../lib/api";
import { Button } from "./ui/button";
import { toast } from "sonner";
import LuxuryBadge from "./LuxuryBadge";
import { formatPrice } from "../lib/utils";

const FALLBACK_IMAGE = "/placeholder-product.png";

const ProductCard = ({ product }) => {
  const { user } = useAuth();

  const [isWishlisted, setIsWishlisted] = useState(false);

  // --------------------------
  // SAFE DATA EXTRACTION
  // --------------------------

  const image = useMemo(() => {
    // Handle both formats: transformed (string array) and raw WooCommerce ({src} objects)
    const imageUrl =
      product?.images?.[0] ||  // Transformed format: array of strings
      product?.images?.[0]?.src ||  // Raw WooCommerce format: array of objects
      product?.image ||  // Fallback for single image field
      FALLBACK_IMAGE;

    console.log("Product Image URL:", imageUrl, "Product:", product?.name);
    return imageUrl;
  }, [product]);



  const price = Number(product?.regular_price || product?.price || 0);
  const salePrice = Number(product?.sale_price || 0);

  const displayPrice = salePrice > 0 ? salePrice : price;
  const hasDiscount = salePrice > 0 && salePrice < price;


  const category =
    product?.categories?.[0]?.name ||
    (Array.isArray(product?.category) ? product.category[0] : product?.category) ||
    "";




  // --------------------------
  // WISHLIST
  // --------------------------

  const handleWishlist = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    try {
      if (isWishlisted) {
        await wishlistAPI.remove(product.id);
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await wishlistAPI.add(product.id);
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Wishlist action failed");
    }
  };

  if (!product) return null;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block premium-card"
    >
      {/* Image */}
      <div className="relative overflow-hidden rounded-xl aspect-[3/4] mb-4 border border-border group-hover:border-secondary/50 transition-colors duration-500">

        <img
          src={image || ""}
          alt={product?.name || "Product"}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* BADGES */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product?.luxury_collection && <LuxuryBadge />}

          {hasDiscount && (
            <div className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-full shadow-lg border border-secondary/20">
              {Math.round(((price - salePrice) / price) * 100)}% OFF
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
          <div className="flex gap-3">

            <Button
              size="sm"
              className="flex-1 bg-secondary text-primary hover:bg-white font-bold rounded-full"
            >
              Shop Now
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="rounded-full w-10 h-10 p-0 bg-white/10 backdrop-blur-md hover:bg-secondary hover:text-primary transition-all border border-white/20"
              onClick={handleWishlist}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
            </Button>

          </div>
        </div>

      </div>

      {/* Content */}
      <div className="space-y-1">

        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-secondary">
          {category}
        </p>

        <h3 className="font-heading text-lg group-hover:text-primary transition-colors line-clamp-1">
          {product?.name || "Unnamed Product"}
        </h3>

        <div className="flex gap-2 items-center">

          <span className="text-lg font-medium">
            {formatPrice(displayPrice)}
          </span>

          {hasDiscount && (
            <span className="text-sm line-through text-muted-foreground">
              {formatPrice(price)}
            </span>
          )}

        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
