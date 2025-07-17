#!/bin/bash

# プロキシサーバー管理スクリプト
# 使用方法: ./scripts/proxy-server.sh {start|stop|restart|status|logs}

set -e

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROXY_DIR="$PROJECT_ROOT/channel-proxy-server"
PID_FILE="$PROJECT_ROOT/.proxy-server.pid"
LOG_FILE="$PROJECT_ROOT/logs/proxy-server.log"
ACCESS_LOG_FILE="$PROJECT_ROOT/logs/proxy-access.log"
ERROR_LOG_FILE="$PROJECT_ROOT/logs/proxy-error.log"
PORT=3000

# ログディレクトリを作成
mkdir -p "$PROJECT_ROOT/logs"

# 色付きメッセージ関数
print_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

print_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

print_info() {
    echo -e "\033[34mℹ️  $1\033[0m"
}

print_warning() {
    echo -e "\033[33m⚠️  $1\033[0m"
}

# PIDファイルからプロセスIDを取得
get_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    else
        echo ""
    fi
}

# プロセスが実行中かチェック
is_running() {
    local pid=$(get_pid)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# ポート3000を使用しているプロセスをすべて停止
kill_port_processes() {
    print_info "ポート$PORTを使用中のプロセスを確認中..."
    local pids=$(lsof -ti:$PORT 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        print_warning "ポート$PORTを使用中のプロセスを停止中: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 2
        
        # 再確認
        local remaining_pids=$(lsof -ti:$PORT 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            print_error "ポート$PORTの解放に失敗: $remaining_pids"
            return 1
        else
            print_success "ポート$PORTを解放しました"
        fi
    else
        print_info "ポート$PORTは使用されていません"
    fi
}

# プロキシサーバーを起動
start_server() {
    if is_running; then
        print_warning "プロキシサーバーは既に実行中です (PID: $(get_pid))"
        return 0
    fi
    
    print_info "プロキシサーバーを起動中..."
    
    # ポートをクリア
    kill_port_processes
    
    # ディレクトリ存在確認
    if [ ! -d "$PROXY_DIR" ]; then
        print_error "プロキシサーバーディレクトリが見つかりません: $PROXY_DIR"
        return 1
    fi
    
    # package.jsonの存在確認
    if [ ! -f "$PROXY_DIR/package.json" ]; then
        print_error "package.jsonが見つかりません: $PROXY_DIR/package.json"
        return 1
    fi
    
    # 環境変数設定
    export NODE_ENV=development
    export PROXY_AUTH_ENABLE=false  # テスト用に認証無効化
    
    # プロキシサーバーを起動（標準入力を適切にリダイレクト）
    cd "$PROXY_DIR"
    nohup npm run dev < /dev/null > "$LOG_FILE" 2> "$ERROR_LOG_FILE" &
    local pid=$!
    
    # PIDファイルに保存
    echo "$pid" > "$PID_FILE"
    
    # 起動確認（最大30秒待機）
    print_info "起動確認中（最大30秒）..."
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
            print_success "プロキシサーバーが正常に起動しました (PID: $pid, Port: $PORT)"
            print_info "ログファイル: $LOG_FILE"
            print_info "エラーログ: $ERROR_LOG_FILE"
            return 0
        fi
        
        # プロセスが終了していないかチェック
        if ! kill -0 "$pid" 2>/dev/null; then
            print_error "プロキシサーバーの起動に失敗しました（プロセス終了）"
            print_info "エラーログを確認してください: $ERROR_LOG_FILE"
            rm -f "$PID_FILE"
            return 1
        fi
        
        sleep 1
        attempts=$((attempts + 1))
        printf "."
    done
    
    echo ""
    print_error "プロキシサーバーの起動タイムアウト（30秒）"
    print_info "プロセスは実行中ですが、ヘルスチェックに応答しません"
    print_info "ログを確認してください: $LOG_FILE"
    return 1
}

# プロキシサーバーを停止
stop_server() {
    print_info "プロキシサーバーを停止中..."
    
    local pid=$(get_pid)
    local stopped=false
    
    if [ -n "$pid" ]; then
        if kill -0 "$pid" 2>/dev/null; then
            print_info "プロセス $pid を停止中..."
            
            # SIGTERM で優雅に停止を試行
            kill -TERM "$pid" 2>/dev/null || true
            sleep 3
            
            # まだ実行中なら SIGKILL で強制停止
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "強制停止中..."
                kill -KILL "$pid" 2>/dev/null || true
                sleep 2
            fi
            
            if ! kill -0 "$pid" 2>/dev/null; then
                print_success "プロセス $pid を停止しました"
                stopped=true
            fi
        else
            print_info "PIDファイルのプロセス $pid は既に終了しています"
            stopped=true
        fi
    else
        print_info "PIDファイルが見つかりません"
    fi
    
    # ポートを使用しているプロセスも確実に停止
    kill_port_processes
    
    # PIDファイルを削除
    rm -f "$PID_FILE"
    
    if [ "$stopped" = true ]; then
        print_success "プロキシサーバーを停止しました"
    else
        print_warning "プロキシサーバーの停止状況を確認してください"
    fi
}

# サーバーステータスを表示
show_status() {
    print_info "=== プロキシサーバー ステータス ==="
    
    if is_running; then
        local pid=$(get_pid)
        print_success "プロキシサーバーは実行中です (PID: $pid)"
        
        # ヘルスチェック
        if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
            print_success "ヘルスチェック: OK (Port: $PORT)"
        else
            print_warning "ヘルスチェック: FAIL (Port: $PORT)"
        fi
        
        # プロセス情報
        print_info "プロセス情報:"
        ps aux | grep -E "(npm|tsx|node)" | grep -v grep | grep "$pid" || print_warning "プロセス詳細が見つかりません"
        
    else
        print_error "プロキシサーバーは停止中です"
    fi
    
    # ポート使用状況
    local port_processes=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$port_processes" ]; then
        print_info "ポート$PORT使用中のプロセス: $port_processes"
    else
        print_info "ポート$PORTは空いています"
    fi
    
    # ログファイル情報
    print_info "ログファイル:"
    if [ -f "$LOG_FILE" ]; then
        print_info "  メインログ: $LOG_FILE ($(wc -l < "$LOG_FILE") lines)"
    fi
    if [ -f "$ERROR_LOG_FILE" ]; then
        print_info "  エラーログ: $ERROR_LOG_FILE ($(wc -l < "$ERROR_LOG_FILE") lines)"
    fi
}

# ログを表示
show_logs() {
    local lines=${2:-50}
    local log_type=${1:-all}
    
    case "$log_type" in
        "error")
            if [ -f "$ERROR_LOG_FILE" ]; then
                print_info "=== エラーログ (最新 $lines 行) ==="
                tail -n "$lines" "$ERROR_LOG_FILE"
            else
                print_warning "エラーログファイルが見つかりません: $ERROR_LOG_FILE"
            fi
            ;;
        "main")
            if [ -f "$LOG_FILE" ]; then
                print_info "=== メインログ (最新 $lines 行) ==="
                tail -n "$lines" "$LOG_FILE"
            else
                print_warning "メインログファイルが見つかりません: $LOG_FILE"
            fi
            ;;
        "all"|*)
            print_info "=== プロキシサーバー ログ (最新 $lines 行) ==="
            if [ -f "$LOG_FILE" ]; then
                tail -n "$lines" "$LOG_FILE"
            else
                print_warning "ログファイルが見つかりません: $LOG_FILE"
            fi
            
            if [ -f "$ERROR_LOG_FILE" ]; then
                echo ""
                print_info "=== エラーログ (最新 $lines 行) ==="
                tail -n "$lines" "$ERROR_LOG_FILE"
            fi
            ;;
    esac
}

# メイン処理
main() {
    case "${1:-}" in
        "start")
            start_server
            ;;
        "stop")
            stop_server
            ;;
        "restart")
            print_info "プロキシサーバーを再起動中..."
            stop_server
            sleep 2
            start_server
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "${2:-all}" "${3:-50}"
            ;;
        *)
            echo "使用方法: $0 {start|stop|restart|status|logs}"
            echo ""
            echo "コマンド:"
            echo "  start    - プロキシサーバーを起動"
            echo "  stop     - プロキシサーバーを停止"
            echo "  restart  - プロキシサーバーを再起動"
            echo "  status   - サーバーステータスを表示"
            echo "  logs     - ログを表示"
            echo ""
            echo "ログオプション:"
            echo "  logs all [行数]   - 全ログを表示 (デフォルト: 50行)"
            echo "  logs main [行数]  - メインログのみ表示"
            echo "  logs error [行数] - エラーログのみ表示"
            echo ""
            echo "例:"
            echo "  $0 start"
            echo "  $0 logs error 100"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@" 