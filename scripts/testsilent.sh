#!/usr/bin/env bash
OUTPUT_TEST=$(deno test src/ 2>&1)
if [ $? -eq 0 ]; then
  echo "All tests passed"
else
  echo "Tests failed:"
  echo "$OUTPUT_TEST"
  exit 1
fi