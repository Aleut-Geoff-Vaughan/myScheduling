using MyScheduling.Core.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MyScheduling.Infrastructure.Services;

/// <summary>
/// Service for generating PDF documents from resume data using QuestPDF
/// </summary>
public class ResumePdfExportService
{
    // Color palette for different styles
    private static readonly Dictionary<ResumeTemplateStyle, (string Primary, string Secondary, string Accent)> StyleColors = new()
    {
        { ResumeTemplateStyle.Modern, ("#2B579A", "#4472C4", "#5B9BD5") },
        { ResumeTemplateStyle.Classic, ("#000000", "#333333", "#666666") },
        { ResumeTemplateStyle.Federal, ("#1F4E79", "#2E75B6", "#5B9BD5") },
        { ResumeTemplateStyle.Executive, ("#44546A", "#5B9BD5", "#70AD47") },
        { ResumeTemplateStyle.Minimal, ("#000000", "#666666", "#999999") }
    };

    public async Task<byte[]> GeneratePdfDocumentAsync(ResumeExportData resumeData, ResumeExportOptions options)
    {
        return await Task.Run(() => GeneratePdfDocument(resumeData, options));
    }

    private byte[] GeneratePdfDocument(ResumeExportData resumeData, ResumeExportOptions options)
    {
        // Configure QuestPDF license (Community license for open source)
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(0.5f, Unit.Inch);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Calibri"));

                page.Content().Column(column =>
                {
                    var colors = StyleColors[options.TemplateStyle];

                    // Header
                    AddHeader(column, resumeData, options, colors);

                    // Summary
                    if (options.IncludeSummary && !string.IsNullOrWhiteSpace(resumeData.Summary))
                    {
                        AddSummarySection(column, resumeData.Summary, colors);
                    }

                    // Experience
                    if (options.IncludeExperience && resumeData.Experience.Any())
                    {
                        AddExperienceSection(column, resumeData.Experience, colors);
                    }

                    // Education
                    if (options.IncludeEducation && resumeData.Education.Any())
                    {
                        AddEducationSection(column, resumeData.Education, colors);
                    }

                    // Skills
                    if (options.IncludeSkills && resumeData.Skills.Any())
                    {
                        AddSkillsSection(column, resumeData.Skills, options, colors);
                    }

                    // Certifications
                    if (options.IncludeCertifications && resumeData.Certifications.Any())
                    {
                        AddCertificationsSection(column, resumeData.Certifications, colors);
                    }

                    // Projects
                    if (options.IncludeProjects && resumeData.Projects.Any())
                    {
                        AddProjectsSection(column, resumeData.Projects, colors);
                    }

                    // Awards
                    if (options.IncludeAwards && resumeData.Awards.Any())
                    {
                        AddAwardsSection(column, resumeData.Awards, colors);
                    }

                    // Publications
                    if (options.IncludePublications && resumeData.Publications.Any())
                    {
                        AddPublicationsSection(column, resumeData.Publications, colors);
                    }
                });
            });
        });

        return document.GeneratePdf();
    }

    private void AddHeader(ColumnDescriptor column, ResumeExportData resumeData, ResumeExportOptions options, (string Primary, string Secondary, string Accent) colors)
    {
        column.Item().Column(headerColumn =>
        {
            // Name
            headerColumn.Item().AlignCenter().Text(resumeData.DisplayName)
                .FontSize(28)
                .FontColor(colors.Primary)
                .SemiBold();

            // Job Title
            if (!string.IsNullOrWhiteSpace(resumeData.JobTitle))
            {
                headerColumn.Item().AlignCenter().Text(resumeData.JobTitle)
                    .FontSize(14)
                    .FontColor(colors.Secondary);
            }

            // Contact info
            if (options.IncludeContactInfo)
            {
                var contactParts = new List<string>();
                if (!string.IsNullOrWhiteSpace(resumeData.Email))
                    contactParts.Add(resumeData.Email);
                if (!string.IsNullOrWhiteSpace(resumeData.Phone))
                    contactParts.Add(resumeData.Phone);
                if (options.IncludeLinkedIn && !string.IsNullOrWhiteSpace(resumeData.LinkedInUrl))
                    contactParts.Add(resumeData.LinkedInUrl);

                if (contactParts.Any())
                {
                    headerColumn.Item().PaddingTop(5).AlignCenter().Text(string.Join("  |  ", contactParts))
                        .FontSize(10)
                        .FontColor(colors.Accent);
                }
            }

            // Horizontal line
            headerColumn.Item().PaddingVertical(10).LineHorizontal(1).LineColor(colors.Primary);
        });
    }

    private void AddSummarySection(ColumnDescriptor column, string summary, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "PROFESSIONAL SUMMARY", colors);

        var cleanSummary = StripHtml(summary);
        column.Item().PaddingBottom(10).Text(cleanSummary)
            .FontSize(11)
            .LineHeight(1.3f);
    }

    private void AddExperienceSection(ColumnDescriptor column, List<ExperienceEntry> experiences, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "PROFESSIONAL EXPERIENCE", colors);

        foreach (var exp in experiences.OrderByDescending(e => e.StartDate))
        {
            column.Item().Column(entryColumn =>
            {
                // Title and company
                entryColumn.Item().Row(row =>
                {
                    row.AutoItem().Text(text =>
                    {
                        text.Span(exp.Title).Bold().FontColor(colors.Secondary);
                        if (!string.IsNullOrWhiteSpace(exp.Organization))
                        {
                            text.Span($" at {exp.Organization}");
                        }
                    });
                });

                // Date range
                var dateRange = FormatDateRange(exp.StartDate, exp.EndDate);
                if (!string.IsNullOrWhiteSpace(dateRange))
                {
                    entryColumn.Item().Text(dateRange)
                        .FontSize(10)
                        .Italic()
                        .FontColor(colors.Accent);
                }

                // Description
                if (!string.IsNullOrWhiteSpace(exp.Description))
                {
                    AddBulletPoints(entryColumn, exp.Description);
                }

                entryColumn.Item().PaddingBottom(8);
            });
        }
    }

    private void AddEducationSection(ColumnDescriptor column, List<EducationEntry> education, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "EDUCATION", colors);

        foreach (var edu in education.OrderByDescending(e => e.EndDate ?? e.StartDate))
        {
            column.Item().Column(entryColumn =>
            {
                // Degree
                entryColumn.Item().Text(text =>
                {
                    text.Span(edu.Title).Bold().FontColor(colors.Secondary);
                    if (!string.IsNullOrWhiteSpace(edu.FieldOfStudy))
                    {
                        text.Span($" in {edu.FieldOfStudy}");
                    }
                });

                // School and date
                var schoolText = edu.Organization ?? "";
                var dateRange = FormatDateRange(edu.StartDate, edu.EndDate);
                var schoolLine = !string.IsNullOrWhiteSpace(dateRange)
                    ? $"{schoolText}  |  {dateRange}"
                    : schoolText;

                if (!string.IsNullOrWhiteSpace(schoolLine))
                {
                    entryColumn.Item().Text(schoolLine)
                        .FontSize(10)
                        .FontColor(colors.Accent);
                }

                entryColumn.Item().PaddingBottom(6);
            });
        }
    }

    private void AddSkillsSection(ColumnDescriptor column, List<SkillEntry> skills, ResumeExportOptions options, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "SKILLS", colors);

        var groupedSkills = skills
            .GroupBy(s => s.Category ?? "Other")
            .OrderBy(g => g.Key);

        foreach (var group in groupedSkills)
        {
            var skillNames = options.ShowSkillProficiency
                ? group.Select(s => $"{s.Name} ({GetProficiencyLabel(s.ProficiencyLevel)})")
                : group.Select(s => s.Name);

            column.Item().PaddingBottom(3).Text(text =>
            {
                text.Span($"{group.Key}: ").Bold().FontColor(colors.Secondary);
                text.Span(string.Join(", ", skillNames));
            });
        }

        column.Item().PaddingBottom(8);
    }

    private void AddCertificationsSection(ColumnDescriptor column, List<CertificationEntry> certifications, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "CERTIFICATIONS", colors);

        foreach (var cert in certifications.OrderByDescending(c => c.IssueDate))
        {
            column.Item().PaddingBottom(3).Text(text =>
            {
                text.Span(cert.Name).Bold().FontColor(colors.Secondary);

                var details = new List<string>();
                if (!string.IsNullOrWhiteSpace(cert.Issuer))
                    details.Add(cert.Issuer);
                if (cert.IssueDate.HasValue)
                    details.Add($"Issued: {cert.IssueDate.Value:MMM yyyy}");
                if (cert.ExpiryDate.HasValue)
                    details.Add($"Expires: {cert.ExpiryDate.Value:MMM yyyy}");

                if (details.Any())
                {
                    text.Span($"  |  {string.Join("  |  ", details)}")
                        .FontSize(10)
                        .FontColor(colors.Accent);
                }
            });
        }

        column.Item().PaddingBottom(8);
    }

    private void AddProjectsSection(ColumnDescriptor column, List<ProjectEntry> projects, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "PROJECTS", colors);

        foreach (var project in projects.OrderByDescending(p => p.StartDate))
        {
            column.Item().Column(entryColumn =>
            {
                // Project title
                entryColumn.Item().Text(project.Title)
                    .Bold()
                    .FontColor(colors.Secondary);

                // Date range
                var dateRange = FormatDateRange(project.StartDate, project.EndDate);
                if (!string.IsNullOrWhiteSpace(dateRange))
                {
                    entryColumn.Item().Text(dateRange)
                        .FontSize(10)
                        .Italic()
                        .FontColor(colors.Accent);
                }

                // Description
                if (!string.IsNullOrWhiteSpace(project.Description))
                {
                    AddBulletPoints(entryColumn, project.Description);
                }

                entryColumn.Item().PaddingBottom(6);
            });
        }
    }

    private void AddAwardsSection(ColumnDescriptor column, List<AwardEntry> awards, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "AWARDS & HONORS", colors);

        foreach (var award in awards.OrderByDescending(a => a.Date))
        {
            column.Item().PaddingBottom(3).Text(text =>
            {
                text.Span(award.Title).Bold().FontColor(colors.Secondary);

                var details = new List<string>();
                if (!string.IsNullOrWhiteSpace(award.Organization))
                    details.Add(award.Organization);
                if (award.Date.HasValue)
                    details.Add(award.Date.Value.ToString("MMM yyyy"));

                if (details.Any())
                {
                    text.Span($"  |  {string.Join("  |  ", details)}")
                        .FontSize(10)
                        .FontColor(colors.Accent);
                }
            });
        }

        column.Item().PaddingBottom(8);
    }

    private void AddPublicationsSection(ColumnDescriptor column, List<PublicationEntry> publications, (string Primary, string Secondary, string Accent) colors)
    {
        AddSectionHeading(column, "PUBLICATIONS", colors);

        foreach (var pub in publications.OrderByDescending(p => p.Date))
        {
            column.Item().PaddingBottom(3).Text(text =>
            {
                text.Span(pub.Title).Bold().FontColor(colors.Secondary);

                var details = new List<string>();
                if (!string.IsNullOrWhiteSpace(pub.Publisher))
                    details.Add(pub.Publisher);
                if (pub.Date.HasValue)
                    details.Add(pub.Date.Value.ToString("MMM yyyy"));

                if (details.Any())
                {
                    text.Span($"  |  {string.Join("  |  ", details)}")
                        .FontSize(10)
                        .FontColor(colors.Accent);
                }
            });
        }
    }

    private void AddSectionHeading(ColumnDescriptor column, string heading, (string Primary, string Secondary, string Accent) colors)
    {
        column.Item().PaddingTop(10).PaddingBottom(5)
            .Background(colors.Primary)
            .Padding(5)
            .Text($"  {heading}")
            .FontSize(12)
            .Bold()
            .FontColor("#FFFFFF");
    }

    private void AddBulletPoints(ColumnDescriptor column, string description)
    {
        var cleanText = StripHtml(description);
        var lines = cleanText.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmedLine)) continue;

            // Remove existing bullet characters
            if (trimmedLine.StartsWith("•") || trimmedLine.StartsWith("-") || trimmedLine.StartsWith("*"))
            {
                trimmedLine = trimmedLine.Substring(1).TrimStart();
            }

            column.Item().PaddingLeft(15).PaddingBottom(2).Text($"• {trimmedLine}")
                .FontSize(11)
                .LineHeight(1.2f);
        }
    }

    private static string FormatDateRange(DateTime? startDate, DateTime? endDate)
    {
        if (!startDate.HasValue && !endDate.HasValue)
            return string.Empty;

        var start = startDate?.ToString("MMM yyyy") ?? "";
        var end = endDate?.ToString("MMM yyyy") ?? "Present";

        return startDate.HasValue ? $"{start} - {end}" : end;
    }

    private static string GetProficiencyLabel(int level)
    {
        return level switch
        {
            0 => "Beginner",
            1 => "Intermediate",
            2 => "Advanced",
            3 => "Expert",
            _ => "Intermediate"
        };
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        var text = html
            .Replace("<br>", "\n")
            .Replace("<br/>", "\n")
            .Replace("<br />", "\n")
            .Replace("</p>", "\n")
            .Replace("</li>", "\n")
            .Replace("<li>", "• ")
            .Replace("&nbsp;", " ")
            .Replace("&amp;", "&")
            .Replace("&lt;", "<")
            .Replace("&gt;", ">")
            .Replace("&quot;", "\"");

        text = System.Text.RegularExpressions.Regex.Replace(text, "<[^>]+>", "");
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\n\s*\n", "\n");

        return text.Trim();
    }
}
