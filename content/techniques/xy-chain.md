# XY-Chain

An XY-Chain runs through cells that each have exactly two candidates, every cell seeing the next and sharing a digit with it.

Pick an end cell and one of its digits, x. Suppose that cell is not x: then it is its other digit. The next cell sees it and shares that digit, so it cannot be it, and must be its own other digit. Carry on along the chain. If the last cell is forced to be x, then one end or the other is x.

So any cell that sees both ends of the chain cannot be x.

The XY-Wing is an XY-Chain of three cells. Longer chains go further, and they are easy to follow once you write the forced digit beside each cell as you go.
