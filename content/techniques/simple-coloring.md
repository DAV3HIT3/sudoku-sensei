# Simple Coloring

Pick a digit and find its conjugate pairs: units where it has exactly two possible cells. In each pair exactly one cell holds the digit. Where pairs share a cell they form a chain, and along a chain the truth alternates: if one cell holds the digit, its partner does not, and the next one does.

Color the chain in two colors, alternating at every link. Every cell of one color holds the digit, and no cell of the other does. You don't know yet which color is which, but two rules often tell you enough.

Color wrap: if two cells of the same color see each other, that color cannot be the one holding the digit, since a unit can't hold it twice. Remove the digit from every cell of that color.

Color trap: a cell outside the chain that sees a cell of each color cannot hold the digit, because one of those two cells does.

With the coloring tool on the board: turn on Color, tap the digit to light up where it can go, then paint the chain one link at a time in two colors.
