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

## Design system (shared with the host — do not diverge)
- `src/app/globals.css`, `src/lib/theme.ts`, `src/components/ui/spinner.tsx`,
  `submit-button.tsx` and `skeletons.tsx` are copies of the host's and must stay
  byte-identical. Change them in host first, then copy across, or the zones
  drift visually.
- Palette: cool slate neutrals with ONE teal accent, reserved for primary
  actions and focus rings. Add semantic tokens (`--success`, `--warning`)
  rather than new accent hues.
- Dark mode is the host's `stevetech-theme` cookie (`path=/`, so it is already
  set on arrival). Read it server-side in `layout.tsx` — never in an effect.
- `AppHeader` deliberately mirrors the host's. The zones are separate
  deployments and the user must never be able to tell.
- Nothing may look dead while it works: `SubmitButton`/`useFormStatus` for
  action forms, `Spinner` in client buttons, `loading.tsx` for the route, and a
  "Saving…" indicator for drag persistence (the optimistic move lands instantly,
  so the write is otherwise invisible). Each card's delete needs its own
  `<form>` or one click greys out every card.
7. Acceptance check: npm run build passes; full flow works through
   http://localhost:3000/kanban with a licensed user; unlicensed user is bounced;
   a dragged card keeps its column after refresh.
