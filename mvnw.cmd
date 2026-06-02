@echo off
setlocal
set BASEDIR=%~dp0
set MAVEN_HOME=%BASEDIR%.mvn\apache-maven-3.9.5
if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  echo Embedded Maven not found
  exit /b 1
)
"%MAVEN_HOME%\bin\mvn.cmd" %*
