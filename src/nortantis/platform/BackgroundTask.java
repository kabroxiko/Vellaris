package nortantis.platform;

import nortantis.CancelledException;

import java.io.IOException;

public interface BackgroundTask<T>
{
	T doInBackground() throws IOException, CancelledException;

	void done(T result);
}
