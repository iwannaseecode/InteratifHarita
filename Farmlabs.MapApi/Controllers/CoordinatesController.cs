using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;

namespace Farmlabs.MapApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CoordinatesController : ControllerBase
    {
        private readonly ILogger<CoordinatesController> _logger;

        public CoordinatesController(ILogger<CoordinatesController> logger)
        {
            _logger = logger;
        }

        [HttpPost]
        public IActionResult Post([FromBody] CoordinateDto coordinate)
        {
            // Log received coordinate and EPSG
            _logger.LogInformation($"Received coordinate: X={coordinate.X}, Y={coordinate.Y}, EPSG={coordinate.EPSG}");

            // Example: You can add validation or transformation logic here if needed

            return Ok(new
            {
                ReceivedAt = DateTime.UtcNow,
                Coordinate = coordinate,
                Message = "Coordinate processed successfully",
            });
        }
    }

    public class CoordinateDto
    {
        public double X { get; set; }
        public double Y { get; set; }
        public string EPSG { get; set; } = "4326";
    }
}