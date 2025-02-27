#!/usr/bin/env bash
# Run formatter check
OUTPUT_FMT=$(deno fmt --check src/ 2>&1)
if [ $? -ne 0 ]; then
  echo "Formatting check failed:"
  echo "$OUTPUT_FMT"
  exit 1
fi

# Run linter
OUTPUT_LINT=$(deno lint src/ 2>&1)
if [ $? -ne 0 ]; then
  echo "Linting failed:"
  echo "$OUTPUT_LINT"
  exit 1
fi

# Run tests
OUTPUT_TEST=$(deno test src/ 2>&1)
if [ $? -ne 0 ]; then
  echo "Tests failed:"
  echo "$OUTPUT_TEST"
  exit 1
fi

# Run build
OUTPUT_BUILD=$(deno task build 2>&1)
if [ $? -ne 0 ]; then
  echo "Build failed:"
  echo "$OUTPUT_BUILD"
  exit 1
fi

echo "ok"
