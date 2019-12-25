package com.leo.stock.library.base;

import android.os.Handler;
import android.os.Looper;

/** 
* @author  ZengLei <p>
* @version 2017年5月26日 <p>
*/
public class UIHandler {
	private static Handler handler = new Handler(Looper.getMainLooper());
	
	public static void post(Runnable action) {
		handler.post(action);
	}
	
	public static void postDelay(Runnable action, long delayMillis) {
		handler.postDelayed(action, delayMillis);
	}

	public static void removeRunnable(Runnable action) {
		handler.removeCallbacks(action);
	}
}
