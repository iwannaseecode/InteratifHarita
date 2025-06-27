using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Farmlabs.MapApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MapDefaultsController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public MapDefaultsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public IActionResult Get()
        {
            var section = _configuration.GetSection("MapDefaults");
            var center = section.GetSection("Center").Get<double[]>();
            var zoom = section.GetValue<int>("Zoom");
            return Ok(new { center, zoom });
        }
    }
}