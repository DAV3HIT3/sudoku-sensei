# XY-Chain

An XY-Chain runs through cells that each have exactly two candidates. Each cell sees the next one, and the two share a candidate.

Pick one end cell and one of its digits, x. Suppose that cell is not x: then it holds its other digit. The next cell sees it and also has that digit as a candidate, so it cannot hold it, and must hold its own other digit. Carry on along the chain. If the last cell ends up forced to be x, then either the first cell is x, or the last one is.

So any cell that sees both ends of the chain cannot be x.

The XY-Wing is an XY-Chain of three cells. For longer chains, write the forced digit beside each cell as you go.
