import json
import sys
from pathlib import Path

import chess
import chess.pgn


CASTLING_ROOK_DATAPOINTS = {
    # Map of (color, king direction) -> rook (square, piece, direction)
    ('white', 'E'): ('h1', 'r', 'W'),
    ('white', 'W'): ('a1', 'r', 'E'),
    ('black', 'E'): ('h8', 'r', 'W'),
    ('black', 'W'): ('a8', 'r', 'E'),
}


def get_aggregate(pgn_filename, player_name):
    full_aggregates = {'white': [], 'black': []}
    with open(pgn_filename) as pgn_file:
        while True:
            game = chess.pgn.read_game(pgn_file)
            if game is None:
                break
            print(game.headers['Date'])
            color = 'white' if player_name in game.headers['White'] else 'black'
            color_aggregates = full_aggregates[color]
            turns_mod = 0 if color == 'white' else 1
            board = game.board()
            for i, move in enumerate(list(game.mainline_moves())):
                board.push(move)
                if i%2 != turns_mod:
                    continue

                move_index = i//2
                # Either this index is a new maximum game length for existing
                # aggregates (so it'll be appended to the list), or it's already
                # in the list, but it cannot be further than the list.
                assert move_index <= len(color_aggregates)
                if move_index == len(color_aggregates):
                    color_aggregates.append({})
                aggregate = color_aggregates[move_index]

                square = chess.square_name(move.from_square)
                piece = piece_code(board.piece_type_at(move.to_square))
                direction = get_direction_from_move(move)

                datapoints = [(square, piece, direction)]

                # Taking the rook into account for castling
                if piece == 'K' and get_file_diff(move) > 1:
                    datapoints.append(
                        CASTLING_ROOK_DATAPOINTS[(color, direction)]
                    )

                for square, piece, direction in datapoints:
                    aggregate.setdefault(
                        square, {}
                    ).setdefault(
                        direction, {}
                    ).setdefault(
                        piece, 0
                    )
                    aggregate[square][direction][piece] += 1

                # Positional aggregates
                positions = get_current_positions(board, color)
                for square, piece in positions:
                    aggregate.setdefault(
                        square, {}
                    ).setdefault(
                        '_', {}
                    ).setdefault(
                        piece, 0
                    )
                    aggregate[square]['_'][piece] += 1


    return full_aggregates


def get_current_positions(board, color):
    positions = []
    for i in range(64):
        piece = board.piece_at(i)
        if piece is None:
            continue
        if piece.color != (color == 'white'):
            continue
        positions.append((
            chess.square_name(i),
            piece_code(piece.piece_type)
        ))
    return positions


def piece_code(piece_type):
    fullname = chess.piece_name(piece_type)
    if fullname == 'knight':
        return 'N'
    if fullname == 'pawn':
        return 'p'
    return fullname[0].upper()


def get_direction_from_move(move):
    direction = ''
    rank_diff = get_rank_diff(move)
    file_diff = get_file_diff(move)
    if rank_diff > 0:
        direction += 'N'
    elif rank_diff < 0:
        direction += 'S'
    if file_diff > 0:
        direction += 'E'
    elif file_diff < 0:
        direction += 'W'
    return direction


def get_file_diff(move):
    return (
        chess.square_file(move.to_square)
        - chess.square_file(move.from_square)
    )


def get_rank_diff(move):
    return (
        chess.square_rank(move.to_square)
        - chess.square_rank(move.from_square)
    )


def main():
    pgn_paths = sys.argv[1:]
    for path in pgn_paths:
        stem = Path(path).stem
        player_name = stem.split('_')[-1]
        aggregate = get_aggregate(path, player_name)
        json_name = 'games/' + stem + '.json'
        with open(json_name, 'w') as _:
            json.dump(aggregate, _)


if __name__ == '__main__':
    main()
