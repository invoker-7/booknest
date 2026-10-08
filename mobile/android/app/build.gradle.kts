plugins {
    id("com.android.application")
}

android {
    namespace = "app.vector.store"
    compileSdk = 37

    defaultConfig {
        applicationId = "app.vector.store"
        minSdk = 30
        targetSdk = 37
        versionCode = 2
        versionName = "1.1.0"
    }

    buildFeatures {
        buildConfig = true // ใช้ BuildConfig.VERSION_NAME ใน user agent
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// ไม่มี dependency ภายนอก: แอปใช้เฉพาะ WebView และ API ของ Android เอง
