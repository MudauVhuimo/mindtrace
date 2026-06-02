#!/bin/sh
# Maven wrapper (bootstrapping version)
# If the embedded Maven dist is missing, it downloads it automatically.
# This fixes "Embedded Maven not found" after git clone (dist is gitignored to keep repo small).

set -e

BASEDIR=$(cd "$(dirname "$0")" && pwd)
MAVEN_VERSION=3.9.5
MAVEN_HOME="$BASEDIR/.mvn/apache-maven-${MAVEN_VERSION}"

if [ ! -x "$MAVEN_HOME/bin/mvn" ]; then
  echo "Embedded Maven not found at $MAVEN_HOME — downloading..." >&2
  mkdir -p "$BASEDIR/.mvn"
  MAVEN_URL="https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz"
  curl -fsSL "$MAVEN_URL" | tar -xz -C "$BASEDIR/.mvn/"
  if [ ! -x "$MAVEN_HOME/bin/mvn" ]; then
    echo "Failed to bootstrap Maven" >&2
    exit 1
  fi
  echo "Maven ${MAVEN_VERSION} installed to $MAVEN_HOME" >&2
fi

exec "$MAVEN_HOME/bin/mvn" "$@"
