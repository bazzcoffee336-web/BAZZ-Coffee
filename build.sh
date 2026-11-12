#!/bin/sh
# Builds the public website into ./site (only what visitors need, never internal notes).
set -e
rm -rf site && mkdir -p site
cp ./*.html site/
cp -r assets site/assets
cp _headers site/_headers
echo "Built $(ls site | wc -l) items into ./site"
