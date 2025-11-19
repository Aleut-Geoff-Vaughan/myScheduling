using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AleutStaffing.Core.Entities;
using AleutStaffing.Infrastructure.Data;

namespace AleutStaffing.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AleutStaffingDbContext _context;
    private readonly ILogger<BookingsController> _logger;

    public BookingsController(AleutStaffingDbContext context, ILogger<BookingsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/bookings
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetBookings(
        [FromQuery] Guid? personId = null,
        [FromQuery] Guid? spaceId = null,
        [FromQuery] Guid? officeId = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] BookingStatus? status = null)
    {
        try
        {
            var query = _context.Bookings
                .Include(b => b.Person)
                .Include(b => b.Space)
                    .ThenInclude(s => s.Office)
                .Include(b => b.CheckInEvents)
                .AsQueryable();

            if (personId.HasValue)
            {
                query = query.Where(b => b.PersonId == personId.Value);
            }

            if (spaceId.HasValue)
            {
                query = query.Where(b => b.SpaceId == spaceId.Value);
            }

            if (officeId.HasValue)
            {
                query = query.Where(b => b.Space.OfficeId == officeId.Value);
            }

            if (startDate.HasValue)
            {
                query = query.Where(b => b.EndDatetime >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(b => b.StartDatetime <= endDate.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(b => b.Status == status.Value);
            }

            var bookings = await query
                .OrderBy(b => b.StartDatetime)
                .ToListAsync();

            return Ok(bookings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bookings");
            return StatusCode(500, "An error occurred while retrieving bookings");
        }
    }

    // GET: api/bookings/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Booking>> GetBooking(Guid id)
    {
        try
        {
            var booking = await _context.Bookings
                .Include(b => b.Person)
                .Include(b => b.Space)
                    .ThenInclude(s => s.Office)
                .Include(b => b.CheckInEvents)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
            {
                return NotFound($"Booking with ID {id} not found");
            }

            return Ok(booking);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving booking {BookingId}", id);
            return StatusCode(500, "An error occurred while retrieving the booking");
        }
    }

    // POST: api/bookings
    [HttpPost]
    public async Task<ActionResult<Booking>> CreateBooking(Booking booking)
    {
        try
        {
            // Check for space conflicts
            var hasConflict = await _context.Bookings
                .AnyAsync(b =>
                    b.SpaceId == booking.SpaceId &&
                    b.Id != booking.Id &&
                    (b.Status == BookingStatus.Reserved || b.Status == BookingStatus.CheckedIn) &&
                    ((booking.StartDatetime >= b.StartDatetime && booking.StartDatetime < b.EndDatetime) ||
                     (booking.EndDatetime > b.StartDatetime && booking.EndDatetime <= b.EndDatetime) ||
                     (booking.StartDatetime <= b.StartDatetime && booking.EndDatetime >= b.EndDatetime)));

            if (hasConflict)
            {
                return Conflict("This space is already booked for the requested time period");
            }

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, booking);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating booking");
            return StatusCode(500, "An error occurred while creating the booking");
        }
    }

    // PUT: api/bookings/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBooking(Guid id, Booking booking)
    {
        if (id != booking.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            _context.Entry(booking).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await BookingExists(id))
                {
                    return NotFound($"Booking with ID {id} not found");
                }
                throw;
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating booking {BookingId}", id);
            return StatusCode(500, "An error occurred while updating the booking");
        }
    }

    // DELETE: api/bookings/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBooking(Guid id)
    {
        try
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound($"Booking with ID {id} not found");
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting booking {BookingId}", id);
            return StatusCode(500, "An error occurred while deleting the booking");
        }
    }

    // POST: api/bookings/{id}/checkin
    [HttpPost("{id}/checkin")]
    public async Task<IActionResult> CheckIn(Guid id, [FromBody] string method)
    {
        try
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound($"Booking with ID {id} not found");
            }

            booking.Status = BookingStatus.CheckedIn;

            var checkInEvent = new CheckInEvent
            {
                BookingId = id,
                Timestamp = DateTime.UtcNow,
                Method = method
            };

            _context.CheckInEvents.Add(checkInEvent);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking in booking {BookingId}", id);
            return StatusCode(500, "An error occurred while checking in");
        }
    }

    // GET: api/bookings/offices
    [HttpGet("offices")]
    public async Task<ActionResult<IEnumerable<Office>>> GetOffices([FromQuery] Guid? tenantId = null)
    {
        try
        {
            var query = _context.Offices
                .Include(o => o.Spaces)
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(o => o.TenantId == tenantId.Value);
            }

            var offices = await query
                .OrderBy(o => o.Name)
                .ToListAsync();

            return Ok(offices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving offices");
            return StatusCode(500, "An error occurred while retrieving offices");
        }
    }

    // GET: api/bookings/spaces
    [HttpGet("spaces")]
    public async Task<ActionResult<IEnumerable<Space>>> GetSpaces(
        [FromQuery] Guid? officeId = null,
        [FromQuery] SpaceType? type = null)
    {
        try
        {
            var query = _context.Spaces
                .Include(s => s.Office)
                .AsQueryable();

            if (officeId.HasValue)
            {
                query = query.Where(s => s.OfficeId == officeId.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(s => s.Type == type.Value);
            }

            var spaces = await query
                .OrderBy(s => s.Name)
                .ToListAsync();

            return Ok(spaces);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving spaces");
            return StatusCode(500, "An error occurred while retrieving spaces");
        }
    }

    private async Task<bool> BookingExists(Guid id)
    {
        return await _context.Bookings.AnyAsync(e => e.Id == id);
    }
}
