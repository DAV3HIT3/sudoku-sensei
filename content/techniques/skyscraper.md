# Skyscraper

Take a digit that can go in only two cells in each of two rows. Suppose one cell of each pair is in the same column: those two are the base, and the other two cells are the tops.

The two base cells share a column, so at most one of them holds the digit. So in at least one of the rows the digit is not at the base, which means it is at that row's top. One of the two tops holds the digit.

So any cell that sees both tops cannot hold it. The same works with rows and columns swapped. A Skyscraper is an X-Wing with one corner out of line.
