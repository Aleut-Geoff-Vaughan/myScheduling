using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using MyScheduling.Core.Interfaces;

namespace MyScheduling.Infrastructure.Services;

/// <summary>
/// Service for generating Word documents from resume data using OpenXML SDK
/// </summary>
public class ResumeWordExportService
{
    // Color palette for different styles
    private static readonly Dictionary<ResumeTemplateStyle, (string Primary, string Secondary, string Accent)> StyleColors = new()
    {
        { ResumeTemplateStyle.Modern, ("2B579A", "4472C4", "5B9BD5") },      // Blue theme
        { ResumeTemplateStyle.Classic, ("000000", "333333", "666666") },      // Black/gray theme
        { ResumeTemplateStyle.Federal, ("1F4E79", "2E75B6", "5B9BD5") },      // Navy blue theme
        { ResumeTemplateStyle.Executive, ("44546A", "5B9BD5", "70AD47") },    // Professional theme
        { ResumeTemplateStyle.Minimal, ("000000", "666666", "999999") }       // Minimal grayscale
    };

    public async Task<byte[]> GenerateWordDocumentAsync(ResumeExportData resumeData, ResumeExportOptions options)
    {
        return await Task.Run(() => GenerateWordDocument(resumeData, options));
    }

    private byte[] GenerateWordDocument(ResumeExportData resumeData, ResumeExportOptions options)
    {
        using var memoryStream = new MemoryStream();
        using (var document = WordprocessingDocument.Create(memoryStream, WordprocessingDocumentType.Document, true))
        {
            var mainPart = document.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;

            // Add styles part after document is initialized
            AddStylesPart(mainPart, options.TemplateStyle);

            // Build the document content
            AddHeader(body, resumeData, options);

            if (options.IncludeSummary && !string.IsNullOrWhiteSpace(resumeData.Summary))
            {
                AddSummarySection(body, resumeData.Summary, options.TemplateStyle);
            }

            if (options.IncludeExperience && resumeData.Experience.Any())
            {
                AddExperienceSection(body, resumeData.Experience, options.TemplateStyle);
            }

            if (options.IncludeEducation && resumeData.Education.Any())
            {
                AddEducationSection(body, resumeData.Education, options.TemplateStyle);
            }

            if (options.IncludeSkills && resumeData.Skills.Any())
            {
                AddSkillsSection(body, resumeData.Skills, options);
            }

            if (options.IncludeCertifications && resumeData.Certifications.Any())
            {
                AddCertificationsSection(body, resumeData.Certifications, options.TemplateStyle);
            }

            if (options.IncludeProjects && resumeData.Projects.Any())
            {
                AddProjectsSection(body, resumeData.Projects, options.TemplateStyle);
            }

            if (options.IncludeAwards && resumeData.Awards.Any())
            {
                AddAwardsSection(body, resumeData.Awards, options.TemplateStyle);
            }

            if (options.IncludePublications && resumeData.Publications.Any())
            {
                AddPublicationsSection(body, resumeData.Publications, options.TemplateStyle);
            }

            // Set page margins
            AddSectionProperties(body);

            document.Save();
        }

        return memoryStream.ToArray();
    }

    private void AddStylesPart(MainDocumentPart mainPart, ResumeTemplateStyle style)
    {
        var stylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
        var styles = new Styles();
        var colors = StyleColors[style];

        // Normal style
        styles.Append(CreateStyle("Normal", "Normal", false, "11", "Calibri", colors.Secondary));

        // Heading styles
        styles.Append(CreateStyle("Heading1", "Heading 1", true, "24", "Calibri Light", colors.Primary));
        styles.Append(CreateStyle("Heading2", "Heading 2", true, "14", "Calibri Light", colors.Primary));
        styles.Append(CreateStyle("Heading3", "Heading 3", true, "12", "Calibri", colors.Primary));

        // Name style (large, bold)
        styles.Append(CreateStyle("Name", "Name", true, "28", "Calibri Light", colors.Primary));

        // Title style
        styles.Append(CreateStyle("JobTitle", "Job Title", false, "14", "Calibri", colors.Secondary));

        // Contact info style
        styles.Append(CreateStyle("ContactInfo", "Contact Info", false, "10", "Calibri", colors.Secondary));

        // Entry title style
        styles.Append(CreateStyle("EntryTitle", "Entry Title", true, "11", "Calibri", colors.Secondary));

        // Organization style
        styles.Append(CreateStyle("Organization", "Organization", false, "11", "Calibri", colors.Secondary));

        // Date style
        styles.Append(CreateStyle("DateRange", "Date Range", false, "10", "Calibri", colors.Accent));

        stylesPart.Styles = styles;
    }

