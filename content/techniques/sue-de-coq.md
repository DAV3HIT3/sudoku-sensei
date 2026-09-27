# Sue de Coq

Look where a box meets a row or column: two or three empty cells shared by both. Suppose between them they hold two more digits than there are cells, say two cells with {1,2,3,4}.

Now find a cell in the row, outside the box, with two of those digits (say {1,2}), and a cell in the box, outside the row, with the other two ({3,4}). Together with the shared cells that makes four cells for four digits, and all four digits must be placed in them, since the cells can't repeat a digit within their row or box.

So 1 and 2 are placed in the row's part of this group: remove them from the rest of the row. 3 and 4 are placed in the box's part: remove them from the rest of the box. With three shared cells and five digits, a digit that belongs to neither outside cell must sit in the shared cells, and leaves both the row and the box.
