#!/bin/sh

# Start backend
node /app/server/src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo "Backend ready"
    break
  fi
  sleep 1
done

# Start frontend
serve -s /app/dist -l 3000 &
FRONTEND_PID=$!

# Handle signals
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' SIGTERM SIGINT

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
exit $?
