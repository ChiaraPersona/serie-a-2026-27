### Task 7: Scraper Service and CLI

**Files:**
- Create: `app/services/scraper.py`, `app/cli/scrape.py`

**Interfaces:**
- Consumes: `Team`, `Player` models
- Produces: `scrape_command` Click group, `ScraperService` with stub methods

- [ ] **Step 1: Write `app/services/scraper.py`**

```python
import json
import os
import requests
from bs4 import BeautifulSoup

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "scraped")


class ScraperService:
    @staticmethod
    def scrape_transfermarkt():
        """Scrape player market values from Transfermarkt.
        This is a stub - real implementation requires handling anti-bot measures.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        output_path = os.path.join(DATA_DIR, "transfermarkt_values.json")
        data = {"source": "transfermarkt", "status": "stub", "players": []}
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return output_path

    @staticmethod
    def scrape_fbref():
        """Scrape player statistics from FBref.
        This is a stub - real implementation requires parsing FBref tables.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        output_path = os.path.join(DATA_DIR, "fbref_stats.json")
        data = {"source": "fbref", "status": "stub", "players": []}
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return output_path

    @staticmethod
    def scrape_diretta():
        """Scrape match results from Diretta.it.
        This is a stub - real implementation requires parsing match pages.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        output_path = os.path.join(DATA_DIR, "diretta_results.json")
        data = {"source": "diretta", "status": "stub", "matches": []}
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return output_path
```

- [ ] **Step 2: Write `app/cli/scrape.py`**

```python
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
```

- [ ] **Step 3: Verify CLI commands register**

```bash
flask scrape --help
```
Expected: shows transfermarkt, fbref, diretta subcommands

- [ ] **Step 4: Commit**

```bash
git add app/services/scraper.py app/cli/scrape.py
git commit -m "feat: add scraper service stubs and CLI commands"
```
