# Unique Rectangle

A proper Sudoku has exactly one solution, and that rules out one shape. Take four empty cells at the corners of a rectangle that spans exactly two boxes, all four with the same two digits, a and b, among their candidates. If all four ended up holding a or b, you could swap a and b around the rectangle and still have a valid grid: two solutions. So at least one corner must end up holding something other than a or b, and that tells you where to look.

- Type 1: three corners have only a and b. So the fourth corner is the one that breaks the pattern: remove a and b from it.
- Type 2: two corners have only a and b, and the other two, in one row or column, each have the same one extra digit c. One of those two must hold c, so a cell that sees both cannot.
- Type 3: the other two corners have different extra digits. One of them must hold one of those extras, so together they act like a single cell holding the extra digits. With other cells of their row, column or box, that can make a naked pair or triple.
- Type 4: in a row, column or box that holds the other two corners, a can go only in those two cells, so one of them holds a. If the other held b, the rectangle would be all a and b. So neither can hold b.

This relies on the puzzle having one solution. Every puzzle here does.
