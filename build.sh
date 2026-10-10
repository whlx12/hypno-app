#!/usr/bin/env bash
# 一键重新打包 APK
set -e
export JAVA_HOME=/c/tmp/taclink-apk-tools/jdk/jdk-17.0.19+10
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=/c/tmp/taclink-apk-tools/android-sdk
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_USER_HOME=/c/Users/17719/.gradle

cd "$(dirname "$0")"
/c/tmp/taclink-apk-tools/gradle/gradle-8.14.3/bin/gradle.bat assembleRelease "$@"

APK=app/build/outputs/apk/release/app-release.apk
echo
echo "构建完成 -> $PWD/$APK"
ls -la "$APK"
