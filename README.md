#PTree
## Description
PTree aims to help building power supplies on electronics design.
A first window is dedicated to build the tree itself by adding sources and loads.
The second window lists all components with their consumption on each power supplies.
The third window is a graphical summary of all consumption on the design.

![screenshot](https://raw.githubusercontent.com/smariel/PTree/master/docs/screenshot.png)

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

Build and deploy using electron-packager:

    $ npm run build:xxx

Where "xxx" must be replaced by:

| xxx     | Platform                  |
| ------- | ------------------------- |
| mac     | macOS                     |
| mas     | macOS [Mac App Store](https://electron.atom.io/docs/tutorial/mac-app-store-submission-guide/)  |
| lin32   | Linux x86 32 bits         |
| lin64   | Linux x86 64 bits         |
| linArm7 | Linux ARMv7               |
| win32   | Windows 32 bits           |
| win64   | Windows 64 bits           |
| macos   | = mac + mas               |
| windows | = win32 + win64           |
| linux   | = lin32 + lin64 + linArm7 |
| all     | = macos + windows + linux |

Finally, a complete view of the objects imbrication can be found in /docs/synop.jpg
![synoptic](https://raw.githubusercontent.com/smariel/PTree/master/docs/synop.jpg)
