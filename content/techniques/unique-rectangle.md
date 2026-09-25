# Unique Rectangle

A proper Sudoku has exactly one solution, and that rules out one shape. Take four empty cells at the corners of a rectangle that spans exactly two boxes, all holding the same two candidates, a and b. If all four ended up a or b, you could swap a and b around the rectangle and still have a valid grid: two solutions. So something in the rectangle must break the pattern, and that tells you where to look.

- Type 1: three corners are exactly {a,b}. The fourth must break the pattern itself, so it is neither a nor b: remove both.
- Type 2: two corners are exactly {a,b} and the other two, in one row or column, add the same single digit c. One of those two must be c, so a cell that sees both cannot be.
- Type 3: the other two corners add different digits. Together they act as one cell holding those extra digits, which can complete a naked pair or triple with other cells in their row, column or box.
- Type 4: in a unit that holds the other two corners, a can only go in those two. One of them is a, so neither can be b, or the pattern would be complete.

This only works because the puzzle has one solution. Every puzzle here does.
