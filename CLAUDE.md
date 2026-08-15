@AGENTS.md

Read CLAUDE.md first — it defines the auth architecture. Build the kanban app
in the current directory (apps/kanban).

Steps 1–4: identical setup to CLAUDE.md spec (Next.js 16 + shadcn, own git repo,
Prisma with env DATABASE_URL + DIRECT_URL from the Neon strings in .env,
BetterAuth genericOAuth client of the host with
basePath "/kanban/api/auth" and cookiePrefix "kanban", middleware + /login page).

5. Feature (ONE page, /):
   - Three fixed columns: "To Do", "Doing", "Done"
   - Card model: { id, userId, title, column, order }
   - Add-card input at the top of "To Do"; small delete button on each card
   - Drag & drop between columns using @dnd-kit/core + @dnd-kit/sortable
     (persist column + order via a server action on drop)
   - All queries scoped to userId; every server action re-verifies session +
     "kanban" entitlement per CLAUDE.md
6. Header: app name, user name, plain <a> "← Dashboard" to `${HOST_URL}/dashboard`.
7. Acceptance check: npm run build passes; full flow works through
   http://localhost:3000/kanban with a licensed user; unlicensed user is bounced;
   a dragged card keeps its column after refresh.
