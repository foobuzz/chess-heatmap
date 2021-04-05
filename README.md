Chess Heatmap
=============

The code that powers chess-heatmap.github.io.

It works in 3 parts:

 1. **Data downloading** is done by the `player_downloader.py` script. It uses the search and export features from chess.com to download games from given player(s) in [PGN](https://en.wikipedia.org/wiki/Portable_Game_Notation) format.
 2. **Aggregation** is done by the `aggregator.py` script. It uses the [python-chess](https://python-chess.readthedocs.io/en/latest/) library to read each game from given PGN file(s) and aggregates positional and directional data into a JSON file, whose structure is documented [here](#aggregate-json-format).
 3. **Visualisation** is done by the `chess-heatmap.js` script. This mini-library exposes an interface to draw the board, load, and parse the JSON aggregates file to draw the heatmap on the board. Methods allow to switch colors, select specific pieces, and so on. The calling HTML pages has the responsability of dealing with inputs that binds to those choices.


## JSON aggregates format

Here is an informal specification of the JSON aggregates format:

```javascript
// The file contains one object with two keys: 'white', and 'black'.
// The value of each key contains aggregates about all games
// played by the player respectively with white, and with black.
{
	// The aggregates for a color is an array whose length is the maximum
	// number of moves the player ever played for this color. Each item of the
	// array contains aggregates for the given turn.
	"white": [
		{...}, // aggregates for move number 1
		{...}, // aggregates for move number 2
		// The aggregates for a given move is an object whose keys are square
		// coordinates. Not necessarily all squares are included: only
		// squares for which there ever was a piece on it at this given move.
		// (beyond move ~10, this happens to be all the squares for most players)
		// Standard coordinates notation is used.
		{
			'a1': {...}, // aggregates for square a1
			'a2': {...}, // aggregates for square a2
			// The aggregates for a given square contains:
			//  - The special key _ (underscore), which contains positional
			//    aggregates.
			//  - Keys N, S, W, E, NW, NE, SW, SE (North, South, West, East, etc)
			//    which contains directional aggregates. Not necessarily all
			//    directions are included: only directions a piece on this square
			//    was ever moved to at this move.
			'a3': {
				'_': {
				// The directional aggregate contains data about all pieces that
				// ever was at this square on this move. It is an object whose
				// keys are pieces and values are the number of times this piece
				// was ever at this square at this move.
				// Pieces are noted p, B, N, R, Q, K.
					'p': 4, // In 4 games there was a pawn on a3 on move 3
					'N': 2  // In 2 games there was a knight on a3 on move 3
				},
				// Directional aggregates follow the same format than the
				// positional ones.
				'N': {
					'p': 1  // In 1 game, a pawn moved up from a3 on move 3
				},
				'NE': {
					'N': 1  // In 1 game, a knight moved up right from a3 on move 3
				}
			}
		},
		...
	],
	// Aggregates about the games the player played as black
	"black": [...]
}
```