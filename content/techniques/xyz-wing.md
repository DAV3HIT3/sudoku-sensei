# XYZ-Wing

Like an XY-Wing, but the pivot has three candidates {X,Y,Z} and sees two pincers with two candidates each: {X,Z} and {Y,Z}.

If the pivot is Z, it holds Z. If it is X, the {X,Z} pincer must be Z; if it is Y, the {Y,Z} pincer must be Z. So one of the three cells always holds Z.

A cell that sees all three of them, the pivot included, cannot be Z. Such a cell is always in the pivot's box, so look there.
