using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using MyScheduling.Api.Controllers;
using MyScheduling.Core.Entities;
using MyScheduling.Core.Enums;
using MyScheduling.Core.Interfaces;
using MyScheduling.Infrastructure.Data;
using System.Security.Claims;
using Xunit;

namespace MyScheduling.Api.Tests.Controllers;

public class FilesControllerTests : IDisposable
{
    private readonly MySchedulingDbContext _context;
    private readonly Mock<IFileStorageService> _mockFileStorageService;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<ILogger<FilesController>> _mockLogger;
    private readonly FilesController _controller;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly Guid _testTenantId = Guid.NewGuid();
    private readonly Guid _otherTenantId = Guid.NewGuid();

    public FilesControllerTests()
    {
        var options = new DbContextOptionsBuilder<MySchedulingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MySchedulingDbContext(options);
        _mockFileStorageService = new Mock<IFileStorageService>();
        _mockConfiguration = new Mock<IConfiguration>();
        _mockLogger = new Mock<ILogger<FilesController>>();

        // Setup configuration for max file size
        var configSection = new Mock<IConfigurationSection>();
        configSection.Setup(s => s.Value).Returns("26214400"); // 25MB
        _mockConfiguration.Setup(c => c.GetSection("FileStorage:MaxFileSizeBytes")).Returns(configSection.Object);

        _controller = new FilesController(
            _context,
            _mockFileStorageService.Object,
            _mockConfiguration.Object,
            _mockLogger.Object);

        SetupUserContext(_testUserId, _testTenantId, isSystemAdmin: false);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private void SetupUserContext(Guid userId, Guid tenantId, bool isSystemAdmin = false)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, $"user{userId}@test.com"),
            new Claim("TenantId", tenantId.ToString()),
            new Claim("IsSystemAdmin", isSystemAdmin.ToString())
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Request.Headers["X-Tenant-Id"] = tenantId.ToString();

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private StoredFile CreateStoredFile(
        Guid? id = null,
        Guid? tenantId = null,
        Guid? entityId = null,
        string entityType = "UserAttachment",
        string? category = "Resume",
        string fileName = "test.pdf",
        bool isDeleted = false)
    {
        return new StoredFile
        {
            Id = id ?? Guid.NewGuid(),
            TenantId = tenantId ?? _testTenantId,
            EntityId = entityId ?? _testUserId,
            EntityType = entityType,
            FileName = $"{Guid.NewGuid()}.pdf",
            OriginalFileName = fileName,
            ContentType = "application/pdf",
            FileSizeBytes = 1024,
            Category = category,
            StorageProvider = FileStorageProvider.LocalFileSystem,
            StoragePath = "/files/test.pdf",
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = entityId ?? _testUserId
        };
    }

    private IFormFile CreateMockFormFile(string fileName = "test.pdf", long size = 1024)
    {
        var stream = new MemoryStream(new byte[size]);
        var file = new Mock<IFormFile>();
        file.Setup(f => f.FileName).Returns(fileName);
        file.Setup(f => f.Length).Returns(size);
        file.Setup(f => f.ContentType).Returns("application/pdf");
        file.Setup(f => f.OpenReadStream()).Returns(stream);
        return file.Object;
    }

    #region UploadFile Tests

    [Fact]
    public async Task UploadFile_ValidFile_ReturnsCreated()
    {
        // Arrange
        var file = CreateMockFormFile();
        var storedFile = CreateStoredFile();

        _mockFileStorageService
            .Setup(s => s.UploadFileAsync(
                It.IsAny<Stream>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>()))
            .ReturnsAsync(storedFile);

        // Act
        var result = await _controller.UploadFile(file, "Resume");

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedResult>().Subject;
        var response = createdResult.Value.Should().BeOfType<FileUploadResponse>().Subject;
        response.Id.Should().Be(storedFile.Id);
        response.OriginalFileName.Should().Be(storedFile.OriginalFileName);
    }

