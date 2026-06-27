import click
from flask import current_app
from app.services.prediction_engine import PredictionEngine


@click.group(name="predict")
def predict_command():
    """Run Monte Carlo predictions."""
    pass


@predict_command.command()
@click.argument("matchday", type=int)
@click.option("--runs", default=None, type=int, help="Number of simulations")
def matchday(matchday, runs):
    """Run predictions for a specific matchday."""
    if runs is None:
        runs = current_app.config["MONTE_CARLO_RUNS"]
    predictions = PredictionEngine.predict_matchday(matchday, runs=runs)
    for pred in predictions:
        click.echo(
            f"Match {pred.match_id}: "
            f"{pred.pred_home_score:.2f} - {pred.pred_away_score:.2f} "
            f"(H:{pred.prob_home_win:.0%} D:{pred.prob_draw:.0%} A:{pred.prob_away_win:.0%})"
        )
    click.echo(f"Predicted {len(predictions)} matches with {runs} simulations each.")
