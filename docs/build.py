"""Shared HTML helpers for the current SDK documentation builders."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent


def table(headers, rows):
    return '<div class="table"><table><thead><tr>' + ''.join('<th>' + x + '</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + value + '</td>' for value in row) + '</tr>' for row in rows) + '</tbody></table></div>'
