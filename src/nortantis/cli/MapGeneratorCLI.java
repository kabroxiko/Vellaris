package nortantis.cli;

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.ListIterator;
import java.util.Map;
import java.util.function.Consumer;

import nortantis.CancelledException;
import nortantis.MapCreator;
import nortantis.MapSettings;
import nortantis.SettingsGenerator;
import nortantis.geom.Dimension;
import nortantis.platform.Image;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import nortantis.util.Logger;

/**
 * Small command-line utility to generate maps headless. Usage (after building jar): java -cp build/libs/Nortantis.jar
 * nortantis.cli.MapGeneratorCLI --random --out out.png --width 2000 --height 1200 java -cp build/libs/Nortantis.jar
 * nortantis.cli.MapGeneratorCLI --nort mymap.nort --out out.png
 */
public class MapGeneratorCLI
{
	public static void main(String[] args)
	{
		Config cfg = parseArgs(args);
		if (cfg.showHelp)
		{
			printHelpAndExit();
		}

		try
		{
			runGeneration(cfg);
			System.exit(0);
		}
		catch (Exception ex)
		{
			Logger.printError("Error generating map: " + ex.getMessage(), ex);
			System.exit(1);
		}
	}

	private static class Config
	{
		boolean showHelp;
		String nortFile;
		String outPath = "out.png";
		Integer width;
		Integer height;
		Long seed;
	}

	private static Config parseArgs(String[] args)
	{
		Config cfg = new Config();
		ListIterator<String> it = Arrays.asList(args).listIterator();

		Map<String, Consumer<ListIterator<String>>> handlers = new HashMap<>();
		handlers.put("--nort", it2 ->
		{
			if (it2.hasNext())
				cfg.nortFile = it2.next();
		});
		handlers.put("--out", it2 ->
		{
			if (it2.hasNext())
				cfg.outPath = it2.next();
		});
		handlers.put("--width", it2 ->
		{
			if (it2.hasNext())
				cfg.width = Integer.parseInt(it2.next());
		});
		handlers.put("--height", it2 ->
		{
			if (it2.hasNext())
				cfg.height = Integer.parseInt(it2.next());
		});
		handlers.put("--seed", it2 ->
		{
			if (it2.hasNext())
				cfg.seed = Long.parseLong(it2.next());
		});
		handlers.put("--help", it2 -> cfg.showHelp = true);
		handlers.put("-h", it2 -> cfg.showHelp = true);

		while (it.hasNext())
		{
			String a = it.next();
			Consumer<ListIterator<String>> handler = handlers.get(a);
			if (handler != null)
			{
				handler.accept(it);
			}
			// ignore unknown options and --random which is implicit
		}

		return cfg;
	}

	private static void runGeneration(Config cfg)
	{
		PlatformFactory.setInstance(new AwtFactory());

		MapSettings settings = (cfg.nortFile != null) ? loadSettings(cfg.nortFile) : generateSettings();

		if (cfg.seed != null)
		{
			settings.randomSeed = cfg.seed;
		}

		Dimension dims = computeDimensions(cfg, settings);

		Logger.println("Creating map (this may take a moment)...");
		Image img;
		try
		{
			img = createMapImage(settings, dims);
		}
		catch (CancelledException e)
		{
			Logger.println("Map creation cancelled.");
			return;
		}

		try
		{
			writeImageToFile(img, cfg.outPath);
		}
		finally
		{
			img.close();
		}

		Logger.println("Done.");
	}

	private static Image createMapImage(MapSettings settings, Dimension dims)
	{
		MapCreator creator = new MapCreator();
		return creator.createMap(settings, dims, null);
	}

	private static void writeImageToFile(Image img, String outPath)
	{
		File outFile = new File(outPath);
		Logger.println("Writing image to: " + outFile.getAbsolutePath());
		img.write(outFile.getAbsolutePath());
	}

	private static MapSettings loadSettings(String path)
	{
		Logger.println("Loading settings from: " + path);
		return new MapSettings(path);
	}

	private static MapSettings generateSettings()
	{
		Logger.println("Generating random settings...");
		return SettingsGenerator.generate(null);
	}

	private static Dimension computeDimensions(Config cfg, MapSettings settings)
	{
		if (cfg.width == null && cfg.height == null)
		{
			return null;
		}

		int w;
		if (cfg.width != null)
		{
			w = cfg.width;
		}
		else if (settings.generatedWidth > 0)
		{
			w = settings.generatedWidth;
		}
		else
		{
			w = 2000;
		}

		int h;
		if (cfg.height != null)
		{
			h = cfg.height;
		}
		else if (settings.generatedHeight > 0)
		{
			h = settings.generatedHeight;
		}
		else
		{
			h = 1200;
		}

		return new Dimension(w, h);
	}

	private static void printHelpAndExit()
	{
		Logger.println("MapGeneratorCLI - generate Nortantis maps from the command line\n");
		Logger.println("Options:");
		Logger.println("  --random                  Generate random settings (default if no --nort)");
		Logger.println("  --nort <file.nort>        Load settings from a .nort file");
		Logger.println("  --seed <n>                Override random seed");
		Logger.println("  --width <px> --height <px>  Optional output size hint");
		Logger.println("  --out <file.png>          Output path (default out.png)");
		System.exit(0);
	}
}
