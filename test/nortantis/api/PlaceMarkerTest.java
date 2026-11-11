package nortantis.api;

import nortantis.LineBreak;
import nortantis.MapSettings;
import nortantis.MapText;
import nortantis.TextType;
import nortantis.editor.FreeIcon;
import nortantis.geom.Point;
import nortantis.platform.PlatformFactory;
import nortantis.platform.awt.AwtFactory;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlaceMarkerTest
{
	/** A settings object that already carries place names, which is what makes it a generated world. */
	private static MapSettings worldWithPlaces()
	{
		// MapSettings and its colours resolve through the platform, so it must exist before the class initializes.
		PlatformFactory.setInstance(new AwtFactory());
		MapSettings settings = new MapSettings();
		settings.resolution = 1.0;
		settings.generatedWidth = 1000;
		settings.generatedHeight = 500;
		settings.edits.text.clear();
		settings.edits.text.add(new MapText("Azureenci", new Point(10, 20), 0.0, TextType.City, LineBreak.Auto, null, null, 0.0, 0, null, MapText.defaultBackgroundFade));
		return settings;
	}

	@Test
	void addsALandmarkWithItsMarker()
	{
		MapSettings settings = worldWithPlaces();

		List<String> added = PlaceMarker.add(settings, List.of(new PlaceMarker.Mark("Cave of the Red Dragon", 300, 200)));

		assertEquals(List.of("Cave of the Red Dragon"), added);
		assertEquals(2, settings.edits.text.size());

		MapText landmark = settings.edits.text.get(1);
		assertEquals("Cave of the Red Dragon", landmark.value);
		assertEquals(TextType.Landmark, landmark.type);
		assertEquals(300, landmark.location.x, 0.001);
		assertEquals(200, landmark.location.y, 0.001);

		List<FreeIcon> icons = new ArrayList<>();
		for (FreeIcon icon : settings.edits.freeIcons)
		{
			icons.add(icon);
		}
		assertEquals(1, icons.size());
		assertEquals(PlaceMarker.MARKER_ICON, icons.get(0).iconName);
		// The marker floats above the label rather than sitting on the name.
		assertEquals(300, icons.get(0).locationResolutionInvariant.x, 0.001);
		assertEquals(200 - PlaceMarker.MARKER_RISE, icons.get(0).locationResolutionInvariant.y, 0.001);

		// A world that now describes its icons must not have them regenerated over the top of it.
		assertTrue(settings.edits.hasIconEdits);
	}

	@Test
	void aNameAlreadyOnTheMapIsNotAddedTwice()
	{
		MapSettings settings = worldWithPlaces();

		List<String> added = PlaceMarker.add(settings, List.of(new PlaceMarker.Mark("azureenci", 50, 60)));

		assertTrue(added.isEmpty());
		assertEquals(1, settings.edits.text.size());
		assertFalse(settings.edits.hasIconEdits);
	}

	@Test
	void blankAndOverlongNamesAreSkipped()
	{
		MapSettings settings = worldWithPlaces();

		List<String> added = PlaceMarker.add(settings, List.of(new PlaceMarker.Mark("   ", 10, 10), new PlaceMarker.Mark("x".repeat(PlaceMarker.MAX_PLACE_NAME_LENGTH + 1), 10, 10)));

		assertTrue(added.isEmpty());
		assertEquals(1, settings.edits.text.size());
	}

	@Test
	void coordinatesOutsideTheMapAreRefused()
	{
		MapSettings settings = worldWithPlaces();

		String problem = PlaceMarker.positionProblem(settings, List.of(new PlaceMarker.Mark("Beyond the Edge", 1200, 100)));

		assertTrue(problem.contains("outside the map"), problem);
		assertTrue(problem.contains("1000.0"), problem);
	}

	@Test
	void coordinatesInsideTheMapAreAccepted()
	{
		MapSettings settings = worldWithPlaces();

		assertEquals("", PlaceMarker.positionProblem(settings, List.of(new PlaceMarker.Mark("Inland Cave", 999, 499))));
	}

	@Test
	void settingsWithNoPlaceNamesCannotBeMarkedOn()
	{
		PlatformFactory.setInstance(new AwtFactory());
		MapSettings settings = new MapSettings();
		settings.edits.text.clear();

		String problem = PlaceMarker.positionProblem(settings, List.of(new PlaceMarker.Mark("Somewhere", 10, 10)));

		assertTrue(problem.contains("no generated world"), problem);
	}
}
