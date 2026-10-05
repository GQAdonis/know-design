# test-baseline Specification

## Purpose
TBD - created by archiving change capture-test-baseline. Update Purpose after archive.

## Requirements

### Requirement: A clean-main test baseline is recorded before profile work
The repository SHALL hold a recorded baseline of the guard, typecheck and package test results measured on clean `main` before any build-profile change, so later changes are compared against it by test name rather than by a raw failure count.

#### Scenario: Baseline is measured, not remembered
- **WHEN** the baseline is captured
- **THEN** every figure in `baseline.md` comes from a command run in that session, with its exit code and duration
- **AND** no result from an earlier, unpersisted session is reused

#### Scenario: Pre-existing failures are classified by name
- **WHEN** a test suite already fails on clean `main`
- **THEN** each failing file is listed by name and classified by whether it fails alone or only under load
- **AND** a later run is judged against those named sets, not against a count
