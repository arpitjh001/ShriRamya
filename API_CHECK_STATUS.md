# API Check Status

I attempted to run the project's API verification scripts, but this environment is missing Python dependencies required to execute any HTTP checks.

## Commands run

1. `python test_deployment.py`
   - Result: failed before tests started
   - Error: `ModuleNotFoundError: No module named 'requests'`

2. `python backend/verify_apis.py`
   - Result: failed before tests started
   - Error: `ModuleNotFoundError: No module named 'requests'`

3. `pip install -r backend/requirements.txt`
   - Result: dependency installation failed due restricted package access (`ProxyError`, then `No matching distribution found for aiohappyeyeballs==2.6.1`)

## API routes discovered in code

### Core routes (`/api`)
- Auth: `/auth/register`, `/auth/login`, `/auth/me`, `/auth/check-admin`
- Catalog: `/products`, `/products/{product_id}`, `/categories`, `/recommendations/{product_id}`
- Cart: `/cart`, `/cart/item/{product_id}`, `/cart`
- System: `/`, `/health`
- Uploads: `/upload`, `/upload/multiple`
- Virtual try-on: `/tryon/upload`, `/tryon/status/{job_id}`, `/tryon/result/{job_id}`, `/tryon/{job_id}`

### WooCommerce routes (`/api/wc`)
- Products, categories, orders, customers, coupons, reports endpoints

### WordPress routes (`/api/wp`)
- Posts, categories, media, capabilities endpoints

## Conclusion

I could not verify runtime API health in this container because dependencies are unavailable and cannot be installed from the network here.

To fully validate your APIs, run these locally in your normal dev environment:

```bash
pip install -r backend/requirements.txt
python test_deployment.py
python backend/verify_apis.py
```
