# Scope Lock — 003-invoiceme-stabilization

**Status**: Active Implementation Spec  
**Date**: 2026-01-21

This specification implements EXACTLY these 20 items. No additions, no omissions.

## The 20 Required Items

1. **App background color** is not fixed and changes based on browser mode settings. I need it to be fixed.

2. **The app layout** is still not responsive enough to mobile. Buttons and charts overflow the screen.

3. **Create account password validation** is for 6 chars but when I'm trying to create an account with 6 I'm getting an error that password must contain 8 chars.

4. **Snackbar are not dismissed** by themselves - they should dismiss after 5 seconds with the option for the user to dismiss them with clicking on a button or on the screen.

5. **Home screen on empty state** remove add business icon and remove upload invoice upload button and leave only add business and upload invoice centered buttons.

6. **Add/Edit business dialog** must include monthly limit inputs.

7. **Home screen with state**: remove button add business icon + Center the floating upload invoice button.

8. **Remove analytics overview icon** from the app bar because it already exists next to the search input and add a business icon button on the home screen.

9. **On invoice details screen** remove the view original file button.

10. **Edit line items** should behave the same as Edit of invoice name, number and date.

11. **Profile screen**, changing name and system currency functionality isn't working.

12. **Edit Dialogs on mobile** get pushed very high on the screen.

13. **Download/Share functionalities** are not working - needs to be fulfilled.

14. **All invoices screen** has type error: type 'minified:y0' is not a subtype of type 'String'.

15. **Please validate** the changing currency functionality working as defined.

16. **On upload invoice** selecting image: This could not work with very heavy images - present an error message when image is too heavy to process.

17. **Analytics Screens** loading times are very long - please show a message to the user that it takes time because this is a demo app with limited resources.

18. **All add/edit dialog saves** should present loading immediately and circular indicators until response comes to the app.

19. **Make AI insights screen** to be more informative and in language that simple users will understand and not json.

20. **All line charts** should be responsive with the X and Y axis.

---

## Implementation Rules

- **NO flow changes**: Navigation and routing stay exactly as is
- **NO new screens**: Only modify existing screens
- **NO new features**: Only fix these 20 items
- **Responsive**: Must work on mobile (375px), tablet (768px), and desktop (1440px+)
- **Testing**: Each item must have mobile + web manual tests

## Definition of Done

Each item must have:
- [ ] Implementation complete
- [ ] Acceptance criteria met
- [ ] Manual test passed (mobile + web)
- [ ] No new errors introduced
- [ ] `flutter analyze` passes
- [ ] `flutter build web` succeeds
