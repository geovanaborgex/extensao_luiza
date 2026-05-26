@echo off
title Lembretes WhatsApp

:loop
C:\xamp\php\php.exe lembretewpp.php

timeout /t 15 >nul

goto loop