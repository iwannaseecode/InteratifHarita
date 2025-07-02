using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Features;
using NetTopologySuite.IO;
using NetTopologySuite.Geometries;
using System.IO.Compression;
using System.Text.Json;
using Newtonsoft.Json;
using Aspose.CAD;
using Aspose.CAD.FileFormats.Cad;
using Aspose.CAD.FileFormats.Cad.CadObjects;
using Aspose.CAD.ImageOptions;
using System.Linq;

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

        [HttpPost("dwg/export")]
        public IActionResult ExportDwg([FromBody] JsonElement geojson)
        {
            // NOTE: CadImage does not have a public constructor.
            // Use a template DWG file as a base.
            var tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDir);
            var dwgPath = Path.Combine(tempDir, "export.dwg");
            var templatePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", "empty.dwg");

            if (!System.IO.File.Exists(templatePath))
                return StatusCode(500, "DWG template not found. Please add 'Templates/empty.dwg'.");

            try
            {
                using (var image = (CadImage)Image.Load(templatePath))
                {
                    // Copy existing entities to a list, add the new line, and assign back
                    var entities = image.Entities?.ToList() ?? new List<CadEntityBase>();
                    var line = new CadLine
                    {
                        FirstPoint = new Cad3DPoint { X = 0, Y = 0, Z = 0 },
                        SecondPoint = new Cad3DPoint { X = 100, Y = 100, Z = 0 }
                    };
                    entities.Add(line);
                    image.Entities = entities;

                    var options = new DwgOptions();
                    image.Save(dwgPath, options);
                }

                var bytes = System.IO.File.ReadAllBytes(dwgPath);
                return File(bytes, "application/acad", "export.dwg");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"DWG export failed: {ex.Message}");
            }
            finally
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }

        [HttpPost("dwg/import")]
        public IActionResult ImportDwg([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            try
            {
                using (var stream = file.OpenReadStream())
                using (var image = (CadImage)Image.Load(stream))
                {
                    // Example: List entity types (replace with your own conversion logic)
                    var entities = image.Entities.Select(e => e.TypeName).ToList();
                    return Ok(new { EntityTypes = entities });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"DWG import failed: {ex.Message}");
            }
        }
    }
}