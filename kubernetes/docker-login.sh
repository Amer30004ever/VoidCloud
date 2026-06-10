#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find dockerhub.env (check current dir and parent dir)
if [ -f "dockerhub.env" ]; then
    source dockerhub.env
elif [ -f "../dockerhub.env" ]; then
    source ../dockerhub.env
else
    echo -e "${RED}❌ Error: dockerhub.env not found!${NC}"
    echo -e "${YELLOW}Please create dockerhub.env from .env.example${NC}"
    exit 1
fi

# Validate credentials
if [ -z "$DOCKER_HUB_USERNAME" ] || [ -z "$DOCKER_HUB_TOKEN" ]; then
    echo -e "${RED}❌ Error: DOCKER_HUB_USERNAME and DOCKER_HUB_TOKEN must be set in dockerhub.env${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Logging into Docker Hub as: ${GREEN}$DOCKER_HUB_USERNAME${NC}"

if echo "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin; then
    echo -e "${GREEN}✅ Successfully logged into Docker Hub${NC}"
else
    echo -e "${RED}❌ Login failed! Please check your credentials.${NC}"
    exit 1
fi