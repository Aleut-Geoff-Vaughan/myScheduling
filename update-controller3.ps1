$file = 'backend/src/MyScheduling.Api/Controllers/WorkLocationPreferencesController.cs'
$content = Get-Content $file -Raw

# Add cleanup logic - insert before "// Validate based on location type"
$searchText = "            // Validate based on location type"
$insertText = @"
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
"@

$content = $content.Replace($searchText, $insertText)

# Write back
Set-Content $file -Value $content -NoNewline -Encoding UTF8
Write-Host "Updated controller"
