# AIC

An Alternating Inference Chain links candidates, not just cells, with two kinds of link:

- Strong: at least one of the two is true. Either a digit's only two cells in a unit, or the two candidates of a two-candidate cell.
- Weak: at most one of the two is true. Either the same digit in two cells that see each other, or two digits in the same cell.

Alternate them, starting and ending with a strong link. Suppose the first candidate is false: the strong link makes the next true, the weak link makes the one after false, and so on, until the last is true. So the first or the last candidate is true.

- Same digit at both ends: a cell that sees both ends cannot hold it.
- Different digits in cells that see each other: each end cell loses the other end's digit.
- Different digits in the same cell: that cell holds one of the two, and nothing else.

X-Chains (one digit) and XY-Chains (two-candidate cells) are AICs too. The AICs here mix both kinds of strong link.
