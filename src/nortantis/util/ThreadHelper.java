package nortantis.util;

import nortantis.platform.ImageHelper;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.function.Consumer;

public class ThreadHelper
{
	private static ThreadHelper instance;
	private ExecutorService cachedThreadPool;
	private ExecutorService fixedThreadPool;
	private final int threadCount;

	/**
	 * Marks threads that belong to {@link #fixedThreadPool}. A job running on that pool must never block waiting for the same pool, so
	 * nested calls run their jobs serially on the current thread instead.
	 */
	private static final ThreadLocal<Boolean> insideFixedThreadPoolWorker = ThreadLocal.withInitial(() -> false);

	private ThreadHelper()
	{
		threadCount = Runtime.getRuntime().availableProcessors();
		cachedThreadPool = Executors.newCachedThreadPool();
	}

	public static synchronized ThreadHelper getInstance()
	{
		if (instance == null)
		{
			instance = new ThreadHelper();
		}
		return instance;
	}

	/**
	 * The pool is created once and reused for every call. Creating a fixed pool per call meant starting and stopping a thread per core for
	 * every image operation, which cost far more than the work being parallelized.
	 */
	private synchronized ExecutorService getFixedThreadPool()
	{
		if (fixedThreadPool == null)
		{
			fixedThreadPool = Executors.newFixedThreadPool(threadCount, runnable ->
			{
				Thread thread = new Thread(() ->
				{
					insideFixedThreadPoolWorker.set(true);
					runnable.run();
				});
				thread.setDaemon(true);
				return thread;
			});
		}
		return fixedThreadPool;
	}

	/**
	 * Processes a list of jobs in parallel using a shared thread pool.
	 * 
	 * @param jobs
	 * @param useFixedThreadPool
	 *            Whether to use the thread pool with a limited number of threads vs the one that grows as needed. Calls made from inside a
	 *            job that is already running on the fixed pool run serially, because waiting on that pool from one of its own workers would
	 *            deadlock.
	 */
	public void processInParallel(List<Runnable> jobs, boolean useFixedThreadPool)
	{
		if (jobs.size() <= 1 || (useFixedThreadPool && insideFixedThreadPoolWorker.get()))
		{
			processSerial(jobs);
			return;
		}

		ExecutorService threadPool = useFixedThreadPool ? getFixedThreadPool() : cachedThreadPool;
		List<Future<?>> futures = new ArrayList<Future<?>>(jobs.size());

		for (Runnable job : jobs)
		{
			futures.add(threadPool.submit(job));
		}

		for (Future<?> future : futures)
		{
			try
			{
				future.get();
			}
			catch (ExecutionException e)
			{
				throw new RuntimeException(e);
			}
			catch (InterruptedException e)
			{
				throw new RuntimeException(e);
			}
		}
	}

	/**
	 * Processes a list of jobs in the current thread.
	 */
	public void processSerial(List<Runnable> jobs)
	{
		for (Runnable job : jobs)
		{
			job.run();
		}
	}

	/**
	 * Processes a list of jobs in parallel that return results. Calls made from inside a job that is already running on the fixed pool run
	 * serially for the same reason as in processInParallel.
	 * 
	 * @param <T>
	 *            Result type
	 * @param jobs
	 * @param useFixedThreadPool
	 *            Whether to use the thread pool with a limited number of threads vs the one that grows as needed.
	 * @return
	 */
	public <T> List<T> processInParallelAndGetResult(List<Callable<T>> jobs, boolean useFixedThreadPool)
	{
		List<T> results = new ArrayList<>();

		if (jobs.size() <= 1 || (useFixedThreadPool && insideFixedThreadPoolWorker.get()))
		{
			for (Callable<T> job : jobs)
			{
				try
				{
					results.add(job.call());
				}
				catch (Exception e)
				{
					throw new RuntimeException(e);
				}
			}
			return results;
		}

		ExecutorService threadPool = useFixedThreadPool ? getFixedThreadPool() : cachedThreadPool;
		List<Future<T>> futures = new ArrayList<>(jobs.size());

		for (Callable<T> job : jobs)
		{
			futures.add(threadPool.submit(job));
		}

		for (Future<T> future : futures)
		{
			try
			{
				results.add(future.get());
			}
			catch (ExecutionException e)
			{
				throw new RuntimeException(e);
			}
			catch (InterruptedException e)
			{
				throw new RuntimeException(e);
			}
		}

		return results;
	}

	/**
	 * Processes rows of data in parallel. Warning: Never submit a job that will submit more jobs using the methods in this class, as that
	 * can lead to a deadlock.
	 * 
	 * @param startRow
	 * @param numRows
	 * @param rowConsumer
	 */
	public void processRowsInParallel(int startRow, int numRows, Consumer<Integer> rowConsumer)
	{
		int numTasks = getThreadCount();
		List<Runnable> tasks = new ArrayList<>(numTasks);
		int rowsPerJob = numRows / numTasks;
		for (int taskNumber : new Range(numTasks))
		{
			tasks.add(() ->
			{
				int endY = taskNumber == numTasks - 1 ? startRow + numRows : startRow + (taskNumber + 1) * rowsPerJob;
				for (int y = startRow + taskNumber * rowsPerJob; y < endY; y++)
				{
					rowConsumer.accept(y);
				}
			});
		}

		if (numRows < ImageHelper.minParallelRowCount)
		{
			ThreadHelper.getInstance().processSerial(tasks);
		}
		else
		{
			ThreadHelper.getInstance().processInParallel(tasks, true);
		}
	}

	public <T> Future<T> submit(Callable<T> job)
	{
		return cachedThreadPool.submit(job);
	}

	public Future<?> submit(Runnable job)
	{
		return cachedThreadPool.submit(job);
	}

	public <T> T getResult(Future<T> task)
	{
		if (task == null)
		{
			return null;
		}
		try
		{
			return task.get();
		}
		catch (InterruptedException e)
		{
			throw new RuntimeException(e);
		}
		catch (ExecutionException e)
		{
			if (e.getCause() != null && e.getCause() instanceof RuntimeException)
			{
				throw (RuntimeException) e.getCause();
			}
			throw new RuntimeException(e);
		}
	}

	public void shutdown()
	{
		cachedThreadPool.shutdownNow();
	}

	public int getThreadCount()
	{
		return threadCount;
	}
}
