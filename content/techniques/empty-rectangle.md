# Empty Rectangle

In some box, a digit's candidates all lie on one row and one column of the box, in an L or cross shape that leaves the other four cells empty. So the digit is on that row or on that column within the box.

Now find a column outside the box where the digit has exactly two possible cells, one of them on the box's row. If that cell holds the digit, the box's copy can't be on that row, so it is on the box's column. If it doesn't, the pair's other end holds the digit. Either way, the cell where the other end's row crosses the box's column cannot hold it. The same works with rows and columns swapped.
