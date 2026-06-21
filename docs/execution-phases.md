## Execution Phases

Each phase follows the approval workflow: describe → wait → **git branch** → implement (uncommitted) → test → **wait for owner approval** → commit → push → summarize → wait.

### Git Workflow (per phase)

#### Step A — After phase approval, before writing code

1. Create a feature branch from `main`:

   ```text
   phase{N}-{short-description}
   ```

   Example: `phase2-database-schema-seed`

2. Implement the approved phase on that branch.

3. Run tests locally.

4. **Do not commit.** Leave all changes uncommitted so the owner can review the full diff in the IDE.

5. Summarize changes and **wait for explicit owner approval**.

#### Step B — After owner confirms they tested and approved

6. Commit with:

   ```text
   Phase {N}: {Phase Title}
   ```

   Example: `Phase 2: Database Schema & Seed`

7. Push the branch to GitHub (only when the owner explicitly requests it):

   ```bash
   git push -u origin phase{N}-{short-description}