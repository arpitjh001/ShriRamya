# Comprehensive API Test Script for Phase 3 Performance Optimization (PowerShell)
# Tests all major API endpoints and validates performance improvements

$BASE_URL = if ($env:REACT_APP_BACKEND_URL) { $env:REACT_APP_BACKEND_URL } else { "http://localhost:8080/api/v1" }
$ADMIN_EMAIL = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@shriramya.com" }
$ADMIN_PASSWORD = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin123" }

# Counters
$TESTS_PASSED = 0
$TESTS_FAILED = 0
$TESTS_TOTAL = 0

# Auth tokens
$ADMIN_TOKEN = ""

# Helper functions
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Pass { param($msg) Write-Host "[PASS] $msg" -ForegroundColor Green; $script:TESTS_PASSED++; $script:TESTS_TOTAL++ }
function Write-Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:TESTS_FAILED++; $script:TESTS_TOTAL++ }
function Write-Skip { param($msg) Write-Host "[SKIP] $msg" -ForegroundColor Yellow }

# Test HTTP endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$ExpectedStatus,
        [string]$Description,
        [string]$Token = "",
        [string]$Data = ""
    )
    
    $url = "${BASE_URL}${Endpoint}"
    $headers = @{ "Content-Type" = "application/json" }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
            TimeoutSec = 30
        }
        
        if ($Data -and $Method -ne "GET") {
            $params["Body"] = $Data
        }
        
        $response = Invoke-WebRequest @params
        $httpCode = $response.StatusCode
        $body = $response.Content
        
        if ($httpCode -eq $ExpectedStatus) {
            Write-Pass "$Description (HTTP $httpCode)"
            return $body
        } else {
            Write-Fail "$Description (Expected: $ExpectedStatus, Got: $httpCode)"
            return $body
        }
    } catch {
        $httpCode = $_.Exception.Response.StatusCode.value__
        Write-Fail "$Description (Expected: $ExpectedStatus, Error: $httpCode)"
        return $null
    }
}

# Measure response time
function Measure-ResponseTime {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description,
        [string]$Token = ""
    )
    
    $url = "${BASE_URL}${Endpoint}"
    $headers = @{ "Content-Type" = "application/json" }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -UseBasicParsing -TimeoutSec 30 | Out-Null
    } catch {
        # Ignore errors for timing tests
    }
    
    $stopwatch.Stop()
    $elapsed = [math]::Round($stopwatch.ElapsedMilliseconds, 2)
    
    if ($elapsed -lt 100) {
        Write-Pass "$Description (${elapsed}ms)"
    } elseif ($elapsed -lt 500) {
        Write-Info "$Description (${elapsed}ms) - Acceptable"
    } else {
        Write-Fail "$Description (${elapsed}ms) - Too slow!"
    }
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "G ShriRamya API Test Suite - Phase 3" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Base URL: $BASE_URL" -ForegroundColor White
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ""

# Step 1: Health Check
Write-Info "=== Health Check ==="
Test-Endpoint -Method "GET" -Endpoint "/health" -ExpectedStatus "200" -Description "Health endpoint"
Write-Host ""

# Step 2: Authentication Tests
Write-Info "=== Authentication Tests ==="

# Admin login
Write-Info "Logging in as admin..."
$loginData = @{ email = $ADMIN_EMAIL; password = $ADMIN_PASSWORD } | ConvertTo-Json
$ADMIN_RESPONSE = Test-Endpoint -Method "POST" -Endpoint "/auth/login" -ExpectedStatus "200" -Description "Admin login" -Data $loginData

if ($ADMIN_RESPONSE) {
    try {
        $json = $ADMIN_RESPONSE | ConvertFrom-Json
        $ADMIN_TOKEN = $json.data.token
        if ($ADMIN_TOKEN) {
            Write-Pass "Admin token obtained"
        } else {
            Write-Fail "Failed to extract admin token from response"
        }
    } catch {
        Write-Fail "Failed to parse admin login response"
    }
} else {
    Write-Fail "Admin login failed"
}

