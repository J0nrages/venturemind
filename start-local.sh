#!/bin/bash

# Start local development environment with Valkey and PostgreSQL

echo "🚀 Starting Syna Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start backend services
echo "📦 Starting backend services (Valkey, PostgreSQL)..."
cd backend
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check Valkey
if docker-compose exec -T valkey valkey-cli ping > /dev/null 2>&1; then
    echo "✅ Valkey is running"
else
    echo "❌ Valkey failed to start"
    exit 1
fi

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U syna > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

cd ..

# Start the application
echo "🎯 Starting application servers..."
echo ""
echo "📝 Services will be available at:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/api/docs"
echo "   Redis GUI: http://localhost:8001 (optional, run with --debug)"
echo ""

# Check for debug flag
if [[ "$1" == "--debug" ]]; then
    echo "🔍 Starting with debug tools..."
    cd backend && docker-compose --profile debug up -d && cd ..
fi

# Run the app
bun run dev