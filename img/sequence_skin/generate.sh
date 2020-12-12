#!/bin/sh

# ------------------------------------------------------------------------------
# PowerTree
# Copyright (c) 2016 Sylvain MARIEL
# MIT License
# ------------------------------------------------------------------------------

cd $(dirname $0)
# wget -O svg2js.js https://github.com/wavedrom/wavedrom/raw/master/bin/svg2js.js
node svg2js.js -i sequence_skin.svg > sequence_skin.js
