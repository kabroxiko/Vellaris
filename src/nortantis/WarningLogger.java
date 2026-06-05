package nortantis;

import java.util.List;

public interface WarningLogger
{
	void addWarningMessage(String message);

	List<String> getWarningMessages();
}
