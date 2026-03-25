# PSW Rejection Reason Display in Profile

## Status: In Progress

**TODO Steps:**
- [ ] 1. Update api.models.ts (ProfileDto + rejectionReason)
- [ ] 2. Update psw-profile.ts (capture rejectionReason)
- [ ] 3. Update psw-profile.html (display in alert)

---

# PSW Registration Flow Fix - Register → Login → Complete Profile

## Status: ✅ COMPLETE

### Plan Steps:
1. [x] Create TODO.md ✅
2. [x] Update login.ts ✅  
3. [x] Update auth.service.ts ✅
4. [x] Update complete-profile.ts ✅
5. [x] Tested & verified flow works ✅
6. [x] Task complete ✅

**Result:** Flow now works: Register (PSW) → Login → Complete Profile (forced redirect via flags)

**Changes:**
- login.ts: Debug logs + FORCE redirect if `pswNeedsProfileCompletion=1`
- auth.service.ts: `needsFreshRegistration()` helper  
- complete-profile.ts: Entry guard + enhanced logging

**Test with:** `ng serve` → /register → PSW → submit → login → auto complete-profile

**Console logs show exact flow** - check F12 during test.

---

🎉 Flow fixed!
