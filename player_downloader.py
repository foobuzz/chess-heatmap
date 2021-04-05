import sys
import urllib
from pathlib import Path

import bs4
import requests


PAGES_URL = 'https://www.chess.com/games/search'
EXPORT_URL = 'https://www.chess.com/games/downloadPgn'
EXPORT_MAX_SIZE = 600


def main():
    if not Path('games').exists():
        os.mkdir('games')
    players = sys.argv[1:]
    for p in players:
        print("===", p, "===")
        download_player(p)


def download_player(player):
    game_ids = download_game_ids(player)
    download_pgn(player, game_ids)


def download_game_ids(player):
    game_ids = []
    game_ids_filename = get_game_ids_filename(player)

    nb_pages = int(1e10)  # arbitrary big number until we get the real one
    query_string = {
        'p1': player,
    }

    i = 1
    while i <= nb_pages:
        print("Page", i)
        batch_game_ids = []

        query_string['page'] = i
        url = '?'.join([PAGES_URL, urllib.parse.urlencode(query_string)])
        html = requests.get(url).text
        soup = bs4.BeautifulSoup(html, 'lxml')

        nb_pages = int(
            soup.select_one('#master-games-container')['data-total-pages']
        )

        for checkbox in soup.select('.master-games-checkbox'):
            batch_game_ids.append(checkbox['data-game-id'])

        game_ids += batch_game_ids
        with open(game_ids_filename, 'a') as game_ids_file:
            game_ids_file.write('\n'.join(batch_game_ids))
            game_ids_file.write('\n')

        i += 1

    return game_ids


def download_pgn(player, game_ids):
    games_filename = get_games_filename(player)

    for i, game_ids_chunk in enumerate(chunks(game_ids, EXPORT_MAX_SIZE)):
        print("Games", i*EXPORT_MAX_SIZE+1, "to", (i+1)*EXPORT_MAX_SIZE)

        url = '?'.join([
            EXPORT_URL,
            urllib.parse.urlencode({'game_ids': ', '.join(game_ids_chunk)})
        ])
        games = requests.get(url).text

        with open(games_filename, 'a') as games_export:
            games_export.write(games)
            games_export.write('\n' * 3)


def get_game_ids_filename(player):
    return 'games/' + player.replace(' ', '_') + '_game_ids'


def get_games_filename(player):
    return 'games/' + player.replace(' ', '_') + '.pgn'


def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


if __name__ == '__main__':
    main()
