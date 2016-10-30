#PTree
## Description
PTree aims to help building power supplies on electronics design.
A first window is dedicated to build the tree itself by adding sources and loads.
The second window lists all components with their consumption on each power supplies.
The third window is a graphical summary of all consumption on the design.
##
## Basic commands
Simple installation using git and npm:

    $ git clone https://github.com/smariel/PTree
    $ cd PTree
    $ npm install

Start coding within Atom:

    $ ./start_dev.sh

Automatically build SASS on each save (in a dedicated shell):

    $ cd sass
    $ ./watch.sh

Run:

    $ npm start

Package and deploy:

    $ npm run pack:xxx

Where "xxx" must be replaced by:

 - osx (OS X .app)
 - mas (OS X Mac App Store)
 - lin32 (Linux 32 bits)
 - lin64 (Linux 64 bits)
 - win32 (Windows 32 bits)
 - win64 (Windows 64 bits)
