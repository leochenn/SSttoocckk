package com.leo.stock.ui;

/**
 * Created by Leo on 2019/12/23.
 */

import android.content.Context;
import android.content.Intent;
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

            CustomHScrollView scrollView = view.findViewById(R.id.h_scrollView);
            holder.scrollView = scrollView;

            CustomHScrollView headSrcrollView = mHead.findViewById(R.id.h_scrollView);
            headSrcrollView.AddOnScrollChangedListener(new OnScrollChangedListenerImp(scrollView));

            view.setTag(holder);
        } else {
            holder = (MyViewHolder) view.getTag();
        }

        final MonitorBean sinaStockBean = mData.get(position);

        if (TextUtils.isEmpty(sinaStockBean.name)) {
            holder.tvName.setText(sinaStockBean.code);
        } else {
            holder.tvName.setText(sinaStockBean.name);
        }
        holder.tvName.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(context, StockDetailActivity.class);
                intent.putExtra("code", sinaStockBean.code);
                context.startActivity(intent);
            }
        });
        holder.tvCurrentPrice.setText("" + sinaStockBean.currentPrice);
        holder.tvPriceChange.setText("" + sinaStockBean.getHL());
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
        TextView tvOpenPrice;
        TextView tvLastClosePrice;
        TextView tvTurnover;
        HorizontalScrollView scrollView;
    }
}
