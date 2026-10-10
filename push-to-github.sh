#!/usr/bin/env bash
# 把本工程推送到 GitHub
#
# 用法:
#   GITHUB_TOKEN=ghp_xxx ./push-to-github.sh <用户名> <仓库名> [public|private]
#
# 例:
#   GITHUB_TOKEN=ghp_xxx ./push-to-github.sh myname hypno-app private
#
# Token 需要 repo 权限。申请: https://github.com/settings/tokens

set -e
cd "$(dirname "$0")"

USER_NAME="${1:?用法: GITHUB_TOKEN=xxx ./push-to-github.sh <用户名> <仓库名> [public|private]}"
REPO="${2:?请指定仓库名}"
VIS="${3:-private}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "错误: 未设置 GITHUB_TOKEN 环境变量" >&2
  exit 1
fi

# ---------- 代理自动探测 ----------
PROXY=""
for p in 7890 7897 10809 1080; do
  if (echo > /dev/tcp/127.0.0.1/$p) >/dev/null 2>&1; then
    PROXY="http://127.0.0.1:$p"; break
  fi
done
if [ -n "$PROXY" ]; then
  echo "检测到代理 $PROXY，将为本次 git 操作启用"
  git config --local http.proxy "$PROXY"
  git config --local https.proxy "$PROXY"
fi
export https_proxy="$PROXY" http_proxy="$PROXY"

# ---------- 1. 创建远端仓库 ----------
echo "创建仓库 $USER_NAME/$REPO ($VIS) ..."
RESP=$(curl -sS -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"private\":$([ "$VIS" = "public" ] && echo false || echo true),\"description\":\"催眠APP - 漫画风格的催眠模拟器视觉演出小玩具\"}")

if echo "$RESP" | grep -q '"full_name"'; then
  echo "  创建成功"
elif echo "$RESP" | grep -q "already exists"; then
  echo "  仓库已存在，直接推送"
else
  echo "  创建失败:"; echo "$RESP" | head -20; exit 1
fi

# ---------- 2. 推送 ----------
git branch -M main 2>/dev/null || true
git remote remove origin 2>/dev/null || true
git remote add origin "https://$USER_NAME:$GITHUB_TOKEN@github.com/$USER_NAME/$REPO.git"

echo "推送中（约 11MB，视网络可能需要一两分钟）..."
git push -u origin main --quiet

# 去掉 URL 里的 token，避免明文留在 .git/config
git remote set-url origin "https://github.com/$USER_NAME/$REPO.git"

echo
echo "完成"
echo "  仓库: https://github.com/$USER_NAME/$REPO"
echo "  下载: https://github.com/$USER_NAME/$REPO/raw/main/dist/HypnoApp-v1.0.apk"
