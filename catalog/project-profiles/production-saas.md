# Project Profile: Production SaaS

## Description
A strict, multi-agent setup for customer-facing systems with high reliability, security, and maintenance requirements.

## Typical Role Composition
- **Technical Lead:** Architecture and Implementation.
- **Code Reviewer:** Independent code analysis.
- **QA Engineer:** Independent test verification.

## Default Quality Gates
- Strict Type Checking.
- 80%+ Test Coverage.
- Integration & E2E Tests Pass.
- Dependency Vulnerability Scan.
- Required Human Approval for Production Deploy.

## Security Considerations
- Mandatory Secret Scanning.
- SQL Injection & XSS checks.
- Human review of any IAM/Permissions changes.

## Workflow
1. Tech Lead implements code (state `IN_PROGRESS`).
2. Tech Lead submits to `REVIEW`.
3. Code Reviewer analyzes diff. If pass, moves to `VERIFYING`.
4. QA Engineer runs test suite. If pass, moves to `PASS`.
5. Any failure returns task to `FAILED` for a maximum of 3 retries.
