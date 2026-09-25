# BUG+1

BUG stands for Bivalue Universal Grave: a position where every empty cell has exactly two candidates, and every candidate appears exactly twice in each row, column and box. Such a position always has at least two solutions, so a proper puzzle can never reach it.

BUG+1 is one step away: every empty cell has two candidates except one cell with three. Take the right digit out of that cell and the grave appears, which cannot happen. So that cell must be that digit.

To find the digit, look at the odd cell's row: one of its three candidates appears three times there, while every other digit appears twice. That is the one to place. Check its column and box too: it appears three times in each.

It feels like a trick, but it is quick to spot late in a hard puzzle when the board is full of pairs.
