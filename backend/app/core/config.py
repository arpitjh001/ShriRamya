from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "Shri Ramya API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Auth
    JWT_SECRET: str = "shri-ramya-secret-key-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    
    # MongoDB
    MONGO_URL: str = "mongodb://mongodb:27017/"
    DB_NAME: str = "shriramya"
    
    # MySQL (for direct checks or alternate storage)
    MYSQL_HOST: str = "mysql"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "wpuser"
    MYSQL_PASSWORD: str = "wppassword"
    MYSQL_DATABASE: str = "shriramya"

    # WooCommerce
    WOOCOMMERCE_URL: str = "http://wordpress"
    WOOCOMMERCE_CONSUMER_KEY: str = ""
    WOOCOMMERCE_CONSUMER_SECRET: str = ""
    WOOCOMMERCE_VERIFY_SSL: bool = False
    WOOCOMMERCE_TIMEOUT: int = 60
    
    # WordPress Admin
    WP_ADMIN_USER: str = "admin"
    WP_APP_PASSWORD: str = ""
    
    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    
    # CORS
    CORS_ORIGINS: str = "*"

    model_config = SettingsConfigDict(env_file="backend/.env", extra="ignore")

settings = Settings()
