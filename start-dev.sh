#!/bin/bash

echo "========================================"
echo "  启动 Web 协同画板开发环境"
echo "========================================"
echo ""

echo "[1/3] 检查 MongoDB..."
if pgrep -x "mongod" > /dev/null; then
    echo "✓ MongoDB 已运行"
else
    echo "✗ MongoDB 未运行，正在启动..."
    if command -v brew &> /dev/null; then
        brew services start mongodb-community
    else
        sudo systemctl start mongod
    fi
fi

echo ""
echo "[2/3] 启动后端服务器..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

echo ""
echo "[3/3] 启动前端开发服务器..."
sleep 3
cd web
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "  ✓ 开发环境启动完成！"
echo "========================================"
echo ""
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3000"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
