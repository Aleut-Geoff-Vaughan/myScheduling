Context: Person → User Merge (Frontend & Backend)
------------------------------------------------

State
- Backend now user-only: person_id removed; migrations rebuilt (20251124153802_InitialUserOnly) and DB reset via `dotnet ef database drop/update`.
- Person entity is `[NotMapped]` (enums kept).
- Seed permissions switched to Resource="User".
- .NET SDK installed locally (8.0.415); builds succeed.

Frontend progress
- Types: Assignments, Bookings, WorkLocationPreference, TeamCalendar models use userId; Person interface simplified to user profile fields.
- Services updated: assignments, bookings, work-location, team calendar (manager view/available), resume create use userId.
- Components updated: BookingModal, AssignmentModal, WorkLocationSelector, MonthCalendarView, WeekCalendarView, TeamCalendarView operate on userId/users.
- Hooks updated: workLocation hooks query/cache by userId.
- Node version: v22.21.1.

Remaining frontend work
- Clean residual personId/person fields (auth store, Hoteling page, API types for person-related entities, peopleService/usePeople, etc.) and point to User endpoints/types.
- Adjust any UI labels/filters still referencing Person.
- Run frontend build/tests after cleanup.

Backend follow-ups
- EF warnings: shadow FK ResumeSection.ResumeProfileId1; optional cleanup later.
- Minor analyzer warnings (duplicate using directives, header append analyzer) still present.

Useful commands
- Build API: `dotnet build backend/src/MyScheduling.Api/MyScheduling.Api.csproj`
- Apply DB migrations: `dotnet ef database update --project backend/src/MyScheduling.Infrastructure --startup-project backend/src/MyScheduling.Api --context MySchedulingDbContext`
- Drop DB (test data only): `dotnet ef database drop --project backend/src/MyScheduling.Infrastructure --startup-project backend/src/MyScheduling.Api --context MySchedulingDbContext --force`