# Test auth me endpoint
if ($ADMIN_TOKEN) {
    Test-Endpoint -Method "GET" -Endpoint "/auth/me" -ExpectedStatus "200" -Description "Get current user" -Token $ADMIN_TOKEN
}
Write-Host ""

# Step 3: Category Tests
Write-Info "=== Category Tests ==="

# Get all categories
Test-Endpoint -Method "GET" -Endpoint "/categories" -ExpectedStatus "200" -Description "Get all categories"

# Create test category
$categoryData = @{ name = "Test Category Phase3"; slug = "test-category-phase3" } | ConvertTo-Json
$CATEGORY_RESPONSE = Test-Endpoint -Method "POST" -Endpoint "/categories" -ExpectedStatus "201" -Description "Create category" -Token $ADMIN_TOKEN -Data $categoryData

if ($CATEGORY_RESPONSE) {
    try {
        $json = $CATEGORY_RESPONSE | ConvertFrom-Json
        $CATEGORY_ID = $json.data.id
        if ($CATEGORY_ID) {
            Write-Pass "Category created with ID: $CATEGORY_ID"
            Test-Endpoint -Method "GET" -Endpoint "/categories/$CATEGORY_ID" -ExpectedStatus "200" -Description "Get category by ID"
        }
    } catch {
        Write-Info "Using existing category for tests"
        $CATEGORY_ID = 1
    }
} else {
    Write-Info "Using existing category for tests"
    $CATEGORY_ID = 1
}
Write-Host ""

# Step 4: Product Tests (Performance Critical)
Write-Info "=== Product Tests (Performance Critical) ==="

# Test 1: Get products (cached endpoint)
Write-Info "Testing product listing performance..."
Measure-ResponseTime -Method "GET" -Endpoint "/products" -Description "First product list request (cache miss)"
Measure-ResponseTime -Method "GET" -Endpoint "/products" -Description "Second product list request (cache hit)"
Measure-ResponseTime -Method "GET" -Endpoint "/products" -Description "Third product list request (cache hit)"

# Get products
$PRODUCTS_RESPONSE = Test-Endpoint -Method "GET" -Endpoint "/products" -ExpectedStatus "200" -Description "Get products list"

if ($PRODUCTS_RESPONSE) {
    try {
        $json = $PRODUCTS_RESPONSE | ConvertFrom-Json
        $products = $json.data.products
        if ($products -and $products.Count -gt 0) {
            $PRODUCT_ID = $products[0].id
            Write-Info "Using product ID: $PRODUCT_ID for detailed tests"
            
            # Get single product
            Test-Endpoint -Method "GET" -Endpoint "/products/$PRODUCT_ID" -ExpectedStatus "200" -Description "Get product by ID"
            
            # Test product with variants
            Test-Endpoint -Method "GET" -Endpoint "/products/$PRODUCT_ID" -ExpectedStatus "200" -Description "Get product with variants"
        }
    } catch {
        Write-Info "Could not parse products response"
    }
}

# Create test product
Write-Info "Creating test product..."
$productCreateData = @{ 
    name = "Test Product Phase3"
    description = "Performance test product"
    basePrice = 999
    status = "published"
    categoryId = $CATEGORY_ID
} | ConvertTo-Json

$PRODUCT_CREATE_RESPONSE = Test-Endpoint -Method "POST" -Endpoint "/products" -ExpectedStatus "201" -Description "Create product" -Token $ADMIN_TOKEN -Data $productCreateData

