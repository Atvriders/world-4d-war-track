#!/bin/sh

# Single server handles both API and static frontend
exec node /app/server/src/server.js
