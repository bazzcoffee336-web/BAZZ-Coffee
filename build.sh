#!/bin/sh
# Builds the public website into ./site (only what visitors need, never internal notes).
set -e
rm -rf site && mkdir -p site
cp ./*.html manifest.webmanifest robots.txt sitemap.xml site/
cp -r assets site/assets
cp _headers site/_headers
cp -r preview site/preview
echo "Built $(ls site | wc -l) items into ./site"
