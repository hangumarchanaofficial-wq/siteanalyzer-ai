"""
__main__.py — Allows running the backend as ``python -m backend <url>``.
"""
import asyncio
from backend.engine import _main

if __name__ == "__main__":
    asyncio.run(_main())
