---
description: Remove Keycloak Docker containers and images
---

1. List any running Keycloak containers
// turbo
```bash
docker ps --filter "ancestor=keycloak" --format "{{.ID}} {{.Image}} {{.Names}}"
```

2. Stop and remove all Keycloak containers (if any)
// turbo
```bash
docker rm -f $(docker ps -aq --filter "ancestor=keycloak")
```

3. Prune unused Keycloak images
// turbo
```bash
docker image prune -f --filter "reference=keycloak*"
```
