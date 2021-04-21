package com.leo.stock.excel;

import android.app.Activity;
import android.text.TextUtils;

import com.leo.stock.library.util.LogUtil;

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

/**
 * Created by Leo on 2021/4/21.
 *
 */
public class ExcelTest {
    // https://blog.csdn.net/u013533369/article/details/105741178
    // https://github.com/andruhon/android5xlsx/blob/master/example/app/src/main/java/pro
    // /kondratev/xlsxpoiexample/MainActivity.java
    // https://blog.csdn.net/blueheart20/article/details/45028311

    Activity activity;

    public ExcelTest(Activity activity) {
        this.activity = activity;
    }

    public void read() {
        try {
            InputStream stream = activity.getAssets().open("1.xls");
            Workbook workbook = WorkbookFactory.create(stream);
            Sheet sheet = workbook.getSheetAt(0);
            int rowsCount = sheet.getPhysicalNumberOfRows();
            FormulaEvaluator formulaEvaluator = workbook.getCreationHelper().createFormulaEvaluator();
            for (int r = 0; r < rowsCount; r++) {
                Row row = sheet.getRow(r);
                int cellsCount = row.getPhysicalNumberOfCells();
                for (int c = 0; c < cellsCount; c++) {
                    String value = getCellAsString(row, c, formulaEvaluator);
                    String cellInfo = "row:" + r + "; cell:" + c + "; value:" + value;
                    log(cellInfo);
                }
            }
        } catch (Exception e) {
            LogUtil.e(e);
        }
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
            LogUtil.d("null");
        } else {
            LogUtil.d(str);
        }
    }

    // 读取失败
    private void read1() {
        try {
            InputStream stream = activity.getAssets().open("1.xls");
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
