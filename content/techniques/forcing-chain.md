# Forcing Chain

When the patterns run out, try a cell with two or three candidates, each in turn, and follow only the singles that follow from it.

- If one choice leads to a contradiction, such as a cell with no candidate left or a digit with nowhere to go in a row, that choice is wrong: remove it.
- If every choice puts the same digit in the same other cell, that digit belongs there, whichever choice is right.

This is the last resort here. It is logic, not guessing, because every branch is followed until it says something certain. But it is slower to do by hand than the patterns, so the solver only reaches for it when nothing else works. Keep the branches short and write down what each one places.
