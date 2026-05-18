package nortantis.api;

import java.lang.reflect.Field;

/**
 * Test fixtures helper to install test-only MapCreator factories.
 * This class is compiled only into the test fixtures output and
 * used by tests to avoid adding any test hooks to production code.
 */
public class MapApiServerTestHooks
{
    public static void setMapCreatorFactory(java.util.function.Supplier<nortantis.MapCreator> factory)
    {
        try
        {
            Field f = MapApiServer.class.getDeclaredField("mapCreatorFactory");
            f.setAccessible(true);
            Object obj = f.get(null);
            if (obj instanceof java.util.concurrent.atomic.AtomicReference)
            {
                java.lang.reflect.Method setMethod = java.util.concurrent.atomic.AtomicReference.class.getMethod("set", Object.class);
                setMethod.invoke(obj, factory != null ? factory : (java.util.function.Supplier<nortantis.MapCreator>) nortantis.MapCreator::new);
            }
            else
            {
                java.util.concurrent.atomic.AtomicReference<java.util.function.Supplier<nortantis.MapCreator>> ref =
                        new java.util.concurrent.atomic.AtomicReference<>(factory != null ? factory : (java.util.function.Supplier<nortantis.MapCreator>) nortantis.MapCreator::new);
                f.set(null, ref);
            }
        }
        catch (ReflectiveOperationException e)
        {
            throw new RuntimeException("Failed to set mapCreatorFactory via reflection", e);
        }
    }

    public static void resetMapCreatorFactory()
    {
        try
        {
            Field f = MapApiServer.class.getDeclaredField("mapCreatorFactory");
            f.setAccessible(true);
            Object obj = f.get(null);
            if (obj instanceof java.util.concurrent.atomic.AtomicReference)
            {
                java.lang.reflect.Method setMethod = java.util.concurrent.atomic.AtomicReference.class.getMethod("set", Object.class);
                setMethod.invoke(obj, (java.util.function.Supplier<nortantis.MapCreator>) nortantis.MapCreator::new);
            }
            else
            {
                f.set(null, new java.util.concurrent.atomic.AtomicReference<>((java.util.function.Supplier<nortantis.MapCreator>) nortantis.MapCreator::new));
            }
        }
        catch (ReflectiveOperationException e)
        {
            throw new RuntimeException("Failed to reset mapCreatorFactory via reflection", e);
        }
    }

    public static AutoCloseable installFactory(java.util.function.Supplier<nortantis.MapCreator> factory)
    {
        setMapCreatorFactory(factory);
        return new AutoCloseable()
        {
            @Override
            public void close()
            {
                resetMapCreatorFactory();
            }
        };
    }
}
