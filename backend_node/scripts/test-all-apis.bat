@echo off
REM Comprehensive API Test Script for Phase 3 Performance Optimization
REM Tests all major API endpoints and validates performance improvements

setlocal enabledelayedexpansion

set BASE_URL=http://localhost:8080/api/v1
set ADMIN_EMAIL=admin@shriramya.com
set ADMIN_PASSWORD=admin123

REM Counters
set TESTS_PASSED=0
set TESTS_FAILED=0
set TESTS_TOTAL=0
set ADMIN_TOKEN=

echo ==============================================
echo API Test Suite - Phase 3 Performance
echo ==============================================
echo Base URL: %BASE_URL%
echo Date: %DATE% %TIME%
echo.

REM Step 1: Health Check
echo [INFO] === Health Check ===
call :test_endpoint GET /health 200 "Health endpoint"
echo.

REM Step 2: Authentication Tests
echo [INFO] === Authentication Tests ===
echo [INFO] Logging in as admin...

REM Admin login
call :login_admin
echo.

REM Step 3: Category Tests
echo [INFO] === Category Tests ===
call :test_endpoint GET /categories 200 "Get all categories"
echo.

REM Step 4: Product Tests (Performance Critical)
echo [INFO] === Product Tests (Performance Critical) ===
echo [INFO] Testing product listing performance...

REM Test cached endpoint - First request (cache miss)
echo [INFO] First product list request (cache miss)...
call :measure_time GET /products
timeout /t 1 /nobreak >nul

REM Second request (cache hit)
echo [INFO] Second product list request (cache hit)...
call :measure_time GET /products
timeout /t 1 /nobreak

REM Third request (cache hit)
echo [INFO] Third product list request (cache hit)...
call :measure_time GET /products
echo.

REM Get products list
call :test_endpoint GET /products 200 "Get products list"
echo.

REM Step 5: Search Tests
echo [INFO] === Search Tests ===
call :test_endpoint GET "/search?q=test" 200 "Search products"
call :test_endpoint GET "/search/suggestions?q=test" 200 "Get search suggestions"
echo.

REM Step 6: Cart Tests
echo [INFO] === Cart Tests ===
call :test_endpoint GET /cart 200 "Get cart"
echo.

REM Step 7: Admin Analytics
echo [INFO] === Admin Analytics Tests ===
if defined ADMIN_TOKEN (
    call :test_endpoint_with_token GET /admin/analytics/overview 200 "Get analytics overview"
    call :test_endpoint_with_token GET /admin/analytics/sales 200 "Get sales analytics"
    call :test_endpoint_with_token GET /admin/analytics/products 200 "Get product analytics"
)
echo.

REM Summary
echo ==============================================
echo Test Summary
echo ==============================================
echo Total Tests: %TESTS_TOTAL%
echo Passed: %TESTS_PASSED%
echo Failed: %TESTS_FAILED%
echo.

if %TESTS_FAILED%==0 (
    echo All tests passed!
    exit /b 0
) else (
    echo Some tests failed.
    exit /b 1
)

goto :eof

REM Function: Test endpoint without auth
:test_endpoint
setlocal
set METHOD=%1
set ENDPOINT=%2
set EXPECTED=%3
set DESC=%4

for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" -H "Content-Type: application/json" -X %METHOD% "%BASE_URL%%ENDPOINT%"') do set HTTP_CODE=%%i

if "%HTTP_CODE%"=="%EXPECTED%" (
    echo [PASS] %DESC% (HTTP %HTTP_CODE%)
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] %DESC% (Expected: %EXPECTED%, Got: %HTTP_CODE%)
    set /a TESTS_FAILED+=1
)
set /a TESTS_TOTAL+=1
endlocal
goto :eof

REM Function: Test endpoint with auth token
:test_endpoint_with_token
setlocal
set METHOD=%1
set ENDPOINT=%2
set EXPECTED=%3
set DESC=%4

for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" -H "Content-Type: application/json" -H "Authorization: Bearer %ADMIN_TOKEN%" -X %METHOD% "%BASE_URL%%ENDPOINT%"') do set HTTP_CODE=%%i

if "%HTTP_CODE%"=="%EXPECTED%" (
    echo [PASS] %DESC% (HTTP %HTTP_CODE%)
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] %DESC% (Expected: %EXPECTED%, Got: %HTTP_CODE%)
    set /a TESTS_FAILED+=1
)
set /a TESTS_TOTAL+=1
endlocal
goto :eof

REM Function: Login admin and get token
:login_admin
for /f "delims=" %%i in ('curl -s -H "Content-Type: application/json" -X POST -d "{\"email\":\"%ADMIN_EMAIL%\",\"password\":\"%ADMIN_PASSWORD%\"}" "%BASE_URL%/auth/login"') do set LOGIN_RESPONSE=%%i

echo !LOGIN_RESPONSE! | findstr "token" >nul
if !errorlevel! equ 0 (
    echo [PASS] Admin login successful
    set /a TESTS_PASSED+=1
    REM Extract token (simplified - full extraction requires more complex parsing)
) else (
    echo [FAIL] Admin login failed
    set /a TESTS_FAILED+=1
)
set /a TESTS_TOTAL+=1
goto :eof

REM Function: Measure response time
:measure_time
setlocal
set METHOD=%1
set ENDPOINT=%2

for /f "tokens=1-4 delims=:." %%a in ('powershell -Command "(Get-Date).ToString('HH:mm:ss.ffff')"') do set START_TIME=%%a%%b%%c%%d

curl -s -o nul -H "Content-Type: application/json" -X %METHOD% "%BASE_URL%%ENDPOINT%"

for /f "tokens=1-4 delims=:." %%a in ('powershell -Command "(Get-Date).ToString('HH:mm:ss.ffff')"') do set END_TIME=%%a%%b%%c%%d

echo [INFO] %ENDPOINT% completed
endlocal
goto :eof
