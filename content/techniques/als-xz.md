# ALS-XZ

An almost locked set (ALS) is a group of cells in one row, column or box holding one more digit than it has cells: a two-candidate cell is the smallest. Take any one digit out of an ALS and the rest lock into place, a naked subset.

Find two ALS that share no cell but share two digits, X and Z, where every X in one sees every X in the other. They can't both contain X, so at least one of them loses X and locks onto its other digits, including Z. So one set or the other holds Z.

A cell that sees every Z in both sets cannot be Z.

X is called the restricted common digit. The pattern generalises the XY-Wing, whose pincers and pivot are small ALS.
