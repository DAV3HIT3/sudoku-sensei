# BUG+1

BUG stands for Bivalue Universal Grave: a position where every empty cell has exactly two candidates and every candidate appears exactly twice in each row, column and box. A position like that has either no solution or more than one, so a proper puzzle can never reach it.

BUG+1 is one step away from it: every empty cell has two candidates except one cell with three. Remove the right one of its three digits and the grave appears, so that digit cannot be removed: the cell must hold it.

To find the digit, count in the odd cell's row: one of its three candidates appears three times there, where every other digit appears twice. That is the one to place. It also appears three times in the cell's column and box.

It is quick to spot late in a hard puzzle, when the board is full of pairs.
