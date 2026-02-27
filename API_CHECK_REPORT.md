# API Check Report

## Scope
Checked key public API endpoints that should be reachable from the backend base path.

Base URL used:
- `http://localhost:8000/api`

## Command Used
```bash
./api_check.sh
```

## Result
```text
API connectivity check against http://localhost:8000/api
------------------------------------------------------------
❌ GET /health -> curl error (curl: (7) Failed to connect to localhost port 8000 after 0 ms: Couldn't connect to server)
❌ GET /products -> curl error (curl: (7) Failed to connect to localhost port 8000 after 0 ms: Couldn't connect to server)
❌ GET /categories -> curl error (curl: (7) Failed to connect to localhost port 8000 after 0 ms: Couldn't connect to server)
❌ GET /blog -> curl error (curl: (7) Failed to connect to localhost port 8000 after 0 ms: Couldn't connect to server)
------------------------------------------------------------
One or more endpoints are unreachable or failing.
```

## Notes
- The API server is not running on port `8000` in this environment.
- `docker` is not available in this environment, so the stack could not be started with Docker Compose.
- External preview URL checks were also blocked by outbound proxy restrictions (`CONNECT tunnel failed: 403`).
