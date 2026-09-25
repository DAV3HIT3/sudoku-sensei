# Simple Coloring

Pick a digit and find its conjugate pairs: units where it has exactly two possible cells. In each pair exactly one cell holds the digit. Where pairs share a cell they form a chain, and along a chain the truth alternates: if one cell holds the digit, its partner does not, and the next one does.

Colour the chain in two colours, alternating at every link. Every cell of one colour holds the digit, and no cell of the other does. You don't know yet which colour is which, but two rules often tell you enough.

Color wrap: if two cells of the same colour see each other, that colour cannot be the one holding the digit, since a unit can't hold it twice. Remove the digit from every cell of that colour.

Color trap: a cell outside the chain that sees a cell of each colour cannot hold the digit, because one of those two cells does.

With the coloring tool on the board: turn on Colour, tap the digit to light up where it can go, then paint the chain one link at a time in two colours.
