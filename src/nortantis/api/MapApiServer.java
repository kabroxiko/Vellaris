package nortantis.api;

import com.google.gson.Gson;
import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.geom.Dimension;
import nortantis.platform.Image;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Logger;
import spark.Request;
import spark.Response;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.charset.StandardCharsets;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;
import java.io.InputStream;
import java.nio.file.StandardCopyOption;

import static spark.Spark.*;

/**
 * Small HTTP API to generate random or .nort maps.
 * POST /generate  - body JSON: { "nortFile": "path.nort", "width":2000, "height":1200, "seed":123, "out":"out.png" }
 */
public class MapApiServer {

    private static final Gson gson = new Gson();
    private static final String NORT_EXTENSION = ".nort";

    public static void main(String[] args) {
        port(8080);
        // Basic CORS
        options("/*", (request, response) -> {
            String accessControlRequestHeaders = request.headers("Access-Control-Request-Headers");
            if (accessControlRequestHeaders != null) {
                response.header("Access-Control-Allow-Headers", accessControlRequestHeaders);
            }
            String accessControlRequestMethod = request.headers("Access-Control-Request-Method");
            if (accessControlRequestMethod != null) {
                response.header("Access-Control-Allow-Methods", accessControlRequestMethod);
            }
            return "OK";
        });
        before((req, res) -> res.header("Access-Control-Allow-Origin", "*"));

        get("/health", (req, res) -> "ok");

        post("/generate", MapApiServer::handleGenerate);

        init();
        Logger.println("Map API server started on port 8080");
    }

    private static Object handleGenerate(Request req, Response res) {
        res.type("application/json");
        logHeaders(req);

        Config cfg = parseConfig(req, res);
        if (cfg == null) {
            return gson.toJson(new ApiResponse(false, "Failed to parse config", null, null));
        }

        PlatformFactory.setInstance(new AwtFactory());

        GenerationContext ctx = loadSettings(cfg, res);
        if (ctx == null) {
            return gson.toJson(new ApiResponse(false, "Failed to load settings", null, null));
        }

        Image img = generateMap(ctx.settings, cfg, res);
        if (img == null) {
            return gson.toJson(new ApiResponse(false, "Failed to generate map", null, null));
        }

        String outPath = determineOutputPath(cfg, res, img);
        if (outPath == null) {
            return gson.toJson(new ApiResponse(false, "Failed to determine output path", null, null));
        }

        if (cfg.returnImageBytes != null && cfg.returnImageBytes) {
            return returnImageAsBytes(img, ctx.tempNortPath, cfg, res);
        }

        if (!writeImageToFile(img, outPath, res)) {
            return gson.toJson(new ApiResponse(false, "Failed to write image", null, null));
        }

        String nortSavedPath = saveNortIfRequested(ctx.settings, outPath, ctx.providedNortContent, cfg, ctx.tempNortPath, res);

        res.status(200);
        return gson.toJson(new ApiResponse(true, "OK", outPath, nortSavedPath));
    }

    private static void logHeaders(Request req) {
        try {
            String ct = req.contentType();
            Logger.println("handleGenerate: contentType='" + ct + "' raw='" + req.raw().getContentType() + "'");
            for (String h : req.headers()) {
                Logger.println("handleGenerate header: " + h + " = " + req.headers(h));
            }
        } catch (Exception e) {
            Logger.println("handleGenerate: failed to log headers: " + e.getMessage());
        }
    }

    private static Config parseConfig(Request req, Response res) {
        try {
            String contentType = req.contentType();
            if (contentType != null && contentType.toLowerCase().startsWith("multipart/form-data")) {
                return parseMultipartConfig(req);
            } else {
                return gson.fromJson(req.body(), Config.class);
            }
        } catch (Exception e) {
            res.status(400);
            return null;
        }
    }

    private static Config parseMultipartConfig(Request req) throws IOException, javax.servlet.ServletException {
        MultipartConfigElement multipartConfigElement = new MultipartConfigElement(System.getProperty("java.io.tmpdir"));
        req.raw().setAttribute("org.eclipse.jetty.multipartConfig", multipartConfigElement);
        Part part = req.raw().getPart("nortFile");
        Config cfg = new Config();

        if (part != null) {
            Path temp = Files.createTempFile("nortantis-upload-", NORT_EXTENSION);
            try (InputStream is = part.getInputStream()) {
                Files.copy(is, temp, StandardCopyOption.REPLACE_EXISTING);
            }
            cfg.nortFile = temp.toAbsolutePath().toString();
        }

        extractFormFields(req, cfg);
        return cfg;
    }

    private static void extractFormFields(Request req, Config cfg) {
        String widthStr = req.raw().getParameter("width");
        String heightStr = req.raw().getParameter("height");
        String seedStr = req.raw().getParameter("seed");
        String saveNortStr = req.raw().getParameter("saveNort");
        String returnBytesStr = req.raw().getParameter("returnImageBytes");

        if (widthStr != null && !widthStr.isEmpty()) cfg.width = Integer.valueOf(widthStr);
        if (heightStr != null && !heightStr.isEmpty()) cfg.height = Integer.valueOf(heightStr);
        if (seedStr != null && !seedStr.isEmpty()) cfg.seed = Long.valueOf(seedStr);
        if (saveNortStr != null && !saveNortStr.isEmpty()) cfg.saveNort = Boolean.valueOf(saveNortStr);
        if (returnBytesStr != null && !returnBytesStr.isEmpty()) cfg.returnImageBytes = Boolean.valueOf(returnBytesStr);
    }

