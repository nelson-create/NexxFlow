#!/bin/sh
set -eu

npx prisma db push
exec node dist/index.js
