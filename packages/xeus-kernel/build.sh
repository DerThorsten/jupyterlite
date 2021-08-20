#!/bin/bash

set -e


mkdir -p /src/src

cd /xeus-build
cd wasm

cp *.{js,wasm} /src/src


cd /xeus-lua-build
cp *.{js,wasm} /src/src

echo "============================================="
echo "Compiling wasm bindings done"
echo "============================================="