    private static GenerationContext loadSettings(Config cfg, Response res) {
        boolean providedNortContent = cfg.nortContent != null && !cfg.nortContent.isEmpty();
        Path tempNortPath = null;

        try {
            MapSettings settings;
            if (providedNortContent) {
                tempNortPath = Files.createTempFile("nortantis-", NORT_EXTENSION);
                Files.write(tempNortPath, cfg.nortContent.getBytes(StandardCharsets.UTF_8), StandardOpenOption.TRUNCATE_EXISTING);
                settings = new MapSettings(tempNortPath.toAbsolutePath().toString());
            } else if (cfg.nortFile != null && !cfg.nortFile.isEmpty()) {
                settings = new MapSettings(cfg.nortFile);
            } else {
                settings = SettingsGenerator.generate(null);
            }

            if (cfg.seed != null) {
                settings.randomSeed = cfg.seed;
            }

            return new GenerationContext(settings, tempNortPath, providedNortContent);
        } catch (IOException ex) {
            res.status(400);
            return null;
        }
    }

    private static Image generateMap(MapSettings settings, Config cfg, Response res) {
        Dimension dims = null;
        if (cfg.width != null || cfg.height != null) {
            int defaultWidth = settings.generatedWidth > 0 ? settings.generatedWidth : 2000;
            int w = (cfg.width != null) ? cfg.width : defaultWidth;
            int defaultHeight = settings.generatedHeight > 0 ? settings.generatedHeight : 1200;
            int h = (cfg.height != null) ? cfg.height : defaultHeight;
            dims = new Dimension(w, h);
        }

        try {
            MapCreator creator = new MapCreator();
            return creator.createMap(settings, dims, null);
        } catch (Exception e) {
            res.status(500);
            return null;
        }
    }

    private static String determineOutputPath(Config cfg, Response res, Image img) {
        String outPath = cfg.out;
        if (outPath == null || outPath.isEmpty()) {
            try {
                File tmp = File.createTempFile("nortantis-map-" + Instant.now().toEpochMilli(), ".png");
                outPath = tmp.getAbsolutePath();
            } catch (IOException e) {
                img.close();
                res.status(500);
                return null;
            }
        }
        return outPath;
    }

    private static Object returnImageAsBytes(Image img, Path tempNortPath, Config cfg, Response res) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            BufferedImage buf = nortantis.platform.awt.AwtFactory.unwrap(img);
            ImageIO.write(buf, "png", baos);
            baos.flush();
            byte[] bytes = baos.toByteArray();
            res.type("image/png");
            res.status(200);
            return bytes;
        } catch (Exception e) {
            res.status(500);
            return gson.toJson(new ApiResponse(false, "Failed to produce image bytes: " + e.getMessage(), null, null));
        } finally {
            img.close();
            if (tempNortPath != null && !cfg.saveNort) {
                try {
                    Files.deleteIfExists(tempNortPath);
                } catch (Exception ignore) {
                    // Ignore cleanup errors; temporary file will be cleaned up by system
                }
            }
        }
    }

    private static boolean writeImageToFile(Image img, String outPath, Response res) {
        try {
            img.write(outPath);
            return true;
        } catch (Exception e) {
            res.status(500);
            return false;
        } finally {
            img.close();
        }
    }

    private static String saveNortIfRequested(MapSettings settings, String outPath, boolean providedNortContent, Config cfg, Path tempNortPath, Response res) {
        String nortSavedPath = null;
        try {
            if (cfg.saveNort != null && cfg.saveNort && providedNortContent) {
                String base = outPath;
                int dot = base.lastIndexOf('.');
                String nortPath = (dot > 0 ? base.substring(0, dot) : base) + NORT_EXTENSION;
                settings.writeToFile(nortPath);
                nortSavedPath = nortPath;
            }
        } catch (Exception e) {
            res.status(200);
        } finally {
            if (tempNortPath != null && !(cfg.saveNort != null && cfg.saveNort)) {
                try {
                    Files.deleteIfExists(tempNortPath);
                } catch (Exception ignore) {
                    // Ignore cleanup errors; temporary file will be cleaned up by system
                }
            }
        }
        return nortSavedPath;
    }

    private static class Config {
        String nortFile;
        String nortContent;
        Integer width;
        Integer height;
        Long seed;
        String out;
        Boolean returnImageBytes;
        Boolean saveNort;
    }

    private static class GenerationContext {
        MapSettings settings;
        Path tempNortPath;
        boolean providedNortContent;

        GenerationContext(MapSettings settings, Path tempNortPath, boolean providedNortContent) {
            this.settings = settings;
            this.tempNortPath = tempNortPath;
            this.providedNortContent = providedNortContent;
        }
    }

    @SuppressWarnings("unused")
    private static class ApiResponse {
        boolean success;
        String message;
        String path;
        String nortPath;

        ApiResponse(boolean success, String message, String path, String nortPath) {
            this.success = success;
            this.message = message;
            this.path = path;
            this.nortPath = nortPath;
        }
    }
}
