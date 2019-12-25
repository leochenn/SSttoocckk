package com.leo.stock.library.base;

/**
 * @author ZengLei
 *         <p>
 * @version 2016年8月15日
 *          <p>
 */
public interface IRequestListener<Result> {
	void success(Result data);

	void failed(int code, String error);
}
