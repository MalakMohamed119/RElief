# Registration Fix TODO

## Steps
- [x] Step 1: Add missing validation error messages and `is-invalid` classes in `register.html`
- [x] Step 2: Fix carehome redirect path and improve error handling in `register.ts`
- [x] Step 3: Add form validation summary helper for debugging
- [x] Step 4: Remove `registerForm.invalid` from submit button disabled state
- [x] Step 5: Verify fixes compile and make sense

## Summary of Fixes

### `register.html`
- Added `pattern` error message for phone number ("Phone number must be at least 10 digits")
- Added `pattern` error message for password ("Password needs uppercase, lowercase, number and special character")
- Updated `is-invalid` class bindings to trigger on `pattern`/`minlength` failures, not just `required`
- **Submit button is no longer disabled when form is invalid** — now only disabled during `isLoading`. This lets users click and see validation feedback instead of a mysteriously dead button.

### `register.ts`
- Added `getFormValidationErrors()` helper that returns human-readable list of all failing validators
- On invalid form submission: logs errors to console AND shows toast notification listing what's wrong
- Fixed carehome redirect from broken `/carehome/complete-profile` to existing `/care-home` route
- Improved error handler: now handles server validation arrays (`err.error.errors`), connection failures (status 0), and 5xx errors

