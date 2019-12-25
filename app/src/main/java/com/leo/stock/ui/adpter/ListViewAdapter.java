package com.leo.stock.ui.adpter;

/**
 * Created by Leo on 2019/12/23.
 */

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.HorizontalScrollView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.leo.stock.Bean.SinaStockBean;
import com.leo.stock.R;
import com.leo.stock.ui.StockMainActivity;
import com.leo.stock.ui.widget.CustomHScrollView;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by hbh on 2017/3/15.
 */

public class ListViewAdapter extends BaseAdapter {

    private List<SinaStockBean> mList = new ArrayList<>();
    private LayoutInflater mInflater;
    private RelativeLayout mHead;
    private StockMainActivity stockMainActivity;

    public ListViewAdapter(StockMainActivity stockMainActivity, List<SinaStockBean> list, RelativeLayout head) {
        this.stockMainActivity = stockMainActivity;
        this.mHead = head;
        this.mInflater = LayoutInflater.from(stockMainActivity);
        addData(list);
    }

    private void addData(List<SinaStockBean> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        mList.addAll(list);
    }

    public void updateData(List<SinaStockBean> list) {
        mList.clear();
        addData(list);
        notifyDataSetChanged();
    }

    @Override
    public int getCount() {
        if (mList == null || mList.size() == 0) {
            return 0;
        }
        return mList.size();
    }

    @Override
    public Object getItem(int i) {
        return mList.get(i);
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

        SinaStockBean sinaStockBean = mList.get(position);

        holder.tvName.setText(sinaStockBean.stockName);
        holder.tvName.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stockMainActivity.onItemClick(position);
            }
        });
        holder.tvCurrentPrice.setText("" + sinaStockBean.todayCurrentPrice);
        holder.tvPriceChange.setText("" + sinaStockBean.priceChange);
        holder.tvPriceChangePercent.setText("" + sinaStockBean.priceChangePercent);
        holder.tvOpenPrice.setText("" + sinaStockBean.todayOpenPrice);
        holder.tvLastClosePrice.setText("" + sinaStockBean.lastClosePrice);
        holder.tvTurnover.setText("" + sinaStockBean.turnover);

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

    ;

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
