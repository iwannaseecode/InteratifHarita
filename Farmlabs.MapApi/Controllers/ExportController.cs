using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Features;
using NetTopologySuite.IO;
using NetTopologySuite.Geometries;
using System.IO.Compression;
using System.Text.Json;
using Newtonsoft.Json;
using System.Linq;
using Aspose.CAD;
using Aspose.CAD.FileFormats.Cad;
using Aspose.CAD.FileFormats.Cad.CadObjects;
using Aspose.CAD.ImageOptions;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using ProjNet.CoordinateSystems;
using ProjNet.CoordinateSystems.Transformations;

namespace Farmlabs.MapApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExportController : ControllerBase
    {
        [HttpPost("shp/export")]
        public IActionResult ExportShp([FromBody] JsonElement geojson)
        {
            FeatureCollection featureCollection;
            try
            {
                var serializer = GeoJsonSerializer.Create();
                using (var reader = new JsonTextReader(new StringReader(geojson.GetRawText())))
                {
                    featureCollection = serializer.Deserialize<FeatureCollection>(reader)!;
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Invalid GeoJSON format: {ex.Message}");
            }

            if (featureCollection == null || featureCollection.Count == 0)
            {
                return BadRequest("No features found in GeoJSON.");
            }

            var validFeatures = featureCollection.Where(f => f?.Geometry != null).ToList();
            if (validFeatures.Count == 0)
            {
                return BadRequest("No valid geometries found in GeoJSON.");
            }

            var geomType = validFeatures[0].Geometry.GeometryType;
            if (validFeatures.Any(f => f.Geometry?.GeometryType != geomType))
            {
                return BadRequest("All features must have the same geometry type for SHP export.");
            }

            if (!(geomType == "Point" || geomType == "LineString" || geomType == "Polygon"))
            {
                return BadRequest("Only Point, LineString, and Polygon geometries are supported for SHP export.");
            }

            var tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDir);
            try
            {
                var shpPath = Path.Combine(tempDir, "export.shp");
                var geometryFactory = new GeometryFactory();

                var records = validFeatures.Select((f, idx) =>
                {
                    var attrs = new AttributesTable();
                    var names = f.Attributes?.GetNames()?.ToList() ?? new List<string>();
                    bool hasSimpleProperty = false;
                    if (names.Count > 0 && f.Attributes != null)
                    {
                        foreach (var kv in names)
                        {
                            var value = f.Attributes[kv];
                            if (value is string || value is int || value is double || value is bool || value is DateTime)
                                hasSimpleProperty = true;
                            attrs.Add(kv, value is null || value is string || value is int || value is double || value is bool || value is DateTime
                                ? value
                                : value?.ToString());
                        }
                    }
                    if (!hasSimpleProperty)
                        attrs.Add("id", idx + 1);
                    return new Feature(f.Geometry, attrs);
                }).ToList();

                var writer = new ShapefileDataWriter(shpPath, geometryFactory)
                {
                    Header = ShapefileDataWriter.GetHeader(records[0], records.Count)
                };

                writer.Write(records);

                var prjPath = Path.Combine(tempDir, "export.prj");
                System.IO.File.WriteAllText(prjPath,
                    "GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563]]," +
                    "PRIMEM[\"Greenwich\",0],UNIT[\"degree\",0.0174532925199433]]");

                var zipPath = Path.Combine(tempDir, "export.zip");
                using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                {
                    foreach (var ext in new[] { ".shp", ".shx", ".dbf", ".prj" })
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
            var tempDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(tempDir);
            var dwgPath = Path.Combine(tempDir, "export.dwg");
            var templatePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", "empty.dwg");

            if (!System.IO.File.Exists(templatePath))
                return StatusCode(500, "DWG template not found. Please add 'Templates/empty.dwg'.");

            try
            {
                var serializer = GeoJsonSerializer.Create();
                FeatureCollection featureCollection;
                using (var reader = new JsonTextReader(new StringReader(geojson.GetRawText())))
                {
                    featureCollection = serializer.Deserialize<FeatureCollection>(reader)!;
                }

                double avgLon = 33.0;
                double avgLat = 39.9;
                if (featureCollection != null && featureCollection.Count > 0)
                {
                    var allCoords = new List<Coordinate>();
                    foreach (var feature in featureCollection)
                    {
                        if (feature.Geometry != null)
                        {
                            allCoords.AddRange(feature.Geometry.Coordinates);
                        }
                    }
                    if (allCoords.Count > 0)
                    {
                        avgLon = allCoords.Average(c => c.X);
                        avgLat = allCoords.Average(c => c.Y);
                    }
                }

                int utmZone = (int)Math.Floor((avgLon + 180) / 6) + 1;
                double centralMeridian = -183.0 + 6.0 * utmZone;
                string utmHemisphere = avgLat >= 0 ? "N" : "S";
                string utmZoneText = $"UTM_ZONE={utmZone}{utmHemisphere}";
                string utmWkt = $@"
PROJCS[""WGS 84 / UTM zone {utmZone}{utmHemisphere}"",GEOGCS[""WGS 84"",DATUM[""WGS_1984"",
SPHEROID[""WGS 84"",6378137,298.257223563]],PRIMEM[""Greenwich"",0],
UNIT[""degree"",0.0174532925199433]],PROJECTION[""Transverse_Mercator""],
PARAMETER[""latitude_of_origin"",0],PARAMETER[""central_meridian"",{centralMeridian}],
PARAMETER[""scale_factor"",0.9996],PARAMETER[""false_easting"",500000],
PARAMETER[""false_northing"",{(avgLat >= 0 ? 0 : 10000000)}],UNIT[""metre"",1],
AXIS[""Easting"",EAST],AXIS[""Northing"",NORTH]]";

                var csFactory = new CoordinateSystemFactory();
                var ctFactory = new CoordinateTransformationFactory();
                var wgs84 = csFactory.CreateFromWkt(
                    "GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563]]," +
                    "PRIMEM[\"Greenwich\",0],UNIT[\"degree\",0.0174532925199433]]");
                var utm = csFactory.CreateFromWkt(utmWkt);
                var transform = ctFactory.CreateFromCoordinateSystems(wgs84, utm);

                using (var image = (CadImage)Image.Load(templatePath))
                {
                    var entities = image.Entities?.ToList() ?? new List<CadEntityBase>();

                    var text = new CadText
                    {
                        DefaultValue = utmZoneText,
                        FirstAlignment = new Cad3DPoint(0, 0, 0),
                        LayerName = "0"
                    };
                    entities.Insert(0, text);

                    if (featureCollection != null)
                    {
                        foreach (var feature in featureCollection)
                        {
                            var geom = feature.Geometry;
                            if (geom is NetTopologySuite.Geometries.Point pt)
                            {
                                var xy = transform.MathTransform.Transform(new[] { pt.X, pt.Y });
                                var cadPoint = new CadPoint();
                                cadPoint.PointLocation = new Cad3DPoint(xy[0], xy[1], 0);
                                entities.Add(cadPoint);
                            }
                            else if (geom is NetTopologySuite.Geometries.LineString line)
                            {
                                var cadLine = new CadLwPolyline
                                {
                                    Coordinates = new List<Cad2DPoint>()
                                };
                                foreach (var coord in line.Coordinates)
                                {
                                    var xy = transform.MathTransform.Transform(new[] { coord.X, coord.Y });
                                    cadLine.Coordinates.Add(new Cad2DPoint { X = xy[0], Y = xy[1] });
                                }
                                cadLine.PointCount = cadLine.Coordinates.Count;
                                entities.Add(cadLine);
                            }
                            else if (geom is NetTopologySuite.Geometries.Polygon poly)
                            {
                                var cadPoly = new CadLwPolyline
                                {
                                    Coordinates = new List<Cad2DPoint>()
                                };
                                var coords = poly.ExteriorRing.Coordinates;
                                foreach (var coord in coords)
                                {
                                    var xy = transform.MathTransform.Transform(new[] { coord.X, coord.Y });
                                    cadPoly.Coordinates.Add(new Cad2DPoint { X = xy[0], Y = xy[1] });
                                }
                                // Ensure closed ring
                                if (coords.Length > 0)
                                {
                                    var first = transform.MathTransform.Transform(new[] { coords[0].X, coords[0].Y });
                                    var last = transform.MathTransform.Transform(new[] { coords[coords.Length - 1].X, coords[coords.Length - 1].Y });
                                    if (first[0] != last[0] || first[1] != last[1])
                                    {
                                        cadPoly.Coordinates.Add(new Cad2DPoint { X = first[0], Y = first[1] });
                                    }
                                }
                                cadPoly.PointCount = cadPoly.Coordinates.Count;
                                entities.Add(cadPoly);
                            }
                        }
                    }

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
                var csFactory = new CoordinateSystemFactory();
                var ctFactory = new CoordinateTransformationFactory();
                
                using (var stream = file.OpenReadStream())
                using (var image = (CadImage)Image.Load(stream))
                {
                    var geometryEntities = image.Entities.Where(e => e is CadPoint || e is CadLwPolyline).ToList();

                    if (geometryEntities.Count == 0)
                    {
                        return Ok(new { geojson = new { type = "FeatureCollection", features = new List<object>() } });
                    }

                    // Koordinat aralığı analizi
                    double minX = double.MaxValue, maxX = double.MinValue;
                    double minY = double.MaxValue, maxY = double.MinValue;
                    
                    foreach (var entity in geometryEntities)
                    {
                        if (entity is CadPoint pt)
                        {
                            minX = Math.Min(minX, pt.PointLocation.X);
                            maxX = Math.Max(maxX, pt.PointLocation.X);
                            minY = Math.Min(minY, pt.PointLocation.Y);
                            maxY = Math.Max(maxY, pt.PointLocation.Y);
                        }
                        else if (entity is CadLwPolyline poly)
                        {
                            foreach (var coord in poly.Coordinates)
                            {
                                minX = Math.Min(minX, coord.X);
                                maxX = Math.Max(maxX, coord.X);
                                minY = Math.Min(minY, coord.Y);
                                maxY = Math.Max(maxY, coord.Y);
                            }
                        }
                    }

                    // Koordinat sistemini belirle
                    ICoordinateTransformation? transform = null;
                    
                    // Eğer koordinatlar WGS84 formatındaysa (enlem/boylam)
                    if (maxX <= 180 && minX >= -180 && maxY <= 90 && minY >= -90)
                    {
                        // Zaten WGS84, dönüşüm gerek yok
                        transform = null;
                    }
                    // Türkiye UTM koordinatları (metre)
                    else if (minX > 200000 && maxX < 900000 && minY > 4000000 && maxY < 5000000)
                    {
                        // Türkiye UTM Zone belirleme
                        int utmZone = 36; // Varsayılan
                        if (minX < 400000) utmZone = 35;
                        else if (maxX > 700000) utmZone = 37;
                        
                        double centralMeridian = -183.0 + 6.0 * utmZone;
                        
                        string utmWkt = $@"PROJCS[""WGS 84 / UTM zone {utmZone}N"",
    GEOGCS[""WGS 84"",
        DATUM[""WGS_1984"",
            SPHEROID[""WGS 84"",6378137,298.257223563]],
        PRIMEM[""Greenwich"",0],
        UNIT[""degree"",0.0174532925199433]],
    PROJECTION[""Transverse_Mercator""],
    PARAMETER[""latitude_of_origin"",0],
    PARAMETER[""central_meridian"",{centralMeridian}],
    PARAMETER[""scale_factor"",0.9996],
    PARAMETER[""false_easting"",500000],
    PARAMETER[""false_northing"",0],
    UNIT[""metre"",1]]";

                        var wgs84 = csFactory.CreateFromWkt(
                            @"GEOGCS[""WGS 84"",
    DATUM[""WGS_1984"",
        SPHEROID[""WGS 84"",6378137,298.257223563]],
    PRIMEM[""Greenwich"",0],
    UNIT[""degree"",0.0174532925199433]]");

                        var utm = csFactory.CreateFromWkt(utmWkt);
                        transform = ctFactory.CreateFromCoordinateSystems(utm, wgs84);
                    }
                    // ED50 koordinat sistemi (eski Türkiye haritaları)
                    else
                    {
                        string ed50UtmWkt = @"PROJCS[""ED50 / UTM zone 36N"",
    GEOGCS[""ED50"",
        DATUM[""European_Datum_1950"",
            SPHEROID[""International 1924"",6378388,297]],
        PRIMEM[""Greenwich"",0],
        UNIT[""degree"",0.0174532925199433]],
    PROJECTION[""Transverse_Mercator""],
    PARAMETER[""latitude_of_origin"",0],
    PARAMETER[""central_meridian"",33],
    PARAMETER[""scale_factor"",0.9996],
    PARAMETER[""false_easting"",500000],
    PARAMETER[""false_northing"",0],
    UNIT[""metre"",1]]";

                        var wgs84 = csFactory.CreateFromWkt(
                            @"GEOGCS[""WGS 84"",
    DATUM[""WGS_1984"",
        SPHEROID[""WGS 84"",6378137,298.257223563]],
    PRIMEM[""Greenwich"",0],
    UNIT[""degree"",0.0174532925199433]]");

                        var ed50Utm = csFactory.CreateFromWkt(ed50UtmWkt);
                        transform = ctFactory.CreateFromCoordinateSystems(ed50Utm, wgs84);
                    }

                    var features = new List<object>();
                    
                    foreach (var entity in geometryEntities)
                    {
                        if (entity is CadPoint pt)
                        {
                            double[] coords;
                            if (transform != null)
                            {
                                coords = transform.MathTransform.Transform(new[] { pt.PointLocation.X, pt.PointLocation.Y });
                            }
                            else
                            {
                                coords = new[] { pt.PointLocation.X, pt.PointLocation.Y };
                            }

                            features.Add(new
                            {
                                type = "Feature",
                                geometry = new
                                {
                                    type = "Point",
                                    coordinates = new[] { coords[0], coords[1] }
                                },
                                properties = new { }
                            });
                        }
                        else if (entity is CadLwPolyline poly)
                        {
                            var coords = poly.Coordinates.Select(v =>
                            {
                                if (transform != null)
                                {
                                    var lonlat = transform.MathTransform.Transform(new[] { v.X, v.Y });
                                    return new[] { lonlat[0], lonlat[1] };
                                }
                                else
                                {
                                    return new[] { v.X, v.Y };
                                }
                            }).ToList();

                            if (coords.Count >= 3)
                            {
                                if (Math.Abs(coords[0][0] - coords[coords.Count - 1][0]) > 1e-10 ||
                                    Math.Abs(coords[0][1] - coords[coords.Count - 1][1]) > 1e-10)
                                {
                                    coords.Add(coords[0]);
                                }
                            }

                            if (coords.Count >= 4)
                            {
                                var polygonCoords = new double[1][][];
                                polygonCoords[0] = coords.Select(c => new double[] { c[0], c[1] }).ToArray();
                                features.Add(new
                                {
                                    type = "Feature",
                                    geometry = new
                                    {
                                        type = "Polygon",
                                        coordinates = polygonCoords
                                    },
                                    properties = new { }
                                });
                            }
                            else
                            {
                                features.Add(new
                                {
                                    type = "Feature",
                                    geometry = new
                                    {
                                        type = "LineString",
                                        coordinates = coords
                                    },
                                    properties = new { }
                                });
                            }
                        }
                    }
                    
                    var geojson = new
                    {
                        type = "FeatureCollection",
                        features = features
                    };
                    return Ok(new { geojson });
                }
            }
            catch (Exception ex)
            {
                return Ok(new { 
                    geojson = new { 
                        type = "FeatureCollection", 
                        features = new List<object>() 
                    },
                    error = ex.Message
                });
            }
        }
    }
}