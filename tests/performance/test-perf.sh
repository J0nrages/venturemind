#!/bin/bash

# Performance Test Suite for SYNA
# Run after optimization changes to verify everything works

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== SYNA Performance Test Suite ===${NC}\n"

# Check if services are running
check_services() {
    echo -e "${YELLOW}0) Checking Services...${NC}"
    
    if ! curl -s http://127.0.0.1:8000/health > /dev/null; then
        echo -e "${RED}✗ Backend not running on :8000${NC}"
        echo "  Start with: cd backend && uv run uvicorn app.main:app --reload --reload-dir app --host 127.0.0.1 --port 8000"
        exit 1
    fi
    echo -e "${GREEN}✓ Backend running${NC}"
    
    if ! curl -s http://localhost:5173 > /dev/null; then
        echo -e "${RED}✗ Frontend not running on :5173${NC}"
        echo "  Start with: bun run dev:frontend"
        exit 1
    fi
    echo -e "${GREEN}✓ Frontend running${NC}\n"
}

# 1) HTTP + CORS Tests
test_http_cors() {
    echo -e "${YELLOW}1) HTTP + CORS Sanity Tests${NC}"
    
    # Health endpoint
    echo "Testing health endpoint..."
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health)
    if [ "$HEALTH_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Health endpoint: 200 OK${NC}"
    else
        echo -e "${RED}✗ Health endpoint: $HEALTH_STATUS${NC}"
    fi
    
    # CORS preflight
    echo "Testing CORS preflight..."
    CORS_HEADERS=$(curl -s -I -X OPTIONS http://127.0.0.1:8000/api/v1/health \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: POST" | grep -i "access-control" | wc -l)
    
    if [ "$CORS_HEADERS" -gt 0 ]; then
        echo -e "${GREEN}✓ CORS headers present${NC}"
    else
        echo -e "${RED}✗ CORS headers missing${NC}"
    fi
    
    # Response time test
    echo "Testing response times (20 requests)..."
    TOTAL_TIME=0
    for i in {1..20}; do
        TIME=$(curl -s -o /dev/null -w "%{time_total}" http://127.0.0.1:8000/health)
        TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME" | bc)
    done
    AVG_TIME=$(echo "scale=3; $TOTAL_TIME / 20" | bc)
    
    if (( $(echo "$AVG_TIME < 0.05" | bc -l) )); then
        echo -e "${GREEN}✓ Avg response time: ${AVG_TIME}s (target: <0.05s)${NC}"
    else
        echo -e "${YELLOW}⚠ Avg response time: ${AVG_TIME}s (target: <0.05s)${NC}"
    fi
    echo ""
}

# 2) WebSocket Tests
test_websocket() {
    echo -e "${YELLOW}2) WebSocket Path + Proxy Tests${NC}"
    
    # Direct WebSocket test
    echo "Testing direct WebSocket connection..."
    python3 -c "
import websocket
import sys
try:
    ws = websocket.create_connection('ws://127.0.0.1:8000/ws/unified/test?token=test', timeout=2)
    ws.close()
    print('✓ Direct WS: Connected and closed successfully')
    sys.exit(0)
except Exception as e:
    print(f'✗ Direct WS failed: {e}')
    sys.exit(1)
" && echo -e "${GREEN}✓ Direct WebSocket OK${NC}" || echo -e "${RED}✗ Direct WebSocket failed${NC}"
    
    # Proxy WebSocket test
    echo "Testing WebSocket through Vite proxy..."
    python3 -c "
import websocket
import sys
try:
    ws = websocket.create_connection('ws://localhost:5173/ws/unified/test?token=test', timeout=2)
    ws.close()
    print('✓ Proxy WS: Connected and closed successfully')
    sys.exit(0)
except Exception as e:
    print(f'✗ Proxy WS failed: {e}')
    sys.exit(1)
" && echo -e "${GREEN}✓ Proxy WebSocket OK${NC}" || echo -e "${RED}✗ Proxy WebSocket failed${NC}"
    echo ""
}

# 3) Build Test
test_build() {
    echo -e "${YELLOW}3) Production Build Test${NC}"
    
    echo "Running production build..."
    if bun run build > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Production build succeeded${NC}"
        
        # Check for vendor chunks
        if ls dist/assets/*vendor*.js > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Vendor chunks created${NC}"
        else
            echo -e "${YELLOW}⚠ No vendor chunks found${NC}"
        fi
        
        # Check build size
        BUILD_SIZE=$(du -sh dist | cut -f1)
        echo -e "${GREEN}✓ Build size: $BUILD_SIZE${NC}"
    else
        echo -e "${RED}✗ Production build failed${NC}"
    fi
    echo ""
}

# 4) Performance Summary
performance_summary() {
    echo -e "${YELLOW}4) Performance Summary${NC}"
    
    # Test concurrent requests
    echo "Testing concurrent performance (50 requests, 10 concurrent)..."
    if command -v ab > /dev/null; then
        ab -n 50 -c 10 -q http://127.0.0.1:8000/health 2>&1 | grep -E "Requests per second|Time per request" | while read line; do
            echo "  $line"
        done
    else
        echo "  (Apache Bench not installed, skipping concurrent test)"
    fi
    
    echo ""
    echo -e "${GREEN}=== Test Complete ===${NC}"
    echo ""
    echo "Performance Targets:"
    echo "  • Dev HMR: <100ms typical"
    echo "  • Dev refresh: <1s to usable"
    echo "  • HTTP TTFB (local): 10-50ms P95"
    echo "  • WebSocket: Status 101, stable connection"
    echo "  • CORS: Correct headers with max-age"
}

# Run all tests
check_services
test_http_cors
test_websocket
test_build
performance_summary