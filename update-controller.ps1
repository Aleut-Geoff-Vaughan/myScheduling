$file = 'backend/src/MyScheduling.Api/Controllers/WorkLocationPreferencesController.cs'
$content = Get-Content $file -Raw

# Update the conflict message
$content = $content.Replace(
    'return Conflict($"A work location preference already exists for this person on {workDate}");',
    'return Conflict($"A work location preference already exists for this person on {workDate} for {request.DayPortion}");'
)

# Add cleanup logic before "// Validate based on location type"
$oldText = @"
            // Validate based on location type
            if (request.LocationType == WorkLocationType.OfficeWithReservation && request.BookingId == null)
"@

$newText = @"
            // If creating AM or PM, check if a FullDay preference exists and delete it
            if (request.DayPortion != DayPortion.FullDay)
            {
                var fullDayPreference = await _context.WorkLocationPreferences
                    .FirstOrDefaultAsync(w =>
                        w.UserId == request.UserId &&
                        w.WorkDate == workDate &&
                        w.TenantId == request.TenantId &&
                        w.DayPortion == DayPortion.FullDay);

                if (fullDayPreference != null)
                {
                    _context.WorkLocationPreferences.Remove(fullDayPreference);
                }
            }
            // If creating FullDay, delete any AM/PM preferences for that day
            else
            {
                var partialDayPreferences = await _context.WorkLocationPreferences
                    .Where(w =>
                        w.UserId == request.UserId &&
                        w.WorkDate == workDate &&
                        w.TenantId == request.TenantId &&
                        w.DayPortion != DayPortion.FullDay)
                    .ToListAsync();

                if (partialDayPreferences.Any())
                {
                    _context.WorkLocationPreferences.RemoveRange(partialDayPreferences);
                }
            }

            // Validate based on location type
            if (request.LocationType == WorkLocationType.OfficeWithReservation && request.BookingId == null)
"@

$content = $content.Replace($oldText, $newText)

# Write back
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host "Updated controller file"
