package com.leo.stock.ui;

/**
 * Created by Leo on 2019/12/23.
 */

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.HorizontalScrollView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.leo.stock.R;
import com.leo.stock.library.util.LogUtil;
import com.leo.stock.module.monitor.MonitorBean;
import com.leo.stock.module.monitor.MonitorBeans;
import com.leo.stock.module.monitor.StockMonitorMgr;
import com.leo.stock.ui.widget.CustomHScrollView;
import com.leo.stock.ui.widget.InterceptScrollLinearLayout;

import java.util.ArrayList;
import java.util.List;

public class StockIdAdapter extends BaseAdapter {

    private Context context;
    private LayoutInflater mInflater;
    private RelativeLayout mHead;
    List<MonitorBean> mData;

    public StockIdAdapter(Context context, RelativeLayout head) {
        this.context = context;
        this.mHead = head;
        this.mInflater = LayoutInflater.from(context);
        mData = new ArrayList<>();
    }

    public boolean isDataEmpty() {
        return mData.isEmpty();
    }

    public void updateData(List<MonitorBean> list) {
        mData.clear();
        mData.addAll(list);
    }

    @Override
    public int getCount() {
        return mData.size();
    }

    @Override
    public Object getItem(int i) {
        return mData.get(i);
    }

    @Override
    public long getItemId(int i) {
        return i;
    }

    @Override
    public View getView(final int position, View view, ViewGroup group) {
        MyViewHolder holder = null;
        if (view == null) {
            holder = new MyViewHolder();

            view = mInflater.inflate(R.layout.list_item, group, false);

            InterceptScrollLinearLayout interceptScrollLinearLayout = view.findViewById(R.id.intercept_sl);
            interceptScrollLinearLayout.setIntercept(true);

            holder.tvName = view.findViewById(R.id.tv_name);
            holder.tvCurrentPrice = view.findViewById(R.id.tv_currentPrice);
            holder.tvPriceChange = view.findViewById(R.id.tv_priceChange);
            holder.tvPriceChangePercent = view.findViewById(R.id.tv_priceChangePercent);
            holder.tvOpenPrice = view.findViewById(R.id.tv_openPrice);
            holder.tvLastClosePrice = view.findViewById(R.id.tv_lastClosePrice);
            holder.tvTurnover = view.findViewById(R.id.tv_turnover);
            holder.tvProfitLoss = view.findViewById(R.id.tv_profitloss);

            CustomHScrollView scrollView = view.findViewById(R.id.h_scrollView);
            holder.scrollView = scrollView;

            CustomHScrollView headSrcrollView = mHead.findViewById(R.id.h_scrollView);
            headSrcrollView.AddOnScrollChangedListener(new OnScrollChangedListenerImp(scrollView));

            view.setTag(holder);
        } else {
            holder = (MyViewHolder) view.getTag();
        }

        final MonitorBean sinaStockBean = mData.get(position);

        String textValue = holder.tvName.getText().toString();
        String nameValue = sinaStockBean.getName();

        boolean same = false;

        if (TextUtils.isEmpty(nameValue)) {
            holder.tvName.setText(sinaStockBean.code);
        } else {
            if (nameValue.equals(textValue)) {
                same = true;
            } else {
                same = false;
            }
            holder.tvName.setText(nameValue);
        }
        holder.tvName.setOnLongClickListener(new View.OnLongClickListener() {

            @Override
            public boolean onLongClick(View v) {
                Intent intent = new Intent(context, StockDetailActivity.class);
                intent.putExtra("code", sinaStockBean.code);
                context.startActivity(intent);
                return true;
            }
        });
        holder.tvName.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String url = sinaStockBean.getEastMoneyUrl();
                Intent intent = new Intent(context, WebActivity.class);
                intent.putExtra("url", url);
                context.startActivity(intent);
            }
        });

        holder.tvName.setTextColor(Color.parseColor("#000000"));

        float value = sinaStockBean.getHL();
        if (value > 0) {
            holder.tvCurrentPrice.setTextColor(Color.parseColor("#F22323"));
            holder.tvPriceChange.setTextColor(Color.parseColor("#F22323"));
            holder.tvPriceChangePercent.setTextColor(Color.parseColor("#F22323"));
            holder.tvProfitLoss.setTextColor(Color.parseColor("#F22323"));
            if (sinaStockBean.isOwn()) {
                holder.tvName.setTextColor(Color.parseColor("#F22323"));
            }
        } else if (value < 0){
            holder.tvCurrentPrice.setTextColor(Color.parseColor("#039E00"));
            holder.tvPriceChange.setTextColor(Color.parseColor("#039E00"));
            holder.tvPriceChangePercent.setTextColor(Color.parseColor("#039E00"));
            holder.tvProfitLoss.setTextColor(Color.parseColor("#039E00"));
            if (sinaStockBean.isOwn()) {
                holder.tvName.setTextColor(Color.parseColor("#039E00"));
            }
        } else if (value == 0) {
            holder.tvCurrentPrice.setTextColor(Color.parseColor("#000000"));
            holder.tvPriceChange.setTextColor(Color.parseColor("#000000"));
            holder.tvPriceChangePercent.setTextColor(Color.parseColor("#000000"));
            holder.tvProfitLoss.setTextColor(Color.parseColor("#000000"));
            if (sinaStockBean.isOwn()) {
                holder.tvName.setTextColor(Color.parseColor("#000000"));
            }
        }

        view.setBackgroundColor(Color.parseColor("#ffffff"));

        String ddd = holder.tvPriceChange.getText().toString();
        if (!"涨跌数".equals(ddd) && same) {
            float value2 = Float.parseFloat(ddd);
            if (value > value2) {
                view.setBackgroundColor(Color.parseColor("#30F22323"));
                final View tmpView = view;
                tmpView.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        tmpView.setBackgroundColor(Color.parseColor("#ffffff"));
                    }
                }, 1000);
            } else if (value < value2) {
                view.setBackgroundColor(Color.parseColor("#30039E00"));
                final View tmpView = view;
                tmpView.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        tmpView.setBackgroundColor(Color.parseColor("#ffffff"));
                    }
                }, 1000);
            }
        }

        if (sinaStockBean.isOwn()) {
            holder.tvProfitLoss.setText("" + sinaStockBean.getProfitLoss());
        } else {
            holder.tvProfitLoss.setText("");
        }

        holder.tvCurrentPrice.setText("" + sinaStockBean.currentPrice);
        holder.tvPriceChange.setText("" + value);
        holder.tvPriceChangePercent.setText("" + sinaStockBean.getHLSpace());
        holder.tvOpenPrice.setText("" + sinaStockBean.todayOpenPrice);
        holder.tvLastClosePrice.setText("" + sinaStockBean.yestodayPrice);
        holder.tvTurnover.setText(sinaStockBean.getTurnover());
        return view;
    }

    class OnScrollChangedListenerImp implements CustomHScrollView.OnScrollChangedListener {
        CustomHScrollView mScrollViewArg;

        public OnScrollChangedListenerImp(CustomHScrollView scrollViewar) {
            mScrollViewArg = scrollViewar;
        }

        @Override
        public void onScrollChanged(int l, int t, int oldl, int oldt) {
            mScrollViewArg.smoothScrollTo(l, t);
        }
    }

    class MyViewHolder {
        TextView tvName;
        TextView tvCurrentPrice;
        TextView tvPriceChange;
        TextView tvPriceChangePercent;
        TextView tvProfitLoss;
        TextView tvOpenPrice;
        TextView tvLastClosePrice;
        TextView tvTurnover;
        HorizontalScrollView scrollView;
    }
}
