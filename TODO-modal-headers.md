# Profile Modal Header Standardization

## Plan for Feedback Updates

**Files to Update:**
1. `src/app/features/admin/components/admin-verifications/admin-verifications.html` - Replace .ver-profile-head HTML block
2. `src/app/features/admin/components/admin-verifications/admin-verifications.scss` - Update .ver-profile-head styles  
3. `src/app/features/admin/components/admin-users/admin-users.html` - Replace .ver-profile-head HTML block (add role meta)
4. `src/app/features/admin/components/admin-users/admin-users.scss` - Update .ver-profile-head styles

**Status:** ✅ All 4 files updated:
- admin-verifications.html (vertical layout)
- admin-users.html (vertical layout + role meta) 
- Both SCSS files (.ver-profile-head → column/center)

Test modals in Admin sections.

**Validation:** 
- Both components use identical .ver-profile-head class names
- HTML blocks unique within files
- Style blocks unique
- No component dependencies affected

**Testing:** Preview modals in Admin Users/Verifications
