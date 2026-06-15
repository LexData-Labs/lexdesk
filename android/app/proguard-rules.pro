# Keep TFLite native methods
-keep class org.tensorflow.lite.** { *; }
-keep class org.tensorflow.lite.support.** { *; }

# Keep kotlinx.serialization classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keep,includedescriptorclasses class com.attenddesk.**$$serializer { *; }
-keepclassmembers class com.attenddesk.** {
    *** Companion;
}
-keepclasseswithmembers class com.attenddesk.** {
    kotlinx.serialization.KSerializer serializer(...);
}
