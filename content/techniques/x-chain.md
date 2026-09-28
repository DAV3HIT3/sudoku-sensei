# X-Chain

An X-Chain follows one digit through cells joined by two kinds of link, taken in turn:

- Strong: a row, column or box where the digit can go in only these two cells. At least one of them holds it.
- Weak: the two cells see each other. At most one of them holds it.

Start and end with a strong link. Suppose the first cell does not hold the digit: the strong link means the second cell does, the weak link means the third does not, the next strong link means the fourth does, and so on to the end. So either the first cell or the last cell holds the digit, and any cell that sees both cannot.

The Skyscraper and the 2-String Kite are X-Chains with three links; longer chains find eliminations those miss. The coloring tool helps: paint the cells as you follow the chain, switching color at each link.
