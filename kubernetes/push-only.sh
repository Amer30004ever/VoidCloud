#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}☁️  Amer Portal - Push to Docker Hub${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load dockerhub.env
if [ -f "dockerhub.env" ]; then
    source dockerhub.env
else
    echo -e "${RED}❌ Error: dockerhub.env not found!${NC}"
    echo -e "${YELLOW}Please create dockerhub.env from .env.example${NC}"
    exit 1
fi

# Validate credentials
if [ -z "$DOCKER_HUB_USERNAME" ] || [ -z "$DOCKER_HUB_TOKEN" ]; then
    echo -e "${RED}❌ Error: DOCKER_HUB_USERNAME and DOCKER_HUB_TOKEN must be set${NC}"
    exit 1
fi

# Set variables
DOCKER_HUB_REPO=${DOCKER_HUB_REPO:-amer-portal}
BACKEND_IMAGE_TAG=${BACKEND_IMAGE_TAG:-latest}
FRONTEND_IMAGE_TAG=${FRONTEND_IMAGE_TAG:-latest}

BACKEND_IMAGE="$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:$BACKEND_IMAGE_TAG"
FRONTEND_IMAGE="$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:$FRONTEND_IMAGE_TAG"

# Login to Docker Hub
echo -e "${BLUE}🔐 Logging into Docker Hub...${NC}"
./docker-login.sh
if [ $? -ne 0 ]; then
    exit 1
fi
echo ""

# Push Backend
echo -e "${BLUE}☁️  Pushing Backend image...${NC}"
docker push "$BACKEND_IMAGE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend image pushed: $BACKEND_IMAGE${NC}"
    
    # Also push timestamped tag if it exists
    TIMESTAMP_TAG=$(docker images --format "{{.Tag}}" | grep -E "^[0-9]{8}-[0-9]{6}$" | head -1)
    if [ -n "$TIMESTAMP_TAG" ]; then
        docker push "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:$TIMESTAMP_TAG"
        echo -e "${GREEN}✅ Also pushed timestamp tag: $TIMESTAMP_TAG${NC}"
    fi
else
    echo -e "${RED}❌ Failed to push backend image${NC}"
    exit 1
fi
echo ""

# Push Frontend
echo -e "${BLUE}☁️  Pushing Frontend image...${NC}"
docker push "$FRONTEND_IMAGE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend image pushed: $FRONTEND_IMAGE${NC}"
    
    # Also push timestamped tag if it exists
    TIMESTAMP_TAG=$(docker images --format "{{.Tag}}" | grep -E "^[0-9]{8}-[0-9]{6}$" | head -1)
    if [ -n "$TIMESTAMP_TAG" ]; then
        docker push "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:$TIMESTAMP_TAG"
        echo -e "${GREEN}✅ Also pushed timestamp tag: $TIMESTAMP_TAG${NC}"
    fi
else
    echo -e "${RED}❌ Failed to push frontend image${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Push Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Images available at:${NC}"
echo -e "   ${GREEN}https://hub.docker.com/r/$BACKEND_IMAGE${NC}"
echo -e "   ${GREEN}https://hub.docker.com/r/$FRONTEND_IMAGE${NC}"