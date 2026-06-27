import click
from app.services.scraper import ScraperService


@click.group(name="scrape")
def scrape_command():
    """Scrape data from external sources."""
    pass


@scrape_command.command()
def transfermarkt():
    """Scrape player market values from Transfermarkt."""
    path = ScraperService.scrape_transfermarkt()
    click.echo(f"Transfermarkt data saved to {path}")


@scrape_command.command()
def fbref():
    """Scrape player statistics from FBref."""
    path = ScraperService.scrape_fbref()
    click.echo(f"FBref data saved to {path}")


@scrape_command.command()
def diretta():
    """Scrape match results from Diretta.it."""
    path = ScraperService.scrape_diretta()
    click.echo(f"Diretta data saved to {path}")
