import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { wishlistAPI } from "../lib/api";
import { Button } from "./ui/button";
import { toast } from "sonner";
import LuxuryBadge from "./LuxuryBadge";
import { formatPrice } from "../lib/utils";

const FALLBACK_IMAGE = "/placeholder-product.png";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

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
  // CART
  // --------------------------

  const handleAddToCart = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await addToCart(String(product.id), 1);
      toast.success("Added to cart!");
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  };

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
      className="group block"
    >
      {/* Image */}
      <div className="relative overflow-hidden rounded aspect-[3/4] mb-4">

        <img
          src={image || ""}
          alt={product?.name || "Product"}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* BADGES */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product?.luxury_collection && <LuxuryBadge />}

          {hasDiscount && (
            <div className="bg-primary text-primary-foreground px-3 py-1 text-sm rounded">
              {Math.round(((price - salePrice) / price) * 100)}% OFF
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition">
          <div className="flex gap-2">

            <Button
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleWishlist}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
            </Button>

          </div>
        </div>

      </div>

      {/* Content */}
      <div>

        <p className="text-sm text-muted-foreground mb-1">
          {category}
        </p>

        <h3 className="font-medium mb-2 group-hover:text-primary transition">
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
