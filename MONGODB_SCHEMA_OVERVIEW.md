# MongoDB Data Persistence & Schema Overview

In the Shri Ramya ecosystem, MongoDB serves as the high-performance application state store and a robust fallback mechanism for the WooCommerce integration. Below is a detailed breakdown of the data handled by MongoDB across its key collections.

---

## 1. Products Collection (`products`)
MongoDB acts as an optimized cache and metadata layer for the fashion catalog.

*   **Core Identification**: `id` (WooCommerce ID), `name`, `description`, `short_description`.
*   **Taxonomy**: `category`, `subcategory`, `tags`.
*   **Media**: `images` (List of absolute URLs).
*   **Premium Fashion Attributes**:
    *   `fabric`: Material details (e.g., Silk, Cotton, Chiffon).
    *   `craft_style`: Embroidery or weaving styles (e.g., Banarasi, Chikankari).
    *   `state_of_origin`: Regional heritage (e.g., Uttar Pradesh, Tamil Nadu).
    *   `occasion`: Suitability (e.g., Wedding, Festive, Casual).
*   **Availability & Variations**:
    *   `in_stock`: Boolean availability flag.
    *   `stock_quantity`: Total items available.
    *   `size_stock`: Custom object tracking stock per size (e.g., `[{"size": "M", "qty": 10}]`).
    *   `color_stock`: Custom object tracking stock per color with hex codes.
*   **Discovery Logic**: `featured`, `trending`, and `luxury_collection` flags for curated UI sections.

## 2. Users Collection (`users`)
Managed entirely within MongoDB for secure and fast authentication.

*   **Identity**: `email` (Unique), `name`, `phone`.
*   **Security**: `password` (Stored as salted Bcrypt hashes).
*   **Authorization**: `role` (Either `customer` or `admin`).
*   **Saved Data**: `addresses` (List of nested shipping/billing objects for checkout efficiency).
*   **Audit**: `created_at` timestamp.

## 3. Carts Collection (`carts`)
Persistent storage for active shopping sessions, allowing cross-device cart recovery.

*   **Mapping**: `session_id` (UUID linked to anonymous visitors or logged-in user IDs).
*   **Line Items**:
    *   `product_id`: Link to the product.
    *   `quantity`: Number of items.
    *   `variation`: A specific object containing selected `size` and `color` (ensures unique identification of different variations of the same product).
*   **Lifecycle**: `created_at` and `updated_at` (Used for session expiration and analytics).

## 4. Virtual Try-On Jobs (Metadata)
*   **State Tracking**: While processed via external AI engines, temporary job states (`pending`, `processing`, `completed`, `failed`) and internal image mappings are tracked through the backend logic, interfacing with MongoDB for product image retrieval.

---

## Architecture Summary
| Feature | Primary Source | MongoDB Role |
| :--- | :--- | :--- |
| **Catalog** | WooCommerce | Cache + Luxury Metadata |
| **Orders** | WooCommerce | (Sync Point) |
| **Customers** | MongoDB | Primary Store |
| **Carts** | MongoDB | Primary Store |
| **Inventory** | WooCommerce | High-speed Fallback |

This dual-database approach ensures that **Shri Ramya** remains operational and extremely fast even during high traffic or third-party API latency.
