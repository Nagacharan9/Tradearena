# TODO
- [x] Add numeric (random but numeric) user UID column to DB schema
- [ ] Implement UID generation helper (unique 8–10 digit numeric string) and backfill existing users

- [ ] Update all user insertion paths to populate `uid` (register, admin seed, bot creation, etc.)
- [ ] Update auth/profile/admin responses to include `uid`
- [ ] Quick smoke test: register/login and verify `uid` exists and is unique

