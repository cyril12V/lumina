#!/bin/bash

# Lumina Deployment Script for Fly.io

echo "=== Lumina Deployment ==="
echo ""

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "Fly CLI not found. Installing..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "On Windows, please install Fly CLI manually:"
        echo "  powershell -Command \"iwr https://fly.io/install.ps1 -useb | iex\""
        exit 1
    else
        curl -L https://fly.io/install.sh | sh
    fi
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "Please log in to Fly.io..."
    fly auth login
fi

# Create volume if it doesn't exist (for SQLite data persistence)
echo "Checking for volume..."
if ! fly volumes list | grep -q "lumina_data"; then
    echo "Creating persistent volume for database..."
    fly volumes create lumina_data --region cdg --size 1
fi

# Deploy
echo ""
echo "Deploying to Fly.io..."
fly deploy

echo ""
echo "=== Deployment Complete ==="
echo "Your app is available at: https://lumina-photo.fly.dev"
