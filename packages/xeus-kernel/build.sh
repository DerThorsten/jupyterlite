#!/bin/bash

set -e


mkdir -p /src/src
cd /embuild/wasm
cp *.{js,wasm} /src/src

echo "============================================="
echo "Compiling wasm bindings done"
echo "============================================="