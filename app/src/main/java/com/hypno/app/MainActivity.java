package com.hypno.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.Locale;

/**
 * 催眠APP —— 原生外壳
 * 职责：沉浸式全屏、震动反馈、屏幕常亮、返回键接管、刘海安全区注入
 * 界面全部由 assets/index.html (HTML + CSS + JS) 渲染
 */
public class MainActivity extends Activity {

    private static final String START_URL = "file:///android_asset/index.html";

    private WebView web;
    private Vibrator vibrator;
    private boolean immersiveMode = false;
    private int lastTop = -1, lastBottom = -1, lastLeft = -1, lastRight = -1;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0A0616"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setLongClickable(false);
        web.setHapticFeedbackEnabled(false);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient());

        setContentView(web);

        applyEdgeToEdge();

        web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int t, b, l, r;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Insets bars = insets.getInsets(
                            WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    t = bars.top; b = bars.bottom; l = bars.left; r = bars.right;
                } else {
                    t = insets.getSystemWindowInsetTop();
                    b = insets.getSystemWindowInsetBottom();
                    l = insets.getSystemWindowInsetLeft();
                    r = insets.getSystemWindowInsetRight();
                }
                pushSafeArea(t, b, l, r);
                return insets;
            }
        });

        web.loadUrl(START_URL);
    }

    /** 让内容延伸到状态栏 / 导航栏底下，由网页自己处理安全区 */
    private void applyEdgeToEdge() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    /** 把真实安全区尺寸注入网页 CSS 变量 */
    private void pushSafeArea(int t, int b, int l, int r) {
        if (web == null) return;
        if (t == lastTop && b == lastBottom && l == lastLeft && r == lastRight) return;
        lastTop = t; lastBottom = b; lastLeft = l; lastRight = r;

        final float d = getResources().getDisplayMetrics().density;
        final String css = String.format(Locale.US,
                "document.documentElement.style.setProperty('--st','%.1fpx');"
                        + "document.documentElement.style.setProperty('--sb','%.1fpx');"
                        + "document.documentElement.style.setProperty('--sl','%.1fpx');"
                        + "document.documentElement.style.setProperty('--sr','%.1fpx');",
                t / d, b / d, l / d, r / d);

        web.post(new Runnable() {
            @Override
            public void run() {
                try {
                    web.evaluateJavascript(css, null);
                } catch (Exception ignored) {
                }
            }
        });
    }

    /** 全屏沉浸：演出时隐藏状态栏与导航栏 */
    private void applyImmersive(boolean on) {
        immersiveMode = on;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c == null) return;
            if (on) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            } else {
                c.show(WindowInsets.Type.systemBars());
            }
        } else {
            View d = getWindow().getDecorView();
            int base = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
            d.setSystemUiVisibility(on
                    ? base | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    : base);
        }
        if (web != null) web.requestApplyInsets();
    }

    /* ---------------- 生命周期 ---------------- */

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (immersiveMode) applyImmersive(true);
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("Android");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /** 返回键：先交给网页处理，网页说没处理再退出 */
    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript(
                "window.__androidBack ? window.__androidBack() : false",
                new android.webkit.ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (!"true".equals(value)) {
                            applyImmersive(false);
                            finish();
                        }
                    }
                });
    }

    /* ---------------- 暴露给 JS 的接口 ---------------- */

    private class Bridge {

        @JavascriptInterface
        public void vibrate(final int ms) {
            if (vibrator == null || !vibrator.hasVibrator()) return;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(
                            Math.max(1, Math.min(ms, 200)), VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(Math.max(1, Math.min(ms, 200)));
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void setImmersive(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    applyImmersive(on);
                }
            });
        }

        @JavascriptInterface
        public void setKeepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (on) {
                        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                }
            });
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }

        @JavascriptInterface
        public String platform() {
            return "android";
        }
    }
}
