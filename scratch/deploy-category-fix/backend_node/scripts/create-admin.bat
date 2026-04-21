@echo off
REM Create Admin User Script
REM Creates admin user via backend API

set BACKEND_URL=http://localhost:8000

echo Creating admin user...
curl -X POST "%BACKEND_URL%/api/v1/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Shri Ramya Admin\",\"email\":\"admin@shriramya.com\",\"password\":\"Admin@123\",\"phone\":\"+91 9876543210\"}"

echo.
echo Admin user created! You can now login with:
echo Email: admin@shriramya.com
echo Password: Admin@123
pause
