using System.ComponentModel.DataAnnotations;

namespace MyScheduling.Api.Models;

public class UpdateUserProfileRequest
{
    [Required]
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public bool? IsSystemAdmin { get; set; }
    public string? ManagerId { get; set; }
}
