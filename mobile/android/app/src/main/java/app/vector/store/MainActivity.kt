package app.vector.store

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.WindowInsets
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import android.window.OnBackInvokedDispatcher

/**
 * VECTOR บน Android — หน้าจอเดียวที่เปิดเว็บร้านที่ deploy แล้วใน WebView (ไม่มีโค้ดร้านซ้ำอยู่ในแอป)
 * สิ่งที่แอปทำเพิ่มจากการเปิดเว็บเฉย ๆ: แนบไฟล์ (สลิปโอนเงิน), ดาวน์โหลดไฟล์สินค้า, ปุ่มย้อนกลับของเครื่อง,
 * หน้าแจ้งเมื่อไม่มีเน็ต และส่งลิงก์นอกร้านไปเบราว์เซอร์ของเครื่อง (ยกเว้นหน้าชำระเงินของ Stripe ซึ่งเปิดในแอป)
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var progress: ProgressBar

    /** WebView รอผลจากตัวเลือกไฟล์อยู่ — ต้องตอบกลับเสมอ ไม่เช่นนั้นปุ่มแนบไฟล์จะกดไม่ได้อีก */
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val storeUrl by lazy { getString(R.string.store_url).trimEnd('/') }
    private val storeHost by lazy { Uri.parse(storeUrl).host.orEmpty() }

    /**
     * กำลังอยู่ในขั้นตอนชำระเงินของ Stripe — เริ่มเมื่อเว็บพาไปหน้าชำระเงิน จบเมื่อกลับถึงเว็บร้าน
     * ระหว่างนี้ทุกหน้าเปิดในแอป เพราะ Stripe อาจพาไปหน้ายืนยันตัวตนของธนาคาร (3D Secure) ซึ่งอยู่คนละโดเมน
     */
    private var paying = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        web = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = false
            max = 100
            visibility = View.GONE
        }
        val root = FrameLayout(this).apply {
            setBackgroundColor(getColor(R.color.navy))
            addView(web, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
            addView(progress, FrameLayout.LayoutParams(MATCH_PARENT, dp(3), Gravity.TOP))
            // Android 15+ วาดแอปเต็มจอใต้แถบสถานะเสมอ: เว้นขอบให้พ้นแถบระบบและคีย์บอร์ดเอง
            setOnApplyWindowInsetsListener { view, insets ->
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                WindowInsets.CONSUMED
            }
        }
        setContentView(root)

        setUpWebView()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { goBack() }
        }

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) web.loadUrl(storeUrl)
    }

    @SuppressLint("SetJavaScriptEnabled") // เปิดเฉพาะเว็บร้านของเราเอง ลิงก์อื่นถูกส่งออกไปเบราว์เซอร์
    private fun setUpWebView() {
        web.setBackgroundColor(Color.TRANSPARENT)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // ตะกร้าและคลังของฉันเก็บใน localStorage
            // เว็บเปิดแท็บใหม่ตอนดาวน์โหลดและตอนดูสลิป — รับไว้ที่ onCreateWindow แล้วส่งต่อให้ถูกที่
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            userAgentString = "$userAgentString VectorApp/${BuildConfig.VERSION_NAME}"
        }
        CookieManager.getInstance().setAcceptCookie(true)

        web.setDownloadListener(downloads)
        web.webViewClient = StoreClient()
        web.webChromeClient = StoreChrome()
    }

    /* ---------- เส้นทางของลิงก์ ---------- */

    private fun isStore(uri: Uri) = uri.host == storeHost
    private fun isStorage(uri: Uri) = uri.host?.endsWith(".supabase.co") == true
    private fun isStripe(uri: Uri) = uri.scheme == "https" && (uri.host == "stripe.com" || uri.host?.endsWith(".stripe.com") == true)

    /**
     * true = แอปจัดการลิงก์นี้เองแล้ว (WebView ไม่ต้องโหลด)
     * ในแอปเปิดได้เฉพาะเว็บร้าน ไฟล์จาก Storage ของร้าน และขั้นตอนชำระเงินของ Stripe ที่เหลือส่งให้เบราว์เซอร์ของเครื่อง
     * หน้าชำระเงินต้องอยู่ในแอป: ถ้าส่งออกไปเบราว์เซอร์ ผู้ซื้อจะจ่ายเสร็จแล้วค้างอยู่นอกแอป
     */
    private fun handledOutside(uri: Uri): Boolean {
        if (uri.scheme == "file" || uri.scheme == "about") return false
        if (isStore(uri)) {
            paying = false
            if (uri.path?.startsWith("/api/auth/google") != true) return false
            explainGoogleSignIn()
            return true
        }
        if (isStorage(uri)) return false
        if (isStripe(uri)) paying = true
        if (paying && uri.scheme == "https") return false
        openOutside(uri)
        return true
    }

    private fun openOutside(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: ActivityNotFoundException) {
            toast(R.string.no_app)
        }
    }

    /** Google ปฏิเสธการเข้าสู่ระบบจาก WebView ที่ฝังในแอป — บอกผู้ใช้ตรง ๆ แทนที่จะปล่อยให้เจอหน้า error ของ Google */
    private fun explainGoogleSignIn() {
        AlertDialog.Builder(this)
            .setTitle(R.string.login_title)
            .setMessage(R.string.login_body)
            .setPositiveButton(R.string.login_open) { _, _ -> openOutside(Uri.parse("$storeUrl/login")) }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    /* ---------- ดาวน์โหลด ---------- */

    private val downloads = DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
        startDownload(url, userAgent, contentDisposition, mimeType)
    }

    /** ส่งงานให้ DownloadManager ของระบบ: ไฟล์ไปอยู่ในโฟลเดอร์ Downloads และมีแจ้งเตือนเมื่อเสร็จ */
    private fun startDownload(url: String, userAgent: String?, contentDisposition: String?, mimeType: String?) {
        try {
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                if (!mimeType.isNullOrBlank()) setMimeType(mimeType)
                CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
                userAgent?.let { addRequestHeader("User-Agent", it) }
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    URLUtil.guessFileName(url, contentDisposition, mimeType),
                )
            }
            getSystemService(DownloadManager::class.java).enqueue(request)
            toast(R.string.download_started)
        } catch (_: RuntimeException) {
            // เช่น DownloadManager ถูกปิดในเครื่อง: ให้เบราว์เซอร์ของเครื่องดาวน์โหลดแทน
            toast(R.string.download_failed)
            openOutside(Uri.parse(url))
        }
    }

    /* ---------- WebView callbacks ---------- */

    private inner class StoreClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            handledOutside(request.url)

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            // เฉพาะตัวหน้าเว็บเอง (ไม่ใช่รูปหรือสคริปต์ย่อย) และไม่ใช่หน้าแจ้งของแอปเอง
            if (!request.isForMainFrame || request.url.scheme == "file") return
            view.loadUrl("file:///android_asset/offline.html?to=${Uri.encode(request.url.toString())}")
        }
    }

    private inner class StoreChrome : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            progress.progress = newProgress
            progress.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
        }

        /** <input type="file"> ของเว็บ (แนบสลิป): เปิดตัวเลือกไฟล์ของระบบ */
        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean {
            fileCallback?.onReceiveValue(null)
            fileCallback = filePathCallback
            return try {
                @Suppress("DEPRECATION") // ไม่ใช้ AndroidX จึงไม่มี Activity Result API
                startActivityForResult(
                    Intent.createChooser(fileChooserParams.createIntent(), getString(R.string.choose_file)),
                    REQUEST_FILE,
                )
                true
            } catch (_: ActivityNotFoundException) {
                fileCallback = null
                false
            }
        }

        /**
         * เว็บขอเปิดแท็บใหม่ (window.open / target="_blank")
         * แอปมีหน้าจอเดียว: รับไว้ด้วย WebView ชั่วคราวเพื่อดูว่าปลายทางคืออะไร แล้วส่งต่อ —
         * ไฟล์จาก Storage ไปดาวน์โหลด, หน้าของร้านไปเปิดในหน้าจอหลัก, ที่เหลือไปเบราว์เซอร์ของเครื่อง
         */
        override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
            val popup = WebView(this@MainActivity)
            popup.setDownloadListener(downloads)
            popup.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(popupView: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    when {
                        isStorage(uri) -> startDownload(uri.toString(), web.settings.userAgentString, null, null)
                        !handledOutside(uri) -> web.loadUrl(uri.toString())
                    }
                    popupView.destroy()
                    return true
                }
            }
            (resultMsg.obj as WebView.WebViewTransport).webView = popup
            resultMsg.sendToTarget()
            return true
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_FILE) return
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
        fileCallback = null
    }

    /* ---------- ปุ่มย้อนกลับ / สถานะ ---------- */

    /** ย้อนหน้าเว็บก่อน ถ้าย้อนไม่ได้แล้วจึงปิดแอป */
    private fun goBack() {
        if (web.canGoBack()) web.goBack() else finish()
    }

    @Deprecated("Deprecated in Java") // Android 12 และเก่ากว่ายังเรียกทางนี้
    override fun onBackPressed() = goBack()

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        web.destroy()
        super.onDestroy()
    }

    private fun toast(message: Int) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private companion object {
        const val REQUEST_FILE = 1
    }
}
