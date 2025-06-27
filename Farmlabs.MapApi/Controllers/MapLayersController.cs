using Microsoft.AspNetCore.Mvc;

namespace Farmlabs.MapApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MapLayersController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public MapLayersController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public IActionResult Get()
        {
            var section = _configuration.GetSection("MapLayers");
            var result = new Dictionary<string, object>();
            foreach (var child in section.GetChildren())
            {
                // Try to parse as object (for SentinelWms), else as string
                if (child.GetChildren().Any())
                {
                    var dict = child.GetChildren().ToDictionary(x => x.Key, x => x.Value ?? (object)x.GetChildren().Select(c => c.Value).ToArray());
                    result[child.Key] = dict;
                }
                else
                {
                    result[child.Key] = child.Value;
                }
            }
            return Ok(result);
        }
    }
}