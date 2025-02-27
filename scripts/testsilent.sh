#!/usr/bin/env bash
deno test src/ >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "All tests passed"
else
  echo "Tests failed"
  exit 1
fi