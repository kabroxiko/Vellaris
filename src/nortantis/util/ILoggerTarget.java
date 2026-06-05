package nortantis.util;

public interface ILoggerTarget
{
	void appendLoggerMessage(String message);

	void clearLoggerMessages();

	boolean isReadyForLogging();
}
