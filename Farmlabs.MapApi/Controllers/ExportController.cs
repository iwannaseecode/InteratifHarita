using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Features;
using NetTopologySuite.IO;
using NetTopologySuite.Geometries;
using System.IO.Compression;
using System.Text.Json;
using Newtonsoft.Json;

namespace Farmlabs.MapApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExportController : ControllerBase
    {
        [HttpPost("shp")]
        public IActionResult ExportShp([FromBody] JsonElement geojson)
        {
            var serializer = GeoJsonSerializer.Create();
            FeatureCollection? featureCollection;
            using (var doc = JsonDocument.Parse(geojson.GetRawText()))
            using (var reader = new JsonTextReader(new StringReader(doc.RootElement.GetRawText())))
            {
                featureCollection = serializer.Deserialize<FeatureCollection>(reader);
            }

            if (featureCollection == null || featureCollection.Count == 0)
                return BadRequest("No features found.");

            var firstFeature = featureCollection.FirstOrDefault();
            if (firstFeature == null)
                return BadRequest("No features found.");

            var tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDir);
            try
            {
                var shpPath = Path.Combine(tempDir, "export.shp");
                var geometryFactory = new GeometryFactory();
                var writer = new ShapefileDataWriter(shpPath, geometryFactory)
                {
                    Header = ShapefileDataWriter.GetHeader(
                        firstFeature,
                        featureCollection.Count
                    )
                };

                // Use the original attributes directly
                var records = featureCollection.ToList();

                writer.Write(records);

                var zipPath = Path.Combine(tempDir, "export.zip");
                using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                {
                    foreach (var ext in new[] { ".shp", ".shx", ".dbf" })
                    {
                        var file = Path.Combine(tempDir, "export" + ext);
                        if (System.IO.File.Exists(file))
                            zip.CreateEntryFromFile(file, "export" + ext);
                    }
                }

                var bytes = System.IO.File.ReadAllBytes(zipPath);
                return File(bytes, "application/zip", "export.zip");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Export failed: {ex.Message}");
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }
    }
}