# RepTrack Development Guide

## Commands

- Build: `deno task build` (builds client-side JS)
- Server: `deno task server` (serves static files)
- Check: `deno task checkall` (runs formatter check and linter)
- Format: `deno fmt` (auto-format code)
- Lint: `deno lint` (lint code)
- Test: `deno test src/binary/pose_test.ts` (run specific test)
- Run all tests: `deno test src/binary/`

## Code Style

- Indentation: 4 spaces (no tabs)
- No semicolons
- Use TypeScript types for everything
- Prefer ES modules: `import * as module from "npm:module"`
- Barrel exports in mod.ts files
- Use PascalCase for classes, camelCase for variables/functions
- Use the EventEmitter pattern for data flow
- Error handling: prefer Option/Maybe pattern over exceptions
- Naming: descriptive, avoid abbreviations
- Comments: only for complex logic, not obvious code

## Project Structure

- src/ - TypeScript source code
- static/ - Static web assets
- binary/ - Binary data handling
- pipeline/ - Data processing pipeline
- ui/ - User interface components
