#!/bin/sh
# Start backend server
cd /app/server && node src/server.js &
# Start frontend static server
serve -s /app/dist -l 3000