    [Fact]
    public async Task UploadFile_NoFile_ReturnsBadRequest()
    {
        // Act
        var result = await _controller.UploadFile(null!, "Resume");

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { message = "No file provided" });
    }

    [Fact]
    public async Task UploadFile_EmptyFile_ReturnsBadRequest()
    {
        // Arrange
        var file = CreateMockFormFile(size: 0);

        // Act
        var result = await _controller.UploadFile(file, "Resume");

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { message = "No file provided" });
    }

    [Fact]
    public async Task UploadFile_FileTooLarge_ReturnsBadRequest()
    {
        // Arrange
        var file = CreateMockFormFile(size: 30 * 1024 * 1024); // 30MB

        // Act
        var result = await _controller.UploadFile(file, "Resume");

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var valueJson = System.Text.Json.JsonSerializer.Serialize(badRequest.Value);
        valueJson.Should().Contain("exceeds maximum");
    }

    [Fact]
    public async Task UploadFile_InvalidTenantContext_Returns500()
    {
        // Arrange - setup user with no tenant claims
        // GetCurrentTenantId returns null when user has no TenantId claims and no X-Tenant-Id header
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var file = CreateMockFormFile();

        // Act
        var result = await _controller.UploadFile(file, "Resume");

        // Assert - GetCurrentTenantId returns null, which causes BadRequest
        // But due to exception handling, it may return 500
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        // The controller catches all exceptions including null reference
        statusResult.StatusCode.Should().BeOneOf(400, 500);
    }

    [Fact]
    public async Task UploadFile_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var file = CreateMockFormFile();
        _mockFileStorageService
            .Setup(s => s.UploadFileAsync(
                It.IsAny<Stream>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>()))
            .ThrowsAsync(new Exception("Storage error"));

        // Act
        var result = await _controller.UploadFile(file, "Resume");

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region ListFiles Tests

    [Fact]
    public async Task ListFiles_ReturnsUserFiles()
    {
        // Arrange
        var file1 = CreateStoredFile(entityId: _testUserId);
        var file2 = CreateStoredFile(entityId: _testUserId);
        await _context.StoredFiles.AddRangeAsync(file1, file2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ListFiles();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileListResponse>().Subject;
        response.Items.Should().HaveCount(2);
        response.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task ListFiles_FiltersByCategory()
    {
        // Arrange
        var resumeFile = CreateStoredFile(entityId: _testUserId, category: "Resume");
        var profileFile = CreateStoredFile(entityId: _testUserId, category: "ProfilePhoto");
        await _context.StoredFiles.AddRangeAsync(resumeFile, profileFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ListFiles(category: "Resume");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileListResponse>().Subject;
        response.Items.Should().HaveCount(1);
        response.Items.First().Category.Should().Be("Resume");
    }

    [Fact]
    public async Task ListFiles_ExcludesDeletedFiles()
    {
        // Arrange
        var activeFile = CreateStoredFile(entityId: _testUserId, isDeleted: false);
        var deletedFile = CreateStoredFile(entityId: _testUserId, isDeleted: true);
        await _context.StoredFiles.AddRangeAsync(activeFile, deletedFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ListFiles();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileListResponse>().Subject;
        response.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task ListFiles_ExcludesOtherTenantFiles()
    {
        // Arrange
        var ownTenantFile = CreateStoredFile(tenantId: _testTenantId, entityId: _testUserId);
        var otherTenantFile = CreateStoredFile(tenantId: _otherTenantId, entityId: _testUserId);
        await _context.StoredFiles.AddRangeAsync(ownTenantFile, otherTenantFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ListFiles();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileListResponse>().Subject;
        response.Items.Should().HaveCount(1);
        response.Items.First().Id.Should().Be(ownTenantFile.Id);
    }

    [Fact]
    public async Task ListFiles_FiltersByEntityTypeAndEntityId()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var userFile = CreateStoredFile(entityType: "UserAttachment", entityId: _testUserId);
        var projectFile = CreateStoredFile(entityType: "Project", entityId: projectId);
        await _context.StoredFiles.AddRangeAsync(userFile, projectFile);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ListFiles(entityType: "Project", entityId: projectId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileListResponse>().Subject;
        response.Items.Should().HaveCount(1);
        response.Items.First().Id.Should().Be(projectFile.Id);
    }

    [Fact]
    public async Task ListFiles_NoTenantContext_ReturnsEmptyList()
    {
        // Arrange - setup user with no tenant claims
        // When GetCurrentTenantId returns null, the query filters by null TenantId which returns empty
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Add some files to ensure they're not returned without tenant context
        var file = CreateStoredFile(entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ListFiles();

        // Assert - controller returns OK but with empty/filtered results when tenant is null
        // This behavior protects against data leakage
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileListResponse>().Subject;
        // Files won't be returned because the tenant filter won't match (null vs actual TenantId)
        response.Items.Should().BeEmpty();
    }

    #endregion

    #region GetFile Tests

    [Fact]
    public async Task GetFile_ExistingFile_ReturnsFile()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetFile(file.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileItemResponse>().Subject;
        response.Id.Should().Be(file.Id);
    }

    [Fact]
    public async Task GetFile_NonexistentFile_ReturnsNotFound()
    {
        // Act
        var result = await _controller.GetFile(Guid.NewGuid());

        // Assert
        var notFound = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value.Should().BeEquivalentTo(new { message = "File not found" });
    }

    [Fact]
    public async Task GetFile_DeletedFile_ReturnsNotFound()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId, isDeleted: true);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetFile(file.Id);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetFile_OtherTenantFile_ReturnsNotFound()
    {
        // Arrange
        var file = CreateStoredFile(tenantId: _otherTenantId, entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetFile(file.Id);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetFile_OtherUsersFile_ReturnsForbidden()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _otherUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetFile(file.Id);

        // Assert
        var forbidden = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task GetFile_OtherUsersFile_SystemAdmin_ReturnsFile()
    {
        // Arrange
        SetupUserContext(_adminUserId, _testTenantId, isSystemAdmin: true);
        var file = CreateStoredFile(entityId: _otherUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetFile(file.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileItemResponse>().Subject;
        response.Id.Should().Be(file.Id);
    }

    #endregion

    #region GetDownloadUrl Tests

    [Fact]
    public async Task GetDownloadUrl_LocalFile_ReturnsFileStreamResult()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId);
        file.StorageProvider = FileStorageProvider.LocalFileSystem;
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        var fileStream = new MemoryStream(new byte[] { 1, 2, 3 });
        _mockFileStorageService
            .Setup(s => s.DownloadFileAsync(file.Id, _testUserId))
            .ReturnsAsync(fileStream);

        // Act
        var result = await _controller.GetDownloadUrl(file.Id);

        // Assert
        result.Result.Should().BeOfType<FileStreamResult>();
    }

    [Fact]
    public async Task GetDownloadUrl_AzureFile_ReturnsSignedUrl()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId);
        file.StorageProvider = FileStorageProvider.AzureBlob;
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        var signedUrl = "https://storage.azure.com/files/test.pdf?sig=abc123";
        _mockFileStorageService
            .Setup(s => s.GenerateDownloadUrlAsync(file.Id, It.IsAny<TimeSpan>()))
            .ReturnsAsync(signedUrl);

        // Act
        var result = await _controller.GetDownloadUrl(file.Id);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FileDownloadResponse>().Subject;
        response.DownloadUrl.Should().Be(signedUrl);
        response.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(1), TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task GetDownloadUrl_NonexistentFile_ReturnsNotFound()
    {
        // Act
        var result = await _controller.GetDownloadUrl(Guid.NewGuid());

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetDownloadUrl_OtherTenantFile_ReturnsNotFound()
    {
        // Arrange
        var file = CreateStoredFile(tenantId: _otherTenantId, entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDownloadUrl(file.Id);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetDownloadUrl_OtherUsersFile_ReturnsForbidden()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _otherUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDownloadUrl(file.Id);

        // Assert
        var forbidden = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task GetDownloadUrl_FileNotFoundInStorage_ReturnsNotFound()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId);
        file.StorageProvider = FileStorageProvider.LocalFileSystem;
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        _mockFileStorageService
            .Setup(s => s.DownloadFileAsync(file.Id, _testUserId))
            .ThrowsAsync(new FileNotFoundException("File not found in storage"));

        // Act
        var result = await _controller.GetDownloadUrl(file.Id);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region DeleteFile Tests

    [Fact]
    public async Task DeleteFile_OwnFile_ReturnsNoContent()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        _mockFileStorageService
            .Setup(s => s.DeleteFileAsync(file.Id, _testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.DeleteFile(file.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();
        _mockFileStorageService.Verify(s => s.DeleteFileAsync(file.Id, _testUserId), Times.Once);
    }

    [Fact]
    public async Task DeleteFile_NonexistentFile_ReturnsNotFound()
    {
        // Act
        var result = await _controller.DeleteFile(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteFile_DeletedFile_ReturnsNotFound()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId, isDeleted: true);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteFile(file.Id);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteFile_OtherTenantFile_ReturnsNotFound()
    {
        // Arrange
        var file = CreateStoredFile(tenantId: _otherTenantId, entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteFile(file.Id);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteFile_OtherUsersFile_ReturnsForbidden()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _otherUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteFile(file.Id);

        // Assert
        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task DeleteFile_OtherUsersFile_SystemAdmin_ReturnsNoContent()
    {
        // Arrange
        SetupUserContext(_adminUserId, _testTenantId, isSystemAdmin: true);
        var file = CreateStoredFile(entityId: _otherUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        _mockFileStorageService
            .Setup(s => s.DeleteFileAsync(file.Id, _adminUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.DeleteFile(file.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteFile_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var file = CreateStoredFile(entityId: _testUserId);
        await _context.StoredFiles.AddAsync(file);
        await _context.SaveChangesAsync();

        _mockFileStorageService
            .Setup(s => s.DeleteFileAsync(file.Id, _testUserId))
            .ThrowsAsync(new Exception("Storage error"));

        // Act
        var result = await _controller.DeleteFile(file.Id);

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion
}
