#!/usr/bin/env bash
# Run formatter check
deno fmt --check src/ > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Formatting check failed"
  exit 1
fi

# Run linter
deno lint src/ > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Linting failed"
  exit 1
fi

# Run tests
deno test src/ > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Tests failed"
  exit 1
fi

echo "All checks passed successfully"