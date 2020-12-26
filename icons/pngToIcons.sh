#!/bin/sh
# convert .png to .icns (macOS) and .ico (Windows)
# xcode is needed to use iconutil for ICNS
# imagemagick is needed to use convert for ICO

# PTree App Icon for Mac
mkdir app.iconset
cp png/app/16x16.png     app.iconset/icon_16x16.png
cp png/app/32x32.png     app.iconset/icon_16x16@2x.png
cp png/app/32x32.png     app.iconset/icon_32x32.png
cp png/app/64x64.png     app.iconset/icon_32x32@2x.png
cp png/app/128x128.png   app.iconset/icon_128x128.png
cp png/app/256x256.png   app.iconset/icon_128x128@2x.png
cp png/app/256x256.png   app.iconset/icon_256x256.png
cp png/app/512x512.png   app.iconset/icon_256x256@2x.png
cp png/app/512x512.png   app.iconset/icon_512x512.png
cp png/app/1024x1024.png app.iconset/icon_512x512@2x.png
iconutil -c icns -o mac/app.icns app.iconset
rm -R app.iconset
cp mac/app.icns ../resources/app.icns


# PTree File Icon for Mac
mkdir file.iconset
cp png/file_mac/16x16.png     file.iconset/icon_16x16.png
cp png/file_mac/32x32.png     file.iconset/icon_16x16@2x.png
cp png/file_mac/32x32.png     file.iconset/icon_32x32.png
cp png/file_mac/64x64.png     file.iconset/icon_32x32@2x.png
cp png/file_mac/128x128.png   file.iconset/icon_128x128.png
cp png/file_mac/256x256.png   file.iconset/icon_128x128@2x.png
cp png/file_mac/256x256.png   file.iconset/icon_256x256.png
cp png/file_mac/512x512.png   file.iconset/icon_256x256@2x.png
cp png/file_mac/512x512.png   file.iconset/icon_512x512.png
cp png/file_mac/1024x1024.png file.iconset/icon_512x512@2x.png
iconutil -c icns -o mac/file.icns file.iconset
rm -R file.iconset
cp mac/file.icns ../resources/file.icns



# PTree App Icon for Windows
convert  png/app/16x16.png \
         png/app/32x32.png \
         png/app/48x48.png \
         png/app/64x64.png \
         png/app/96x96.png \
         png/app/128x128.png \
         png/app/256x256.png \
         win/app.ico
cp win/app.ico ../resources/app.ico


# PTree File Windows
convert  png/file_win/16x16.png \
         png/file_win/32x32.png \
         png/file_win/48x48.png \
         png/file_win/256x256.png \
         win/file.ico
cp win/file.ico ../resources/file.ico


# PTree App Icon for Linux
cp -R png ../resources/app_png
