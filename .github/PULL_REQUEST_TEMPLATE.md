## Description
Provide a concise explanation of what this pull request changes and why. Link any associated issues.

Closes # (issue number if applicable)

## Type of Change
Please check the option that applies:
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style / formatting update (no logic changes)
- [ ] ♻️ Refactoring (improving internal architecture without behavior changes)
- [ ] ⚡ Performance optimization
- [ ] 🔧 Build tooling or configuration changes

## Key Areas Affected
- [ ] Opportunities Catalog / Detail views
- [ ] Community Discussion Feed & Mentions
- [ ] Pixel Rewards Ledger & Transactions
- [ ] User Profiles & Authentication
- [ ] Supabase Migrations / Backend Functions
- [ ] Transactional Email API (`/api/send-email`)
- [ ] Documentation / CI / Tooling

## Verification Steps
Please describe the tests and steps you performed to verify your changes:
1. Ran `npm run lint` with zero errors.
2. Ran `npm run build` (`tsc -b && vite build`) with zero errors.
3. Tested manually in the browser at `http://localhost:5173`.
4. (Optional) Verified database operations against local/test Supabase instance.

## Checklist
- [ ] My code adheres to the project's coding standards and style guidelines.
- [ ] I have performed a self-review of my own code.
- [ ] I have not committed any hardcoded credentials, service-role keys, or secrets.
- [ ] I have updated relevant documentation if my changes modify existing behavior.
- [ ] My changes generate no new build or lint warnings.

