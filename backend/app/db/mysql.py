import aiomysql
import logging
from ..core.config import settings

logger = logging.getLogger("shriramya.db.mysql")

class MySQLClient:
    def __init__(self):
        self.pool: aiomysql.Pool = None

    async def connect(self):
        try:
            self.pool = await aiomysql.create_pool(
                host=settings.MYSQL_HOST,
                port=settings.MYSQL_PORT,
                user=settings.MYSQL_USER,
                password=settings.MYSQL_PASSWORD,
                db=settings.MYSQL_DATABASE,
                autocommit=True,
                minsize=1,
                maxsize=10
            )
            logger.info(f"Connected to MySQL: {settings.MYSQL_DATABASE} at {settings.MYSQL_HOST}")
        except Exception as e:
            logger.error(f"MySQL Connection Failed: {str(e)}")
            # We don't raise here to allow the app to start even if MySQL is down 
            # (unless it's a hard requirement)
            pass

    async def close(self):
        if self.pool:
            self.pool.close()
            await self.pool.wait_closed()
            logger.info("MySQL connection pool closed")

    async def ping(self) -> bool:
        if not self.pool:
            return False
        try:
            async with self.pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("SELECT 1")
                    return True
        except Exception as e:
            logger.error(f"MySQL Ping Failed: {str(e)}")
            return False

mysql_client = MySQLClient()

async def get_mysql_db():
    if not mysql_client.pool:
        await mysql_client.connect()
    return mysql_client.pool
