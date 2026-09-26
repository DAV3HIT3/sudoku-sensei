# X-Chain

An X-Chain follows one digit through a chain of cells joined by two kinds of link, alternating:

- Strong: a row, column or box where the digit has only these two cells. At least one of them holds it.
- Weak: the two cells see each other. At most one of them holds it.

Start and end the chain with a strong link. Now suppose the first cell is not the digit: the strong link makes the next one the digit, the weak link makes the one after that not, and so on, until the last cell is forced to be the digit. So one end or the other holds it, and any cell that sees both ends cannot.

The Skyscraper, 2-String Kite and Turbot Fish are X-Chains with three links. Longer chains find eliminations those miss. The coloring tool helps: paint the cells as you follow the chain, alternating colours at each link.
