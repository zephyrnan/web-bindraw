@echo off
echo ========================================
echo   启动 Web 协同画板开发环境
echo ========================================
echo.

echo [1/3] 检查 MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MongoDB 已运行
) else (
    echo ✗ MongoDB 未运行，请先启动 MongoDB
    echo   运行命令: mongod
    pause
    exit /b 1
)

echo.
echo [2/3] 启动后端服务器...
cd server
start "后端服务器" cmd /k "npm run dev"
cd ..

echo.
echo [3/3] 启动前端开发服务器...
timeout /t 3 /nobreak >nul
cd web
start "前端服务器" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo   ✓ 开发环境启动完成！
echo ========================================
echo.
echo   前端: http://localhost:5173
echo   后端: http://localhost:3000
echo.
echo   按任意键关闭此窗口...
pause >nul
