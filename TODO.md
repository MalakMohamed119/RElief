# Task TODO

- [x] Edit `src/app/features/psw/components/psw-profile/psw-profile.ts` — Fix `onPhotoSelected()` to use local FileReader preview, avoid full profile reload, and revert preview on error.
- [x] Edit `src/app/shared/components/footer/footer.html` — Replace Twitter `<i>` icon with inline X logo SVG.
- [x] Edit `src/app/core/services/complete-profile.service.ts` — Only append files to FormData if they are actual `File` instances; conditionally append `workStatus` and `proofIdentityType`.
- [x] Edit `src/app/features/admin/components/admin-verifications/admin-verifications.ts`, `.html`, `.scss` — Show profile photos in verification cards and modal header with proper initials fallback and CSS styling.

