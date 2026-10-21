package dev.homin.gasamari;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep the screen on while the lyrics display is in use.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        enterFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterFullscreen();
        }
    }

    /** Immersive fullscreen: system bars reappear only on swipe. */
    private void enterFullscreen() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                    | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            );
            return;
        }
        WindowInsetsController controller = getWindow().getInsetsController();
        if (controller != null) {
            controller.hide(WindowInsets.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    }
}
