# Contributing to Pixel Minds

Thank you for your interest in contributing to Pixel Minds! This guide outlines the development workflow, coding standards, and pull request procedures to help you get started smoothly.

---

## Code of Conduct

All contributors, maintainers, and community members are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please ensure interactions remain respectful, inclusive, and constructive.

---

## Quick Development Workflow

1. **Fork the Repository**: Create your personal fork on GitHub.
2. **Clone Locally**:
   ```bash
   git clone https://github.com/<your-username>/Pixel-Minds.git
   cd Pixel-Minds
   ```
3. **Set Up Upstream Remote**:
   ```bash
   git remote add upstream https://github.com/ADHARV-S-RAVI/Pixel-Minds.git
   ```
4. **Create a Dedicated Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
5. **Install Dependencies**:
   ```bash
   npm install
   ```
6. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your local or test Supabase project keys.

---

## Branch Naming Conventions

Use clear, descriptive branch names prefixed by their purpose:

- `feat/<short-description>`: New features or UI components
- `fix/<short-description>`: Bug fixes or security patches
- `docs/<short-description>`: Documentation additions or updates
- `refactor/<short-description>`: Code restructuring without feature changes
- `test/<short-description>`: Adding or modifying test suites
- `chore/<short-description>`: Build tooling, dependency, or configuration updates

Examples:
- `feat/filter-by-tags`
- `fix/mention-autocomplete-delay`
- `docs/setup-guide-clarification`

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>
```

### Common Types
- `feat`: A new user-facing capability or API integration
- `fix`: A bug fix or defect correction
- `docs`: Documentation changes only
- `style`: Formatting, whitespace, or layout adjustments with no logic changes
- `refactor`: Internal code improvements without behavioral changes
- `perf`: Performance optimizations
- `test`: Adding or updating test cases
- `chore`: Maintenance tasks, lockfiles, or package updates

### Examples
- `feat(feed): add keyboard shortcuts for post actions`
- `fix(ledger): guard against concurrent transaction calls`
- `docs(readme): add troubleshooting section for local Supabase setup`

---

## Code Quality & Guidelines

- **TypeScript Strictness**: Avoid using `any` where explicit interfaces exist. Leverage types from `src/types/index.ts` and `src/types/database.ts`.
- **Styling**: Use utility classes from Tailwind CSS. Preserve existing dark and light mode support via `dark:` class variants.
- **Component Structure**: Keep components modular, accessible, and functional. Avoid direct React prop mutations.
- **Security & Sanitization**: Always sanitize external inputs, query params, and links using helpers from `src/utils/text.tsx`. Never hardcode API keys, service role secrets, or database credentials.
- **Database Consistency**: Balance changes and ledger transactions must always route through atomic database functions rather than direct client table inserts.

---

## Verification Before Submitting

Before pushing your changes, run:

```bash
# Verify syntax and linting rules
npm run lint

# Verify TypeScript compilation and production packaging
npm run build
```

Both commands must complete with zero errors.

---

## Submitting a Pull Request (PR)

1. Rebase your feature branch on the latest `main` branch:
   ```bash
   git checkout main
   git pull upstream main
   git checkout <your-branch>
   git rebase main
   ```
2. Push your branch to your personal fork:
   ```bash
   git push origin <your-branch>
   ```
3. Open a Pull Request on GitHub targeting the `main` branch.
4. Fill in the provided Pull Request template completely, describing:
   - The motivation behind the change
   - Any affected routes or components
   - Verification steps taken
5. Await feedback or approval from maintainers. Be prepared to address review feedback.

---

## Reporting Issues & Requesting Features

- **Bug Reports**: Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) with reproduction steps and browser info.
- **Feature Requests**: Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) with a clear explanation of the user need.
- **Security Vulnerabilities**: Do **not** post security bugs in public issues. Refer to [SECURITY.md](SECURITY.md) for private reporting steps.

