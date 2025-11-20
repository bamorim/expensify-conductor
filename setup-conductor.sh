#!/usr/bin/env bash

set -e

# Compute ports based on CONDUCTOR_PORT
DB_PORT=$((CONDUCTOR_PORT + 1))
HTTP_MAIL_PORT=$((CONDUCTOR_PORT + 2))
SMTP_MAIL_PORT=$((CONDUCTOR_PORT + 3))

# Generate .env file with computed ports
cat > .env <<EOF
# Prisma
# https://www.prisma.io/docs/reference/database-reference/connection-urls#env
DATABASE_URL="postgresql://postgres:password@localhost:$DB_PORT/expensify"

# Mail Server (SMTP URL for sending emails)
MAIL_SERVER="smtp://127.0.0.1:$SMTP_MAIL_PORT"

# Docker Compose ports
DB_PORT=$DB_PORT
HTTP_MAIL_PORT=$HTTP_MAIL_PORT
SMTP_MAIL_PORT=$SMTP_MAIL_PORT

# Dev Server port
PORT=$CONDUCTOR_PORT
EOF

# Install dependencies
pnpm install
pnpm compose:up
pnpm db:migrate
