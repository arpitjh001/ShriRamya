import logging
import sys
from typing import Any

def setup_logging():
    # Configure logging to standard output
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set levels for specific loggers if needed
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("shriramya").setLevel(logging.INFO)

logger = logging.getLogger("shriramya")
