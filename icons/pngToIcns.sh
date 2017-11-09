#!/bin/sh

mkdir icon.iconset
cp png/16x16.png icon.iconset/icon_16x16.png
cp png/32x32.png icon.iconset/icon_16x16@2x.png
cp png/32x32.png icon.iconset/icon_32x32.png
cp png/64x64.png icon.iconset/icon_32x32@2x.png
cp png/128x128.png icon.iconset/icon_128x128.png
cp png/256x256.png icon.iconset/icon_128x128@2x.png
cp png/256x256.png icon.iconset/icon_256x256.png
cp png/512x512.png icon.iconset/icon_256x256@2x.png
cp png/512x512.png icon.iconset/icon_512x512.png
cp png/1024x1024.png icon.iconset/icon_512x512@2x.png
iconutil -c icns -o mac/icon.icns icon.iconset
rm -R icon.iconset
