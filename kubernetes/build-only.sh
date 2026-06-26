#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}📦 Amer Portal - Build Images Only${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load dockerhub.env if exists
if [ -f "dockerhub.env" ]; then
    source dockerhub.env
    echo -e "${GREEN}✅ Loaded Docker Hub configuration${NC}"
else
    echo -e "${YELLOW}⚠️  dockerhub.env not found. Using local tags only.${NC}"
    DOCKER_HUB_USERNAME=""
fi

# Set variables
DOCKER_HUB_REPO=${DOCKER_HUB_REPO:-voidcloud}
BACKEND_IMAGE_TAG=${BACKEND_IMAGE_TAG:-latest}
FRONTEND_IMAGE_TAG=${FRONTEND_IMAGE_TAG:-latest}

# Check if backend directory exists
if [ ! -d "../backend" ]; then
    echo -e "${RED}❌ Error: backend directory not found at ../backend${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "../frontend" ]; then
    echo -e "${RED}❌ Error: frontend directory not found at ../frontend${NC}"
    exit 1
fi

# Build Backend
echo -e "${BLUE}📦 Building Backend image...${NC}"
cd ../backend
if [ -n "$DOCKER_HUB_USERNAME" ]; then
    BACKEND_IMAGE_FULL="$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:$BACKEND_IMAGE_TAG"
    docker build -t "$BACKEND_IMAGE_FULL" -t "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-backend:$(date +%Y%m%d-%H%M%S)" .
else
    BACKEND_IMAGE_FULL="voidcloud-backend:$BACKEND_IMAGE_TAG"
    docker build -t "$BACKEND_IMAGE_FULL" .
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend image built: $BACKEND_IMAGE_FULL${NC}"
else
    echo -e "${RED}❌ Failed to build backend image${NC}"
    exit 1
fi
cd ../kubernetes

# Build Frontend
echo -e "${BLUE}📦 Building Frontend image...${NC}"
cd ../frontend
if [ -n "$DOCKER_HUB_USERNAME" ]; then
    FRONTEND_IMAGE_FULL="$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:$FRONTEND_IMAGE_TAG"
    docker build -t "$FRONTEND_IMAGE_FULL" -t "$DOCKER_HUB_USERNAME/$DOCKER_HUB_REPO-frontend:$(date +%Y%m%d-%H%M%S)" .
else
    FRONTEND_IMAGE_FULL="voidcloud-frontend:$FRONTEND_IMAGE_TAG"
    docker build -t "$FRONTEND_IMAGE_FULL" .
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend image built: $FRONTEND_IMAGE_FULL${NC}"
else
    echo -e "${RED}❌ Failed to build frontend image${NC}"
    exit 1
fi
cd ../kubernetes

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Built images:${NC}"
echo -e "   Backend:  ${GREEN}$BACKEND_IMAGE_FULL${NC}"
echo -e "   Frontend: ${GREEN}$FRONTEND_IMAGE_FULL${NC}"
echo ""
if [ -n "$DOCKER_HUB_USERNAME" ]; then
    echo -e "${YELLOW}To push to Docker Hub, run: ./push-only.sh${NC}"
    echo -e "${YELLOW}To build and deploy, run: ./build-and-deploy.sh${NC}"
else
    echo -e "${YELLOW}To deploy locally, run: ./deploy-only.sh${NC}"
fi