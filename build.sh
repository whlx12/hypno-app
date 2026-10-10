#!/usr/bin/env bash
# 构建 Release APK
#
# 依赖：
#   JDK 17          —— 设置 JAVA_HOME，或让 java 在 PATH 里
#   Android SDK     —— 设置 ANDROID_HOME / ANDROID_SDK_ROOT
#
# 用法： ./build.sh  [额外的 gradle 参数]

set -e
cd "$(dirname "$0")"

# ---------- 检查 JAVA_HOME ----------
if [ -z "$JAVA_HOME" ]; then
  if command -v java > /dev/null 2>&1; then
    echo "JAVA_HOME 未设置，使用 PATH 里的 java"
  else
    echo "错误：找不到 JDK。请设置 JAVA_HOME 指向 JDK 17。" >&2
    exit 1
  fi
fi

# ---------- 检查 Android SDK ----------
SDK="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
if [ -z "$SDK" ]; then
  if [ -f local.properties ]; then
    echo "使用 local.properties 里的 sdk.dir"
  else
    echo "错误：找不到 Android SDK。请设置 ANDROID_HOME，或创建 local.properties。" >&2
    exit 1
  fi
fi
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"

# ---------- 选择 gradle ----------
if [ -f ./gradlew ]; then
  GRADLE=./gradlew
elif command -v gradle > /dev/null 2>&1; then
  GRADLE=gradle
else
  echo "错误：找不到 gradle。请在项目根目录放一份 gradle wrapper。" >&2
  exit 1
fi

echo "JAVA_HOME = ${JAVA_HOME:-<PATH>}"
echo "ANDROID_HOME = $ANDROID_HOME"
echo "gradle = $GRADLE"
echo

"$GRADLE" assembleRelease "$@"

APK=app/build/outputs/apk/release/app-release.apk
echo
echo "构建完成 -> $PWD/$APK"
ls -la "$APK" 2>/dev/null || true