    private Style CreateStyle(string styleId, string styleName, bool bold, string fontSize, string fontName, string color)
    {
        return new Style(
            new StyleName { Val = styleName },
            new BasedOn { Val = "Normal" },
            new StyleRunProperties(
                new RunFonts { Ascii = fontName, HighAnsi = fontName },
                new FontSize { Val = (int.Parse(fontSize) * 2).ToString() },
                new Color { Val = color },
                bold ? new Bold() : null!
            )
        )
        {
            Type = StyleValues.Paragraph,
            StyleId = styleId
        };
    }

    private void AddDocumentProperties(MainDocumentPart mainPart, ResumeExportData resumeData)
    {
        var docPropsPart = mainPart.AddNewPart<ExtendedFilePropertiesPart>();
        docPropsPart.Properties = new DocumentFormat.OpenXml.ExtendedProperties.Properties
        {
            Application = new DocumentFormat.OpenXml.ExtendedProperties.Application { Text = "MyScheduling Resume Export" }
        };
    }

    private void AddHeader(Body body, ResumeExportData resumeData, ResumeExportOptions options)
    {
        var colors = StyleColors[options.TemplateStyle];

        // Name
        var namePara = new Paragraph(
            new ParagraphProperties(
                new Justification { Val = JustificationValues.Center },
                new SpacingBetweenLines { After = "0" }
            ),
            new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri Light", HighAnsi = "Calibri Light" },
                    new FontSize { Val = "56" },
                    new Color { Val = colors.Primary }
                ),
                new Text(resumeData.DisplayName)
            )
        );
        body.Append(namePara);

        // Job Title
        if (!string.IsNullOrWhiteSpace(resumeData.JobTitle))
        {
            var titlePara = new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { After = "60" }
                ),
                new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "28" },
                        new Color { Val = colors.Secondary }
                    ),
                    new Text(resumeData.JobTitle)
                )
            );
            body.Append(titlePara);
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
                var contactPara = new Paragraph(
                    new ParagraphProperties(
                        new Justification { Val = JustificationValues.Center },
                        new SpacingBetweenLines { After = "200" }
                    ),
                    new Run(
                        new RunProperties(
                            new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                            new FontSize { Val = "20" },
                            new Color { Val = colors.Accent }
                        ),
                        new Text(string.Join("  |  ", contactParts))
                    )
                );
                body.Append(contactPara);
            }
        }

        // Add a horizontal line
        AddHorizontalLine(body, colors.Primary);
    }

    private void AddSummarySection(Body body, string summary, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "PROFESSIONAL SUMMARY", style);

        // Strip HTML and parse as plain text with bullet points
        var cleanSummary = StripHtml(summary);

        var para = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines { After = "200" },
                new Indentation { Left = "0" }
            ),
            new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" }
                ),
                new Text(cleanSummary)
            )
        );
        body.Append(para);
    }

    private void AddExperienceSection(Body body, List<ExperienceEntry> experiences, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "PROFESSIONAL EXPERIENCE", style);
        var colors = StyleColors[style];

        foreach (var exp in experiences.OrderByDescending(e => e.StartDate))
        {
            // Title and Company on same line
            var titlePara = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { Before = "120", After = "0" }
                )
            );

            // Job title (bold)
            titlePara.Append(new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" },
                    new Bold(),
                    new Color { Val = colors.Secondary }
                ),
                new Text(exp.Title)
            ));

            if (!string.IsNullOrWhiteSpace(exp.Organization))
            {
                titlePara.Append(new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "22" }
                    ),
                    new Text($" at {exp.Organization}")
                ));
            }

            body.Append(titlePara);

            // Date range
            var dateRange = FormatDateRange(exp.StartDate, exp.EndDate);
            if (!string.IsNullOrWhiteSpace(dateRange))
            {
                var datePara = new Paragraph(
                    new ParagraphProperties(
                        new SpacingBetweenLines { After = "60" }
                    ),
                    new Run(
                        new RunProperties(
                            new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                            new FontSize { Val = "20" },
                            new Italic(),
                            new Color { Val = colors.Accent }
                        ),
                        new Text(dateRange)
                    )
                );
                body.Append(datePara);
            }

            // Description (bullet points)
            if (!string.IsNullOrWhiteSpace(exp.Description))
            {
                AddBulletPoints(body, exp.Description);
            }
        }
    }

    private void AddEducationSection(Body body, List<EducationEntry> education, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "EDUCATION", style);
        var colors = StyleColors[style];

        foreach (var edu in education.OrderByDescending(e => e.EndDate ?? e.StartDate))
        {
            // Degree
            var degreePara = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { Before = "120", After = "0" }
                ),
                new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "22" },
                        new Bold(),
                        new Color { Val = colors.Secondary }
                    ),
                    new Text(edu.Title)
                )
            );

            if (!string.IsNullOrWhiteSpace(edu.FieldOfStudy))
            {
                degreePara.Append(new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "22" }
                    ),
                    new Text($" in {edu.FieldOfStudy}")
                ));
            }

            body.Append(degreePara);

            // School and date
            var schoolText = edu.Organization ?? "";
            var dateRange = FormatDateRange(edu.StartDate, edu.EndDate);
            var schoolLine = !string.IsNullOrWhiteSpace(dateRange)
                ? $"{schoolText}  |  {dateRange}"
                : schoolText;

            if (!string.IsNullOrWhiteSpace(schoolLine))
            {
                var schoolPara = new Paragraph(
                    new ParagraphProperties(
                        new SpacingBetweenLines { After = "120" }
                    ),
                    new Run(
                        new RunProperties(
                            new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                            new FontSize { Val = "20" },
                            new Color { Val = colors.Accent }
                        ),
                        new Text(schoolLine)
                    )
                );
                body.Append(schoolPara);
            }
        }
    }

    private void AddSkillsSection(Body body, List<SkillEntry> skills, ResumeExportOptions options)
    {
        AddSectionHeading(body, "SKILLS", options.TemplateStyle);
        var colors = StyleColors[options.TemplateStyle];

        // Group skills by category if categories exist
        var groupedSkills = skills
            .GroupBy(s => s.Category ?? "Other")
            .OrderBy(g => g.Key);

        foreach (var group in groupedSkills)
        {
            var skillNames = options.ShowSkillProficiency
                ? group.Select(s => $"{s.Name} ({GetProficiencyLabel(s.ProficiencyLevel)})")
                : group.Select(s => s.Name);

            var para = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { After = "60" }
                )
            );

            // Category name (bold)
            para.Append(new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" },
                    new Bold(),
                    new Color { Val = colors.Secondary }
                ),
                new Text($"{group.Key}: ")
            ));

            // Skills list
            para.Append(new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" }
                ),
                new Text(string.Join(", ", skillNames))
            ));

            body.Append(para);
        }
    }

    private void AddCertificationsSection(Body body, List<CertificationEntry> certifications, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "CERTIFICATIONS", style);
        var colors = StyleColors[style];

        foreach (var cert in certifications.OrderByDescending(c => c.IssueDate))
        {
            var para = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { After = "60" }
                )
            );

            // Certification name (bold)
            para.Append(new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" },
                    new Bold(),
                    new Color { Val = colors.Secondary }
                ),
                new Text(cert.Name)
            ));

            // Issuer and dates
            var details = new List<string>();
            if (!string.IsNullOrWhiteSpace(cert.Issuer))
                details.Add(cert.Issuer);
            if (cert.IssueDate.HasValue)
                details.Add($"Issued: {cert.IssueDate.Value:MMM yyyy}");
            if (cert.ExpiryDate.HasValue)
                details.Add($"Expires: {cert.ExpiryDate.Value:MMM yyyy}");

            if (details.Any())
            {
                para.Append(new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "20" },
                        new Color { Val = colors.Accent }
                    ),
                    new Text($"  |  {string.Join("  |  ", details)}")
                ));
            }

            body.Append(para);
        }
    }

    private void AddProjectsSection(Body body, List<ProjectEntry> projects, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "PROJECTS", style);
        var colors = StyleColors[style];

        foreach (var project in projects.OrderByDescending(p => p.StartDate))
        {
            // Project title
            var titlePara = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { Before = "120", After = "0" }
                ),
                new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "22" },
                        new Bold(),
                        new Color { Val = colors.Secondary }
                    ),
                    new Text(project.Title)
                )
            );
            body.Append(titlePara);

            // Date range
            var dateRange = FormatDateRange(project.StartDate, project.EndDate);
            if (!string.IsNullOrWhiteSpace(dateRange))
            {
                var datePara = new Paragraph(
                    new ParagraphProperties(
                        new SpacingBetweenLines { After = "60" }
                    ),
                    new Run(
                        new RunProperties(
                            new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                            new FontSize { Val = "20" },
                            new Italic(),
                            new Color { Val = colors.Accent }
                        ),
                        new Text(dateRange)
                    )
                );
                body.Append(datePara);
            }

            // Description
            if (!string.IsNullOrWhiteSpace(project.Description))
            {
                AddBulletPoints(body, project.Description);
            }
        }
    }

    private void AddAwardsSection(Body body, List<AwardEntry> awards, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "AWARDS & HONORS", style);
        var colors = StyleColors[style];

        foreach (var award in awards.OrderByDescending(a => a.Date))
        {
            var para = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { After = "60" }
                )
            );

            // Award name (bold)
            para.Append(new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" },
                    new Bold(),
                    new Color { Val = colors.Secondary }
                ),
                new Text(award.Title)
            ));

            // Details
            var details = new List<string>();
            if (!string.IsNullOrWhiteSpace(award.Organization))
                details.Add(award.Organization);
            if (award.Date.HasValue)
                details.Add(award.Date.Value.ToString("MMM yyyy"));

            if (details.Any())
            {
                para.Append(new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "20" },
                        new Color { Val = colors.Accent }
                    ),
                    new Text($"  |  {string.Join("  |  ", details)}")
                ));
            }

            body.Append(para);
        }
    }

    private void AddPublicationsSection(Body body, List<PublicationEntry> publications, ResumeTemplateStyle style)
    {
        AddSectionHeading(body, "PUBLICATIONS", style);
        var colors = StyleColors[style];

        foreach (var pub in publications.OrderByDescending(p => p.Date))
        {
            var para = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { After = "60" }
                )
            );

            // Publication title (bold)
            para.Append(new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "22" },
                    new Bold(),
                    new Color { Val = colors.Secondary }
                ),
                new Text(pub.Title)
            ));

            // Details
            var details = new List<string>();
            if (!string.IsNullOrWhiteSpace(pub.Publisher))
                details.Add(pub.Publisher);
            if (pub.Date.HasValue)
                details.Add(pub.Date.Value.ToString("MMM yyyy"));

            if (details.Any())
            {
                para.Append(new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "20" },
                        new Color { Val = colors.Accent }
                    ),
                    new Text($"  |  {string.Join("  |  ", details)}")
                ));
            }

            body.Append(para);
        }
    }

    private void AddSectionHeading(Body body, string heading, ResumeTemplateStyle style)
    {
        var colors = StyleColors[style];

        // Add some spacing before section
        body.Append(new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines { Before = "200", After = "0" }
            )
        ));

        var para = new Paragraph(
            new ParagraphProperties(
                new SpacingBetweenLines { After = "60" },
                new Shading { Fill = colors.Primary, Val = ShadingPatternValues.Clear }
            ),
            new Run(
                new RunProperties(
                    new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                    new FontSize { Val = "24" },
                    new Bold(),
                    new Color { Val = "FFFFFF" }
                ),
                new Text($"  {heading}")
            )
        );
        body.Append(para);
    }

    private void AddHorizontalLine(Body body, string color)
    {
        var para = new Paragraph(
            new ParagraphProperties(
                new ParagraphBorders(
                    new BottomBorder { Val = BorderValues.Single, Color = color, Size = 6, Space = 1 }
                ),
                new SpacingBetweenLines { After = "200" }
            )
        );
        body.Append(para);
    }

    private void AddBulletPoints(Body body, string description)
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

            var para = new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { After = "40" },
                    new Indentation { Left = "360" }
                ),
                new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "Calibri", HighAnsi = "Calibri" },
                        new FontSize { Val = "22" }
                    ),
                    new Text($"• {trimmedLine}")
                )
            );
            body.Append(para);
        }
    }

    private void AddSectionProperties(Body body)
    {
        var sectionProps = new SectionProperties(
            new PageMargin
            {
                Top = 720,      // 0.5 inch
                Right = 720,    // 0.5 inch
                Bottom = 720,   // 0.5 inch
                Left = 720,     // 0.5 inch
                Header = 360,
                Footer = 360
            },
            new PageSize { Width = 12240, Height = 15840 } // Letter size
        );
        body.Append(sectionProps);
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

        // Basic HTML stripping - replace common HTML elements
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

        // Remove remaining HTML tags
        text = System.Text.RegularExpressions.Regex.Replace(text, "<[^>]+>", "");

        // Clean up extra whitespace
        text = System.Text.RegularExpressions.Regex.Replace(text, @"\n\s*\n", "\n");

        return text.Trim();
    }
}
