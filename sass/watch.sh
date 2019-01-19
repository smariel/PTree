#!/bin/sh

# ------------------------------------------------------------------------------
# PowerTree
# Copyright (c) 2016 Sylvain MARIEL
# MIT License
# ------------------------------------------------------------------------------

cd $(dirname $0)
sass --watch ./:../css --style compressed --no-source-map
#node-sass --watch ./ --output ../css --output-style compressed
