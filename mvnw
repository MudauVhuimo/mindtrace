#!/bin/sh
# Maven wrapper that delegates to the embedded Maven distribution
# (the original mvnw was corrupted during previous setup)

set -e

BASEDIR=$(cd "$(dirname "$0")" && pwd)
MAVEN_HOME="$BASEDIR/.mvn/apache-maven-3.9.5"

if [ ! -x "$MAVEN_HOME/bin/mvn" ]; then
  echo "Embedded Maven not found at $MAVEN_HOME" >&2
  exit 1
fi

exec "$MAVEN_HOME/bin/mvn" "$@"
