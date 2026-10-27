---
name: generate-tests
version: 1.0.0
description: >
 Generates a complete test suite for a target function, module, or file.
 Auto-detects the test framework and conventions. Covers happy paths,
 edge cases, error paths, and async/integration scenarios.
 Runs tests to verify they pass before finishing.
idempotent: false
overwrite_policy: merge
allowed-tools:
 - Read
 - Write
 - Glob
 - Bash
input_schema:
 type: object
 properties:
 target:
 type: string
 description: "File path or function/class name to generate tests for."
 framework:
 type: string
 description: "Test framework override (e.g. 'jest', 'pytest', 'vitest'). Auto-detected if omitted."
 coverage_target:
 type: integer
 description: "Minimum branch coverage % to aim for. Defaults to 80."
 default: 80
 required: [target]
output_schema:
 type: object
 properties:
 test_file:
 type: string
 description: "Path of the written test file."
 tests_written:
 type: integer
 tests_passed:
 type: integer
 coverage_areas:
 type: array
 items: {type: string, enum: [happy-path, edge-case, error-path, async, integration]}
 warnings:
 type: array
 items: {type: string}
 required: [test_file, tests_written, tests_passed]
fallback:
 on_framework_unknown: "Ask the user which test framework to use."
 on_test_failure: "Fix failing tests before reporting completion."
---

Read target code fully. Understand the contract: inputs, outputs, side effects, error conditions.

Detect framework from `package.json`, `pyproject.toml`, or existing test files. Match naming, import style, and assertion conventions exactly.

Generate four coverage layers:
1. **Happy path** — standard inputs → expected outputs; document the contract in the test name
2. **Edge cases** — empty/null/undefined, 0/negative/max-int, single items, unicode, type coercions
3. **Error paths** — invalid types, missing args, constraint violations → assert correct error/exception
4. **Async/integration** — mock all external deps (network, FS, DB); test resolved AND rejected paths

**Constraints:**
- One assertion per test (or one tightly related group)
- Test names read as sentences: `"returns null when input is empty"`
- No real network calls — mock all external dependencies
- Target coverage_target% branch coverage

Run: `npm test -- --testPathPattern=<test-file>` or `pytest <test-file> -x -v`
Fix any failures. Report tests_written and tests_passed.
