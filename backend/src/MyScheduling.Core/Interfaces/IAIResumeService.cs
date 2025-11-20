using MyScheduling.Core.Entities;

namespace MyScheduling.Core.Interfaces;

public interface IAIResumeService
{
    // AI-assisted resume improvement
    Task<string> SuggestSummaryAsync(ResumeProfile resume);

    Task<string> EnhanceDescriptionAsync(string originalDescription, string context);

    Task<List<string>> SuggestSkillsAsync(ResumeProfile resume);

    Task<string> OptimizeForJobDescriptionAsync(
        ResumeProfile resume,
        string jobDescription);

    Task<ResumeAnalysis> AnalyzeResumeAsync(ResumeProfile resume);

    Task<string> GenerateAchievementBulletsAsync(
        string jobTitle,
        string company,
        string description);

    // Gap analysis
    Task<List<SkillGap>> IdentifySkillGapsAsync(
        ResumeProfile resume,
        string targetJobDescription);
}

public class ResumeAnalysis
{
    public int OverallScore { get; set; } // 0-100
    public List<string> Strengths { get; set; } = new();
    public List<string> ImprovementAreas { get; set; } = new();
    public List<string> MissingKeywords { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public Dictionary<string, int> SectionScores { get; set; } = new();
}

public class SkillGap
{
    public string SkillName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ImportanceLevel { get; set; } // 1-5
    public bool HasSkill { get; set; }
    public string? Recommendation { get; set; }
}
