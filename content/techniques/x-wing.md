# X-Wing

Pick a digit. Suppose that in two rows it can go in only two cells each, and those cells sit in the same two columns. The four cells form the corners of a rectangle.

Each row must hold the digit somewhere, so it is at one of two diagonally opposite pairs of corners. Either way, each of the two columns gets its copy of the digit from one of those two rows. So no other cell in either column can hold it: remove it from the rest of both columns.

The same works with rows and columns swapped. Start by looking for rows where a digit has exactly two possible cells.
