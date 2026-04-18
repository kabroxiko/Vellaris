package nortantis.api;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import nortantis.CancelledException;
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

        post("/generate", (req, res) -> handleGenerate(req, res));

        init();
        Logger.println("Map API server started on port 8080");
    }

    private static Object handleGenerate(Request req, Response res) {
        res.type("application/json");

        // Debug: log content-type and headers (do NOT call req.body() here, it may consume the stream)
        try {
            String ct = req.contentType();
            Logger.println("handleGenerate: contentType='" + ct + "' raw='" + req.raw().getContentType() + "'");
            for (String h : req.headers()) {
                Logger.println("handleGenerate header: " + h + " = " + req.headers(h));
            }
        } catch (Exception e) {
            Logger.println("handleGenerate: failed to log headers: " + e.getMessage());
        }

        Config cfg = null;
        try {
            String contentType = req.contentType();
            if (contentType != null && contentType.toLowerCase().startsWith("multipart/form-data")) {
                // Configure multipart handling and extract the uploaded file + form fields
                MultipartConfigElement multipartConfigElement = new MultipartConfigElement(System.getProperty("java.io.tmpdir"));
                req.raw().setAttribute("org.eclipse.jetty.multipartConfig", multipartConfigElement);
                Part part = req.raw().getPart("nortFile");
                cfg = new Config();
                if (part != null) {
                    Path temp = Files.createTempFile("nortantis-upload-", ".nort");
                    try (InputStream is = part.getInputStream()) {
                        Files.copy(is, temp, StandardCopyOption.REPLACE_EXISTING);
                    }
                    cfg.nortFile = temp.toAbsolutePath().toString();
                }
                // read other form fields if present
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
            } else {
                cfg = gson.fromJson(req.body(), Config.class);
            }
        } catch (JsonSyntaxException e) {
            res.status(400);
            return gson.toJson(new ApiResponse(false, "Invalid JSON: " + e.getMessage(), null, null));
        }
        catch (Exception e) {
            res.status(400);
            return gson.toJson(new ApiResponse(false, "Invalid request: " + e.getMessage(), null, null));
        }

        if (cfg == null) {
            cfg = new Config();
        }

        // Initialize AWT platform for headless generation
        PlatformFactory.setInstance(new AwtFactory());

        MapSettings settings;
        Path tempNortPath = null;
        boolean providedNortContent = cfg.nortContent != null && !cfg.nortContent.isEmpty();
        try {
            if (providedNortContent) {
                tempNortPath = Files.createTempFile("nortantis-", ".nort");
                Files.write(tempNortPath, cfg.nortContent.getBytes(StandardCharsets.UTF_8), StandardOpenOption.TRUNCATE_EXISTING);
                settings = new MapSettings(tempNortPath.toAbsolutePath().toString());
            } else if (cfg.nortFile != null && !cfg.nortFile.isEmpty()) {
                settings = new MapSettings(cfg.nortFile);
            } else {
                settings = SettingsGenerator.generate(null);
            }
        } catch (IOException ex) {
            res.status(400);
            return gson.toJson(new ApiResponse(false, "Invalid nort content: " + ex.getMessage(), null, null));
        }

        if (cfg.seed != null) {
            settings.randomSeed = cfg.seed;
        }

        Dimension dims = null;
        if (cfg.width != null || cfg.height != null) {
            int w = (cfg.width != null) ? cfg.width : (settings.generatedWidth > 0 ? settings.generatedWidth : 2000);
            int h = (cfg.height != null) ? cfg.height : (settings.generatedHeight > 0 ? settings.generatedHeight : 1200);
            dims = new Dimension(w, h);
        }

        MapCreator creator = new MapCreator();
        Image img = null;
        try {
            img = creator.createMap(settings, dims, null);
        } catch (CancelledException e) {
            res.status(500);
            return gson.toJson(new ApiResponse(false, "Map generation cancelled", null, null));
        } catch (Exception e) {
            res.status(500);
            return gson.toJson(new ApiResponse(false, "Error: " + e.getMessage(), null, null));
        }

        String outPath = cfg.out;
        if (outPath == null || outPath.isEmpty()) {
            try {
                File tmp = File.createTempFile("nortantis-map-" + Instant.now().toEpochMilli(), ".png");
                outPath = tmp.getAbsolutePath();
            } catch (IOException e) {
                if (img != null) img.close();
                res.status(500);
                return gson.toJson(new ApiResponse(false, "Failed to create temp file: " + e.getMessage(), null, null));
            }
        }
        // If requested, return raw image bytes directly
        if (cfg.returnImageBytes != null && cfg.returnImageBytes) {
            try {
                // Use AWT unwrap to get BufferedImage and write to byte array
                BufferedImage buf = nortantis.platform.awt.AwtFactory.unwrap(img);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(buf, "png", baos);
                baos.flush();
                byte[] bytes = baos.toByteArray();
                baos.close();
                res.type("image/png");
                res.status(200);
                return bytes;
            } catch (Exception e) {
                res.status(500);
                return gson.toJson(new ApiResponse(false, "Failed to produce image bytes: " + e.getMessage(), null, null));
            } finally {
                if (img != null) img.close();
                // Clean up temp nort if we wrote one but didn't save it
                if (tempNortPath != null && !cfg.saveNort) {
                    try { Files.deleteIfExists(tempNortPath); } catch (Exception ignore) {}
                }
            }
        }

        try {
            img.write(outPath);
        } catch (Exception e) {
            res.status(500);
            return gson.toJson(new ApiResponse(false, "Failed to write image: " + e.getMessage(), null, null));
        } finally {
            if (img != null) img.close();
        }

        String nortSavedPath = null;
        try {
            if (cfg.saveNort != null && cfg.saveNort && providedNortContent) {
                String base = outPath;
                int dot = base.lastIndexOf('.');
                String nortPath = (dot > 0 ? base.substring(0, dot) : base) + ".nort";
                settings.writeToFile(nortPath);
                nortSavedPath = nortPath;
            }
        } catch (Exception e) {
            // Non-fatal: image was written. Return warning in response.
            res.status(200);
            return gson.toJson(new ApiResponse(true, "Image written but failed to save .nort: " + e.getMessage(), outPath, null));
        } finally {
            // Remove temporary nort file unless user requested save
            if (tempNortPath != null && !(cfg.saveNort != null && cfg.saveNort)) {
                try { Files.deleteIfExists(tempNortPath); } catch (Exception ignore) {}
            }
        }

        res.status(200);
        return gson.toJson(new ApiResponse(true, "OK", outPath, nortSavedPath));
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
