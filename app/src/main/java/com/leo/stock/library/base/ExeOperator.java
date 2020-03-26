package com.leo.stock.library.base;

import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Created by ZengLei on 2016/10/15.
 */
public final class ExeOperator {
    private static ExecutorService EXECUTORS_INSTANCE;

    private static Executor getExecutor() {
        if (EXECUTORS_INSTANCE == null) {
            synchronized (ExeOperator.class) {
                if (EXECUTORS_INSTANCE == null) {
                	int availableCount = Runtime.getRuntime().availableProcessors();
                	int processorCount = availableCount > 3 ? availableCount : 3;
                    EXECUTORS_INSTANCE = Executors.newFixedThreadPool(processorCount);
                }
            }
        }
        return EXECUTORS_INSTANCE;
    }

    public static void runOnThread(Runnable action) {
        getExecutor().execute(action);
    }

    public static void runOnThreadDelay(Runnable action, long delay) {
        UIHandler.postDelay(action, delay);
    }
}