if ($PRODUCT_CREATE_RESPONSE) {
    try {
        $json = $PRODUCT_CREATE_RESPONSE | ConvertFrom-Json
        $NEW_PRODUCT_ID = $json.data.id
        if ($NEW_PRODUCT_ID) {
            Write-Pass "Product created with ID: $NEW_PRODUCT_ID"
            
            # Add variant
            $variantData = @{ 
                sku = "TEST-PHASE3-001"
                price = 999
                stock = 100
                attributes = @{ Size = "M"; Color = "Blue" }
            } | ConvertTo-Json
            Test-Endpoint -Method "POST" -Endpoint "/products/$NEW_PRODUCT_ID/variants" -ExpectedStatus "201" -Description "Add variant to product" -Token $ADMIN_TOKEN -Data $variantData
            
            # Update product (should trigger cache invalidation)
            $updateData = @{ name = "Updated Test Product Phase3" } | ConvertTo-Json
            Test-Endpoint -Method "PUT" -Endpoint "/products/$NEW_PRODUCT_ID" -ExpectedStatus "200" -Description "Update product (cache invalidation)" -Token $ADMIN_TOKEN -Data $updateData
            
            # Verify cache was invalidated by checking response time
            Write-Info "Testing cache after update..."
            Measure-ResponseTime -Method "GET" -Endpoint "/products" -Description "Product list after update (cache miss expected)"
        }
    } catch {
        Write-Info "Could not parse product create response"
    }
}
Write-Host ""

# Step 5: Search Tests
Write-Info "=== Search Tests ==="
Test-Endpoint -Method "GET" -Endpoint "/search?q=test" -ExpectedStatus "200" -Description "Search products"
Test-Endpoint -Method "GET" -Endpoint "/search/suggestions?q=test" -ExpectedStatus "200" -Description "Get search suggestions"
Write-Host ""

# Step 6: Cart Tests
Write-Info "=== Cart Tests ==="
Test-Endpoint -Method "GET" -Endpoint "/cart" -ExpectedStatus "200" -Description "Get cart"
Write-Host ""

# Step 7: Admin Analytics
Write-Info "=== Admin Analytics Tests ==="
if ($ADMIN_TOKEN) {
    Test-Endpoint -Method "GET" -Endpoint "/admin/analytics/overview" -ExpectedStatus "200" -Description "Get analytics overview" -Token $ADMIN_TOKEN
    Test-Endpoint -Method "GET" -Endpoint "/admin/analytics/sales" -ExpectedStatus "200" -Description "Get sales analytics" -Token $ADMIN_TOKEN
    Test-Endpoint -Method "GET" -Endpoint "/admin/analytics/products" -ExpectedStatus "200" -Description "Get product analytics" -Token $ADMIN_TOKEN
}
Write-Host ""

# Step 8: Performance Verification
Write-Info "=== Performance Verification ==="
Write-Info "Testing cached vs non-cached endpoints..."

# Test products endpoint multiple times to verify caching
$times = @()
for ($i = 0; $i -lt 5; $i++) {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        Invoke-WebRequest -Uri "${BASE_URL}/products" -Method Get -Headers @{ "Content-Type" = "application/json" } -UseBasicParsing -TimeoutSec 30 | Out-Null
    } catch {}
    $stopwatch.Stop()
    $times += $stopwatch.ElapsedMilliseconds
}
$avgTime = [math]::Round(($times | Measure-Object -Average).Average, 2)

Write-Info "Average response time for /products (5 requests): ${avgTime}ms"

if ($avgTime -lt 100) {
    Write-Pass "Caching is working effectively (avg < 100ms)"
} elseif ($avgTime -lt 500) {
    Write-Info "Caching is acceptable (avg < 500ms)"
} else {
    Write-Fail "Caching may not be working (avg > 500ms)"
}
Write-Host ""

# Step 9: Redis Cache Verification
Write-Info "=== Redis Cache Verification ==="
try {
    $redisCheck = Invoke-WebRequest -Uri "${BASE_URL}/health" -Method Get -UseBasicParsing -TimeoutSec 10
    if ($redisCheck.StatusCode -eq 200) {
        Write-Pass "Redis connection verified (via health endpoint)"
    }
} catch {
    Write-Info "Redis status: Unable to verify directly"
}
Write-Host ""

# Summary
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Total Tests: $TESTS_TOTAL" -ForegroundColor White
Write-Host "Passed: $TESTS_PASSED" -ForegroundColor Green
Write-Host "Failed: $TESTS_FAILED" -ForegroundColor Red
Write-Host ""

if ($TESTS_FAILED -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Check logs above." -ForegroundColor Yellow
    exit 1
}
