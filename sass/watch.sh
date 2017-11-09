#!/bin/sh

# ------------------------------------------------------------------------------
# PowerTree
# Copyright (c) 2016 Sylvain MARIEL
# MIT License
# ------------------------------------------------------------------------------

cd $(dirname $0)
sass --watch ./:../css --sourcemap=none --style compressed
