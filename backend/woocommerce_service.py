"""
WooCommerce Headless Service Layer
Complete product, order, customer, and coupon management via WC REST API
"""

import os
import logging
from typing import Optional, List, Dict, Any
from woocommerce import API
from requests.auth import HTTPBasicAuth
from tenacity import retry, stop_after_attempt, wait_exponential
from datetime import datetime, timezone
import json

logger = logging.getLogger("shriramya.woocommerce")

# =====================
# WooCommerce Client
# =====================

class WooCommerceService:
    """Centralized WooCommerce REST API service"""

    def __init__(self):
        self.enabled = all([
            os.getenv("WOOCOMMERCE_URL"),
            os.getenv("WOOCOMMERCE_CONSUMER_KEY"),
            os.getenv("WOOCOMMERCE_CONSUMER_SECRET")
        ])

        if self.enabled:
            import requests
            from requests.auth import HTTPBasicAuth
            
            class DirectWCAPI:
                def __init__(self, url, consumer_key, consumer_secret, version="wc/v3", verify_ssl=False, timeout=30, **kwargs):
                    self.base_url = f"{url.rstrip('/')}/wp-json/{version}"
                    self.auth = HTTPBasicAuth(consumer_key, consumer_secret)
                    self.verify = verify_ssl
                    self.timeout = timeout

                def _url(self, endpoint):
                    return f"{self.base_url}/{endpoint.lstrip('/')}"
                    
                def get(self, endpoint, params=None):
                    return requests.get(self._url(endpoint), params=params, auth=self.auth, verify=self.verify, timeout=self.timeout)
                    
                def post(self, endpoint, data=None):
                    return requests.post(self._url(endpoint), json=data, auth=self.auth, verify=self.verify, timeout=self.timeout)

                def put(self, endpoint, data=None):
                    return requests.put(self._url(endpoint), json=data, auth=self.auth, verify=self.verify, timeout=self.timeout)

                def delete(self, endpoint, params=None):
                    return requests.delete(self._url(endpoint), params=params, auth=self.auth, verify=self.verify, timeout=self.timeout)
                    
            self.api = DirectWCAPI(
                url=os.getenv("WOOCOMMERCE_URL"),
                consumer_key=os.getenv("WOOCOMMERCE_CONSUMER_KEY"),
                consumer_secret=os.getenv("WOOCOMMERCE_CONSUMER_SECRET"),
                version="wc/v3",
                timeout=30,
                verify_ssl=os.getenv("WOOCOMMERCE_VERIFY_SSL", "False").lower() == "true",
            )
            logger.info("WooCommerce API initialized via robust DirectWCAPI method")
        else:
            self.api = None
            logger.warning("WooCommerce not configured")

    # ---- Low-level HTTP helpers with retry ----

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _get(self, endpoint: str, params: dict = None):
        resp = self.api.get(endpoint, params=params or {})
        if resp.status_code >= 400:
            logger.error(f"WC GET {endpoint}: {resp.status_code} {resp.text}")
            return None
        return resp.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _post(self, endpoint: str, data: dict = None):
        resp = self.api.post(endpoint, data or {})
        if resp.status_code >= 400:
            logger.error(f"WC POST {endpoint}: {resp.status_code} {resp.text}")
            return None
        return resp.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _put(self, endpoint: str, data: dict = None):
        resp = self.api.put(endpoint, data or {})
        if resp.status_code >= 400:
            logger.error(f"WC PUT {endpoint}: {resp.status_code} {resp.text}")
            return None
        return resp.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _delete(self, endpoint: str, params: dict = None):
        resp = self.api.delete(endpoint, params=params or {"force": True})
        if resp.status_code >= 400:
            logger.error(f"WC DELETE {endpoint}: {resp.status_code} {resp.text}")
            return None
        return resp.json()

    # =====================
    # PRODUCTS
    # =====================

    def get_products(self, per_page=50, page=1, category=None, search=None,
                     featured=None, on_sale=None, status="publish", order_by="date"):
        params = {
            "per_page": per_page, "page": page,
            "status": status, "orderby": order_by
        }
        if category:
            params["category"] = category
        if search:
            params["search"] = search
        if featured is not None:
            params["featured"] = featured
        if on_sale is not None:
            params["on_sale"] = on_sale
        return self._get("products", params) or []

    def get_product(self, product_id: int):
        return self._get(f"products/{product_id}")

    def create_product(self, data: dict):
        """Create product in WooCommerce"""
        product_data = {
            "name": data["name"],
            "type": data.get("type", "simple"),
            "regular_price": str(data.get("price", data.get("regular_price", "0"))),
            "description": data.get("description", ""),
            "short_description": data.get("short_description", ""),
            "manage_stock": True,
            "stock_quantity": data.get("stock_quantity", 0),
            "status": data.get("status", "publish"),
        }
        if data.get("sale_price"):
            product_data["sale_price"] = str(data["sale_price"])
        if data.get("categories"):
            product_data["categories"] = [{"id": c} if isinstance(c, int) else c for c in data["categories"]]
        if data.get("images"):
            product_data["images"] = [{"src": img} if isinstance(img, str) else img for img in data["images"]]
        if data.get("tags"):
            product_data["tags"] = [{"name": t} if isinstance(t, str) else t for t in data["tags"]]
        if data.get("sku"):
            product_data["sku"] = data["sku"]

        # Custom meta for ethnic wear fields
        meta_data = []
        for field in ["fabric", "craft_style", "state_of_origin", "occasion", "care_instructions"]:
            if data.get(field):
                meta_data.append({"key": f"_sr_{field}", "value": data[field]})
        # Size stock meta
        if data.get("size_stock"):
            meta_data.append({"key": "_sr_sizes", "value": json.dumps(data["size_stock"])})
        # Color stock meta
        if data.get("color_stock"):
            meta_data.append({"key": "_sr_colors", "value": json.dumps(data["color_stock"])})
        if meta_data:
            product_data["meta_data"] = meta_data

        return self._post("products", product_data)

    def update_product(self, product_id: int, data: dict):
        """Update existing product"""
        update_data = {}
        field_map = {
            "name": "name", "description": "description",
            "short_description": "short_description",
            "status": "status", "sku": "sku",
        }
        for src, dest in field_map.items():
            if src in data:
                update_data[dest] = data[src]
        if "price" in data or "regular_price" in data:
            update_data["regular_price"] = str(data.get("price", data.get("regular_price")))
        if "sale_price" in data:
            update_data["sale_price"] = str(data["sale_price"]) if data["sale_price"] else ""
        if "stock_quantity" in data:
            update_data["stock_quantity"] = data["stock_quantity"]
            update_data["manage_stock"] = True
        if "images" in data:
            update_data["images"] = [{"src": img} if isinstance(img, str) else img for img in data["images"]]
        if "categories" in data:
            update_data["categories"] = [{"id": c} if isinstance(c, int) else c for c in data["categories"]]
        # Handle metadata overwriting by fetching existing IDs if necessary
        meta_to_update = []
        if "size_stock" in data:
            meta_to_update.append({"key": "_sr_sizes", "value": json.dumps(data["size_stock"])})
        if "color_stock" in data:
            meta_to_update.append({"key": "_sr_colors", "value": json.dumps(data["color_stock"])})
        
        # Meta values for other ethnic wear fields
        for field in ["fabric", "craft_style", "state_of_origin", "occasion", "care_instructions"]:
            if field in data:
                meta_to_update.append({"key": f"_sr_{field}", "value": data[field]})
        
        if meta_to_update:
            # Fetch existing to get meta IDs to OVERWRITE rather than duplicate
            existing = self._get(f"products/{product_id}")
            if existing and existing.get("meta_data"):
                meta_map = {m["key"]: m["id"] for m in existing["meta_data"]}
                for meta in meta_to_update:
                    if meta["key"] in meta_map:
                        meta["id"] = meta_map[meta["key"]]
            if "meta_data" not in update_data:
                update_data["meta_data"] = []
            update_data["meta_data"].extend(meta_to_update)

        return self._put(f"products/{product_id}", update_data)

    def delete_product(self, product_id: int, force=True):
        return self._delete(f"products/{product_id}", {"force": force})

    # =====================
    # CATEGORIES
    # =====================

    def get_categories(self, per_page=100):
        return self._get("products/categories", {"per_page": per_page}) or []

    def create_category(self, name: str, parent: int = 0, description: str = "", image_src: str = None):
        data = {"name": name, "parent": parent, "description": description}
        if image_src:
            data["image"] = {"src": image_src}
        return self._post("products/categories", data)

    def update_category(self, cat_id: int, data: dict):
        return self._put(f"products/categories/{cat_id}", data)

    def delete_category(self, cat_id: int):
        return self._delete(f"products/categories/{cat_id}", {"force": True})

    # =====================
    # ORDERS
    # =====================

    def get_orders(self, per_page=50, page=1, status=None, customer_id=None):
        params = {"per_page": per_page, "page": page}
        if status:
            params["status"] = status
        if customer_id:
            params["customer"] = customer_id
        return self._get("orders", params) or []

    def get_order(self, order_id: int):
        return self._get(f"orders/{order_id}")

    def create_order(self, items: list, billing: dict, shipping: dict,
                     customer_id: int = 0, coupon_lines: list = None,
                     payment_method: str = "razorpay"):
        """Create WooCommerce order from cart data"""
        line_items = []
        for item in items:
            li = {"product_id": int(item["product_id"]), "quantity": item["quantity"]}
            if item.get("variation_id"):
                li["variation_id"] = int(item["variation_id"])
            line_items.append(li)

        order_data = {
            "payment_method": payment_method,
            "payment_method_title": "Razorpay" if payment_method == "razorpay" else payment_method,
            "set_paid": False,
            "billing": billing,
            "shipping": shipping,
            "line_items": line_items,
            "customer_id": customer_id,
        }
        if coupon_lines:
            order_data["coupon_lines"] = [{"code": c} for c in coupon_lines]

        return self._post("orders", order_data)

    def update_order_status(self, order_id: int, status: str):
        return self._put(f"orders/{order_id}", {"status": status})

    def mark_order_paid(self, order_id: int, transaction_id: str = ""):
        return self._put(f"orders/{order_id}", {
            "set_paid": True,
            "transaction_id": transaction_id,
            "status": "processing"
        })

    def add_order_note(self, order_id: int, note: str):
        return self._post(f"orders/{order_id}/notes", {"note": note})

    # =====================
    # CUSTOMERS
    # =====================

    def get_customers(self, per_page=50, page=1, search=None):
        params = {"per_page": per_page, "page": page}
        if search:
            params["search"] = search
        return self._get("customers", params) or []

    def get_customer(self, customer_id: int):
        return self._get(f"customers/{customer_id}")

    def create_customer(self, email: str, first_name: str, last_name: str = "",
                        password: str = None, billing: dict = None, shipping: dict = None):
        data = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
        }
        if password:
            data["password"] = password
        if billing:
            data["billing"] = billing
        if shipping:
            data["shipping"] = shipping
        return self._post("customers", data)

    def update_customer(self, customer_id: int, data: dict):
        return self._put(f"customers/{customer_id}", data)

    def get_customer_by_email(self, email: str):
        customers = self._get("customers", {"email": email})
        if customers and len(customers) > 0:
            return customers[0]
        return None

    # =====================
    # COUPONS
    # =====================

    def get_coupons(self, per_page=50):
        return self._get("coupons", {"per_page": per_page}) or []

    def create_coupon(self, code: str, discount_type: str = "percent",
                      amount: str = "10", description: str = "",
                      usage_limit: int = None, expiry_date: str = None):
        data = {
            "code": code, "discount_type": discount_type,
            "amount": amount, "description": description,
        }
        if usage_limit:
            data["usage_limit"] = usage_limit
        if expiry_date:
            data["date_expires"] = expiry_date
        return self._post("coupons", data)

    def validate_coupon(self, code: str):
        coupons = self._get("coupons", {"code": code})
        if coupons and len(coupons) > 0:
            coupon = coupons[0]
            if coupon.get("date_expires"):
                exp = datetime.fromisoformat(coupon["date_expires"].replace("Z", "+00:00"))
                if exp < datetime.now(timezone.utc):
                    return {"valid": False, "reason": "Coupon expired"}
            if coupon.get("usage_limit") and coupon.get("usage_count", 0) >= coupon["usage_limit"]:
                return {"valid": False, "reason": "Usage limit reached"}
            return {"valid": True, "coupon": coupon}
        return {"valid": False, "reason": "Coupon not found"}

    # =====================
    # REPORTS
    # =====================

    def get_sales_report(self, period="month"):
        return self._get("reports/sales", {"period": period})

    def get_top_sellers(self, period="month"):
        return self._get("reports/top_sellers", {"period": period})


# Singleton instance
wc_service = WooCommerceService()
