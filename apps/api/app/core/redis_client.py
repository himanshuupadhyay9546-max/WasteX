import redis
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=0,
        decode_responses=True,
        socket_connect_timeout=2
    )
except Exception as e:
    logger.warning(f"Redis not available on startup: {e}")
    redis_client = None

def get_redis():
    return redis_client
