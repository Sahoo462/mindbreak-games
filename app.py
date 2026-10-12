from flask import Flask, abort, render_template

from games.catalog import GAMES, GAMES_BY_SLUG

app = Flask(__name__)


@app.get("/")
def home():
    return render_template("index.html", games=GAMES)


@app.get("/customize")
def customize():
    return render_template("customize.html", games=GAMES)


@app.get("/games/<slug>")
def game_details(slug):
    game = GAMES_BY_SLUG.get(slug)
    if game is None:
        abort(404)
    return render_template("game_detail.html", game=game)


@app.errorhandler(404)
def not_found(_error):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
