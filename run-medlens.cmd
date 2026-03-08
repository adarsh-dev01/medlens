@echo off
cd /d C:\Users\adars\Documents\git\medlens
start "MedLens" /min "C:\Program Files\nodejs\node.exe" .\node_modules\next\dist\bin\next start -p 3001
exit /b 0
