package com.leo.stock.excel;

import android.text.TextUtils;

import com.leo.stock.App;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.StockId;

import org.apache.poi.hssf.usermodel.HSSFDateUtil;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellValue;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;

/**
 * Created by Leo on 2021/4/21.
 *
 */
public class ExcelTest {
    // https://blog.csdn.net/u013533369/article/details/105741178
    // https://github.com/andruhon/android5xlsx/blob/master/example/app/src/main/java/pro
    // /kondratev/xlsxpoiexample/MainActivity.java
    // https://blog.csdn.net/blueheart20/article/details/45028311

    int maxColumn, rowsCount;

    public ExcelTest() {
    }

    // 测试本地文件
    public void read() {
        try {
            // 可以支持 xls xlsx格式
            InputStream stream = App.getInstance().getApplicationContext().getAssets().open("1.xls");
            read(stream);
        } catch (Exception e) {
            LogUtil.e(e);
        }

        log("共有行数:" + rowsCount + ", 最大列数:" + maxColumn);
    }

    public List<StockId> read(InputStream stream) {
        List<StockId> list = new ArrayList<>();
        List<String> tmp = new ArrayList<>();
        try {
            Workbook workbook = WorkbookFactory.create(stream);
            Sheet sheet = workbook.getSheetAt(0);
            rowsCount = sheet.getPhysicalNumberOfRows();

            FormulaEvaluator formulaEvaluator = workbook.getCreationHelper().createFormulaEvaluator();

            int codeStartRow = -1;

            for (int r = 0; r < rowsCount; r++) {
                Row row = sheet.getRow(r);
                if (row != null) {
                    int cellsCount = row.getPhysicalNumberOfCells();
                    if (maxColumn < cellsCount) {
                        maxColumn = cellsCount;
                    }
                    StockId stockId = null;
                    for (int c = 0; c < cellsCount; c++) {
                        String value = getCellAsString(row, c, formulaEvaluator);
//                        String cellInfo = "row:" + r + "; cell:" + c + "; value:" + value;
//                        log(cellInfo);

                        if (codeStartRow != -1 && r > codeStartRow) {
                            if (stockId == null) {
                                if (TextUtils.isEmpty(value)) {
                                    break;
                                }
                                stockId = new StockId();
                            }
                            stockId.setValue(c, value);
                        }

                        if ("证券代码".equals(value)) {
                            codeStartRow = r;
                        }
                    }
                    if (stockId != null) {
                        log(stockId.toString());
                        if (!tmp.contains(stockId.stockCode)) {
                            list.add(stockId);
                            tmp.add(stockId.stockCode);
                        } else {
                            for (StockId id : list) {
                                if (id.stockCode.equals(stockId.stockCode)) {
                                    id.stockCount += stockId.stockCount;
                                    break;
                                }
                            }
                        }
                    } else {
                        String cellInfo = "row:" + r + "; 不为空，stockId null";
                        log(cellInfo);
                    }
                } else {
                    String cellInfo = "row:" + r + "; 空";
                    log(cellInfo);
                }
            }
        } catch (Exception e) {
            LogUtil.e(e);
        } finally {
            if (stream != null) {
                try {
                    stream.close();
                } catch (Exception e) {
                    LogUtil.e(e);
                }
            }
        }

        log("共有行数:" + rowsCount + ", 最大列数:" + maxColumn);

        return list;
    }


    private String getCellAsString(Row row, int c, FormulaEvaluator formulaEvaluator) {
        String value = "";
        try {
            Cell cell = row.getCell(c);
            CellValue cellValue = formulaEvaluator.evaluate(cell);
            if (cellValue == null) {
                return value;
            }

            int cellType = cellValue.getCellType();

            switch (cellType) {
                case Cell.CELL_TYPE_NUMERIC:
                    double numericValue = cellValue.getNumberValue();
                    if (HSSFDateUtil.isCellDateFormatted(cell)) {
                        double date = cellValue.getNumberValue();
                        SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yy");
                        value = formatter.format(HSSFDateUtil.getJavaDate(date));
                    } else {
                        value = "" + numericValue;
                    }
                    break;

                case Cell.CELL_TYPE_STRING:
                    value = "" + cellValue.getStringValue();
                    break;

                case Cell.CELL_TYPE_FORMULA:
                    value = "unexpected CELL_TYPE_FORMULA";
                    break;

                case Cell.CELL_TYPE_BLANK:
                    value = "unexpected CELL_TYPE_BLANK";
                    break;

                case Cell.CELL_TYPE_BOOLEAN:
                    value = "" + cellValue.getBooleanValue();
                    break;

                case Cell.CELL_TYPE_ERROR:
                    value = "error CELL_TYPE_ERROR";
                    break;

                default:
                    value = "unexpected " + cellType;
            }
        } catch (NullPointerException e) {
            log("error:" + e.toString());
        }
        return value;
    }

    private void log(String str) {
        if (TextUtils.isEmpty(str)) {
            LogUtil.d("");
        } else {
            LogUtil.d(str);
        }
    }

    // 读取失败
    private void read1() {
        try {
            InputStream stream = App.getInstance().getApplicationContext().getAssets().open("1.xls");
            XSSFWorkbook workbook = new XSSFWorkbook(stream);
            XSSFSheet sheet = workbook.getSheetAt(0);
            int rowsCount = sheet.getPhysicalNumberOfRows();
            FormulaEvaluator formulaEvaluator =
                    workbook.getCreationHelper().createFormulaEvaluator();
            for (int r = 0; r < rowsCount; r++) {
                Row row = sheet.getRow(r);
                int cellsCount = row.getPhysicalNumberOfCells();
                for (int c = 0; c < cellsCount; c++) {
                    String value = getCellAsString(row, c, formulaEvaluator);
                    String cellInfo = "r:" + r + "; c:" + c + "; v:" + value;
                    log(cellInfo);
                }
            }
        } catch (Exception e) {
            LogUtil.e(e);
        }
    }
}
